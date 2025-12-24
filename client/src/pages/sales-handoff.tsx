import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HandshakeIcon, Users, Clock, CheckCircle, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Event } from "@shared/schema";

export default function SalesHandoff() {
  const [selectedEventId, setSelectedEventId] = useState<string>("all");

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Sales Handoff"
        breadcrumbs={[{ label: "Revenue & ROI" }, { label: "Sales Handoff" }]}
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
            Connect your CRM (Salesforce, HubSpot, etc.) to activate sales handoff tracking and lead routing. Contact your administrator to set up the integration.
          </AlertDescription>
        </Alert>
        
        <p className="text-muted-foreground text-sm mb-4">Manage the transition of qualified leads from programs to sales teams</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ready for Handoff</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">High-intent leads</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Handed Off</CardTitle>
              <HandshakeIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Transferred to sales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Handoff Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Time to sales contact</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--%</div>
              <p className="text-xs text-muted-foreground">Sales acceptance rate</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lead Handoff Queue</CardTitle>
            <CardDescription>Manage leads ready for sales engagement</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <HandshakeIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">Sales handoff coming soon</p>
              <p className="text-sm mt-2">Configure lead scoring and routing rules</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
