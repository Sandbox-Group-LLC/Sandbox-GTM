import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Zap, Flame, Users, RefreshCw, BarChart3, MessageSquare, Star, TrendingUp, CheckCircle, Radio, Clock, Handshake, Target, HelpCircle, Copy, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { titleCase } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event, IntentExplanation } from "@shared/schema";

interface ActiveVisitor {
  eventId: string;
  eventName: string;
  pageType: string;
  activeVisitors: number;
}

interface MomentsAnalytics {
  totalMoments: number;
  momentsByStatus: { status: string; count: number }[];
  totalResponses: number;
  responsesByType: { type: string; count: number }[];
  topRespondents: { attendeeId: string; name: string; email: string; responseCount: number }[];
  averageRatings: { momentId: string; title: string; avgRating: number; responseCount: number }[];
  pollResults: { momentId: string; title: string; options: { label: string; count: number; percentage: number }[] }[];
  recentQASubmissions: { momentId: string; title: string; attendeeName: string; response: string; createdAt: string }[];
  liveVsEndedDistribution: { live: number; ended: number };
  responseRate: number;
  totalAttendeesWithAccess: number;
}

interface MeetingStats {
  totalMeetings: number;
  pendingMeetings: number;
  completedMeetings: number;
  outcomesRecorded: number;
  highIntentMeetings: number;
  mediumIntentMeetings: number;
  lowIntentMeetings: number;
  outcomeBreakdown: { type: string; count: number }[];
  intentBreakdown: { type: string; count: number }[];
}

interface IntentContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  intentStatus: string | null;
  salesReady: boolean | null;
  intentSources: { type: string; id: string; createdAt: string }[] | null;
  intentExplanation: IntentExplanation | null;
  updatedAt: Date | null;
}

const typeLabels: Record<string, string> = {
  poll_single: "Single Choice Poll",
  poll_multi: "Multi Choice Poll",
  rating: "Rating",
  open_text: "Open Text",
  qa: "Q&A",
  pulse: "Pulse Check",
  cta: "Call to Action",
};

const formatIntentSourceType = (type: string): string => {
  const typeMap: Record<string, string> = {
    'product_interaction': 'Product Interaction',
    'meeting': 'Meeting Outcome',
    'engagement': 'Engagement Signal',
    'session_attendance': 'Session Attendance',
    'event_lead': 'Product Interaction',
  };
  return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

function formatOpportunityBucket(bucket: string): string {
  const labels: Record<string, string> = {
    under_10k: '<$10k',
    '10k_to_50k': '$10k-$50k',
    '50k_to_100k': '$50k-$100k',
    over_100k: '$100k+',
  };
  return labels[bucket] || bucket;
}

function generateCRMNote(
  explanation: IntentExplanation,
  intentStatus: string,
  contactName: string,
  company: string | null
): string {
  const lines: string[] = [];
  
  const statusLabel = intentStatus === 'hot_lead' ? 'Hot Lead' : 'High-Intent';
  lines.push(`[${statusLabel}] ${contactName}${company ? ` - ${company}` : ''}`);
  lines.push('');

  if (explanation.primary_reasons.length > 0) {
    lines.push('Primary Reasons:');
    for (const reason of explanation.primary_reasons) {
      lines.push(`• ${reason}`);
    }
    lines.push('');
  }

  if (explanation.supporting_signals.length > 0) {
    lines.push('Supporting Signals:');
    for (const signal of explanation.supporting_signals) {
      lines.push(`• ${signal}`);
    }
    lines.push('');
  }

  if (explanation.contra_signals && explanation.contra_signals.length > 0) {
    lines.push('Context / Caveats:');
    for (const contra of explanation.contra_signals) {
      lines.push(`• ${contra.context}`);
    }
    lines.push('');
  }

  if (explanation.context) {
    lines.push('Note:');
    lines.push(`• ${explanation.context}`);
    lines.push('');
  }

  lines.push(`Momentum Score: ${explanation.totals.momentum_score}/10`);
  if (explanation.totals.highest_intent_level_seen) {
    lines.push(`Highest Intent Level: ${explanation.totals.highest_intent_level_seen}`);
  }
  if (explanation.totals.max_opportunity_bucket_seen) {
    lines.push(`Max Opportunity: ${formatOpportunityBucket(explanation.totals.max_opportunity_bucket_seen)}`);
  }

  return lines.join('\n');
}

export default function EngagementSignals() {
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("signals");
  const { organization } = useAuth();
  const { toast } = useToast();

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const recomputeIntentMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/recompute-intent`);
      return res.json();
    },
    onSuccess: (data: { message: string; processedCount: number; promotedCount: number }) => {
      toast({
        title: "Intent Recomputed",
        description: `Recomputed intent for ${data.processedCount} contacts. ${data.promotedCount} promoted.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", organization?.id, "hot-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", organization?.id, "high-intent-contacts"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to recompute intent. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCopyCRMNote = async (contact: IntentContact) => {
    if (!contact.intentExplanation) return;
    
    const note = generateCRMNote(
      contact.intentExplanation,
      contact.intentStatus || 'high_intent',
      `${contact.firstName} ${contact.lastName}`,
      contact.company
    );
    
    try {
      await navigator.clipboard.writeText(note);
      toast({
        title: "Copied to clipboard",
        description: "CRM note has been copied to your clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const { data: activeVisitors, isLoading } = useQuery<ActiveVisitor[]>({
    queryKey: ["/api/analytics/active-visitors", selectedEventId],
    refetchInterval: 30000,
    queryFn: async () => {
      const url = selectedEventId && selectedEventId !== "all"
        ? `/api/analytics/active-visitors?eventId=${selectedEventId}`
        : "/api/analytics/active-visitors";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch active visitors");
      return res.json();
    },
  });

  const { data: momentsAnalytics, isLoading: analyticsLoading } = useQuery<MomentsAnalytics>({
    queryKey: ["/api/organizations", organization?.id, "moments/analytics", selectedEventId],
    enabled: !!organization?.id,
    queryFn: async () => {
      const eventParam = selectedEventId && selectedEventId !== "all" ? `?eventId=${selectedEventId}` : "";
      const res = await fetch(`/api/organizations/${organization?.id}/moments/analytics${eventParam}`, { 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to fetch moments analytics");
      return res.json();
    },
  });

  const { data: meetingStats, isLoading: meetingStatsLoading } = useQuery<MeetingStats>({
    queryKey: ["/api/events", selectedEventId, "meetings", "stats"],
    enabled: selectedEventId !== "all" && !!selectedEventId,
    queryFn: async () => {
      const res = await fetch(`/api/events/${selectedEventId}/meetings/stats`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch meeting stats");
      return res.json();
    },
  });

  const { data: hotLeads, isLoading: hotLeadsLoading } = useQuery<IntentContact[]>({
    queryKey: ["/api/organizations", organization?.id, "hot-leads", selectedEventId],
    enabled: !!organization?.id,
    queryFn: async () => {
      const eventParam = selectedEventId && selectedEventId !== "all" ? `?eventId=${selectedEventId}` : "";
      const res = await fetch(`/api/organizations/${organization?.id}/hot-leads${eventParam}`, { 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to fetch hot leads");
      return res.json();
    },
  });

  const { data: highIntentContacts, isLoading: highIntentLoading } = useQuery<IntentContact[]>({
    queryKey: ["/api/organizations", organization?.id, "high-intent-contacts", selectedEventId],
    enabled: !!organization?.id,
    queryFn: async () => {
      const eventParam = selectedEventId && selectedEventId !== "all" ? `?eventId=${selectedEventId}` : "";
      const res = await fetch(`/api/organizations/${organization?.id}/high-intent-contacts${eventParam}`, { 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to fetch high-intent contacts");
      return res.json();
    },
  });

  const totalActiveVisitors = activeVisitors?.reduce((sum, v) => sum + v.activeVisitors, 0) || 0;

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Engagement Signals" 
        breadcrumbs={[{ label: "Performance" }, { label: "Engagement Signals" }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {selectedEventId && selectedEventId !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => recomputeIntentMutation.mutate(selectedEventId)}
                disabled={recomputeIntentMutation.isPending}
                data-testid="button-recompute-intent"
              >
                {recomputeIntentMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Recompute Intent
              </Button>
            )}
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-[120px] sm:w-[180px]" data-testid="select-event-filter">
                <SelectValue placeholder="Filter by program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {events?.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="signals" data-testid="tab-signals">
              <Activity className="w-4 h-4 mr-2" />
              Real-Time Signals
            </TabsTrigger>
            <TabsTrigger value="moments" data-testid="tab-moments">
              <BarChart3 className="w-4 h-4 mr-2" />
              Moments Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signals" className="mt-6 space-y-6">
            <p className="text-muted-foreground text-sm">Who is showing buying intent, and how?</p>
            
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5 text-blue-500" />
                    Engagement Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-4xl font-bold" data-testid="text-engagement-rate">
                        {momentsAnalytics?.responseRate ?? "--"}%
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Active participation level</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Intent Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-4xl font-bold">--</p>
                      <p className="text-sm text-muted-foreground mt-1">Behavioral signals</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Flame className="w-5 h-5 text-orange-500" />
                    Hot Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-4xl font-bold" data-testid="text-hot-leads-count">
                        {hotLeadsLoading ? "--" : (hotLeads?.length ?? 0)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Sales-ready contacts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      Real-Time Activity
                      {totalActiveVisitors > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {totalActiveVisitors} active
                        </Badge>
                      )}
                    </span>
                    <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" style={{ animationDuration: '3s' }} />
                  </CardTitle>
                  <CardDescription>Visitors on Program Hub pages in the last 5 minutes</CardDescription>
                </CardHeader>
                <CardContent className="h-64 overflow-auto">
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : activeVisitors && activeVisitors.length > 0 ? (
                    <div className="space-y-2">
                      {activeVisitors.map((visitor, index) => (
                        <div 
                          key={`${visitor.eventId}-${visitor.pageType}`}
                          className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50"
                          data-testid={`row-active-visitor-${index}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <div>
                              <p className="font-medium text-sm" data-testid={`text-event-name-${index}`}>
                                {visitor.eventName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {titleCase(visitor.pageType)} page
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold" data-testid={`text-visitor-count-${index}`}>
                              {visitor.activeVisitors}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No active visitors right now</p>
                        <p className="text-sm mt-2">Visitors will appear when they view your Program Hub pages</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>High-Intent Audience</CardTitle>
                  <CardDescription>Contacts ready for follow-up, identified through cumulative buying signals across meetings and engagement.</CardDescription>
                </CardHeader>
                <CardContent className="h-64 overflow-auto">
                  {highIntentLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : highIntentContacts && highIntentContacts.length > 0 ? (
                    <div className="space-y-2">
                      {highIntentContacts.slice(0, 10).map((contact, index) => (
                        <div 
                          key={contact.id}
                          className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50"
                          data-testid={`row-high-intent-${index}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              contact.intentStatus === 'hot_lead' ? 'bg-red-500' :
                              contact.intentStatus === 'high_intent' ? 'bg-orange-500' :
                              'bg-amber-500'
                            }`} />
                            <div>
                              <p className="font-medium text-sm" data-testid={`text-contact-name-${index}`}>
                                {contact.firstName} {contact.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {contact.company || contact.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge 
                              variant={contact.intentStatus === 'hot_lead' ? 'destructive' : 'secondary'}
                              data-testid={`badge-intent-status-${index}`}
                            >
                              {contact.intentStatus === 'hot_lead' ? 'Hot Lead' :
                               contact.intentStatus === 'high_intent' ? 'High Intent' :
                               contact.intentStatus || 'Engaged'}
                            </Badge>
                            {contact.intentExplanation && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={() => handleCopyCRMNote(contact)}
                                    data-testid={`button-copy-crm-note-${index}`}
                                  >
                                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">Copy CRM Note</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {(contact.intentExplanation || (contact.intentSources && contact.intentSources.length > 0)) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    data-testid={`button-why-${index}`}
                                  >
                                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                  <div className="space-y-2">
                                    <p className="font-medium text-xs">Why this contact was promoted:</p>
                                    {contact.intentExplanation ? (
                                      <>
                                        {contact.intentExplanation.primary_reasons.length > 0 && (
                                          <div className="space-y-1">
                                            {contact.intentExplanation.primary_reasons.map((reason, i) => (
                                              <div key={i} className="flex items-start gap-2 text-xs">
                                                <Target className="h-3 w-3 mt-0.5 text-green-500 shrink-0" />
                                                <span className="font-medium">{reason}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {contact.intentExplanation.supporting_signals.length > 0 && (
                                          <div className="space-y-1 pt-1 border-t border-border/50">
                                            {contact.intentExplanation.supporting_signals.map((signal, i) => (
                                              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                                <span className="shrink-0">+</span>
                                                <span>{signal}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {(contact.intentExplanation as IntentExplanation & { guardrail_message?: string }).guardrail_message && (
                                          <div className="pt-1 border-t border-border/50">
                                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                              {(contact.intentExplanation as IntentExplanation & { guardrail_message?: string }).guardrail_message}
                                            </p>
                                          </div>
                                        )}
                                      </>
                                    ) : contact.intentSources ? (
                                      contact.intentSources.map((source, i) => (
                                        <div key={i} className="flex items-center justify-between gap-3 text-xs">
                                          <span>{formatIntentSourceType(source.type)}</span>
                                          <span className="text-muted-foreground">
                                            {new Date(source.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                      ))
                                    ) : null}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      ))}
                      {highIntentContacts.length > 10 && (
                        <p className="text-xs text-center text-muted-foreground pt-2">
                          + {highIntentContacts.length - 10} more contacts
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Flame className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No high-intent contacts yet</p>
                        <p className="text-sm mt-2">Capture meeting outcomes to identify buyers</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Meeting Quality Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Handshake className="w-5 h-5 text-blue-500" />
                  Meeting Quality
                </CardTitle>
                <CardDescription>Internal meeting outcomes that surface buyer intent and sales-ready conversations.</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedEventId === "all" ? (
                  <div className="h-40 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Target className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p>Select a program to view meeting quality data</p>
                    </div>
                  </div>
                ) : meetingStatsLoading ? (
                  <div className="grid gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : meetingStats ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Total Meetings</p>
                        <p className="text-2xl font-bold" data-testid="text-total-meetings">
                          {meetingStats.totalMeetings}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Completed</p>
                        <p className="text-2xl font-bold" data-testid="text-completed-meetings">
                          {meetingStats.completedMeetings}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Outcomes Recorded</p>
                        <p className="text-2xl font-bold" data-testid="text-outcomes-recorded">
                          {meetingStats.outcomesRecorded}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">High Intent</p>
                        <p className="text-2xl font-bold text-green-600" data-testid="text-high-intent-meetings">
                          {meetingStats.highIntentMeetings}
                        </p>
                      </div>
                    </div>

                    {meetingStats.intentBreakdown && meetingStats.intentBreakdown.length > 0 && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h4 className="text-sm font-medium mb-3">Intent Strength Distribution</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <span className="text-sm">High Intent</span>
                              </div>
                              <span className="font-medium">{meetingStats.highIntentMeetings}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-amber-500" />
                                <span className="text-sm">Medium Intent</span>
                              </div>
                              <span className="font-medium">{meetingStats.mediumIntentMeetings}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-gray-400" />
                                <span className="text-sm">Low Intent</span>
                              </div>
                              <span className="font-medium">{meetingStats.lowIntentMeetings}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-3">Outcome Breakdown</h4>
                          <div className="space-y-2">
                            {meetingStats.outcomeBreakdown.map((outcome) => (
                              <div key={outcome.type} className="flex items-center justify-between">
                                <span className="text-sm capitalize">{outcome.type.replace(/_/g, ' ')}</span>
                                <Badge variant="secondary">{outcome.count}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Handshake className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p>No meeting data available</p>
                      <p className="text-sm mt-1">Schedule internal meetings to track buyer intent</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="moments" className="mt-6 space-y-6">
            <p className="text-muted-foreground text-sm">
              ICP alignment through audience engagement moments
            </p>

            {analyticsLoading ? (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              </div>
            ) : momentsAnalytics ? (
              <>
                <div className="grid gap-6 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <TrendingUp className="w-4 h-4" />
                        Total Responses
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold" data-testid="text-total-responses">
                        {momentsAnalytics.totalResponses}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        from {momentsAnalytics.totalAttendeesWithAccess} attendees
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <CheckCircle className="w-4 h-4" />
                        Response Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold" data-testid="text-response-rate">
                        {momentsAnalytics.responseRate}%
                      </p>
                      <Progress value={momentsAnalytics.responseRate} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Radio className="w-4 h-4" />
                        Live Moments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold" data-testid="text-live-moments">
                        {momentsAnalytics.liveVsEndedDistribution.live}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {momentsAnalytics.liveVsEndedDistribution.ended} ended
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <BarChart3 className="w-4 h-4" />
                        Total Moments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold" data-testid="text-total-moments">
                        {momentsAnalytics.totalMoments}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {momentsAnalytics.momentsByStatus.slice(0, 3).map((s) => (
                          <Badge key={s.status} variant="outline" className="text-xs">
                            {s.count} {s.status}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Responses by Type
                      </CardTitle>
                      <CardDescription>Breakdown of engagement by moment type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {momentsAnalytics.responsesByType.length > 0 ? (
                        <div className="space-y-4">
                          {momentsAnalytics.responsesByType.map((item) => {
                            const total = momentsAnalytics.totalResponses || 1;
                            const percentage = Math.round((item.count / total) * 100);
                            return (
                              <div key={item.type} data-testid={`row-type-${item.type}`}>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-sm font-medium">
                                    {typeLabels[item.type] || titleCase(item.type)}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {item.count} ({percentage}%)
                                  </span>
                                </div>
                                <Progress value={percentage} className="h-2" />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-40 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No responses yet</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Top Engaged Attendees
                      </CardTitle>
                      <CardDescription>Most active participants by response count</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-64 overflow-auto">
                      {momentsAnalytics.topRespondents.length > 0 ? (
                        <div className="space-y-3">
                          {momentsAnalytics.topRespondents.map((respondent, index) => (
                            <div 
                              key={respondent.attendeeId}
                              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50"
                              data-testid={`row-respondent-${index}`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                  {index + 1}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{respondent.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{respondent.email}</p>
                                </div>
                              </div>
                              <Badge variant="secondary">{respondent.responseCount}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-40 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No respondents yet</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        Average Ratings
                      </CardTitle>
                      <CardDescription>Ratings from rating-type moments</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {momentsAnalytics.averageRatings.length > 0 ? (
                        <div className="space-y-4">
                          {momentsAnalytics.averageRatings.map((rating) => (
                            <div 
                              key={rating.momentId} 
                              className="p-3 rounded-lg bg-muted/50"
                              data-testid={`row-rating-${rating.momentId}`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="font-medium text-sm truncate">{rating.title}</span>
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                  <span className="font-bold">{rating.avgRating}</span>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {rating.responseCount} response{rating.responseCount !== 1 ? "s" : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-40 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <Star className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No rating moments yet</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Poll Results Summary
                      </CardTitle>
                      <CardDescription>Results from poll-type moments</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-80 overflow-auto">
                      {momentsAnalytics.pollResults.length > 0 ? (
                        <div className="space-y-6">
                          {momentsAnalytics.pollResults.map((poll) => (
                            <div key={poll.momentId} data-testid={`row-poll-${poll.momentId}`}>
                              <p className="font-medium text-sm mb-3">{poll.title}</p>
                              <div className="space-y-2">
                                {poll.options.map((opt, i) => (
                                  <div key={i}>
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <span className="text-xs truncate max-w-[60%]">{opt.label}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {opt.count} ({opt.percentage}%)
                                      </span>
                                    </div>
                                    <Progress value={opt.percentage} className="h-1.5" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-40 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No polls yet</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Recent Q&A Submissions
                    </CardTitle>
                    <CardDescription>Latest open-ended responses and questions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {momentsAnalytics.recentQASubmissions.length > 0 ? (
                      <div className="space-y-3">
                        {momentsAnalytics.recentQASubmissions.map((qa, index) => (
                          <div 
                            key={`${qa.momentId}-${index}`}
                            className="p-4 rounded-lg bg-muted/50"
                            data-testid={`row-qa-${index}`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <Badge variant="outline" className="mb-1">{qa.title}</Badge>
                                <p className="text-sm font-medium mt-1">{qa.attendeeName}</p>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {new Date(qa.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{qa.response}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-40 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">No Q&A submissions yet</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Unable to load moments analytics</p>
                  <p className="text-sm mt-2">Please try again later</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
