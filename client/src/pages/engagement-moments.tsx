import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Zap,
  Plus,
  MoreVertical,
  Play,
  Pause,
  Lock,
  StopCircle,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  MessageSquare,
  Star,
  CheckSquare,
  Send,
  BarChart3,
  Users,
  Copy,
} from "lucide-react";
import type { Event, Moment, EventSession } from "@shared/schema";

const MOMENT_TYPES = [
  { value: "poll_single", label: "Single Choice Poll", icon: CheckSquare, description: "One answer from multiple options" },
  { value: "poll_multi", label: "Multi-Choice Poll", icon: CheckSquare, description: "Multiple answers allowed" },
  { value: "rating", label: "Rating Scale", icon: Star, description: "1-5 or 1-10 scale rating" },
  { value: "open_text", label: "Open Text", icon: MessageSquare, description: "Free-form text response" },
  { value: "qa", label: "Q&A", icon: MessageSquare, description: "Questions from audience" },
  { value: "pulse", label: "Pulse Check", icon: Zap, description: "Quick sentiment check" },
  { value: "cta", label: "Call to Action", icon: Send, description: "Direct action prompt" },
] as const;

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  live: "default",
  locked: "outline",
  ended: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  live: "Live",
  locked: "Locked",
  ended: "Ended",
};

const momentFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  type: z.enum(["poll_single", "poll_multi", "rating", "open_text", "qa", "pulse", "cta"]),
  sessionId: z.string().nullable(),
  optionsJson: z.object({
    options: z.array(z.string()).optional(),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
    ctaLabel: z.string().optional(),
    ctaUrl: z.string().optional(),
  }).optional(),
  showResults: z.boolean().default(false),
});

type MomentFormValues = z.infer<typeof momentFormSchema>;

export default function EngagementMoments() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);
  const [deletingMoment, setDeletingMoment] = useState<Moment | null>(null);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: moments = [], isLoading: momentsLoading } = useQuery<Moment[]>({
    queryKey: ["/api/events", selectedEventId, "moments"],
    enabled: !!selectedEventId,
  });

  const { data: sessions = [] } = useQuery<EventSession[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      const res = await fetch(`/api/sessions?eventId=${selectedEventId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const form = useForm<MomentFormValues>({
    resolver: zodResolver(momentFormSchema),
    defaultValues: {
      title: "",
      type: "poll_single",
      sessionId: null,
      optionsJson: {},
      showResults: false,
    },
  });

  const momentType = form.watch("type");

  useEffect(() => {
    if (momentType === "poll_single" || momentType === "poll_multi") {
      if (pollOptions.length < 2) {
        setPollOptions(["", ""]);
      }
    } else if (momentType === "rating") {
      form.setValue("optionsJson", { minValue: 1, maxValue: 5 });
    } else if (momentType === "cta") {
      form.setValue("optionsJson", { ctaLabel: "Learn More", ctaUrl: "" });
    }
  }, [momentType]);

  useEffect(() => {
    if (editingMoment) {
      form.reset({
        title: editingMoment.title,
        type: editingMoment.type as MomentFormValues["type"],
        sessionId: editingMoment.sessionId,
        optionsJson: editingMoment.optionsJson as MomentFormValues["optionsJson"],
        showResults: editingMoment.showResults ?? false,
      });
      if (editingMoment.type === "poll_single" || editingMoment.type === "poll_multi") {
        const opts = (editingMoment.optionsJson as any)?.options || ["", ""];
        setPollOptions(opts);
      }
    } else {
      form.reset({
        title: "",
        type: "poll_single",
        sessionId: null,
        optionsJson: {},
        showResults: false,
      });
      setPollOptions(["", ""]);
    }
  }, [editingMoment]);

  const createMutation = useMutation({
    mutationFn: async (data: MomentFormValues) => {
      const payload = {
        ...data,
        eventId: selectedEventId,
        optionsJson: data.type === "poll_single" || data.type === "poll_multi"
          ? { options: pollOptions.filter(o => o.trim()) }
          : data.optionsJson,
      };
      return await apiRequest("POST", `/api/events/${selectedEventId}/moments`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "moments"] });
      toast({ title: "Moment created successfully" });
      setCreateDialogOpen(false);
      form.reset();
      setPollOptions(["", ""]);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error creating moment", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MomentFormValues> & { status?: string } }) => {
      const payload = {
        ...data,
        optionsJson: data.type === "poll_single" || data.type === "poll_multi"
          ? { options: pollOptions.filter(o => o.trim()) }
          : data.optionsJson,
      };
      return await apiRequest("PATCH", `/api/moments/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "moments"] });
      toast({ title: "Moment updated successfully" });
      setEditingMoment(null);
      form.reset();
      setPollOptions(["", ""]);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error updating moment", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/moments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "moments"] });
      toast({ title: "Moment deleted successfully" });
      setDeletingMoment(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting moment", description: error.message, variant: "destructive" });
    },
  });

  const handleStatusChange = (moment: Moment, newStatus: string) => {
    updateMutation.mutate({ id: moment.id, data: { status: newStatus } });
  };

  const handleToggleResults = (moment: Moment) => {
    updateMutation.mutate({ id: moment.id, data: { showResults: !moment.showResults } });
  };

  const onSubmit = (data: MomentFormValues) => {
    if (editingMoment) {
      updateMutation.mutate({ id: editingMoment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const addPollOption = () => {
    setPollOptions([...pollOptions, ""]);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const getMomentTypeInfo = (type: string) => {
    return MOMENT_TYPES.find(t => t.value === type);
  };

  const getSessionName = (sessionId: string | null) => {
    if (!sessionId) return "General";
    const session = sessions.find(s => s.id === sessionId);
    return session?.title || "Unknown Session";
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Engagement Moments"
        breadcrumbs={[{ label: "Programs" }, { label: "Engagement Moments" }]}
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-full sm:w-[240px] min-h-10" data-testid="select-event">
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id} data-testid={`select-event-option-${event.id}`}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEventId && (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="w-full sm:w-auto min-h-10"
                data-testid="button-create-moment"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Moment
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-3 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          <p className="text-muted-foreground text-xs sm:text-sm">
            Create interactive moments to engage your audience during live sessions. Launch polls, Q&As, and pulse checks in real-time.
          </p>

          {eventsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !selectedEventId ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Zap className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Select a program to manage engagement moments</p>
              </CardContent>
            </Card>
          ) : momentsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : moments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Zap className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground mb-4">No engagement moments yet</p>
                <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first-moment">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Moment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {moments.map((moment) => {
                const typeInfo = getMomentTypeInfo(moment.type);
                const TypeIcon = typeInfo?.icon || Zap;
                return (
                  <Card key={moment.id} data-testid={`card-moment-${moment.id}`}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col gap-3">
                        {/* Header row with icon, title, badges and menu */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className="p-1.5 sm:p-2 rounded-md bg-muted flex-shrink-0">
                              <TypeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <Badge variant={STATUS_COLORS[moment.status]} className="text-xs" data-testid={`badge-moment-status-${moment.id}`}>
                                  {STATUS_LABELS[moment.status]}
                                </Badge>
                                {moment.showResults && (
                                  <Badge variant="outline" className="gap-1 text-xs">
                                    <Eye className="h-3 w-3" />
                                    Results Visible
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-medium text-sm sm:text-base mt-1 leading-tight" data-testid={`text-moment-title-${moment.id}`}>
                                {moment.title}
                              </h3>
                              <div className="flex items-center gap-2 sm:gap-4 mt-0.5 text-xs sm:text-sm text-muted-foreground flex-wrap">
                                <span>{typeInfo?.label}</span>
                                <span>{getSessionName(moment.sessionId)}</span>
                              </div>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="flex-shrink-0" data-testid={`button-moment-menu-${moment.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setEditingMoment(moment)}
                                disabled={moment.status !== "draft"}
                                data-testid={`menu-edit-${moment.id}`}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const newMoment = { ...moment };
                                  delete (newMoment as any).id;
                                  setEditingMoment(null);
                                  form.reset({
                                    title: `${moment.title} (Copy)`,
                                    type: moment.type as MomentFormValues["type"],
                                    sessionId: moment.sessionId,
                                    optionsJson: moment.optionsJson as MomentFormValues["optionsJson"],
                                    showResults: false,
                                  });
                                  if (moment.type === "poll_single" || moment.type === "poll_multi") {
                                    setPollOptions((moment.optionsJson as any)?.options || ["", ""]);
                                  }
                                  setCreateDialogOpen(true);
                                }}
                                data-testid={`menu-duplicate-${moment.id}`}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeletingMoment(moment)}
                                data-testid={`menu-delete-${moment.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {/* Action buttons row - shown for non-draft moments */}
                        {moment.status !== "draft" && (
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
                            {moment.status === "live" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleResults(moment)}
                                  className="flex-1 sm:flex-none min-h-10 text-xs sm:text-sm"
                                  data-testid={`button-toggle-results-${moment.id}`}
                                >
                                  {moment.showResults ? (
                                    <>
                                      <EyeOff className="h-4 w-4 mr-1" />
                                      Hide Results
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-4 w-4 mr-1" />
                                      Show Results
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusChange(moment, "locked")}
                                  className="flex-1 sm:flex-none min-h-10 text-xs sm:text-sm"
                                  data-testid={`button-lock-${moment.id}`}
                                >
                                  <Lock className="h-4 w-4 mr-1" />
                                  Lock
                                </Button>
                              </>
                            )}
                            {(moment.status === "live" || moment.status === "locked") && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleStatusChange(moment, "ended")}
                                className="flex-1 sm:flex-none min-h-10 text-xs sm:text-sm"
                                data-testid={`button-end-${moment.id}`}
                              >
                                <StopCircle className="h-4 w-4 mr-1" />
                                End
                              </Button>
                            )}
                          </div>
                        )}
                        
                        {/* Draft launch button */}
                        {moment.status === "draft" && (
                          <div className="pt-1 border-t border-border/50">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleStatusChange(moment, "live")}
                              className="w-full sm:w-auto min-h-10"
                              data-testid={`button-launch-${moment.id}`}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Launch
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={createDialogOpen || !!editingMoment} onOpenChange={(open) => {
        if (!open) {
          setCreateDialogOpen(false);
          setEditingMoment(null);
          form.reset();
          setPollOptions(["", ""]);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMoment ? "Edit Moment" : "Create Engagement Moment"}</DialogTitle>
            <DialogDescription>
              {editingMoment ? "Update this engagement moment" : "Create an interactive moment to engage your audience"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., How are you feeling about this topic?" {...field} data-testid="input-moment-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-moment-type">
                          <SelectValue placeholder="Select moment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MOMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value} data-testid={`select-type-${type.value}`}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {MOMENT_TYPES.find(t => t.value === field.value)?.description}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sessionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session (Optional)</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "__general__" ? null : val)} value={field.value || "__general__"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-session">
                          <SelectValue placeholder="General (no specific session)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__general__">General (no specific session)</SelectItem>
                        {sessions.map((session) => (
                          <SelectItem key={session.id} value={session.id} data-testid={`select-session-${session.id}`}>
                            {session.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Link this moment to a specific session, or leave as general for event-wide engagement
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(momentType === "poll_single" || momentType === "poll_multi") && (
                <div className="space-y-3">
                  <Label>Poll Options</Label>
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updatePollOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        data-testid={`input-poll-option-${index}`}
                      />
                      {pollOptions.length > 2 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removePollOption(index)}
                          data-testid={`button-remove-option-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPollOption}
                    data-testid="button-add-option"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>
              )}

              {momentType === "rating" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="optionsJson.minValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Value</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-min-value"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="optionsJson.maxValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Value</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-max-value"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {momentType === "cta" && (
                <>
                  <FormField
                    control={form.control}
                    name="optionsJson.ctaLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Button Label</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Learn More" data-testid="input-cta-label" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="optionsJson.ctaUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Button URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://example.com" data-testid="input-cta-url" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="showResults"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Show Results to Audience</FormLabel>
                      <FormDescription>
                        Display live results to participants after they respond
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-show-results" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    setEditingMoment(null);
                    form.reset({
                      title: "",
                      type: "poll_single",
                      sessionId: null,
                      optionsJson: {},
                      showResults: false,
                    });
                    setPollOptions(["", ""]);
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-moment"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingMoment ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingMoment} onOpenChange={(open) => !open && setDeletingMoment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Moment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingMoment?.title}"? This action cannot be undone and will remove all responses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingMoment && deleteMutation.mutate(deletingMoment.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
