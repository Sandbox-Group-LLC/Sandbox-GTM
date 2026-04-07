import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import {
  Users, Zap, Target, CalendarDays, Monitor,
  ArrowRight, RefreshCw, CheckCircle, AlertCircle,
} from "lucide-react";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();

  const { data: events = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/events"],
    queryFn: () => fetch("/api/events", { credentials: "include" }).then(r => r.json()),
  });

  const { data: connections = [] } = useQuery<any[]>({
    queryKey: ["/api/connections"],
    queryFn: () => fetch("/api/connections", { credentials: "include" }).then(r => r.json()),
  });

  const activeEvent = events[0];

  const { data: checkinStats } = useQuery<any>({
    queryKey: ["/api/checkin-stats", activeEvent?.id],
    queryFn: () =>
      fetch(`/api/events/${activeEvent.id}/checkin/stats?mode=program`, { credentials: "include" }).then(r => r.json()),
    enabled: !!activeEvent?.id,
  });

  const { data: interactionStats } = useQuery<any>({
    queryKey: ["/api/interaction-stats", activeEvent?.id],
    queryFn: () =>
      fetch(`/api/events/${activeEvent.id}/interactions/stats`, { credentials: "include" }).then(r => r.json()),
    enabled: !!activeEvent?.id,
  });

  const { data: moments = [] } = useQuery<any[]>({
    queryKey: ["/api/moments", activeEvent?.id],
    queryFn: () =>
      fetch(`/api/events/${activeEvent.id}/moments`, { credentials: "include" }).then(r => r.json()),
    enabled: !!activeEvent?.id,
  });

  const { data: meetingStats } = useQuery<any>({
    queryKey: ["/api/meeting-stats", activeEvent?.id],
    queryFn: () =>
      fetch(`/api/events/${activeEvent.id}/meetings/stats`, { credentials: "include" }).then(r => r.json()),
    enabled: !!activeEvent?.id,
  });

  const handleSync = async (eventId: string) => {
    try {
      await apiRequest("POST", `/api/events/${eventId}/attendees/sync`);
      toast({ title: "Sync complete", description: "Attendee roster updated from platform." });
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    }
  };

  const liveMoments = moments.filter((m: any) => m.status === "live");

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Engage</h1>
          <p className="text-xs text-muted-foreground">Event Engagement Platform</p>
        </div>
        <nav className="flex items-center gap-1">
          {[
            { href: "/check-in", label: "Check-In" },
            { href: "/moments", label: "Moments" },
            { href: "/stations", label: "Stations" },
            { href: "/meetings", label: "Meetings" },
            { href: "/connect", label: "Connect" },
          ].map(({ href, label }) => (
            <Link key={href} href={href}>
              <Button variant="ghost" size="sm">{label}</Button>
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Connection status */}
        {connections.length === 0 ? (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">No platform connected</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">Connect a registration platform to start syncing attendees.</p>
              </div>
              <Link href="/connect">
                <Button size="sm" variant="outline">Connect Now</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
            <CardContent className="flex items-center gap-3 py-4">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Connected to {connections[0]?.name}
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 capitalize">
                  {connections[0]?.adapter} · {events.length} event{events.length !== 1 ? "s" : ""} synced
                </p>
              </div>
              {activeEvent && (
                <Button size="sm" variant="outline" onClick={() => handleSync(activeEvent.id)}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sync Attendees
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active event selector hint */}
        {events.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Active event:</span>
            <Badge variant="outline" className="text-sm">{activeEvent?.name}</Badge>
          </div>
        )}

        {/* Live moments alert */}
        {liveMoments.length > 0 && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardContent className="flex items-center gap-3 py-4">
              <Zap className="h-5 w-5 text-blue-600 flex-shrink-0 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {liveMoments.length} moment{liveMoments.length !== 1 ? "s" : ""} live right now
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {liveMoments.map((m: any) => m.title).join(", ")}
                </p>
              </div>
              <Link href="/moments">
                <Button size="sm" variant="outline">Manage</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Checked In"
            value={checkinStats?.checkedIn ?? 0}
            sub={`of ${checkinStats?.totalAttendees ?? 0} registered`}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            href="/check-in"
            loading={!checkinStats && !!activeEvent}
          />
          <StatCard
            title="Interactions Today"
            value={interactionStats?.interactionsToday ?? 0}
            sub={`${interactionStats?.totalInteractions ?? 0} total`}
            icon={<Target className="h-4 w-4 text-muted-foreground" />}
            href="/check-in"
            loading={!interactionStats && !!activeEvent}
          />
          <StatCard
            title="Active Moments"
            value={liveMoments.length}
            sub={`${moments.length} total created`}
            icon={<Zap className="h-4 w-4 text-muted-foreground" />}
            href="/moments"
            loading={false}
          />
          <StatCard
            title="Meetings"
            value={meetingStats?.totalMeetings ?? 0}
            sub={`${meetingStats?.outcomesCaptured ?? 0} outcomes captured`}
            icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
            href="/meetings"
            loading={!meetingStats && !!activeEvent}
          />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { href: "/check-in", icon: <Users className="h-5 w-5" />, label: "Check-In", desc: "Program, session & lead capture" },
            { href: "/moments", icon: <Zap className="h-5 w-5" />, label: "Moments", desc: "Live polls, Q&A, pulse checks" },
            { href: "/stations", icon: <Monitor className="h-5 w-5" />, label: "Demo Stations", desc: "Configure booth & station roster" },
            { href: "/meetings", icon: <CalendarDays className="h-5 w-5" />, label: "Meetings", desc: "Schedule & track outcomes" },
          ].map(({ href, icon, label, desc }) => (
            <Link key={href} href={href}>
              <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-md bg-muted">{icon}</div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, sub, icon, href, loading }: {
  title: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  href: string;
  loading: boolean;
}) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer hover:border-primary/50 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
