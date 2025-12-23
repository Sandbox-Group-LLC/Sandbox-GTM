import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ClipboardList,
  CalendarIcon,
  Check,
  X,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EventSelectField } from "@/components/event-select-field";
import { cn } from "@/lib/utils";
import type { SponsorTask, Event, EventSponsor, SponsorTaskCompletion } from "@shared/schema";
import { Loader2, Send } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";

const taskFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  taskType: z.string().min(1, "Task type is required"),
  isRequired: z.boolean().default(false),
  dueDate: z.string().optional(),
  displayOrder: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

const taskTypeLabels: Record<string, string> = {
  company_info: "Company Info",
  logo_upload: "Logo Upload",
  social_links: "Social Links",
  bio: "Bio",
  custom: "Custom",
  document_upload: "Document Upload",
};

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  submitted: "secondary",
  approved: "default",
  rejected: "destructive",
};

interface PreviewData {
  completion: SponsorTaskCompletion;
  task: SponsorTask;
  sponsor: EventSponsor;
}

interface ImageMetadata {
  width: number;
  height: number;
  size?: number;
  type?: string;
  dpi?: number;
}

export default function SponsorTasks() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTask, setEditingTask] = useState<SponsorTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<SponsorTask | null>(null);
  const [viewingTaskCompletions, setViewingTaskCompletions] = useState<SponsorTask | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [rejectingCompletion, setRejectingCompletion] = useState<{
    completion: SponsorTaskCompletion;
    task: SponsorTask;
    sponsor: EventSponsor;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: tasks = [], isLoading } = useQuery<SponsorTask[]>({
    queryKey: ["/api/events", selectedEventId, "sponsor-tasks"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${selectedEventId}/sponsor-tasks`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sponsor tasks");
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const { data: sponsors = [] } = useQuery<EventSponsor[]>({
    queryKey: ["/api/events", selectedEventId, "sponsors"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${selectedEventId}/sponsors`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sponsors");
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const { data: completions = [] } = useQuery<SponsorTaskCompletion[]>({
    queryKey: ["/api/events", selectedEventId, "sponsor-task-completions"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${selectedEventId}/sponsor-task-completions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch task completions");
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      eventId: "",
      name: "",
      description: "",
      taskType: "company_info",
      isRequired: false,
      dueDate: "",
      displayOrder: 0,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      return await apiRequest("POST", `/api/events/${data.eventId}/sponsor-tasks`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", variables.eventId, "sponsor-tasks"] });
      toast({ title: "Task created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TaskFormData }) => {
      return await apiRequest("PATCH", `/api/sponsor-tasks/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", variables.data.eventId, "sponsor-tasks"] });
      toast({ title: "Task updated successfully" });
      setIsDialogOpen(false);
      setEditingTask(null);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/sponsor-tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "sponsor-tasks"] });
      toast({ title: "Task deleted successfully" });
      setDeletingTask(null);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateCompletionStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/task-completions/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "sponsor-task-completions"] });
      toast({ title: "Status updated successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectWithReasonMutation = useMutation({
    mutationFn: async ({ id, reviewNotes, sendEmail }: { id: string; reviewNotes: string; sendEmail: boolean }) => {
      return await apiRequest("PATCH", `/api/task-completions/${id}`, { 
        status: "rejected", 
        reviewNotes,
        sendRejectionEmail: sendEmail 
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "sponsor-task-completions"] });
      toast({ 
        title: "Task rejected", 
        description: variables.sendEmail ? "The sponsor has been notified via email." : "Task has been rejected." 
      });
      setRejectingCompletion(null);
      setRejectReason("");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: TaskFormData) => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (task: SponsorTask) => {
    setEditingTask(task);
    form.reset({
      eventId: task.eventId,
      name: task.name,
      description: task.description || "",
      taskType: task.taskType,
      isRequired: task.isRequired || false,
      dueDate: task.dueDate || "",
      displayOrder: task.displayOrder || 0,
      isActive: task.isActive !== false,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTask(null);
    form.reset();
  };

  const getEventName = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    return event?.name || "Unknown Event";
  };

  const getSponsorName = (sponsorId: string) => {
    const sponsor = sponsors.find(s => s.id === sponsorId);
    return sponsor?.name || "Unknown Sponsor";
  };

  const getTaskCompletions = (taskId: string) => {
    return completions.filter(c => c.taskId === taskId);
  };

  const getSponsorsForEvent = (eventId: string) => {
    return sponsors.filter(s => s.eventId === eventId);
  };

  const loadImageMetadata = async (url: string): Promise<ImageMetadata> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        const metadata: ImageMetadata = {
          width: img.naturalWidth,
          height: img.naturalHeight,
        };
        
        // Try to get file size and type via fetch
        try {
          const response = await fetch(url, { method: 'HEAD' });
          const contentLength = response.headers.get('content-length');
          const contentType = response.headers.get('content-type');
          if (contentLength) {
            metadata.size = parseInt(contentLength, 10);
          }
          if (contentType) {
            metadata.type = contentType;
          }
        } catch {
          // If HEAD request fails, try GET for metadata
          try {
            const response = await fetch(url);
            const blob = await response.blob();
            metadata.size = blob.size;
            metadata.type = blob.type;
          } catch {
            // Ignore fetch errors
          }
        }
        
        resolve(metadata);
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
      img.src = url;
    });
  };

  const handleOpenPreview = async (completion: SponsorTaskCompletion, task: SponsorTask, sponsor: EventSponsor) => {
    setPreviewData({ completion, task, sponsor });
    setImageMetadata(null);
    
    // If it's a logo upload, try to load image metadata
    if (task.taskType === "logo_upload") {
      const submittedData = completion.submittedData as Record<string, unknown> | undefined;
      const logoUrl = submittedData?.logoUrl as string | undefined;
      if (logoUrl) {
        setLoadingMetadata(true);
        const metadata = await loadImageMetadata(logoUrl);
        setImageMetadata(metadata);
        setLoadingMetadata(false);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const filteredTasks = tasks.filter((task) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      task.name.toLowerCase().includes(searchLower) ||
      (task.description?.toLowerCase().includes(searchLower) ?? false) ||
      taskTypeLabels[task.taskType]?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Sponsor Tasks"
        breadcrumbs={[{ label: "Programs", href: "/events" }, { label: "Sponsor Tasks" }]}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleDialogClose()}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-task">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTask ? "Edit Task" : "Add New Task"}</DialogTitle>
                <DialogDescription>
                  {editingTask ? "Update task details" : "Create a new task for sponsors to complete"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <EventSelectField control={form.control} />
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Submit Company Logo" data-testid="input-name" />
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
                            {...field} 
                            rows={3}
                            placeholder="Describe what the sponsor needs to do..."
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taskType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-type">
                              <SelectValue placeholder="Select task type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="company_info">Company Info</SelectItem>
                            <SelectItem value="logo_upload">Logo Upload</SelectItem>
                            <SelectItem value="social_links">Social Links</SelectItem>
                            <SelectItem value="bio">Bio</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                            <SelectItem value="document_upload">Document Upload</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Due Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="input-due-date"
                                >
                                  {field.value ? format(new Date(field.value), "PPP") : "Pick a date"}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="displayOrder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Order</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0} 
                              {...field} 
                              data-testid="input-display-order"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-6">
                    <FormField
                      control={form.control}
                      name="isRequired"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-is-required"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Required</FormLabel>
                            <FormDescription>
                              Sponsors must complete this task
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-is-active"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Active</FormLabel>
                            <FormDescription>
                              Task is visible to sponsors
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit-task"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? "Saving..."
                        : editingTask
                        ? "Update"
                        : "Create Task"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-[250px]" data-testid="select-event-filter">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
          </div>

          {!selectedEventId ? (
            <EmptyState
              icon={ClipboardList}
              title="Select an event"
              description="Choose an event from the dropdown above to view its sponsor tasks"
            />
          ) : isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No sponsor tasks yet"
              description="Create tasks for sponsors to complete before and during your event"
              action={{
                label: "Add Task",
                onClick: () => setIsDialogOpen(true),
              }}
            />
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {filteredTasks.map((task) => {
                const taskCompletions = getTaskCompletions(task.id);
                const eventSponsors = getSponsorsForEvent(task.eventId);
                const completedCount = taskCompletions.filter(c => c.status === "approved").length;

                return (
                  <AccordionItem key={task.id} value={task.id} className="border rounded-lg">
                    <Card className="border-0 shadow-none">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline [&[data-state=open]>div>.chevron]:rotate-180">
                        <div className="flex items-center justify-between w-full gap-4 pr-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="text-left min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium" data-testid={`text-task-name-${task.id}`}>
                                  {task.name}
                                </span>
                                <Badge variant="secondary">
                                  {taskTypeLabels[task.taskType] || task.taskType}
                                </Badge>
                                {task.isRequired && (
                                  <Badge variant="default">Required</Badge>
                                )}
                                {!task.isActive && (
                                  <Badge variant="outline">Inactive</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {getEventName(task.eventId)} 
                                {task.dueDate && (
                                  <span className="ml-2">
                                    Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {completedCount}/{eventSponsors.length} completed
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(task);
                              }}
                              data-testid={`button-edit-task-${task.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingTask(task);
                              }}
                              data-testid={`button-delete-task-${task.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="px-6 pb-4">
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-4">{task.description}</p>
                          )}
                          
                          <div className="border rounded-md">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Sponsor</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Completed</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {eventSponsors.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                      No sponsors for this event
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  eventSponsors.map((sponsor) => {
                                    const completion = taskCompletions.find(c => c.sponsorId === sponsor.id);
                                    const status = completion?.status || "pending";
                                    
                                    return (
                                      <TableRow key={sponsor.id} data-testid={`row-completion-${sponsor.id}`}>
                                        <TableCell className="font-medium">{sponsor.name}</TableCell>
                                        <TableCell>
                                          <Badge variant={statusColors[status]}>
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          {completion?.completedAt 
                                            ? format(new Date(completion.completedAt), "MMM d, yyyy")
                                            : "-"
                                          }
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {status === "submitted" && completion && (
                                            <div className="flex justify-end gap-1">
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleOpenPreview(completion, task, sponsor)}
                                                data-testid={`button-preview-${sponsor.id}`}
                                              >
                                                <Eye className="h-4 w-4 mr-1" />
                                                Preview
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => updateCompletionStatusMutation.mutate({ 
                                                  id: completion.id, 
                                                  status: "approved" 
                                                })}
                                                disabled={updateCompletionStatusMutation.isPending}
                                                data-testid={`button-approve-${sponsor.id}`}
                                              >
                                                <Check className="h-4 w-4 mr-1" />
                                                Approve
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                  setRejectingCompletion({ completion, task, sponsor });
                                                  setRejectReason("");
                                                }}
                                                data-testid={`button-reject-${sponsor.id}`}
                                              >
                                                <X className="h-4 w-4 mr-1" />
                                                Reject
                                              </Button>
                                            </div>
                                          )}
                                          {status === "approved" && completion && (
                                            <div className="flex justify-end gap-1">
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleOpenPreview(completion, task, sponsor)}
                                                data-testid={`button-preview-approved-${sponsor.id}`}
                                              >
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => updateCompletionStatusMutation.mutate({ 
                                                  id: completion.id, 
                                                  status: "submitted" 
                                                })}
                                                disabled={updateCompletionStatusMutation.isPending}
                                                data-testid={`button-unapprove-${sponsor.id}`}
                                              >
                                                <X className="h-4 w-4 mr-1" />
                                                Unapprove
                                              </Button>
                                            </div>
                                          )}
                                          {status === "rejected" && completion && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => updateCompletionStatusMutation.mutate({ 
                                                id: completion.id, 
                                                status: "pending" 
                                              })}
                                              disabled={updateCompletionStatusMutation.isPending}
                                              data-testid={`button-reset-${sponsor.id}`}
                                            >
                                              Reset
                                            </Button>
                                          )}
                                          {status === "pending" && (
                                            <span className="text-sm text-muted-foreground">Awaiting</span>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </div>

      <AlertDialog open={!!deletingTask} onOpenChange={() => setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTask?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTask && deleteMutation.mutate(deletingTask.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Preview</DialogTitle>
            <DialogDescription>
              {previewData?.sponsor.name} - {previewData?.task.name}
            </DialogDescription>
          </DialogHeader>
          
          {previewData && (
            <div className="space-y-4">
              {/* Logo Preview for logo_upload tasks */}
              {previewData.task.taskType === "logo_upload" && (
                <div className="space-y-4">
                  {(() => {
                    const submittedData = previewData.completion.submittedData as Record<string, unknown> | undefined;
                    const logoUrl = submittedData?.logoUrl as string | undefined;
                    
                    if (!logoUrl) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          No logo uploaded
                        </div>
                      );
                    }
                    
                    return (
                      <>
                        <div className="border rounded-md p-4 bg-muted/30">
                          <div className="flex justify-center mb-4">
                            <img 
                              src={logoUrl} 
                              alt="Uploaded logo"
                              className="max-h-48 max-w-full object-contain"
                              data-testid="img-preview-logo"
                            />
                          </div>
                        </div>
                        
                        <div className="border rounded-md p-4">
                          <h4 className="font-medium mb-3">File Information</h4>
                          {loadingMetadata ? (
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-4 w-40" />
                              <Skeleton className="h-4 w-28" />
                            </div>
                          ) : imageMetadata ? (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="text-muted-foreground">Dimensions:</div>
                              <div>{imageMetadata.width} x {imageMetadata.height} px</div>
                              
                              {imageMetadata.size && (
                                <>
                                  <div className="text-muted-foreground">File Size:</div>
                                  <div>{formatFileSize(imageMetadata.size)}</div>
                                </>
                              )}
                              
                              {imageMetadata.type && (
                                <>
                                  <div className="text-muted-foreground">File Type:</div>
                                  <div>{imageMetadata.type}</div>
                                </>
                              )}
                              
                              <div className="text-muted-foreground">Aspect Ratio:</div>
                              <div>
                                {imageMetadata.width && imageMetadata.height 
                                  ? `${(imageMetadata.width / imageMetadata.height).toFixed(2)}:1`
                                  : "N/A"
                                }
                              </div>
                              
                              <div className="text-muted-foreground">Resolution:</div>
                              <div>
                                {imageMetadata.width >= 300 && imageMetadata.height >= 300
                                  ? "High resolution"
                                  : imageMetadata.width >= 100 && imageMetadata.height >= 100
                                    ? "Medium resolution"
                                    : "Low resolution"
                                }
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Unable to load file information
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-muted-foreground break-all">
                          <span className="font-medium">URL: </span>
                          <a href={logoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {logoUrl}
                          </a>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
              
              {/* Generic data display for other task types */}
              {previewData.task.taskType !== "logo_upload" && (
                <div className="border rounded-md p-4">
                  <h4 className="font-medium mb-3">Submitted Data</h4>
                  <div className="space-y-2 text-sm">
                    {Object.entries(previewData.completion.submittedData || {}).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-3 gap-2">
                        <div className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</div>
                        <div className="col-span-2 break-words">
                          {typeof value === 'string' && value.startsWith('http') ? (
                            <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {value}
                            </a>
                          ) : (
                            String(value || '-')
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Status and Metadata */}
              <div className="border rounded-md p-4">
                <h4 className="font-medium mb-3">Submission Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Status:</div>
                  <div>
                    <Badge variant={statusColors[previewData.completion.status || "pending"]}>
                      {(previewData.completion.status || "pending").charAt(0).toUpperCase() + (previewData.completion.status || "pending").slice(1)}
                    </Badge>
                  </div>
                  
                  <div className="text-muted-foreground">Submitted:</div>
                  <div>
                    {previewData.completion.createdAt 
                      ? format(new Date(previewData.completion.createdAt), "MMM d, yyyy 'at' h:mm a")
                      : "-"
                    }
                  </div>
                  
                  {previewData.completion.completedAt && (
                    <>
                      <div className="text-muted-foreground">Completed:</div>
                      <div>{format(new Date(previewData.completion.completedAt), "MMM d, yyyy 'at' h:mm a")}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={!!rejectingCompletion} onOpenChange={() => {
        setRejectingCompletion(null);
        setRejectReason("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {rejectingCompletion?.sponsor.name}'s submission for "{rejectingCompletion?.task.name}".
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rejection Reason</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide feedback explaining why this submission was rejected and what changes are needed..."
                className="mt-1 min-h-[120px]"
                data-testid="input-reject-reason"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This feedback will be shown to the sponsor and included in the notification email.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (rejectingCompletion) {
                  rejectWithReasonMutation.mutate({
                    id: rejectingCompletion.completion.id,
                    reviewNotes: rejectReason,
                    sendEmail: false,
                  });
                }
              }}
              disabled={rejectWithReasonMutation.isPending}
              data-testid="button-reject-without-email"
            >
              {rejectWithReasonMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-1" />
              )}
              Reject Only
            </Button>
            <Button
              onClick={() => {
                if (rejectingCompletion) {
                  rejectWithReasonMutation.mutate({
                    id: rejectingCompletion.completion.id,
                    reviewNotes: rejectReason,
                    sendEmail: true,
                  });
                }
              }}
              disabled={rejectWithReasonMutation.isPending || !rejectingCompletion?.sponsor.contactEmail}
              data-testid="button-reject-and-email"
            >
              {rejectWithReasonMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Reject & Send Email
            </Button>
          </DialogFooter>
          
          {rejectingCompletion && !rejectingCompletion.sponsor.contactEmail && (
            <p className="text-xs text-muted-foreground text-center">
              No contact email available for this sponsor. Email notification is not available.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
