import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LineChart, DollarSign, TrendingUp, Calculator, PieChart, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Event } from "@shared/schema";

export default function ROI() {
  const [selectedEventId, setSelectedEventId] = useState<string>("all");

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="ROI Reporting"
        breadcrumbs={[{ label: "Revenue & ROI" }, { label: "ROI Reporting" }]}
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

      <div className="flex-1 overflow-auto p-6">
        <Alert className="mb-6" data-testid="alert-crm-required">
          <Info className="h-4 w-4" />
          <AlertTitle>CRM Integration Required</AlertTitle>
          <AlertDescription>
            Connect your CRM (Salesforce, HubSpot, etc.) to activate ROI calculations and revenue attribution. Contact your administrator to set up the integration.
          </AlertDescription>
        </Alert>
        
        <p className="text-muted-foreground text-sm mb-4">Measure and report on program return on investment</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$--</div>
              <p className="text-xs text-muted-foreground">Program costs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$--</div>
              <p className="text-xs text-muted-foreground">Attributed revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ROI Multiple</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--x</div>
              <p className="text-xs text-muted-foreground">Revenue / Investment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost per Opp</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$--</div>
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
            <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <LineChart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>ROI trending coming soon</p>
                <p className="text-sm mt-2">Historical ROI analysis</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Program Comparison</CardTitle>
              <CardDescription>Compare ROI across programs</CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <PieChart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Comparison view coming soon</p>
                <p className="text-sm mt-2">Benchmark program performance</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
