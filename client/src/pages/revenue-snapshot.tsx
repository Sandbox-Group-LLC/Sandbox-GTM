import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DollarSign, TrendingUp, PieChart, Target, Info } from "lucide-react";

export default function RevenueSnapshot() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Revenue Impact" 
        breadcrumbs={[{ label: "Performance" }, { label: "Revenue Impact" }]}
      />

      <div className="flex-1 overflow-auto p-6">
        <Alert className="mb-6" data-testid="alert-crm-required">
          <Info className="h-4 w-4" />
          <AlertTitle>CRM Integration Required</AlertTitle>
          <AlertDescription>
            Connect your CRM (Salesforce, HubSpot, etc.) to activate revenue metrics and pipeline tracking. Contact your administrator to set up the integration.
          </AlertDescription>
        </Alert>
        
        <p className="text-muted-foreground text-sm mb-6">Did this program move pipeline or revenue?</p>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Generated</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$--</div>
              <p className="text-xs text-muted-foreground">From program audience</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Influenced</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$--</div>
              <p className="text-xs text-muted-foreground">Closed-won attribution</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost per Lead</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$--</div>
              <p className="text-xs text-muted-foreground">Total investment / conversions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ROI</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--x</div>
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
            <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <PieChart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Attribution model coming soon</p>
                <p className="text-sm mt-2">Connect your CRM to see revenue impact</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline Velocity</CardTitle>
              <CardDescription>Track how programs accelerate deal progression</CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Velocity metrics coming soon</p>
                <p className="text-sm mt-2">Measure time-to-close impact</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
