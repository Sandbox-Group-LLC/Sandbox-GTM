import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DollarSign, TrendingUp, PieChart, Target, Info, FlaskConical } from "lucide-react";
import { useDemoMode } from "@/contexts/demo-mode-context";
import { DemoModeToggle } from "@/components/demo-mode-toggle";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const DEMO_DATA = {
  pipelineGenerated: 2450000,
  revenueInfluenced: 1280000,
  costPerLead: 142,
  roi: 8.2,
  attribution: [
    { name: "First Touch", value: 45, color: "hsl(var(--chart-1))" },
    { name: "Multi-Touch", value: 35, color: "hsl(var(--chart-2))" },
    { name: "Last Touch", value: 20, color: "hsl(var(--chart-3))" },
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

export default function RevenueSnapshot() {
  const { isDemoMode } = useDemoMode();

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Revenue Impact" 
        breadcrumbs={[{ label: "Performance" }, { label: "Revenue Impact" }]}
        actions={<DemoModeToggle />}
      />

      <div className="flex-1 overflow-auto p-6">
        {!isDemoMode && (
          <Alert className="mb-6" data-testid="alert-crm-required">
            <Info className="h-4 w-4" />
            <AlertTitle>CRM Integration Required</AlertTitle>
            <AlertDescription>
              Connect your CRM (Salesforce, HubSpot, etc.) to activate revenue metrics and pipeline tracking. Toggle "Demo Data" to preview this dashboard with sample data.
            </AlertDescription>
          </Alert>
        )}

        {isDemoMode && (
          <Alert className="mb-6 border-amber-500/50 bg-amber-500/10" data-testid="alert-demo-mode">
            <FlaskConical className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-600 dark:text-amber-400">Demo Mode Active</AlertTitle>
            <AlertDescription>
              Viewing sample data. Connect your CRM to see real revenue metrics.
            </AlertDescription>
          </Alert>
        )}
        
        <p className="text-muted-foreground text-sm mb-6">Did this program move pipeline or revenue?</p>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Generated</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pipeline-generated">
                {isDemoMode ? formatCurrency(DEMO_DATA.pipelineGenerated) : "$--"}
              </div>
              <p className="text-xs text-muted-foreground">From program audience</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Influenced</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-revenue-influenced">
                {isDemoMode ? formatCurrency(DEMO_DATA.revenueInfluenced) : "$--"}
              </div>
              <p className="text-xs text-muted-foreground">Closed-won attribution</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost per Lead</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-cost-per-lead">
                {isDemoMode ? `$${DEMO_DATA.costPerLead}` : "$--"}
              </div>
              <p className="text-xs text-muted-foreground">Total investment / conversions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ROI</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-roi">
                {isDemoMode ? `${DEMO_DATA.roi}x` : "--x"}
              </div>
              <p className="text-xs text-muted-foreground">Return on investment</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Attribution</CardTitle>
              <CardDescription>How programs contribute to closed-won revenue</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {isDemoMode ? (
                <div className="flex h-full items-center gap-6">
                  <div className="flex-1 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={DEMO_DATA.attribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {DEMO_DATA.attribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`${value}%`, "Share"]}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--popover))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3 min-w-[140px]">
                    {DEMO_DATA.attribution.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-sm" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{entry.name}</div>
                          <div className="text-lg font-bold">{entry.value}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Attribution model coming soon</p>
                    <p className="text-sm mt-2">Connect your CRM to see revenue impact</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline Velocity</CardTitle>
              <CardDescription>Track how programs accelerate deal progression</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {isDemoMode ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg. Days to Close</span>
                    <span className="text-2xl font-bold">42</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Velocity vs. Benchmark</span>
                    <span className="text-lg font-semibold text-green-600">+18% faster</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Deals Accelerated</span>
                    <span className="text-2xl font-bold">67</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pipeline Stage Progression</span>
                    <span className="text-lg font-semibold text-blue-600">2.4 stages/mo</span>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Velocity metrics coming soon</p>
                    <p className="text-sm mt-2">Measure time-to-close impact</p>
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
