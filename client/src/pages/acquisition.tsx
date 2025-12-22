import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Target, BarChart3, Filter, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { titleCase } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Event } from "@shared/schema";

interface ICPMatchMetrics {
  icpMatchRate: number;
  totalAttendees: number;
  matchedAttendees: number;
  breakdown: {
    companyTypeMatch: number;
    roleMatch: number;
    functionMatch: number;
  };
}

interface AcquisitionMetrics {
  uniqueVisitors: number;
  registrations: number;
  conversionRate: number;
  topSource: string | null;
  channelBreakdown: Array<{ channel: string; visits: number }>;
}

export default function Acquisition() {
  const [selectedEventId, setSelectedEventId] = useState<string>("all");

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: metrics, isLoading } = useQuery<AcquisitionMetrics>({
    queryKey: ["/api/analytics/acquisition", selectedEventId],
    queryFn: async () => {
      const url = selectedEventId && selectedEventId !== "all"
        ? `/api/analytics/acquisition?eventId=${selectedEventId}`
        : "/api/analytics/acquisition";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch acquisition metrics");
      return res.json();
    },
  });

  const { data: icpMetrics, isLoading: icpLoading } = useQuery<ICPMatchMetrics>({
    queryKey: ["/api/analytics/icp-match", selectedEventId],
    queryFn: async () => {
      const url = selectedEventId && selectedEventId !== "all"
        ? `/api/analytics/icp-match?eventId=${selectedEventId}`
        : "/api/analytics/icp-match";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch ICP match metrics");
      return res.json();
    },
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Acquisition Health" 
        breadcrumbs={[{ label: "Performance" }, { label: "Acquisition Health" }]}
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
      <div className="flex-1 overflow-auto p-6">
        <p className="text-muted-foreground text-sm mb-6">Are we attracting the right audience from the right channels?</p>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-conversion-rate">
                  {metrics?.uniqueVisitors && metrics.uniqueVisitors > 0 
                    ? `${metrics.conversionRate}%` 
                    : "--%"}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Tracked link clicks to registrations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                ICP Match Rate
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">
                    <div className="space-y-1 text-xs">
                      <p className="font-medium">Breakdown:</p>
                      <p>Company Type: {icpMetrics?.breakdown?.companyTypeMatch ?? 0}% match</p>
                      <p>Role: {icpMetrics?.breakdown?.roleMatch ?? 0}% match</p>
                      <p>Function: {icpMetrics?.breakdown?.functionMatch ?? 0}% match</p>
                      <p className="text-muted-foreground pt-1">
                        {icpMetrics?.matchedAttendees ?? 0} of {icpMetrics?.totalAttendees ?? 0} attendees match ICP criteria
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {icpLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-icp-match-rate">
                  {icpMetrics?.totalAttendees && icpMetrics.totalAttendees > 0 
                    ? `${icpMetrics.icpMatchRate}%` 
                    : "--%"}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Audience quality score</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Qualified Audience</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-qualified-audience">
                  {metrics?.registrations ?? "--"}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Confirmed registrations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Source Attribution</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-top-source">
                  {metrics?.topSource || "--"}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Top performing channel</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Acquisition Funnel</CardTitle>
              <CardDescription>Track your audience journey from awareness to registration conversion</CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Funnel visualization coming soon</p>
                <p className="text-sm mt-2">Connect marketing tools to track conversion stages</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Channel Performance</CardTitle>
              <CardDescription>Landing page visits by source (Organic = no tracking attribution)</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : metrics?.channelBreakdown && metrics.channelBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={metrics.channelBreakdown.map(item => ({
                      ...item,
                      channel: titleCase(item.channel)
                    }))} 
                    layout="vertical" 
                    margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                    barCategoryGap="20%"
                  >
                    <XAxis 
                      type="number" 
                      allowDecimals={false} 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="channel" 
                      width={72}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 13, fill: 'hsl(var(--foreground))' }}
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => [value.toLocaleString(), "Visits"]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        padding: '8px 12px'
                      }}
                      labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                      cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                    />
                    <Bar dataKey="visits" radius={[0, 6, 6, 0]} maxBarSize={32}>
                      {metrics.channelBreakdown.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.4)'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No channel data yet</p>
                    <p className="text-sm mt-2">Create activation links to track channel performance</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
