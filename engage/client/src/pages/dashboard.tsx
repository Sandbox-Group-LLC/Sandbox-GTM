import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import {
  Users, Zap, Target, CalendarDays, Monitor,
  ArrowRight, RefreshCw, CheckCircle, AlertCircle,
  Menu, X, Plug,
} from "lucide-react";
import { apiRequest, fetchJSON } from "../lib/queryClient";
import { useActiveEvent } from "../hooks/use-active-event";
import { useToast } from "../hooks/use-toast";

const NAV_LINKS = [
  { href: "/check-in",  label: "Check-In" },
  { href: "/moments",   label: "Moments" },
  { href: "/stations",  label: "Stations" },
  { href: "/meetings",  label: "Meetings" },
  { href: "/leads",     label: "Leads" },
  { href: "/connect",   label: "Connect" },
];

function EventBadge() {
  const { eventName, hasEvent } = useActiveEvent();
  if (!hasEvent) return <p className="text-xs text-muted-foreground">Event Engagement Platform</p>;
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{eventName}</p>
    </div>
  );
}

export function AppHeader() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  return (
    <header className="border-b px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <Link href="/">
          <div className="cursor-pointer">
            <h1 className="text-lg font-semibold tracking-tight leading-none">Engage</h1>
            <EventBadge />
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href}>
              <Button
                variant={location === href ? "secondary" : "ghost"}
                size="sm"
              >
                {label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav className="md:hidden mt-3 pb-1 flex flex-col gap-1 border-t pt-3">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href}>
              <button
                onClick={() => setOpen(false)}
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                  ${location === href
                    ? "bg-secondary text-secondary-foreground"
                    : "hover:bg-muted text-foreground"}`}
              >
                {label}
              </button>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export default function Dashboard() {
  const { toast } = useToast();

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
    queryFn: () => fetchJSON("/api/events"),
  });

  const { data: connections = [] } = useQuery<any[]>({
    queryKey: ["/api/connections"],
    queryFn: () => fetchJSON("/api/connections"),
  });

  const activeEvent = events[0];

  const { data: checkinStats } = useQuery<any>({
    queryKey: ["/api/checkin-stats", activeEvent?.id],
    queryFn: () => fetchJSON(`/api/events/${activeEvent.id}/checkin/stats?mode=program`),
    enabled: !!activeEvent?.id,
  });

  const { data: interactionStats } = useQuery<any>({
    queryKey: ["/api/interaction-stats", activeEvent?.id],
    queryFn: () => fetchJSON(`/api/events/${activeEvent.id}/interactions/stats`),
    enabled: !!activeEvent?.id,
  });

  const { data: moments = [] } = useQuery<any[]>({
    queryKey: ["/api/moments", activeEvent?.id],
    queryFn: () => fetchJSON(`/api/events/${activeEvent.id}/moments`),
    enabled: !!activeEvent?.id,
  });

  const { data: meetingStats } = useQuery<any>({
    queryKey: ["/api/meeting-stats", activeEvent?.id],
    queryFn: () => fetchJSON(`/api/events/${activeEvent.id}/meetings/stats`),
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

  const liveMoments = (moments as any[]).filter((m: any) => m.status === "live");

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />

      <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-4 sm:space-y-6">
        {/* Connection status */}
        {connections.length === 0 ? (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">No platform connected</p>
                <p className="text-xs text-muted-foreground">Connect a registration platform to start syncing.</p>
              </div>
              <Link href="/connect"><Button size="sm" variant="outline"><Plug className="h-3 w-3 mr-1" />Connect</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="flex items-center gap-3 py-4">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{connections[0]?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{connections[0]?.adapter} · {events.length} event{events.length !== 1 ? "s" : ""}</p>
              </div>
              {activeEvent && (
                <Button size="sm" variant="outline" onClick={() => handleSync(activeEvent.id)}>
                  <RefreshCw className="h-3 w-3 mr-1" />Sync
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {events.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Active event:</span>
            <Badge variant="outline" className="text-xs">{activeEvent?.name}</Badge>
          </div>
        )}

        {liveMoments.length > 0 && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="flex items-center gap-3 py-4">
              <Zap className="h-5 w-5 text-blue-600 flex-shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{liveMoments.length} moment{liveMoments.length !== 1 ? "s" : ""} live</p>
                <p className="text-xs text-muted-foreground truncate">{liveMoments.map((m: any) => m.title).join(", ")}</p>
              </div>
              <Link href="/moments"><Button size="sm" variant="outline">Manage</Button></Link>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="Checked In"        value={checkinStats?.checkedIn ?? 0}            sub={`of ${checkinStats?.totalAttendees ?? 0}`}          icon={<Users className="h-4 w-4 text-muted-foreground" />}      href="/check-in" loading={!checkinStats && !!activeEvent} />
          <StatCard title="Interactions"      value={interactionStats?.interactionsToday ?? 0} sub={`${interactionStats?.totalInteractions ?? 0} total`} icon={<Target className="h-4 w-4 text-muted-foreground" />}     href="/check-in" loading={!interactionStats && !!activeEvent} />
          <StatCard title="Live Moments"      value={liveMoments.length}                       sub={`${moments.length} total`}                          icon={<Zap className="h-4 w-4 text-muted-foreground" />}        href="/moments"  loading={false} />
          <StatCard title="Meetings"          value={meetingStats?.totalMeetings ?? 0}         sub={`${meetingStats?.outcomesCaptured ?? 0} outcomes`}  icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />} href="/meetings" loading={!meetingStats && !!activeEvent} />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { href: "/check-in",  icon: <Users className="h-5 w-5" />,       label: "Check-In",     desc: "Program, session & lead" },
            { href: "/moments",   icon: <Zap className="h-5 w-5" />,         label: "Moments",      desc: "Live polls & Q&A" },
            { href: "/stations",  icon: <Monitor className="h-5 w-5" />,     label: "Stations",     desc: "Demo booth roster" },
            { href: "/meetings",  icon: <CalendarDays className="h-5 w-5" />, label: "Meetings",     desc: "Schedule & outcomes" },
          ].map(({ href, icon, label, desc }) => (
            <Link key={href} href={href}>
              <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
                <CardContent className="p-3 sm:p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="p-1.5 sm:p-2 rounded-md bg-muted">{icon}</div>
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
  title: string; value: number; sub: string;
  icon: React.ReactNode; href: string; loading: boolean;
}) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer hover:border-primary/50 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-3 sm:p-6 sm:pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          {loading ? <Skeleton className="h-7 w-12" /> : <p className="text-xl sm:text-2xl font-bold">{value.toLocaleString()}</p>}
          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
