import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  UserCheck, 
  Calendar, 
  DollarSign, 
  Target,
  Mail,
  TrendingUp,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertEventSchema, type Event } from "@shared/schema";
import { z } from "zod";

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


const eventFormSchema = insertEventSchema.extend({
  name: z.string().min(1, "Event name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

export default function Dashboard() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const { toast } = useToast();

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/overview", selectedEventId],
    queryFn: async () => {
      const url = selectedEventId && selectedEventId !== "all" 
        ? `/api/analytics/overview?eventId=${selectedEventId}`
        : "/api/analytics/overview";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      location: "",
      status: "draft",
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const res = await apiRequest("POST", "/api/events", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/overview"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: EventFormValues) => {
    createEventMutation.mutate(data);
  };

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

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="GTM Overview" 
        breadcrumbs={[{ label: "Performance" }, { label: "GTM Overview" }]}
        actions={
          <div className="flex items-center gap-2">
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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon" className="sm:w-auto sm:px-3" data-testid="button-new-program">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">New Program</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Program</DialogTitle>
                  <DialogDescription>
                    Add a new program to your GTM platform.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Program Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Annual Conference 2025" {...field} data-testid="input-program-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your event..." 
                              {...field} 
                              value={field.value || ""}
                              data-testid="input-event-description" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-event-start-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-event-end-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="San Francisco, CA" 
                              {...field} 
                              value={field.value || ""}
                              data-testid="input-event-location" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                        data-testid="button-cancel-event"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createEventMutation.isPending}
                        data-testid="button-submit-event"
                      >
                        {createEventMutation.isPending ? "Creating..." : "Create Program"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <p className="text-muted-foreground text-sm">Is this program working at a glance?</p>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="w-4 h-4 text-blue-500" />
                    Acquisition
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold" data-testid="text-total-conversions">{analytics?.attendance.total || 0}</p>
                      <p className="text-sm text-muted-foreground">Total conversions</p>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <TrendingUp className="w-5 h-5" />
                      <span className="text-sm font-medium">On track</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserCheck className="w-4 h-4 text-green-500" />
                    Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold" data-testid="text-engagement-rate">{analytics?.attendance.checkInRate || 0}%</p>
                      <p className="text-sm text-muted-foreground">Check-in rate</p>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <TrendingUp className="w-5 h-5" />
                      <span className="text-sm font-medium">Healthy</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                    Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold" data-testid="text-budget-spent">${analytics?.budget.totalSpent.toLocaleString() || 0}</p>
                      <p className="text-sm text-muted-foreground">Investment to date</p>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Target className="w-5 h-5" />
                      <span className="text-sm font-medium">{analytics?.budget.utilizationRate || 0}% used</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="w-4 h-4" />
                    Program Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Execution Progress</span>
                    <div className="flex items-center gap-2">
                      <Progress value={analytics?.project.projectProgress || 0} className="w-24" />
                      <span className="text-sm font-medium" data-testid="text-project-progress">{analytics?.project.projectProgress || 0}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Deliverables Complete</span>
                    <span className="text-sm font-medium">{analytics?.project.completedDeliverables || 0} / {analytics?.project.deliverables || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">Content Experiences</span>
                    <span className="text-sm font-medium" data-testid="text-content-experiences">{analytics?.sessions.total || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Mail className="w-4 h-4" />
                    Outreach Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Email Campaigns</span>
                    <span className="text-sm font-medium" data-testid="text-total-emails">{analytics?.marketing.totalEmails || 0} total</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Sent / Scheduled</span>
                    <span className="text-sm font-medium">{analytics?.marketing.sentEmails || 0} / {analytics?.marketing.scheduledEmails || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">Contributors</span>
                    <span className="text-sm font-medium" data-testid="text-contributors">{analytics?.sessions.speakers || 0}</span>
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
