import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PieChart, DollarSign, TrendingUp, Users, Info, FlaskConical } from "lucide-react";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Event } from "@shared/schema";

const DEMO_DATA = {
  pipelineCreated: 1850000,
  pipelineInfluenced: 3200000,
  opportunities: 127,
  byProgram: [
    { name: "AI GTM Summit", value: 1250000, color: "hsl(var(--chart-1))" },
    { name: "Product Launch", value: 850000, color: "hsl(var(--chart-2))" },
    { name: "User Conference", value: 620000, color: "hsl(var(--chart-3))" },
    { name: "Webinar Series", value: 480000, color: "hsl(var(--chart-4))" },
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

export default function Pipeline() {
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const { isDemoMode } = useDemoMode();

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Pipeline Influence"
        breadcrumbs={[{ label: "Revenue & ROI" }, { label: "Pipeline Influence" }]}
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
              Connect your CRM (Salesforce, HubSpot, etc.) to activate pipeline metrics and opportunity tracking. Toggle "Demo Data" to preview this dashboard with sample data.
            </AlertDescription>
          </Alert>
        )}

        {isDemoMode && (
          <Alert className="mb-6 border-amber-500/50 bg-amber-500/10" data-testid="alert-demo-mode">
            <FlaskConical className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-600 dark:text-amber-400">Demo Mode Active</AlertTitle>
            <AlertDescription>
              Viewing sample data. Connect your CRM to see real pipeline metrics.
            </AlertDescription>
          </Alert>
        )}
        
        <p className="text-muted-foreground text-sm mb-4">Track how your programs generate and influence sales pipeline</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Created</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pipeline-created">
                {isDemoMode ? formatCurrency(DEMO_DATA.pipelineCreated) : "$--"}
              </div>
              <p className="text-xs text-muted-foreground">First-touch attribution</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Influenced</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pipeline-influenced">
                {isDemoMode ? formatCurrency(DEMO_DATA.pipelineInfluenced) : "$--"}
              </div>
              <p className="text-xs text-muted-foreground">Multi-touch attribution</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-opportunities">
                {isDemoMode ? DEMO_DATA.opportunities : "--"}
              </div>
              <p className="text-xs text-muted-foreground">Audience converted to opps</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Program</CardTitle>
            <CardDescription>See which programs drive the most pipeline value</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {isDemoMode ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DEMO_DATA.byProgram} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {DEMO_DATA.byProgram.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PieChart className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">Pipeline tracking coming soon</p>
                  <p className="text-sm mt-2">Connect your CRM to track pipeline influence</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
