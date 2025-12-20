import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Target, BarChart3, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface AcquisitionMetrics {
  uniqueVisitors: number;
  registrations: number;
  conversionRate: number;
  topSource: string | null;
}

export default function Acquisition() {
  const { data: metrics, isLoading } = useQuery<AcquisitionMetrics>({
    queryKey: ["/api/analytics/acquisition"],
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Acquisition Health" 
        breadcrumbs={[{ label: "Performance" }, { label: "Acquisition Health" }]}
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
              <p className="text-xs text-muted-foreground">Page views to registrations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ICP Match Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--%</div>
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
              <p className="text-xs text-muted-foreground">Registered attendees</p>
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
              <CardDescription>Which channels drive the highest quality audience</CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Channel breakdown coming soon</p>
                <p className="text-sm mt-2">Email, social, paid, partner, and direct traffic</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
