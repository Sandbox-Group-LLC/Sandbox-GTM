import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { titleCase } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Plus, 
  FileText, 
  Settings2, 
  Users, 
  ListOrdered, 
  CalendarIcon, 
  Pencil, 
  Trash2, 
  Search,
  UserPlus,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  PlusCircle,
  Copy,
  ExternalLink,
  Mail,
} from "lucide-react";
import { format } from "date-fns";
import type { Event, CfpConfig, CfpTopic, CfpSubmission, CfpReviewer, CfpReview } from "@shared/schema";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  under_review: "outline",
  accepted: "default",
  rejected: "destructive",
  waitlisted: "secondary",
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  under_review: AlertCircle,
  accepted: CheckCircle2,
  rejected: XCircle,
  waitlisted: Clock,
};

const cfpSettingsSchema = z.object({
  isOpen: z.boolean().default(false),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  submissionDeadline: z.date().optional(),
  notificationDate: z.date().optional(),
  maxAbstractLength: z.coerce.number().min(100).max(10000).default(500),
  allowMultipleSubmissions: z.boolean().default(true),
  requiresRegistration: z.boolean().default(false),
  guidelines: z.string().optional(),
});

type CfpSettingsFormData = z.infer<typeof cfpSettingsSchema>;

const topicFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  sortOrder: z.coerce.number().min(0).default(0),
});

type TopicFormData = z.infer<typeof topicFormSchema>;

const reviewerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  assignedTopics: z.array(z.string()).optional(),
});

type ReviewerFormData = z.infer<typeof reviewerFormSchema>;

export default function CallForPapers() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("settings");
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<CfpTopic | null>(null);
  const [isReviewerDialogOpen, setIsReviewerDialogOpen] = useState(false);
  const [editingReviewer, setEditingReviewer] = useState<CfpReviewer | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<CfpSubmission | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [assignReviewerDialogOpen, setAssignReviewerDialogOpen] = useState(false);
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>("");
  const [createSessionDialogOpen, setCreateSessionDialogOpen] = useState(false);
  const [sessionFormData, setSessionFormData] = useState({
    sessionDate: "",
    startTime: "09:00",
    endTime: "10:00",
  });

  // Fetch submission details with reviews when a submission is selected
  const { data: submissionDetails } = useQuery<CfpSubmission & { reviews?: CfpReview[] }>({
    queryKey: ["/api/events", selectedEventId, "cfp", "submissions", selectedSubmission?.id],
    queryFn: async () => {
      if (!selectedEventId || !selectedSubmission?.id) return null;
      const res = await fetch(`/api/events/${selectedEventId}/cfp/submissions/${selectedSubmission.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch submission details");
      return res.json();
    },
    enabled: !!selectedEventId && !!selectedSubmission?.id,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const selectedEvent = events.find(e => e.id === selectedEventId);

  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const { data: cfpConfig, isLoading: cfpLoading } = useQuery<CfpConfig | null>({
    queryKey: ["/api/events", selectedEventId, "cfp"],
    queryFn: async () => {
      if (!selectedEventId) return null;
      const res = await fetch(`/api/events/${selectedEventId}/cfp`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch CFP config");
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const { data: topics = [], isLoading: topicsLoading } = useQuery<CfpTopic[]>({
    queryKey: ["/api/events", selectedEventId, "cfp", "topics"],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const res = await fetch(`/api/events/${selectedEventId}/cfp/topics`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch topics");
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<CfpSubmission[]>({
    queryKey: ["/api/events", selectedEventId, "cfp", "submissions"],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const res = await fetch(`/api/events/${selectedEventId}/cfp/submissions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch submissions");
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const { data: reviewers = [], isLoading: reviewersLoading } = useQuery<CfpReviewer[]>({
    queryKey: ["/api/events", selectedEventId, "cfp", "reviewers"],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const res = await fetch(`/api/events/${selectedEventId}/cfp/reviewers`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reviewers");
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const settingsForm = useForm<CfpSettingsFormData>({
    resolver: zodResolver(cfpSettingsSchema),
    defaultValues: {
      isOpen: false,
      title: "Call for Papers",
      description: "",
      maxAbstractLength: 500,
      allowMultipleSubmissions: true,
      requiresRegistration: false,
      guidelines: "",
    },
  });

  const topicForm = useForm<TopicFormData>({
    resolver: zodResolver(topicFormSchema),
    defaultValues: {
      name: "",
      description: "",
      sortOrder: 0,
    },
  });

  const reviewerForm = useForm<ReviewerFormData>({
    resolver: zodResolver(reviewerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      assignedTopics: [],
    },
  });

  useEffect(() => {
    if (cfpConfig) {
      settingsForm.reset({
        isOpen: cfpConfig.isOpen ?? false,
        title: cfpConfig.title || "Call for Papers",
        description: cfpConfig.description || "",
        submissionDeadline: cfpConfig.submissionDeadline ? new Date(cfpConfig.submissionDeadline) : undefined,
        notificationDate: cfpConfig.notificationDate ? new Date(cfpConfig.notificationDate) : undefined,
        maxAbstractLength: cfpConfig.maxAbstractLength ?? 500,
        allowMultipleSubmissions: cfpConfig.allowMultipleSubmissions ?? true,
        requiresRegistration: cfpConfig.requiresRegistration ?? false,
        guidelines: cfpConfig.guidelines || "",
      });
    }
  }, [cfpConfig, settingsForm]);

  const saveCfpMutation = useMutation({
    mutationFn: async (data: CfpSettingsFormData) => {
      const method = cfpConfig ? "PATCH" : "POST";
      const payload = {
        ...data,
        submissionDeadline: data.submissionDeadline?.toISOString(),
        notificationDate: data.notificationDate?.toISOString(),
      };
      return await apiRequest(method, `/api/events/${selectedEventId}/cfp`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "cfp"] });
      toast({ title: "CFP settings saved successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createTopicMutation = useMutation({
    mutationFn: async (data: TopicFormData) => {
      return await apiRequest("POST", `/api/events/${selectedEventId}/cfp/topics`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "cfp", "topics"] });
      toast({ title: "Topic created successfully" });
      setIsTopicDialogOpen(false);
      topicForm.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateTopicMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TopicFormData }) => {
      return await apiRequest("PATCH", `/api/events/${selectedEventId}/cfp/topics/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "cfp", "topics"] });
      toast({ title: "Topic updated successfully" });
      setIsTopicDialogOpen(false);
      setEditingTopic(null);
      topicForm.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/events/${selectedEventId}/cfp/topics/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "cfp", "topics"] });
      toast({ title: "Topic deleted successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createReviewerMutation = useMutation({
    mutationFn: async (data: ReviewerFormData) => {
      return await apiRequest("POST", `/api/events/${selectedEventId}/cfp/reviewers`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "cfp", "reviewers"] });
      toast({ title: "Reviewer added successfully" });
      setIsReviewerDialogOpen(false);
      reviewerForm.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateReviewerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ReviewerFormData }) => {
      return await apiRequest("PATCH", `/api/events/${selectedEventId}/cfp/reviewers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "cfp", "reviewers"] });
      toast({ title: "Reviewer updated successfully" });
      setIsReviewerDialogOpen(false);
      setEditingReviewer(null);
      reviewerForm.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteReviewerMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/events/${selectedEventId}/cfp/reviewers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "cfp", "reviewers"] });
      toast({ title: "Reviewer deleted successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateSubmissionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CfpSubmission> }) => {
      return await apiRequest("PATCH", `/api/events/${selectedEventId}/cfp/submissions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "cfp", "submissions"] });
      toast({ title: "Submission updated successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const assignReviewerMutation = useMutation({
    mutationFn: async ({ submissionId, reviewerId }: { submissionId: number; reviewerId: number }) => {
      return await apiRequest("POST", `/api/events/${selectedEventId}/cfp/submissions/${submissionId}/assign-reviewer`, { reviewerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "cfp", "submissions"] });
      toast({ title: "Reviewer assigned successfully" });
      setAssignReviewerDialogOpen(false);
      setSelectedReviewerId("");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async ({ submissionId, sessionData }: { submissionId: number; sessionData: typeof sessionFormData }) => {
      return await apiRequest("POST", `/api/events/${selectedEventId}/cfp/submissions/${submissionId}/create-session`, sessionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "cfp", "submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Session created from submission" });
      setCreateSessionDialogOpen(false);
      setSelectedSubmission(null);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resendAcceptanceEmailMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      return await apiRequest("POST", `/api/events/${selectedEventId}/cfp/submissions/${submissionId}/resend-acceptance`);
    },
    onSuccess: () => {
      toast({ title: "Acceptance email sent", description: "The speaker has been notified" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleTopicSubmit = (data: TopicFormData) => {
    if (editingTopic) {
      updateTopicMutation.mutate({ id: editingTopic.id, data });
    } else {
      createTopicMutation.mutate(data);
    }
  };

  const handleEditTopic = (topic: CfpTopic) => {
    setEditingTopic(topic);
    topicForm.reset({
      name: topic.name,
      description: topic.description || "",
      sortOrder: topic.sortOrder ?? 0,
    });
    setIsTopicDialogOpen(true);
  };

  const handleDeleteTopic = (id: number) => {
    if (confirm("Are you sure you want to delete this topic?")) {
      deleteTopicMutation.mutate(id);
    }
  };

  const handleReviewerSubmit = (data: ReviewerFormData) => {
    if (editingReviewer) {
      updateReviewerMutation.mutate({ id: editingReviewer.id, data });
    } else {
      createReviewerMutation.mutate(data);
    }
  };

  const handleEditReviewer = (reviewer: CfpReviewer) => {
    setEditingReviewer(reviewer);
    reviewerForm.reset({
      name: reviewer.name,
      email: reviewer.email,
      assignedTopics: reviewer.assignedTopics || [],
    });
    setIsReviewerDialogOpen(true);
  };

  const handleDeleteReviewer = (id: number) => {
    if (confirm("Are you sure you want to delete this reviewer?")) {
      deleteReviewerMutation.mutate(id);
    }
  };

  const getTopicName = (topicId: number | null) => {
    if (!topicId) return "Unassigned";
    const topic = topics.find(t => t.id === topicId);
    return topic?.name || "Unknown";
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    const matchesSearch = !searchQuery || 
      sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.authorEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const topicColumns = [
    { key: "name", header: "Name" },
    { key: "description", header: "Description", cell: (topic: CfpTopic) => topic.description || "-" },
    { key: "sortOrder", header: "Order", cell: (topic: CfpTopic) => topic.sortOrder ?? 0 },
    {
      key: "actions",
      header: "Actions",
      cell: (topic: CfpTopic) => (
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleEditTopic(topic)}
            data-testid={`button-edit-topic-${topic.id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleDeleteTopic(topic.id)}
            data-testid={`button-delete-topic-${topic.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const submissionColumns = [
    { key: "title", header: "Title" },
    { key: "authorName", header: "Author" },
    { key: "submissionType", header: "Type", cell: (s: CfpSubmission) => titleCase(s.submissionType) },
    { key: "topicId", header: "Topic", cell: (s: CfpSubmission) => getTopicName(s.topicId) },
    {
      key: "status",
      header: "Status",
      cell: (s: CfpSubmission) => {
        const StatusIcon = statusIcons[s.status || "pending"] || Clock;
        return (
          <Badge variant={statusColors[s.status || "pending"]} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {titleCase(s.status)}
          </Badge>
        );
      },
    },
    {
      key: "submittedAt",
      header: "Submitted",
      cell: (s: CfpSubmission) => s.submittedAt ? format(new Date(s.submittedAt), "MMM d, yyyy") : "-",
    },
    {
      key: "actions",
      header: "Actions",
      cell: (s: CfpSubmission) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedSubmission(s);
          }}
          data-testid={`button-view-submission-${s.id}`}
        >
          View
        </Button>
      ),
    },
  ];

  const reviewerColumns = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    {
      key: "assignedTopics",
      header: "Topics",
      cell: (r: CfpReviewer) => {
        const topicNames = (r.assignedTopics || []).map(id => {
          const topic = topics.find(t => t.id.toString() === id);
          return topic?.name || id;
        });
        return topicNames.length > 0 ? topicNames.join(", ") : "-";
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (r: CfpReviewer) => (
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleEditReviewer(r)}
            data-testid={`button-edit-reviewer-${r.id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleDeleteReviewer(r.id)}
            data-testid={`button-delete-reviewer-${r.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (eventsLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title="Call for Papers"
          breadcrumbs={[{ label: "Program", href: "/sessions" }, { label: "Call for Papers" }]}
        />
        <div className="flex-1 p-6">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Call for Papers"
        breadcrumbs={[{ label: "Program", href: "/sessions" }, { label: "Call for Papers" }]}
        actions={
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-[200px]" data-testid="select-event">
              <SelectValue placeholder="Select event" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        {!selectedEventId ? (
          <EmptyState
            icon={FileText}
            title="No Event Selected"
            description="Please select an event to manage its Call for Papers"
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList data-testid="cfp-tabs">
              <TabsTrigger value="settings" data-testid="tab-settings">
                <Settings2 className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="topics" data-testid="tab-topics">
                <ListOrdered className="h-4 w-4 mr-2" />
                Topics
              </TabsTrigger>
              <TabsTrigger value="submissions" data-testid="tab-submissions">
                <FileText className="h-4 w-4 mr-2" />
                Submissions
              </TabsTrigger>
              <TabsTrigger value="reviewers" data-testid="tab-reviewers">
                <Users className="h-4 w-4 mr-2" />
                Reviewers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle>CFP Settings</CardTitle>
                      <CardDescription>Configure the Call for Papers for this event</CardDescription>
                    </div>
                    <Badge variant={cfpConfig?.isOpen ? "default" : "secondary"} data-testid="badge-cfp-status">
                      {cfpConfig?.isOpen ? "Open" : "Closed"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {cfpLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <Form {...settingsForm}>
                      <form onSubmit={settingsForm.handleSubmit((data) => saveCfpMutation.mutate(data))} className="space-y-6">
                        <FormField
                          control={settingsForm.control}
                          name="isOpen"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">CFP Status</FormLabel>
                                <FormDescription>
                                  When open, authors can submit papers for review
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-cfp-open"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {selectedEvent?.publicSlug && cfpConfig && (
                          <div className="rounded-lg border p-4 space-y-2">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              <div className="space-y-0.5">
                                <p className="text-sm font-medium">Public Submission Link</p>
                                <p className="text-sm text-muted-foreground">
                                  Share this link with authors to submit papers
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
                                    const url = `${baseUrl}/event/${selectedEvent.publicSlug}/cfp`;
                                    navigator.clipboard.writeText(url);
                                    toast({
                                      title: "Link copied",
                                      description: "The public submission link has been copied to your clipboard",
                                    });
                                  }}
                                  data-testid="button-copy-cfp-link"
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Link
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    window.open(`/event/${selectedEvent.publicSlug}/cfp`, "_blank");
                                  }}
                                  data-testid="button-open-cfp-link"
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Preview
                                </Button>
                              </div>
                            </div>
                            <code className="block text-xs bg-muted p-2 rounded break-all">
                              {`${import.meta.env.VITE_APP_URL || window.location.origin}/event/${selectedEvent.publicSlug}/cfp`}
                            </code>
                          </div>
                        )}

                        <FormField
                          control={settingsForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title *</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-cfp-title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={settingsForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} rows={3} data-testid="input-cfp-description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={settingsForm.control}
                            name="submissionDeadline"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Submission Deadline</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "justify-start text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                        data-testid="button-submission-deadline"
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : "Select date"}
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={settingsForm.control}
                            name="notificationDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Notification Date</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "justify-start text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                        data-testid="button-notification-date"
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : "Select date"}
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={settingsForm.control}
                          name="maxAbstractLength"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Maximum Abstract Length (words)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-max-abstract" />
                              </FormControl>
                              <FormDescription>
                                The maximum number of words allowed in submission abstracts
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={settingsForm.control}
                          name="allowMultipleSubmissions"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Allow Multiple Submissions</FormLabel>
                                <FormDescription>
                                  Allow authors to submit more than one paper
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-multiple-submissions"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={settingsForm.control}
                          name="requiresRegistration"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Requires Registration</FormLabel>
                                <FormDescription>
                                  Authors must be registered for the event to submit
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-requires-registration"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={settingsForm.control}
                          name="guidelines"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Submission Guidelines</FormLabel>
                              <FormControl>
                                <Textarea {...field} rows={8} data-testid="input-guidelines" placeholder="Enter guidelines in markdown format..." />
                              </FormControl>
                              <FormDescription>
                                Markdown is supported for formatting
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button type="submit" disabled={saveCfpMutation.isPending} data-testid="button-save-settings">
                          {saveCfpMutation.isPending ? "Saving..." : "Save Settings"}
                        </Button>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="topics">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                <h2 className="text-xl font-semibold">CFP Topics</h2>
                <Dialog open={isTopicDialogOpen} onOpenChange={(open) => {
                  setIsTopicDialogOpen(open);
                  if (!open) {
                    setEditingTopic(null);
                    topicForm.reset();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-topic">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Topic
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTopic ? "Edit Topic" : "Add Topic"}</DialogTitle>
                      <DialogDescription>
                        {editingTopic ? "Update the topic details" : "Create a new topic for submissions"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...topicForm}>
                      <form onSubmit={topicForm.handleSubmit(handleTopicSubmit)} className="space-y-4">
                        <FormField
                          control={topicForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name *</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-topic-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={topicForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} data-testid="input-topic-description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={topicForm.control}
                          name="sortOrder"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sort Order</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-topic-order" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button
                            type="submit"
                            disabled={createTopicMutation.isPending || updateTopicMutation.isPending}
                            data-testid="button-save-topic"
                          >
                            {(createTopicMutation.isPending || updateTopicMutation.isPending) ? "Saving..." : editingTopic ? "Update Topic" : "Add Topic"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {topicsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : topics.length === 0 ? (
                <EmptyState
                  icon={ListOrdered}
                  title="No Topics Yet"
                  description="Add topics to organize your call for papers submissions"
                  action={{
                    label: "Add Topic",
                    onClick: () => setIsTopicDialogOpen(true),
                  }}
                />
              ) : (
                <DataTable
                  columns={topicColumns}
                  data={[...topics].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))}
                  getRowKey={(t) => t.id.toString()}
                />
              )}
            </TabsContent>

            <TabsContent value="submissions">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                <h2 className="text-xl font-semibold">Submissions</h2>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search submissions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                      data-testid="input-search-submissions"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40" data-testid="select-status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="waitlisted">Waitlisted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {submissionsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : filteredSubmissions.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No Submissions"
                  description={statusFilter !== "all" || searchQuery ? "No submissions match your filters" : "No submissions have been received yet"}
                />
              ) : (
                <DataTable
                  columns={submissionColumns}
                  data={filteredSubmissions}
                  getRowKey={(s) => s.id.toString()}
                  onRowClick={(s) => setSelectedSubmission(s)}
                />
              )}

              <Sheet open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
                <SheetContent className="w-full sm:max-w-xl">
                  {selectedSubmission && (
                    <>
                      <SheetHeader>
                        <SheetTitle>{selectedSubmission.title}</SheetTitle>
                        <SheetDescription>
                          Submitted by {selectedSubmission.authorName}
                        </SheetDescription>
                      </SheetHeader>
                      <ScrollArea className="h-[calc(100vh-12rem)] mt-6">
                        <div className="space-y-6 pr-4">
                          <div className="flex items-center gap-4 flex-wrap">
                            <Badge variant={statusColors[selectedSubmission.status || "pending"]}>
                              {titleCase(selectedSubmission.status)}
                            </Badge>
                            <Badge variant="outline">{titleCase(selectedSubmission.submissionType)}</Badge>
                            <span className="text-sm text-muted-foreground">
                              Topic: {getTopicName(selectedSubmission.topicId)}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Author Information</h4>
                            <div className="text-sm space-y-1">
                              <p><span className="text-muted-foreground">Name:</span> {selectedSubmission.authorName}</p>
                              <p><span className="text-muted-foreground">Email:</span> {selectedSubmission.authorEmail}</p>
                              {selectedSubmission.authorAffiliation && (
                                <p><span className="text-muted-foreground">Affiliation:</span> {selectedSubmission.authorAffiliation}</p>
                              )}
                              {selectedSubmission.coAuthors && (
                                <p><span className="text-muted-foreground">Co-Authors:</span> {selectedSubmission.coAuthors}</p>
                              )}
                            </div>
                          </div>

                          {selectedSubmission.keywords && (
                            <div>
                              <h4 className="font-medium mb-2">Keywords</h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedSubmission.keywords.split(",").map((kw, i) => (
                                  <Badge key={i} variant="secondary">{kw.trim()}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <h4 className="font-medium mb-2">Abstract</h4>
                            <p className="text-sm whitespace-pre-wrap">{selectedSubmission.abstract}</p>
                          </div>

                          {/* Reviewer Recommendations Section */}
                          {submissionDetails?.reviews && submissionDetails.reviews.length > 0 && (
                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-3">Reviewer Recommendations</h4>
                              <div className="space-y-3">
                                {submissionDetails.reviews.map((review) => {
                                  const reviewer = reviewers.find(r => r.id === review.reviewerId);
                                  const recommendationColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
                                    accept: "default",
                                    reject: "destructive",
                                    revise: "secondary",
                                    undecided: "outline",
                                  };
                                  return (
                                    <div key={review.id} className="p-3 bg-muted/50 rounded-md space-y-2">
                                      <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <span className="text-sm font-medium">{reviewer?.name || 'Unknown Reviewer'}</span>
                                        <div className="flex items-center gap-2">
                                          {review.score && (
                                            <Badge variant="outline">Score: {review.score}/5</Badge>
                                          )}
                                          {review.recommendation && (
                                            <Badge variant={recommendationColors[review.recommendation] || "secondary"}>
                                              {titleCase(review.recommendation)}
                                            </Badge>
                                          )}
                                          <Badge variant={review.status === 'completed' ? 'default' : 'secondary'}>
                                            {titleCase(review.status || 'assigned')}
                                          </Badge>
                                        </div>
                                      </div>
                                      {review.comments && (
                                        <p className="text-sm text-muted-foreground">{review.comments}</p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="border-t pt-4">
                            <h4 className="font-medium mb-4">Actions</h4>
                            <div className="space-y-4">
                              <div className="flex items-center gap-4 flex-wrap">
                                <label className="text-sm font-medium">Status:</label>
                                <Select
                                  value={selectedSubmission.status || "pending"}
                                  onValueChange={(value) => {
                                    updateSubmissionMutation.mutate({
                                      id: selectedSubmission.id,
                                      data: { status: value },
                                    });
                                    setSelectedSubmission({ ...selectedSubmission, status: value });
                                  }}
                                >
                                  <SelectTrigger className="w-40" data-testid="select-submission-status">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="under_review">Under Review</SelectItem>
                                    <SelectItem value="accepted">Accepted</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                    <SelectItem value="waitlisted">Waitlisted</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex items-center gap-4 flex-wrap">
                                <Button
                                  variant="outline"
                                  onClick={() => setAssignReviewerDialogOpen(true)}
                                  data-testid="button-assign-reviewer"
                                >
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Assign Reviewer
                                </Button>

                                {selectedSubmission.status === "accepted" && (
                                  <>
                                    {!selectedSubmission.sessionId && (
                                      <Button
                                        onClick={() => {
                                          const defaultDate = selectedEvent?.startDate || new Date().toISOString().split('T')[0];
                                          setSessionFormData({
                                            sessionDate: defaultDate,
                                            startTime: "09:00",
                                            endTime: "10:00",
                                          });
                                          setCreateSessionDialogOpen(true);
                                        }}
                                        disabled={createSessionMutation.isPending}
                                        data-testid="button-create-session"
                                      >
                                        <PlusCircle className="h-4 w-4 mr-2" />
                                        Create Session
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      onClick={() => resendAcceptanceEmailMutation.mutate(selectedSubmission.id)}
                                      disabled={resendAcceptanceEmailMutation.isPending}
                                      data-testid="button-resend-acceptance-email"
                                    >
                                      <Mail className="h-4 w-4 mr-2" />
                                      {resendAcceptanceEmailMutation.isPending ? "Sending..." : "Resend Acceptance Email"}
                                    </Button>
                                  </>
                                )}

                                {selectedSubmission.sessionId && (
                                  <Badge variant="outline">Session Created</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </>
                  )}
                </SheetContent>
              </Sheet>

              <Dialog open={assignReviewerDialogOpen} onOpenChange={setAssignReviewerDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Reviewer</DialogTitle>
                    <DialogDescription>
                      Select a reviewer to assign to this submission
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={selectedReviewerId} onValueChange={setSelectedReviewerId}>
                      <SelectTrigger data-testid="select-reviewer">
                        <SelectValue placeholder="Select reviewer" />
                      </SelectTrigger>
                      <SelectContent>
                        {reviewers.map((r) => (
                          <SelectItem key={r.id} value={r.id.toString()}>
                            {r.name} ({r.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          if (selectedSubmission && selectedReviewerId) {
                            assignReviewerMutation.mutate({
                              submissionId: selectedSubmission.id,
                              reviewerId: parseInt(selectedReviewerId),
                            });
                          }
                        }}
                        disabled={!selectedReviewerId || assignReviewerMutation.isPending}
                        data-testid="button-confirm-assign"
                      >
                        {assignReviewerMutation.isPending ? "Assigning..." : "Assign Reviewer"}
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={createSessionDialogOpen} onOpenChange={setCreateSessionDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Session</DialogTitle>
                    <DialogDescription>
                      Set the date and time for this session
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">Session Date *</label>
                      <Input
                        type="date"
                        value={sessionFormData.sessionDate}
                        onChange={(e) => setSessionFormData({ ...sessionFormData, sessionDate: e.target.value })}
                        data-testid="input-session-date"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium block mb-2">Start Time *</label>
                        <Input
                          type="time"
                          value={sessionFormData.startTime}
                          onChange={(e) => setSessionFormData({ ...sessionFormData, startTime: e.target.value })}
                          data-testid="input-start-time"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-2">End Time *</label>
                        <Input
                          type="time"
                          value={sessionFormData.endTime}
                          onChange={(e) => setSessionFormData({ ...sessionFormData, endTime: e.target.value })}
                          data-testid="input-end-time"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setCreateSessionDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (selectedSubmission && sessionFormData.sessionDate && sessionFormData.startTime && sessionFormData.endTime) {
                            createSessionMutation.mutate({
                              submissionId: selectedSubmission.id,
                              sessionData: sessionFormData,
                            });
                          }
                        }}
                        disabled={!sessionFormData.sessionDate || !sessionFormData.startTime || !sessionFormData.endTime || createSessionMutation.isPending}
                        data-testid="button-confirm-create-session"
                      >
                        {createSessionMutation.isPending ? "Creating..." : "Create Session"}
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="reviewers">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                <h2 className="text-xl font-semibold">Reviewers</h2>
                <Dialog open={isReviewerDialogOpen} onOpenChange={(open) => {
                  setIsReviewerDialogOpen(open);
                  if (!open) {
                    setEditingReviewer(null);
                    reviewerForm.reset();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-reviewer">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Reviewer
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingReviewer ? "Edit Reviewer" : "Add Reviewer"}</DialogTitle>
                      <DialogDescription>
                        {editingReviewer ? "Update reviewer details" : "Add a new reviewer to the review committee"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...reviewerForm}>
                      <form onSubmit={reviewerForm.handleSubmit(handleReviewerSubmit)} className="space-y-4">
                        <FormField
                          control={reviewerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name *</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-reviewer-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={reviewerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email *</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} data-testid="input-reviewer-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {topics.length > 0 && (
                          <FormField
                            control={reviewerForm.control}
                            name="assignedTopics"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Assigned Topics</FormLabel>
                                <div className="space-y-2">
                                  {topics.map((topic) => (
                                    <label key={topic.id} className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={field.value?.includes(topic.id.toString())}
                                        onChange={(e) => {
                                          const current = field.value || [];
                                          if (e.target.checked) {
                                            field.onChange([...current, topic.id.toString()]);
                                          } else {
                                            field.onChange(current.filter(id => id !== topic.id.toString()));
                                          }
                                        }}
                                        className="rounded border-input"
                                        data-testid={`checkbox-topic-${topic.id}`}
                                      />
                                      <span className="text-sm">{topic.name}</span>
                                    </label>
                                  ))}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <DialogFooter>
                          <Button
                            type="submit"
                            disabled={createReviewerMutation.isPending || updateReviewerMutation.isPending}
                            data-testid="button-save-reviewer"
                          >
                            {(createReviewerMutation.isPending || updateReviewerMutation.isPending) ? "Saving..." : editingReviewer ? "Update Reviewer" : "Add Reviewer"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {reviewersLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : reviewers.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No Reviewers Yet"
                  description="Add reviewers to evaluate submitted papers"
                  action={{
                    label: "Add Reviewer",
                    onClick: () => setIsReviewerDialogOpen(true),
                  }}
                />
              ) : (
                <DataTable
                  columns={reviewerColumns}
                  data={reviewers}
                  getRowKey={(r) => r.id.toString()}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
