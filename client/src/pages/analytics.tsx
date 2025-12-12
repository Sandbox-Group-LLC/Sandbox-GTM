import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  UserCheck, 
  Calendar, 
  Mic, 
  DollarSign, 
  CheckSquare, 
  Target,
  Mail,
  Share2,
  TrendingUp,
  PieChart,
  BarChart3
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

interface AnalyticsData {
  attendance: {
    total: number;
    checkedIn: number;
    checkInRate: number;
    statusBreakdown: Record<string, number>;
    registrationsByDate: Record<string, number>;
  };
  sessions: {
    total: number;
    speakers: number;
  };
  budget: {
    totalPlanned: number;
    totalSpent: number;
    budgetRemaining: number;
    utilizationRate: number;
  };
  project: {
    deliverables: number;
    completedDeliverables: number;
    milestones: number;
    completedMilestones: number;
    projectProgress: number;
  };
  marketing: {
    totalEmails: number;
    sentEmails: number;
    scheduledEmails: number;
    totalPosts: number;
    publishedPosts: number;
    scheduledPosts: number;
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Analytics() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/overview"],
  });

  const registrationChartData = analytics?.attendance.registrationsByDate
    ? Object.entries(analytics.attendance.registrationsByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([date, count]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          registrations: count,
        }))
    : [];

  const statusChartData = analytics?.attendance.statusBreakdown
    ? Object.entries(analytics.attendance.statusBreakdown).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
      }))
    : [];

  const budgetChartData = analytics
    ? [
        { name: 'Spent', value: analytics.budget.totalSpent },
        { name: 'Remaining', value: analytics.budget.budgetRemaining },
      ]
    : [];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Analytics & Reporting"
        breadcrumbs={[{ label: "Analytics" }]}
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Registrations</p>
                      <p className="text-2xl font-semibold" data-testid="text-total-registrations">{analytics?.attendance.total || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                      <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Check-in Rate</p>
                      <p className="text-2xl font-semibold" data-testid="text-checkin-rate">{analytics?.attendance.checkInRate || 0}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900/30">
                      <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sessions</p>
                      <p className="text-2xl font-semibold" data-testid="text-total-sessions">{analytics?.sessions.total || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900/30">
                      <Mic className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Speakers</p>
                      <p className="text-2xl font-semibold" data-testid="text-total-speakers">{analytics?.sessions.speakers || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="w-4 h-4" />
                    Registration Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {registrationChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={registrationChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                        <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                        <Tooltip />
                        <Line type="monotone" dataKey="registrations" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No registration data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PieChart className="w-4 h-4" />
                    Registration Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {statusChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPie>
                        <Pie
                          data={statusChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {statusChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No status data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <DollarSign className="w-4 h-4" />
                    Budget Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Budget Utilization</span>
                      <span className="font-medium" data-testid="text-budget-util">{analytics?.budget.utilizationRate || 0}%</span>
                    </div>
                    <Progress value={analytics?.budget.utilizationRate || 0} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Planned</p>
                      <p className="text-lg font-semibold" data-testid="text-budget-planned">${analytics?.budget.totalPlanned.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Spent</p>
                      <p className="text-lg font-semibold" data-testid="text-budget-spent">${analytics?.budget.totalSpent.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="w-4 h-4" />
                    Project Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Overall Progress</span>
                      <span className="font-medium" data-testid="text-project-progress">{analytics?.project.projectProgress || 0}%</span>
                    </div>
                    <Progress value={analytics?.project.projectProgress || 0} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Deliverables</p>
                      <p className="text-lg font-semibold">{analytics?.project.completedDeliverables || 0}/{analytics?.project.deliverables || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Milestones</p>
                      <p className="text-lg font-semibold">{analytics?.project.completedMilestones || 0}/{analytics?.project.milestones || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="w-4 h-4" />
                    Marketing Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                    <Mail className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Email Campaigns</p>
                      <p className="text-xs text-muted-foreground">
                        {analytics?.marketing.sentEmails || 0} sent, {analytics?.marketing.scheduledEmails || 0} scheduled
                      </p>
                    </div>
                    <span className="text-lg font-semibold" data-testid="text-total-emails">{analytics?.marketing.totalEmails || 0}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                    <Share2 className="w-5 h-5 text-purple-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Social Posts</p>
                      <p className="text-xs text-muted-foreground">
                        {analytics?.marketing.publishedPosts || 0} published, {analytics?.marketing.scheduledPosts || 0} scheduled
                      </p>
                    </div>
                    <span className="text-lg font-semibold" data-testid="text-total-posts">{analytics?.marketing.totalPosts || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
