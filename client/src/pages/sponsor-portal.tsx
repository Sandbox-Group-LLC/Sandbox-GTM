import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Building2,
  Mail,
  Phone,
  User,
  Globe,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ClipboardList,
  Users,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  ImageIcon,
  Trash2,
  Send,
} from "lucide-react";
import { SiLinkedin, SiX, SiFacebook, SiInstagram } from "react-icons/si";
import type { EventSponsor, SponsorTask, SponsorTaskCompletion } from "@shared/schema";

interface SponsorWithEvent extends EventSponsor {
  event?: {
    id: string;
    name: string;
    publicSlug: string;
  };
}

interface TasksResponse {
  tasks: SponsorTask[];
  completions: SponsorTaskCompletion[];
}

const profileFormSchema = z.object({
  bio: z.string().optional(),
  contactEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  logoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  socialLinks: z.object({
    linkedin: z.string().url("Invalid URL").optional().or(z.literal("")),
    twitter: z.string().url("Invalid URL").optional().or(z.literal("")),
    facebook: z.string().url("Invalid URL").optional().or(z.literal("")),
    instagram: z.string().url("Invalid URL").optional().or(z.literal("")),
  }).optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

function getToken(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("token");
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    case "submitted":
      return (
        <Badge variant="default" className="bg-yellow-600">
          <Clock className="w-3 h-3 mr-1" />
          Submitted
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
  }
}

function ProfileTab({ sponsor, token }: { sponsor: SponsorWithEvent; token: string }) {
  const { toast } = useToast();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      bio: sponsor.bio || "",
      contactEmail: sponsor.contactEmail || "",
      contactName: sponsor.contactName || "",
      contactPhone: sponsor.contactPhone || "",
      logoUrl: sponsor.logoUrl || "",
      socialLinks: {
        linkedin: sponsor.socialLinks?.linkedin || "",
        twitter: sponsor.socialLinks?.twitter || "",
        facebook: sponsor.socialLinks?.facebook || "",
        instagram: sponsor.socialLinks?.instagram || "",
      },
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await fetch(`/api/sponsor-portal/profile?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your company profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sponsor-portal/auth", token] });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Information
          </CardTitle>
          <CardDescription>Your current sponsorship details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Company Name</p>
              <p className="font-medium" data-testid="text-company-name">{sponsor.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tier</p>
              <Badge variant="outline" className="capitalize" data-testid="badge-tier">
                {sponsor.tier}
              </Badge>
            </div>
            {sponsor.websiteUrl && (
              <div>
                <p className="text-sm text-muted-foreground">Website</p>
                <a
                  href={sponsor.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm flex items-center gap-1 hover:underline"
                  data-testid="link-website"
                >
                  {sponsor.websiteUrl}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {sponsor.logoUrl && (
              <div>
                <p className="text-sm text-muted-foreground">Logo</p>
                <img
                  src={sponsor.logoUrl}
                  alt={`${sponsor.name} logo`}
                  className="h-12 w-auto object-contain mt-1"
                  data-testid="img-logo"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Editable Profile</CardTitle>
          <CardDescription>Update your company details for the event</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell attendees about your company..."
                        className="min-h-[120px]"
                        {...field}
                        data-testid="input-bio"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Company Logo</FormLabel>
                <div className="flex items-start gap-4 flex-wrap">
                  {form.watch("logoUrl") ? (
                    <div className="relative">
                      <img
                        src={form.watch("logoUrl")}
                        alt="Company logo"
                        className="h-24 w-auto max-w-48 object-contain border rounded-md p-2"
                        data-testid="img-logo-preview"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => form.setValue("logoUrl", "")}
                        data-testid="button-remove-logo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-24 w-24 border rounded-md flex items-center justify-center bg-muted">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <ObjectUploader
                      onComplete={(result) => form.setValue("logoUrl", result.uploadUrl)}
                      accept="image/*"
                      buttonText="Upload Logo"
                      buttonVariant="outline"
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: Square image, at least 200x200 pixels
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input placeholder="Primary contact name" className="pl-10" {...field} data-testid="input-contact-name" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="email" placeholder="contact@company.com" className="pl-10" {...field} data-testid="input-contact-email" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="tel" placeholder="+1 (555) 123-4567" className="pl-10" {...field} data-testid="input-contact-phone" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Social Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="socialLinks.linkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <SiLinkedin className="w-4 h-4" />
                          LinkedIn
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://linkedin.com/company/..." {...field} data-testid="input-linkedin" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialLinks.twitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <SiX className="w-4 h-4" />
                          X (Twitter)
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://x.com/..." {...field} data-testid="input-twitter" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialLinks.facebook"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <SiFacebook className="w-4 h-4" />
                          Facebook
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://facebook.com/..." {...field} data-testid="input-facebook" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialLinks.instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <SiInstagram className="w-4 h-4" />
                          Instagram
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://instagram.com/..." {...field} data-testid="input-instagram" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Profile"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function TaskCompletionForm({
  task,
  completion,
  token,
  onSuccess,
}: {
  task: SponsorTask;
  completion?: SponsorTaskCompletion;
  token: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const existing = completion?.submittedData as Record<string, string> | undefined;
    return existing || {};
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sponsor-portal/task-completions/${task.id}?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submittedData: formData }),
      });
      if (!res.ok) throw new Error("Failed to submit task");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Task submitted",
        description: "Your task submission has been received.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Submission failed",
        description: "There was an error submitting your task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isSubmitted = completion?.status === "submitted" || completion?.status === "approved";
  const isRejected = completion?.status === "rejected";

  const renderFormFields = () => {
    switch (task.taskType) {
      case "company_info":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Company Information</label>
              <Textarea
                value={formData.companyInfo || ""}
                onChange={(e) => setFormData({ ...formData, companyInfo: e.target.value })}
                placeholder="Enter your company information..."
                className="mt-1"
                disabled={isSubmitted}
                data-testid={`input-task-${task.id}-company-info`}
              />
            </div>
          </div>
        );
      case "logo_upload":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Logo URL</label>
              <Input
                value={formData.logoUrl || ""}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="mt-1"
                disabled={isSubmitted}
                data-testid={`input-task-${task.id}-logo-url`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Provide a direct URL to your company logo
              </p>
            </div>
          </div>
        );
      case "social_links":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">LinkedIn</label>
              <Input
                value={formData.linkedin || ""}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                placeholder="https://linkedin.com/company/..."
                className="mt-1"
                disabled={isSubmitted}
                data-testid={`input-task-${task.id}-linkedin`}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Twitter/X</label>
              <Input
                value={formData.twitter || ""}
                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                placeholder="https://x.com/..."
                className="mt-1"
                disabled={isSubmitted}
                data-testid={`input-task-${task.id}-twitter`}
              />
            </div>
          </div>
        );
      case "bio":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Company Bio</label>
              <Textarea
                value={formData.bio || ""}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Write a brief description of your company..."
                className="mt-1 min-h-[150px]"
                disabled={isSubmitted}
                data-testid={`input-task-${task.id}-bio`}
              />
            </div>
          </div>
        );
      case "document_upload":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Document URL</label>
              <Input
                value={formData.documentUrl || ""}
                onChange={(e) => setFormData({ ...formData, documentUrl: e.target.value })}
                placeholder="https://example.com/document.pdf"
                className="mt-1"
                disabled={isSubmitted}
                data-testid={`input-task-${task.id}-document-url`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Provide a direct URL to your document
              </p>
            </div>
          </div>
        );
      case "custom":
      default:
        const requiredFields = (task.requiredFields as string[]) || ["response"];
        return (
          <div className="space-y-4">
            {requiredFields.map((field) => (
              <div key={field}>
                <label className="text-sm font-medium capitalize">{field.replace(/_/g, " ")}</label>
                <Input
                  value={formData[field] || ""}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  placeholder={`Enter ${field.replace(/_/g, " ")}...`}
                  className="mt-1"
                  disabled={isSubmitted}
                  data-testid={`input-task-${task.id}-${field}`}
                />
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {renderFormFields()}

      {isRejected && completion?.reviewNotes && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm font-medium text-destructive">Reviewer Notes:</p>
          <p className="text-sm text-destructive/80">{completion.reviewNotes}</p>
        </div>
      )}

      {!isSubmitted && (
        <Button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending}
          data-testid={`button-submit-task-${task.id}`}
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : isRejected ? (
            "Resubmit"
          ) : (
            "Submit"
          )}
        </Button>
      )}
    </div>
  );
}

function TasksTab({ token }: { token: string }) {
  const { data, isLoading, refetch } = useQuery<TasksResponse>({
    queryKey: ["/api/sponsor-portal/tasks", token],
    queryFn: async () => {
      const res = await fetch(`/api/sponsor-portal/tasks?token=${token}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!data || data.tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No tasks assigned yet</p>
        </CardContent>
      </Card>
    );
  }

  const getCompletionForTask = (taskId: string) =>
    data.completions.find((c) => c.taskId === taskId);

  return (
    <div className="space-y-4">
      {data.tasks.map((task) => {
        const completion = getCompletionForTask(task.id);
        const status = completion?.status || "pending";

        return (
          <Card key={task.id} data-testid={`card-task-${task.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-lg">{task.name}</CardTitle>
                  {task.description && (
                    <CardDescription className="mt-1">{task.description}</CardDescription>
                  )}
                </div>
                <StatusBadge status={status} />
              </div>
              <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground mt-2">
                <span className="capitalize">Type: {task.taskType?.replace(/_/g, " ")}</span>
                {task.dueDate && (
                  <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                )}
                {task.isRequired && <Badge variant="outline">Required</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <TaskCompletionForm
                task={task}
                completion={completion}
                token={token}
                onSuccess={() => refetch()}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string | null;
  createdAt?: Date | string | null;
}

interface TeamMembersResponse {
  teamMembers: TeamMember[];
}

const teamMemberFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  jobTitle: z.string().optional(),
});

type TeamMemberFormData = z.infer<typeof teamMemberFormSchema>;

function SendInviteButton({ attendeeId, memberName }: { attendeeId: string; memberName: string }) {
  const token = getToken();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const handleSendInvite = async () => {
    if (!token) return;
    
    setSending(true);
    try {
      const res = await fetch(`/api/sponsor-portal/team-members/${attendeeId}/send-invite?token=${token}`, {
        method: "POST",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to send invite");
      }
      
      toast({
        title: "Invite Sent",
        description: `An invitation email has been sent to ${memberName}.`,
      });
    } catch (error) {
      toast({
        title: "Failed to Send Invite",
        description: error instanceof Error ? error.message : "Could not send the invitation email.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleSendInvite}
      disabled={sending}
      data-testid={`button-send-invite-${attendeeId}`}
      title="Send invitation email"
    >
      {sending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
    </Button>
  );
}

function TeamTab({ sponsor, token }: { sponsor: SponsorWithEvent; token: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: teamData, isLoading: teamLoading, refetch: refetchTeam } = useQuery<TeamMembersResponse>({
    queryKey: ["/api/sponsor-portal/team-members", token],
    queryFn: async () => {
      const res = await fetch(`/api/sponsor-portal/team-members?token=${token}`);
      if (!res.ok) throw new Error("Failed to fetch team members");
      return res.json();
    },
  });

  const { data: sponsorData } = useQuery<SponsorWithEvent>({
    queryKey: ["/api/sponsor-portal/auth", token],
  });

  const currentSponsor = sponsorData || sponsor;
  const seatsUsed = currentSponsor.seatsUsed || 0;
  const totalSeats = currentSponsor.registrationSeats || 0;
  const seatsRemaining = Math.max(0, totalSeats - seatsUsed);
  const progressPercent = totalSeats > 0 ? (seatsUsed / totalSeats) * 100 : 0;

  const form = useForm<TeamMemberFormData>({
    resolver: zodResolver(teamMemberFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      jobTitle: "",
    },
  });

  const addTeamMemberMutation = useMutation({
    mutationFn: async (data: TeamMemberFormData) => {
      const res = await fetch(`/api/sponsor-portal/team-members?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to add team member");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Team member added",
        description: "The team member has been registered successfully.",
      });
      form.reset();
      refetchTeam();
      queryClient.invalidateQueries({ queryKey: ["/api/sponsor-portal/auth", token] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TeamMemberFormData) => {
    addTeamMemberMutation.mutate(data);
  };

  const inviteLink = currentSponsor.event?.publicSlug && currentSponsor.baseInviteCodeId
    ? `${import.meta.env.VITE_APP_URL || window.location.origin}/event/${currentSponsor.event.publicSlug}/register?invite=${currentSponsor.baseInviteCodeId}`
    : null;

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const teamMembers = teamData?.teamMembers || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Registration Seats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold" data-testid="text-seats-used">
              {seatsUsed}
            </div>
            <div className="text-muted-foreground">
              of {totalSeats} seats used
            </div>
          </div>
          {totalSeats > 0 && (
            <div className="space-y-2">
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  data-testid="progress-seats"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {seatsRemaining > 0 ? (
                  <>{seatsRemaining} seat{seatsRemaining !== 1 ? "s" : ""} remaining</>
                ) : (
                  <>All seats have been used</>
                )}
              </p>
            </div>
          )}
          {totalSeats === 0 && (
            <p className="text-sm text-muted-foreground">
              No team registration seats allocated for this sponsorship
            </p>
          )}
        </CardContent>
      </Card>

      {seatsRemaining > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Add Team Member
            </CardTitle>
            <CardDescription>
              Register a new team member for the event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} data-testid="input-team-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} data-testid="input-team-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="email" placeholder="john@company.com" className="pl-10" {...field} data-testid="input-team-email" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Software Engineer" {...field} data-testid="input-team-job-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={addTeamMemberMutation.isPending} data-testid="button-add-team-member">
                  {addTeamMemberMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Team Member"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {inviteLink && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Link</CardTitle>
            <CardDescription>
              Share this link with your team members to self-register for the event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input value={inviteLink} readOnly className="font-mono text-sm" data-testid="input-invite-link" />
              <Button variant="outline" size="icon" onClick={copyInviteLink} data-testid="button-copy-link">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Team members registered using your sponsor activation key
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No team members have registered yet</p>
              {seatsRemaining > 0 && (
                <p className="text-sm mt-2">
                  Use the form above or share the invite link with your team
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-3 rounded-md border bg-muted/30"
                  data-testid={`team-member-${member.id}`}
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" data-testid={`text-member-name-${member.id}`}>
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground truncate" data-testid={`text-member-email-${member.id}`}>
                      {member.email}
                    </p>
                  </div>
                  {member.jobTitle && (
                    <Badge variant="secondary" className="hidden sm:inline-flex" data-testid={`badge-member-title-${member.id}`}>
                      {member.jobTitle}
                    </Badge>
                  )}
                  <SendInviteButton 
                    attendeeId={member.id} 
                    memberName={`${member.firstName} ${member.lastName}`}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SponsorPortal() {
  const token = getToken();
  const { toast } = useToast();

  const { data: sponsor, isLoading, error } = useQuery<SponsorWithEvent>({
    queryKey: ["/api/sponsor-portal/auth", token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      const res = await fetch(`/api/sponsor-portal/auth?token=${token}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Invalid or expired token");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-error-title">Access Token Required</h2>
            <p className="text-muted-foreground mb-4">
              Please use the sponsor portal link provided by the event organizer.
            </p>
            <p className="text-sm text-muted-foreground">
              If you need access, please contact the event organizer for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !sponsor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-error-title">Invalid Access Token</h2>
            <p className="text-muted-foreground mb-4">
              {(error as Error)?.message || "The provided token is invalid or has expired."}
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact the event organizer for a new sponsor portal link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            {sponsor.logoUrl && (
              <img
                src={sponsor.logoUrl}
                alt={`${sponsor.name} logo`}
                className="h-12 w-auto object-contain"
                data-testid="img-header-logo"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-sponsor-name">{sponsor.name}</h1>
              {sponsor.event && (
                <p className="text-muted-foreground" data-testid="text-event-name">
                  {sponsor.event.name} Sponsor Portal
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList data-testid="tabs-navigation">
            <TabsTrigger value="profile" data-testid="tab-profile">
              <Building2 className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="tasks" data-testid="tab-tasks">
              <ClipboardList className="w-4 h-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="team" data-testid="tab-team">
              <Users className="w-4 h-4 mr-2" />
              Team
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileTab sponsor={sponsor} token={token} />
          </TabsContent>

          <TabsContent value="tasks">
            <TasksTab token={token} />
          </TabsContent>

          <TabsContent value="team">
            <TeamTab sponsor={sponsor} token={token} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
