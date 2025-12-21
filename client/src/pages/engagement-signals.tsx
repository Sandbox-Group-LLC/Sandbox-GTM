import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Zap, Flame, Users, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Event } from "@shared/schema";

interface ActiveVisitor {
  eventId: string;
  eventName: string;
  pageType: string;
  activeVisitors: number;
}

export default function EngagementSignals() {
  const [selectedEventId, setSelectedEventId] = useState<string>("all");

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: activeVisitors, isLoading } = useQuery<ActiveVisitor[]>({
    queryKey: ["/api/analytics/active-visitors", selectedEventId],
    refetchInterval: 30000, // Refresh every 30 seconds
    queryFn: async () => {
      const url = selectedEventId && selectedEventId !== "all"
        ? `/api/analytics/active-visitors?eventId=${selectedEventId}`
        : "/api/analytics/active-visitors";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch active visitors");
      return res.json();
    },
  });

  // Calculate total active visitors
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
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold">--%</p>
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
              <div className="flex items-center justify-between">
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
              <div className="flex items-center justify-between">
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
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
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
      </div>
    </div>
  );
}
