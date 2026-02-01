import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Send, Clock, CheckCircle, TrendingUp, Mail, Info, FlaskConical } from "lucide-react";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from "recharts";
import type { Event } from "@shared/schema";

const DEMO_DATA = {
  followUpsSent: 342,
  responseRate: 34,
  avgResponseTime: "4.2 hrs",
  meetingsBooked: 28,
  sequences: [
    { name: "Day 1", sent: 342, opened: 245, replied: 89, color: "hsl(var(--chart-1))" },
    { name: "Day 3", sent: 253, opened: 178, replied: 52, color: "hsl(var(--chart-2))" },
    { name: "Day 7", sent: 201, opened: 134, replied: 38, color: "hsl(var(--chart-3))" },
    { name: "Day 14", sent: 163, opened: 98, replied: 21, color: "hsl(var(--chart-4))" },
  ],
  responseAnalytics: [
    { day: "Mon", responses: 24 },
    { day: "Tue", responses: 31 },
    { day: "Wed", responses: 28 },
    { day: "Thu", responses: 35 },
    { day: "Fri", responses: 22 },
    { day: "Sat", responses: 8 },
    { day: "Sun", responses: 5 },
  ],
};

export default function FollowUp() {
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const { isDemoMode } = useDemoMode();

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Follow-Up Performance"
        breadcrumbs={[{ label: "Revenue & ROI" }, { label: "Follow-Up Performance" }]}
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
              Connect your CRM (Salesforce, HubSpot, etc.) to activate follow-up tracking and response metrics. Toggle "Demo Data" to preview this dashboard with sample data.
            </AlertDescription>
          </Alert>
        )}

        {isDemoMode && (
          <Alert className="mb-6 border-amber-500/50 bg-amber-500/10" data-testid="alert-demo-mode">
            <FlaskConical className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-600 dark:text-amber-400">Demo Mode Active</AlertTitle>
            <AlertDescription>
              Viewing sample data. Connect your CRM to see real follow-up metrics.
            </AlertDescription>
          </Alert>
        )}
        
        <p className="text-muted-foreground text-sm mb-4">Track post-program engagement and follow-up effectiveness</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Follow-Ups Sent</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-follow-ups-sent">
                {isDemoMode ? DEMO_DATA.followUpsSent : "--"}
              </div>
              <p className="text-xs text-muted-foreground">Total outreach attempts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-response-rate">
                {isDemoMode ? `${DEMO_DATA.responseRate}%` : "--%"}
              </div>
              <p className="text-xs text-muted-foreground">Reply rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-avg-response-time">
                {isDemoMode ? DEMO_DATA.avgResponseTime : "--"}
              </div>
              <p className="text-xs text-muted-foreground">Time to first response</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meetings Booked</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" data-testid="text-meetings-booked">
                {isDemoMode ? DEMO_DATA.meetingsBooked : "--"}
              </div>
              <p className="text-xs text-muted-foreground">From follow-up outreach</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Follow-Up Sequences</CardTitle>
              <CardDescription>Track automated post-program engagement</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {isDemoMode ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DEMO_DATA.sequences}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sent" name="Sent" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="opened" name="Opened" fill="hsl(var(--chart-2))" />
                    <Bar dataKey="replied" name="Replied" fill="hsl(var(--chart-3))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Sequence tracking coming soon</p>
                    <p className="text-sm mt-2">Connect your outreach tools</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Response Analytics</CardTitle>
              <CardDescription>Understand what drives engagement</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {isDemoMode ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={DEMO_DATA.responseAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="responses" 
                      stroke="hsl(var(--chart-1))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-1))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Analytics coming soon</p>
                    <p className="text-sm mt-2">Optimize your follow-up strategy</p>
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
