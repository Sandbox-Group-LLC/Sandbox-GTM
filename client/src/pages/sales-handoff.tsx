import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HandshakeIcon, Users, Clock, CheckCircle, Info, FlaskConical } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { Event } from "@shared/schema";

const DEMO_DATA = {
  readyForHandoff: 47,
  handedOff: 89,
  avgHandoffTime: "2.4 hrs",
  acceptanceRate: 78,
  queue: [
    { id: 1, name: "Sarah Johnson", company: "Acme Corp", score: 92, signal: "Demo Request", status: "ready" },
    { id: 2, name: "Mike Chen", company: "TechFlow Inc", score: 88, signal: "Pricing Page", status: "ready" },
    { id: 3, name: "Emily Davis", company: "Growth Labs", score: 85, signal: "Case Study", status: "ready" },
    { id: 4, name: "Alex Thompson", company: "DataSync", score: 82, signal: "Product Tour", status: "pending" },
    { id: 5, name: "Jordan Lee", company: "CloudScale", score: 79, signal: "Webinar Attended", status: "pending" },
  ],
};

export default function SalesHandoff() {
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const { isDemoMode } = useDemoMode();

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Sales Handoff"
        breadcrumbs={[{ label: "Revenue & ROI" }, { label: "Sales Handoff" }]}
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
              Connect your CRM (Salesforce, HubSpot, etc.) to activate sales handoff tracking and lead routing. Toggle "Demo Data" to preview this dashboard with sample data.
            </AlertDescription>
          </Alert>
        )}

        {isDemoMode && (
          <Alert className="mb-6 border-amber-500/50 bg-amber-500/10" data-testid="alert-demo-mode">
            <FlaskConical className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-600 dark:text-amber-400">Demo Mode Active</AlertTitle>
            <AlertDescription>
              Viewing sample data. Connect your CRM to see real handoff metrics.
            </AlertDescription>
          </Alert>
        )}
        
        <p className="text-muted-foreground text-sm mb-4">Manage the transition of qualified leads from programs to sales teams</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ready for Handoff</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600" data-testid="text-ready-for-handoff">
                {isDemoMode ? DEMO_DATA.readyForHandoff : "--"}
              </div>
              <p className="text-xs text-muted-foreground">High-intent leads</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Handed Off</CardTitle>
              <HandshakeIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-handed-off">
                {isDemoMode ? DEMO_DATA.handedOff : "--"}
              </div>
              <p className="text-xs text-muted-foreground">Transferred to sales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Handoff Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-avg-handoff-time">
                {isDemoMode ? DEMO_DATA.avgHandoffTime : "--"}
              </div>
              <p className="text-xs text-muted-foreground">Time to sales contact</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accepted</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-acceptance-rate">
                {isDemoMode ? `${DEMO_DATA.acceptanceRate}%` : "--%"}
              </div>
              <p className="text-xs text-muted-foreground">Sales acceptance rate</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lead Handoff Queue</CardTitle>
            <CardDescription>Manage leads ready for sales engagement</CardDescription>
          </CardHeader>
          <CardContent>
            {isDemoMode ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Intent Score</TableHead>
                    <TableHead>Signal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DEMO_DATA.queue.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>{lead.company}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full" 
                              style={{ width: `${lead.score}%` }}
                            />
                          </div>
                          <span className="text-sm">{lead.score}</span>
                        </div>
                      </TableCell>
                      <TableCell>{lead.signal}</TableCell>
                      <TableCell>
                        <Badge variant={lead.status === "ready" ? "default" : "secondary"}>
                          {lead.status === "ready" ? "Ready" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant={lead.status === "ready" ? "default" : "outline"}>
                          {lead.status === "ready" ? "Hand Off" : "Review"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <HandshakeIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">Sales handoff coming soon</p>
                  <p className="text-sm mt-2">Configure lead scoring and routing rules</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
