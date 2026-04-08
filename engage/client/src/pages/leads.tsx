import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, fetchJSON, apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { useActiveEvent } from "../hooks/use-active-event";
import { AppHeader } from "./dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Flame, TrendingUp, Zap, Users, RefreshCw,
  Clock, Building2, ArrowUpRight, ArrowDownRight,
  ChevronDown, ChevronUp, Shield, Star, Calendar,
} from "lucide-react";

const INTENT_CONFIG = {
  hot_lead:    { label: "Hot Lead",    bg: "bg-red-100 text-red-800 border-red-200",       dot: "bg-red-500",           icon: <Flame className="h-3 w-3" /> },
  high_intent: { label: "High Intent", bg: "bg-orange-100 text-orange-800 border-orange-200", dot: "bg-orange-500",     icon: <TrendingUp className="h-3 w-3" /> },
  engaged:     { label: "Engaged",     bg: "bg-blue-100 text-blue-800 border-blue-200",    dot: "bg-blue-500",          icon: <Zap className="h-3 w-3" /> },
  none:        { label: "No Signal",   bg: "bg-muted text-muted-foreground border-border",  dot: "bg-muted-foreground/30", icon: null },
};

const SIGNAL_ICON: Record<string, JSX.Element> = {
  product_interaction: <Star className="h-3 w-3 text-amber-500" />,
  meeting:             <Calendar className="h-3 w-3 text-blue-500" />,
  session_checkin:     <Shield className="h-3 w-3 text-green-500" />,
};

function IntentBadge({ status }: { status: string }) {
  const cfg = INTENT_CONFIG[status as keyof typeof INTENT_CONFIG] || INTENT_CONFIG.none;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${cfg.bg}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min((score / 10) * 100, 100);
  const color = score >= 8 ? "bg-red-500" : score >= 5 ? "bg-orange-400" : score >= 3 ? "bg-blue-400" : "bg-muted-foreground/20";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-bold w-8 text-right">{score}/10</span>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (!delta) return <span className="text-xs text-muted-foreground">—</span>;
  return delta > 0
    ? <span className="inline-flex items-center text-xs text-green-600 font-semibold"><ArrowUpRight className="h-3 w-3" />+{delta}</span>
    : <span className="inline-flex items-center text-xs text-red-500 font-semibold"><ArrowDownRight className="h-3 w-3" />{delta}</span>;
}

function AttendeeCard({ a }: { a: any }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = INTENT_CONFIG[a.eventIntentStatus as keyof typeof INTENT_CONFIG] || INTENT_CONFIG.none;
  const sources: any[] = a.eventIntentSources || [];
  const tier1 = sources.filter((s: any) => s.tier === 1);
  const tier2 = sources.filter((s: any) => s.tier === 2);

  return (
    <div className="px-4 py-4 hover:bg-muted/20 transition-colors">
      <div className="flex items-start gap-3">
        {/* Status dot */}
        <div className={`mt-2 h-2.5 w-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />

        <div className="flex-1 min-w-0 space-y-2">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm">{a.firstName} {a.lastName}</p>
                <IntentBadge status={a.eventIntentStatus} />
                {a.eventSalesReady && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200 font-semibold">
                    ✓ Sales Ready
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Building2 className="h-3 w-3" />
                <span>{a.company || "—"}</span>
                {a.jobTitle && <><span>·</span><span>{a.jobTitle}</span></>}
              </div>
            </div>
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {/* Score bar */}
          <ScoreBar score={a.eventMomentumScore || 0} />

          {/* Narrative */}
          {a.eventIntentNarrative && (
            <p className="text-xs text-muted-foreground leading-relaxed">{a.eventIntentNarrative}</p>
          )}

          {/* Expanded signals */}
          {expanded && sources.length > 0 && (
            <div className="mt-3 space-y-2 border-t pt-3">
              {tier1.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-1.5 flex items-center gap-1">
                    <Flame className="h-3 w-3" /> Tier 1 — Buying Signals
                  </p>
                  <div className="space-y-1">
                    {tier1.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-red-50 border border-red-100 rounded px-2 py-1">
                        {SIGNAL_ICON[s.type]}
                        <span className="capitalize">{s.signal}</span>
                        <span className="ml-auto text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tier2.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Tier 2 — Momentum
                  </p>
                  <div className="space-y-1">
                    {tier2.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                        {SIGNAL_ICON[s.type]}
                        <span className="capitalize">{s.signal}</span>
                        {s.points && <span className="ml-auto text-xs font-mono text-muted-foreground">+{s.points}pts</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Lifetime score if different from event score */}
              {a.lifetimeIntentStatus && a.lifetimeIntentStatus !== "none" && a.lifetimeIntentStatus !== a.eventIntentStatus && (
                <div className="text-xs text-muted-foreground border-t pt-2 flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" />
                  Lifetime: <IntentBadge status={a.lifetimeIntentStatus} />
                  <span>({a.lifetimeMomentumScore}/10)</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, delta, color, icon, loading }: {
  label: string; value: number; delta?: number | null;
  color: string; icon: React.ReactNode; loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          {icon}
        </div>
        {loading ? <Skeleton className="h-7 w-10" /> : (
          <div className="flex items-end gap-2">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {delta !== null && delta !== undefined && <DeltaBadge delta={delta} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Leads() {
  const { toast } = useToast();
  const { eventId: selectedEventId, eventName, hasEvent } = useActiveEvent();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: summary, isLoading: summaryLoading } = useQuery<any>({
    queryKey: ["/api/intent/summary", selectedEventId],
    queryFn: () => fetchJSON(`/api/events/${selectedEventId}/intent/summary`),
    enabled: !!selectedEventId,
    refetchInterval: 30_000,
  });

  const { data: scoredAttendees = [], isLoading: attendeesLoading } = useQuery<any[]>({
    queryKey: ["/api/intent/attendees", selectedEventId, statusFilter],
    queryFn: () => fetchJSON(
      `/api/events/${selectedEventId}/intent/attendees${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`
    ),
    enabled: !!selectedEventId,
  });

  const { data: history = [] } = useQuery<any[]>({
    queryKey: ["/api/intent/history", selectedEventId],
    queryFn: () => fetchJSON(`/api/events/${selectedEventId}/intent/history`),
    enabled: !!selectedEventId,
  });

  const recomputeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${selectedEventId}/intent/recompute`, { triggeredBy: "manual" });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/intent/summary", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/intent/attendees", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/intent/history", selectedEventId] });
      toast({
        title: "Signals engine complete",
        description: `${data.totalPromoted} promoted · Hot: ${data.afterHotLeads} · High: ${data.afterHighIntent} · Engaged: ${data.afterEngaged}`,
      });
    },
    onError: (err: any) => toast({ title: "Recompute failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-6">

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {hasEvent && (
            <Button onClick={() => recomputeMutation.mutate()} disabled={recomputeMutation.isPending} variant="outline" size="sm">
              <RefreshCw className={`h-3 w-3 mr-2 ${recomputeMutation.isPending ? "animate-spin" : ""}`} />
              {recomputeMutation.isPending ? "Scoring..." : "Run Signals Engine"}
            </Button>
          )}
          {summary?.lastRecomputedAt && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last run: {new Date(summary.lastRecomputedAt).toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })} PT
            </span>
          )}
        </div>

        {!hasEvent ? (
          <Card><CardContent className="flex flex-col items-center py-16">
            <Flame className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No active event configured</p>
          </CardContent></Card>
        ) : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Card className="col-span-2 lg:col-span-1 border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Follow-Up Readiness</p>
                  {summaryLoading ? <Skeleton className="h-10 w-16" /> : (
                    <p className="text-4xl font-bold text-primary">{summary?.followUpReadiness ?? 0}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Hot Leads + High Intent</p>
                </CardContent>
              </Card>
              <StatCard label="Hot Leads"    value={summary?.hotLeads ?? 0}   delta={summary?.lastDeltaHotLeads}   color="text-red-600"    icon={<Flame className="h-4 w-4 text-red-500" />}         loading={summaryLoading} />
              <StatCard label="High Intent"  value={summary?.highIntent ?? 0} delta={summary?.lastDeltaHighIntent} color="text-orange-600" icon={<TrendingUp className="h-4 w-4 text-orange-500" />}  loading={summaryLoading} />
              <StatCard label="Engaged"      value={summary?.engaged ?? 0}    delta={null}                         color="text-blue-600"   icon={<Zap className="h-4 w-4 text-blue-500" />}           loading={summaryLoading} />
              <StatCard label="Total Scored" value={summary?.total ?? 0}      delta={null}                         color="text-foreground" icon={<Users className="h-4 w-4 text-muted-foreground" />} loading={summaryLoading} />
            </div>

            {/* Attendee list */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base">Signal Scores</CardTitle>
                  <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                    <TabsList className="h-8">
                      <TabsTrigger value="all" className="text-xs px-2 h-6">All</TabsTrigger>
                      <TabsTrigger value="hot_lead" className="text-xs px-2 h-6">🔥 Hot</TabsTrigger>
                      <TabsTrigger value="high_intent" className="text-xs px-2 h-6">📈 High</TabsTrigger>
                      <TabsTrigger value="engaged" className="text-xs px-2 h-6">⚡ Engaged</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {attendeesLoading ? (
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
                  </div>
                ) : scoredAttendees.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Flame className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No attendees match this filter.</p>
                    <p className="text-xs mt-1">Run the signals engine to score attendees.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {scoredAttendees.map((a: any) => <AttendeeCard key={a.id} a={a} />)}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Changelog */}
            {history.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Signals Engine Changelog</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {history.map((h: any, i: number) => (
                      <div key={h.id} className="px-4 py-3 flex items-start gap-3">
                        <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-medium">
                              {new Date(h.recomputedAt).toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} PT
                            </span>
                            <span className="text-xs text-muted-foreground">by {h.triggeredBy}</span>
                            {h.totalPromoted > 0 && (
                              <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">{h.totalPromoted} promoted</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-red-500" />Hot: {h.afterHotLeads} <DeltaBadge delta={h.deltaHotLeads} /></span>
                            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-orange-500" />High: {h.afterHighIntent} <DeltaBadge delta={h.deltaHighIntent} /></span>
                            <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-blue-500" />Engaged: {h.afterEngaged} <DeltaBadge delta={h.deltaEngaged} /></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
