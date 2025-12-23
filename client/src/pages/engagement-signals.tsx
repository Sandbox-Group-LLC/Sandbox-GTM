import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Zap, Flame, Users, RefreshCw, BarChart3, MessageSquare, Star, TrendingUp, CheckCircle, Radio, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import type { Event } from "@shared/schema";

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

const typeLabels: Record<string, string> = {
  poll_single: "Single Choice Poll",
  poll_multi: "Multi Choice Poll",
  rating: "Rating",
  open_text: "Open Text",
  qa: "Q&A",
  pulse: "Pulse Check",
  cta: "Call to Action",
};

export default function EngagementSignals() {
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("signals");
  const { organization } = useAuth();

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

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

  const totalActiveVisitors = activeVisitors?.reduce((sum, v) => sum + v.activeVisitors, 0) || 0;

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Engagement Signals" 
        breadcrumbs={[{ label: "Performance" }, { label: "Engagement Signals" }]}
        actions={
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
                      <p className="text-4xl font-bold">--</p>
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
                  <CardDescription>Contacts showing buying signals ready for follow-up</CardDescription>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Flame className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Intent scoring coming soon</p>
                    <p className="text-sm mt-2">AI-powered engagement analysis</p>
                  </div>
                </CardContent>
              </Card>
            </div>
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
