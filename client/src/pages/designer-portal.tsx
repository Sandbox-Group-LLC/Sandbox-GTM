import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Key,
  Loader2,
  FileImage,
  Calendar,
  Clock,
  Building2,
  MapPin,
  Tag,
  ArrowRight,
  LogOut,
  AlertCircle,
  Plus,
} from "lucide-react";
import type { ProofRequest, Designer, Event } from "@shared/schema";

interface DesignerSession {
  designerId: string;
  sessionToken: string;
  designer: Designer;
}

interface ProofRequestWithDetails extends ProofRequest {
  event?: { name: string } | null;
}

function getSessionToken(): string | null {
  return localStorage.getItem("designerSessionToken");
}

function setSessionToken(token: string) {
  localStorage.setItem("designerSessionToken", token);
}

function clearSessionToken() {
  localStorage.removeItem("designerSessionToken");
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending_upload":
      return (
        <Badge variant="secondary" data-testid="badge-status-pending-upload">
          <Clock className="w-3 h-3 mr-1" />
          Pending Upload
        </Badge>
      );
    case "pending_review":
      return (
        <Badge className="bg-blue-600" data-testid="badge-status-pending-review">
          <FileImage className="w-3 h-3 mr-1" />
          Pending Review
        </Badge>
      );
    case "approved":
      return (
        <Badge className="bg-green-600" data-testid="badge-status-approved">
          Approved
        </Badge>
      );
    case "revision_requested":
      return (
        <Badge className="bg-orange-500" data-testid="badge-status-revision">
          Revision Requested
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" data-testid="badge-status-rejected">
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" data-testid={`badge-status-${status}`}>
          {status}
        </Badge>
      );
  }
}

function PriorityBadge({ priority }: { priority: string }) {
  switch (priority) {
    case "urgent":
      return (
        <Badge variant="destructive" className="text-xs" data-testid="badge-priority-urgent">
          Urgent
        </Badge>
      );
    case "high":
      return (
        <Badge className="bg-orange-500 text-xs" data-testid="badge-priority-high">
          High
        </Badge>
      );
    case "normal":
      return (
        <Badge variant="secondary" className="text-xs" data-testid="badge-priority-normal">
          Normal
        </Badge>
      );
    case "low":
      return (
        <Badge variant="outline" className="text-xs" data-testid="badge-priority-low">
          Low
        </Badge>
      );
    default:
      return null;
  }
}

function LoginForm({ onSuccess }: { onSuccess: (session: DesignerSession) => void }) {
  const { toast } = useToast();
  const [inviteCode, setInviteCode] = useState("");

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/designer/auth/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Invalid invite code");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.sessionToken) {
        setSessionToken(data.sessionToken);
        onSuccess(data);
        toast({
          title: "Login Successful",
          description: "Welcome to the Designer Portal",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid invite code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim()) {
      loginMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Designer Portal
          </CardTitle>
          <CardDescription>
            Enter your invite code to access your assigned proof requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="pl-10"
                  placeholder="Enter your invite code"
                  required
                  data-testid="input-invite-code"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The invite code was provided in your invitation email.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending || !inviteCode.trim()}
              className="w-full"
              data-testid="button-login"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                "Access Portal"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ProofRequestsList({ token }: { token: string }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    printVendor: "",
    area: "",
    category: "",
    dimensions: "",
    printSide: "",
    material: "",
    eventId: "",
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/designer/events"],
    queryFn: async () => {
      const response = await fetch("/api/designer/events", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Failed to load events");
      }
      return response.json();
    },
  });

  const { data: requests, isLoading, error } = useQuery<ProofRequestWithDetails[]>({
    queryKey: ["/api/designer/proof-requests"],
    queryFn: async () => {
      const response = await fetch("/api/designer/proof-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 401) {
          clearSessionToken();
          window.location.reload();
          throw new Error("Session expired");
        }
        throw new Error("Failed to load submissions");
      }
      return response.json();
    },
  });

  const createSubmissionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/designer/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create submission");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Submission Created", description: "Now upload your proof files." });
      setCreateDialogOpen(false);
      setFormData({ title: "", description: "", printVendor: "", area: "", category: "", dimensions: "", printSide: "", material: "", eventId: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/designer/proof-requests"] });
      setLocation(`/designer/proof/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create submission",
        variant: "destructive",
      });
    },
  });

  const handleCreateSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim() && formData.eventId) {
      createSubmissionMutation.mutate(formData);
    }
  };

  const handleLogout = () => {
    clearSessionToken();
    toast({ title: "Logged out successfully" });
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-9 w-24" />
          </div>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>Failed to load proof requests. Please try refreshing the page.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <FileImage className="h-6 w-6" />
              Designer Portal
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              My Submissions
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-submission">
                  <Plus className="h-4 w-4 mr-2" />
                  New Submission
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>New Proof Submission</DialogTitle>
                  <DialogDescription>
                    Create a new proof submission. After creating, you can upload your proof files.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSubmission} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventId">Event *</Label>
                    <Select
                      value={formData.eventId}
                      onValueChange={(value) => setFormData({ ...formData, eventId: value })}
                    >
                      <SelectTrigger data-testid="select-submission-event">
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Event Banner Design"
                      required
                      data-testid="input-submission-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your submission..."
                      data-testid="input-submission-description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="printVendor">Print Vendor</Label>
                      <Input
                        id="printVendor"
                        value={formData.printVendor}
                        onChange={(e) => setFormData({ ...formData, printVendor: e.target.value })}
                        placeholder="Vendor name"
                        data-testid="input-submission-vendor"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="area">Area</Label>
                      <Input
                        id="area"
                        value={formData.area}
                        onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                        placeholder="e.g., Main Stage"
                        data-testid="input-submission-area"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Signage, Banner, Poster"
                      data-testid="input-submission-category"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dimensions">Dimensions</Label>
                      <Input
                        id="dimensions"
                        value={formData.dimensions}
                        onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                        placeholder="e.g., 24x36 inches"
                        data-testid="input-submission-dimensions"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="printSide">Print Side</Label>
                      <Select
                        value={formData.printSide}
                        onValueChange={(value) => setFormData({ ...formData, printSide: value })}
                      >
                        <SelectTrigger data-testid="select-submission-print-side">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single-sided</SelectItem>
                          <SelectItem value="double">Double-sided</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="material">Material</Label>
                    <Input
                      id="material"
                      value={formData.material}
                      onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                      placeholder="e.g., Vinyl, Paper, Canvas"
                      data-testid="input-submission-material"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createSubmissionMutation.isPending || !formData.title.trim() || !formData.eventId} data-testid="button-create-submission">
                      {createSubmissionMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Submission"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {requests && requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card
                key={request.id}
                className="hover-elevate cursor-pointer"
                onClick={() => setLocation(`/designer/proof/${request.id}`)}
                data-testid={`card-proof-request-${request.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{request.title}</CardTitle>
                      {request.event?.name && (
                        <CardDescription>{request.event.name}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={request.status || "pending_upload"} />
                      {request.priority && <PriorityBadge priority={request.priority} />}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {request.category && (
                      <div className="flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        <span data-testid={`text-category-${request.id}`}>{request.category}</span>
                      </div>
                    )}
                    {request.printVendor && (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        <span data-testid={`text-vendor-${request.id}`}>{request.printVendor}</span>
                      </div>
                    )}
                    {request.area && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span data-testid={`text-area-${request.id}`}>{request.area}</span>
                      </div>
                    )}
                    {request.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span data-testid={`text-due-date-${request.id}`}>
                          Due: {format(new Date(request.dueDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button variant="ghost" size="sm" data-testid={`button-view-${request.id}`}>
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileImage className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No submissions yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first submission to get started.
              </p>
              <Button className="mt-4" onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first-submission">
                <Plus className="h-4 w-4 mr-2" />
                New Submission
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function DesignerPortal() {
  const [location] = useLocation();
  const [session, setSession] = useState<DesignerSession | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get("code");
      const existingToken = getSessionToken();

      if (codeFromUrl) {
        try {
          const response = await fetch("/api/designer/auth/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inviteCode: codeFromUrl }),
          });
          if (response.ok) {
            const data = await response.json();
            setSessionToken(data.sessionToken);
            setSession(data);
            window.history.replaceState({}, "", "/designer");
          }
        } catch {
        }
        setIsValidating(false);
        return;
      }

      if (existingToken) {
        try {
          const response = await fetch("/api/designer/auth/me", {
            headers: { Authorization: `Bearer ${existingToken}` },
          });
          if (response.ok) {
            const data = await response.json();
            setSession({ designerId: data.id, sessionToken: existingToken, designer: data });
          } else {
            clearSessionToken();
          }
        } catch {
          clearSessionToken();
        }
      }
      setIsValidating(false);
    };

    validateSession();
  }, []);

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginForm onSuccess={setSession} />;
  }

  return <ProofRequestsList token={session.sessionToken} />;
}
