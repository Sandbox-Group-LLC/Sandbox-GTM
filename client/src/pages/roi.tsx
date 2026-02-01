import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LineChart as LineChartIcon, DollarSign, TrendingUp, Calculator, PieChart, Info, FlaskConical } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDemoMode } from "@/contexts/demo-mode-context";
import { DemoModeToggle } from "@/components/demo-mode-toggle";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from "recharts";
import type { Event } from "@shared/schema";

const DEMO_DATA = {
  totalInvestment: 156000,
  revenueGenerated: 1280000,
  roiMultiple: 8.2,
  costPerOpp: 1228,
  roiTrend: [
    { month: "Jan", roi: 4.2 },
    { month: "Feb", roi: 5.1 },
    { month: "Mar", roi: 6.8 },
    { month: "Apr", roi: 7.4 },
    { month: "May", roi: 8.2 },
    { month: "Jun", roi: 8.2 },
  ],
  programComparison: [
    { name: "AI GTM Summit", roi: 12.4, color: "hsl(var(--chart-1))" },
    { name: "Product Launch", roi: 8.6, color: "hsl(var(--chart-2))" },
    { name: "User Conference", roi: 6.2, color: "hsl(var(--chart-3))" },
    { name: "Webinar Series", roi: 4.8, color: "hsl(var(--chart-4))" },
  ],
};

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

export default function ROI() {
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const { isDemoMode } = useDemoMode();

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="ROI Reporting"
        breadcrumbs={[{ label: "Revenue & ROI" }, { label: "ROI Reporting" }]}
        actions={
          <div className="flex items-center gap-4">
            <DemoModeToggle />
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

      <div className="flex-1 overflow-auto p-6">
        {!isDemoMode && (
          <Alert className="mb-6" data-testid="alert-crm-required">
            <Info className="h-4 w-4" />
            <AlertTitle>CRM Integration Required</AlertTitle>
            <AlertDescription>
              Connect your CRM (Salesforce, HubSpot, etc.) to activate ROI calculations and revenue attribution. Toggle "Demo Data" to preview this dashboard with sample data.
            </AlertDescription>
          </Alert>
        )}

        {isDemoMode && (
          <Alert className="mb-6 border-amber-500/50 bg-amber-500/10" data-testid="alert-demo-mode">
            <FlaskConical className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-600 dark:text-amber-400">Demo Mode Active</AlertTitle>
            <AlertDescription>
              Viewing sample data. Connect your CRM to see real ROI metrics.
            </AlertDescription>
          </Alert>
        )}
        
        <p className="text-muted-foreground text-sm mb-4">Measure and report on program return on investment</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-investment">
                {isDemoMode ? formatCurrency(DEMO_DATA.totalInvestment) : "$--"}
              </div>
              <p className="text-xs text-muted-foreground">Program costs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-revenue-generated">
                {isDemoMode ? formatCurrency(DEMO_DATA.revenueGenerated) : "$--"}
              </div>
              <p className="text-xs text-muted-foreground">Attributed revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ROI Multiple</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-roi-multiple">
                {isDemoMode ? `${DEMO_DATA.roiMultiple}x` : "--x"}
              </div>
              <p className="text-xs text-muted-foreground">Revenue / Investment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost per Opp</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-cost-per-opp">
                {isDemoMode ? formatCurrency(DEMO_DATA.costPerOpp) : "$--"}
              </div>
              <p className="text-xs text-muted-foreground">Investment efficiency</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>ROI Trend</CardTitle>
              <CardDescription>Track ROI performance over time</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {isDemoMode ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={DEMO_DATA.roiTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${v}x`} />
                    <Tooltip formatter={(value: number) => [`${value}x`, "ROI"]} />
                    <Line 
                      type="monotone" 
                      dataKey="roi" 
                      stroke="hsl(var(--chart-1))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-1))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <LineChartIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>ROI trending coming soon</p>
                    <p className="text-sm mt-2">Historical ROI analysis</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Program Comparison</CardTitle>
              <CardDescription>Compare ROI across programs</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {isDemoMode ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DEMO_DATA.programComparison} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" tickFormatter={(v) => `${v}x`} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => [`${value}x`, "ROI"]} />
                    <Bar dataKey="roi" radius={[0, 4, 4, 0]}>
                      {DEMO_DATA.programComparison.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Comparison view coming soon</p>
                    <p className="text-sm mt-2">Benchmark program performance</p>
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
