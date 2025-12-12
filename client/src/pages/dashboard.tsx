import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Users, Calendar, Mic2, DollarSign, Clock, CheckCircle, AlertCircle, Plus } from "lucide-react";
import { Link } from "wouter";
import type { Attendee, EventSession, Speaker, BudgetItem, Deliverable, Milestone } from "@shared/schema";

interface DashboardStats {
  totalAttendees: number;
  totalSessions: number;
  totalSpeakers: number;
  totalBudget: number;
  spentBudget: number;
  pendingDeliverables: number;
  upcomingMilestones: Milestone[];
  recentAttendees: Attendee[];
  upcomingSessions: EventSession[];
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const budgetProgress = stats ? (stats.spentBudget / stats.totalBudget) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Dashboard" 
        breadcrumbs={[{ label: "Dashboard" }]}
        actions={
          <Button asChild size="sm" data-testid="button-new-event">
            <Link href="/events/new">
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Link>
          </Button>
        }
      />
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? (
              <>
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <StatsCard
                  title="Total Attendees"
                  value={stats?.totalAttendees || 0}
                  description="Registered attendees"
                  icon={Users}
                />
                <StatsCard
                  title="Sessions"
                  value={stats?.totalSessions || 0}
                  description="Scheduled sessions"
                  icon={Calendar}
                />
                <StatsCard
                  title="Speakers"
                  value={stats?.totalSpeakers || 0}
                  description="Confirmed speakers"
                  icon={Mic2}
                />
                <StatsCard
                  title="Pending Tasks"
                  value={stats?.pendingDeliverables || 0}
                  description="Deliverables to complete"
                  icon={CheckCircle}
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-lg">Budget Overview</CardTitle>
                  <CardDescription>Track your event spending</CardDescription>
                </div>
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-sm text-muted-foreground">Spent</p>
                        <p className="text-2xl font-semibold font-mono">
                          ${(stats?.spentBudget || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Budget</p>
                        <p className="text-2xl font-semibold font-mono">
                          ${(stats?.totalBudget || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Progress value={budgetProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {budgetProgress.toFixed(1)}% of budget used
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-lg">Upcoming Milestones</CardTitle>
                  <CardDescription>Key deadlines ahead</CardDescription>
                </div>
                <Clock className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : stats?.upcomingMilestones && stats.upcomingMilestones.length > 0 ? (
                  <div className="space-y-3">
                    {stats.upcomingMilestones.slice(0, 4).map((milestone) => (
                      <div
                        key={milestone.id}
                        className="flex items-start gap-3 p-2 rounded-md bg-muted/50"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {milestone.status === "completed" ? (
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{milestone.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {milestone.dueDate}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming milestones
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Recent Registrations</CardTitle>
                  <CardDescription>Latest attendee sign-ups</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/attendees">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : stats?.recentAttendees && stats.recentAttendees.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentAttendees.slice(0, 5).map((attendee) => (
                      <div key={attendee.id} className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                          {attendee.firstName[0]}{attendee.lastName[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {attendee.firstName} {attendee.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {attendee.company || attendee.email}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {attendee.registrationStatus}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No registrations yet
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Upcoming Sessions</CardTitle>
                  <CardDescription>Next scheduled sessions</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/sessions">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : stats?.upcomingSessions && stats.upcomingSessions.length > 0 ? (
                  <div className="space-y-3">
                    {stats.upcomingSessions.slice(0, 4).map((session) => (
                      <div
                        key={session.id}
                        className="p-3 rounded-md bg-muted/50 space-y-1"
                      >
                        <p className="text-sm font-medium">{session.title}</p>
                        <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                          <span>{session.sessionDate}</span>
                          <span>{session.startTime} - {session.endTime}</span>
                          {session.room && <span>{session.room}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No sessions scheduled
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
