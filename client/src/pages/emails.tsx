import { useState, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { titleCase } from "@/lib/utils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Switch } from "@/components/ui/switch";
import { Plus, Mail, Send, Clock, CheckCircle, FileText, Copy, Trash2, X, Type, Palette, Library, Pencil, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { EventSelectField } from "@/components/event-select-field";
import { MergeTagPicker } from "@/components/merge-tag-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EmailCampaign, EmailTemplate, Event, BrandKit, EmailTemplateLibrary } from "@shared/schema";

const emailStylesSchema = z.object({
  alignment: z.enum(["left", "center", "right"]).optional(),
  headingFont: z.string().optional(),
  headingSize: z.enum(["sm", "base", "lg", "xl", "2xl", "3xl", "4xl"]).optional(),
  headingWeight: z.enum(["normal", "medium", "semibold", "bold"]).optional(),
  headingColor: z.string().optional(),
  bodyFont: z.string().optional(),
  bodySize: z.enum(["sm", "base", "lg"]).optional(),
  bodyColor: z.string().optional(),
  lineHeight: z.enum(["tight", "normal", "relaxed"]).optional(),
}).optional();

const emailFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  recipientType: z.string().default("all"),
  status: z.string().default("draft"),
  scheduledAt: z.string().optional(),
  isInviteEmail: z.boolean().default(false),
  styles: emailStylesSchema,
});

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  campaignType: z.string().optional(),
  funnelStage: z.string().optional(),
  campaignRole: z.string().default("general"),
  headerImageUrl: z.string().optional(),
  isInviteEmail: z.boolean().default(false),
  styles: emailStylesSchema,
});

const libraryTemplateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  purpose: z.string().optional(),
  timing: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  campaignType: z.string().min(1, "Campaign type is required"),
  funnelStage: z.string().min(1, "Funnel stage is required"),
  campaignRole: z.string().min(1, "Campaign role is required"),
  isActive: z.boolean().default(true),
  headerImageUrl: z.string().optional(),
  styles: emailStylesSchema,
});

const CAMPAIGN_TYPE_OPTIONS = [
  { value: "program_acquisition", label: "Program Acquisition" },
  { value: "attendee_communications", label: "Attendee Communications" },
  { value: "post_event_followup", label: "Post-Event Follow-Up" },
  { value: "sponsor_communications", label: "Sponsor Communications" },
  { value: "internal_operations", label: "Internal / Operations" },
];

const FUNNEL_STAGE_OPTIONS = [
  { value: "awareness", label: "Awareness" },
  { value: "consideration", label: "Consideration" },
  { value: "conversion", label: "Conversion" },
  { value: "retention", label: "Retention" },
];

const CAMPAIGN_ROLE_OPTIONS = [
  { value: "save_the_date", label: "Save the Date" },
  { value: "invitation", label: "Invitation" },
  { value: "reminder", label: "Reminder" },
  { value: "last_call", label: "Last Call" },
  { value: "abandonment", label: "Abandonment" },
  { value: "confirmation", label: "Confirmation" },
  { value: "followup", label: "Follow-Up" },
];

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Lato", label: "Lato" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Poppins", label: "Poppins" },
  { value: "Oswald", label: "Oswald" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Raleway", label: "Raleway" },
  { value: "Source Sans Pro", label: "Source Sans Pro" },
  { value: "Merriweather", label: "Merriweather" },
  { value: "Nunito", label: "Nunito" },
];

const ALIGNMENT_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const HEADING_SIZE_OPTIONS = [
  { value: "sm", label: "Small" },
  { value: "base", label: "Base" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra Large" },
  { value: "2xl", label: "2XL" },
  { value: "3xl", label: "3XL" },
  { value: "4xl", label: "4XL" },
];

const BODY_SIZE_OPTIONS = [
  { value: "sm", label: "Small" },
  { value: "base", label: "Normal" },
  { value: "lg", label: "Large" },
];

const HEADING_WEIGHT_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "medium", label: "Medium" },
  { value: "semibold", label: "Semibold" },
  { value: "bold", label: "Bold" },
];

const LINE_HEIGHT_OPTIONS = [
  { value: "tight", label: "Tight" },
  { value: "normal", label: "Normal" },
  { value: "relaxed", label: "Relaxed" },
];

type EmailFormData = z.infer<typeof emailFormSchema>;
type TemplateFormData = z.infer<typeof templateFormSchema>;
type LibraryTemplateFormData = z.infer<typeof libraryTemplateFormSchema>;

const statusConfig: Record<string, { icon: typeof FileText; color: "default" | "secondary" | "outline" }> = {
  draft: { icon: FileText, color: "secondary" },
  scheduled: { icon: Clock, color: "outline" },
  sent: { icon: CheckCircle, color: "default" },
};

const getCampaignRoleLabel = (value: string): string => {
  const option = CAMPAIGN_ROLE_OPTIONS.find(opt => opt.value === value);
  return option ? option.label : value;
};

export default function Emails() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isSuperAdmin = (user?.email?.toLowerCase().endsWith("@makemysandbox.com") || user?.isAdmin) ?? false;

  const [activeTab, setActiveTab] = useState("campaigns");
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isLibraryDialogOpen, setIsLibraryDialogOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<EmailCampaign | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editingLibraryTemplate, setEditingLibraryTemplate] = useState<EmailTemplateLibrary | null>(null);
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [selectedLibraryTemplate, setSelectedLibraryTemplate] = useState<EmailTemplateLibrary | null>(null);

  const campaignSubjectRef = useRef<HTMLInputElement>(null);
  const campaignContentRef = useRef<HTMLTextAreaElement>(null);
  const templateSubjectRef = useRef<HTMLInputElement>(null);
  const templateContentRef = useRef<HTMLTextAreaElement>(null);
  const librarySubjectRef = useRef<HTMLInputElement>(null);
  const libraryContentRef = useRef<HTMLTextAreaElement>(null);

  const { data: emailsData, isLoading: emailsLoading } = useQuery<EmailCampaign[] | null>({
    queryKey: ["/api/emails"],
  });
  const emails = emailsData ?? [];

  const { data: templatesData, isLoading: templatesLoading } = useQuery<EmailTemplate[] | null>({
    queryKey: ["/api/email-templates"],
  });
  const templates = templatesData ?? [];

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: brandKits = [] } = useQuery<BrandKit[]>({
    queryKey: ["/api/brand-kits"],
  });

  const { data: libraryTemplates = [], isLoading: libraryLoading } = useQuery<EmailTemplateLibrary[]>({
    queryKey: ["/api/email-template-library"],
  });

  const eventMap = new Map(events.map((e) => [e.id, e.name]));
  const filteredEmails = eventFilter === "all" 
    ? emails 
    : emails.filter((email) => email.eventId === eventFilter);

  const campaignForm = useForm<EmailFormData>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      eventId: "",
      subject: "",
      content: "",
      recipientType: "all",
      status: "draft",
      scheduledAt: "",
      isInviteEmail: false,
      styles: {},
    },
  });

  const templateForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      subject: "",
      content: "",
      campaignType: "",
      funnelStage: "",
      campaignRole: "general",
      headerImageUrl: "",
      isInviteEmail: false,
      styles: {},
    },
  });

  const libraryTemplateForm = useForm<LibraryTemplateFormData>({
    resolver: zodResolver(libraryTemplateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      purpose: "",
      timing: "",
      subject: "",
      content: "",
      campaignType: "",
      funnelStage: "",
      campaignRole: "",
      isActive: true,
      headerImageUrl: "",
      styles: {},
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      const payload = {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
      };
      return await apiRequest("POST", "/api/emails", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({ title: "Email campaign created successfully" });
      setIsCampaignDialogOpen(false);
      campaignForm.reset();
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

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EmailFormData }) => {
      const payload = {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
      };
      return await apiRequest("PATCH", `/api/emails/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({ title: "Email campaign updated successfully" });
      setIsCampaignDialogOpen(false);
      setEditingEmail(null);
      campaignForm.reset();
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

  const sendCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/emails/${id}/send`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({ 
        title: "Campaign sent successfully", 
        description: `${data.totalSent} emails sent${data.totalFailed > 0 ? `, ${data.totalFailed} failed` : ''}` 
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Failed to send campaign", description: error.message, variant: "destructive" });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      return await apiRequest("POST", "/api/email-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({ title: "Email template created successfully" });
      setIsTemplateDialogOpen(false);
      templateForm.reset();
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

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TemplateFormData }) => {
      return await apiRequest("PATCH", `/api/email-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({ title: "Email template updated successfully" });
      setIsTemplateDialogOpen(false);
      setEditingTemplate(null);
      templateForm.reset();
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

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/email-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({ title: "Email template deleted" });
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

  const importLibraryTemplateMutation = useMutation({
    mutationFn: async ({ templateId, eventId }: { templateId: string; eventId?: string }) => {
      return await apiRequest("POST", `/api/email-template-library/${templateId}/import`, { eventId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({ title: "Template imported successfully!" });
      setActiveTab("templates");
    },
    onError: () => {
      toast({ title: "Failed to import template", variant: "destructive" });
    },
  });

  const createLibraryTemplateMutation = useMutation({
    mutationFn: async (data: LibraryTemplateFormData) => {
      return await apiRequest("POST", "/api/email-template-library", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-template-library"] });
      toast({ title: "Library template created successfully" });
      setIsLibraryDialogOpen(false);
      libraryTemplateForm.reset();
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

  const updateLibraryTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: LibraryTemplateFormData }) => {
      return await apiRequest("PATCH", `/api/email-template-library/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-template-library"] });
      toast({ title: "Library template updated successfully" });
      setIsLibraryDialogOpen(false);
      setEditingLibraryTemplate(null);
      libraryTemplateForm.reset();
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

  const deleteLibraryTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/email-template-library/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-template-library"] });
      toast({ title: "Library template deleted" });
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

  const toggleLibraryTemplateActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/email-template-library/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-template-library"] });
      toast({ title: "Template status updated" });
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

  const onSubmitCampaign = (data: EmailFormData) => {
    if (editingEmail) {
      updateCampaignMutation.mutate({ id: editingEmail.id, data });
    } else {
      createCampaignMutation.mutate(data);
    }
  };

  const onSubmitTemplate = (data: TemplateFormData) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleEditCampaign = (email: EmailCampaign) => {
    setEditingEmail(email);
    campaignForm.reset({
      eventId: email.eventId,
      subject: email.subject,
      content: email.content,
      recipientType: email.recipientType || "all",
      status: email.status || "draft",
      scheduledAt: email.scheduledAt ? new Date(email.scheduledAt).toISOString().slice(0, 16) : "",
      isInviteEmail: email.isInviteEmail || false,
      styles: email.styles || {},
    });
    setIsCampaignDialogOpen(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    templateForm.reset({
      name: template.name,
      subject: template.subject,
      content: template.content,
      campaignType: template.campaignType || "",
      funnelStage: template.funnelStage || "",
      campaignRole: template.campaignRole || "general",
      headerImageUrl: template.headerImageUrl || "",
      isInviteEmail: template.isInviteEmail || false,
      styles: template.styles || {},
    });
    setIsTemplateDialogOpen(true);
  };

  const handleUseTemplate = (template: EmailTemplate) => {
    campaignForm.reset({
      eventId: "",
      subject: template.subject,
      content: template.content,
      recipientType: "all",
      status: "draft",
      scheduledAt: "",
      isInviteEmail: template.isInviteEmail || false,
      styles: template.styles || {},
    });
    setActiveTab("campaigns");
    setIsCampaignDialogOpen(true);
    toast({ title: "Template loaded", description: "Edit and send your campaign" });
  };

  const handleCampaignDialogClose = () => {
    setIsCampaignDialogOpen(false);
    setEditingEmail(null);
    campaignForm.reset();
  };

  const handleTemplateDialogClose = () => {
    setIsTemplateDialogOpen(false);
    setEditingTemplate(null);
    templateForm.reset();
  };

  const handleEditLibraryTemplate = (template: EmailTemplateLibrary) => {
    setEditingLibraryTemplate(template);
    libraryTemplateForm.reset({
      name: template.name,
      description: template.description || "",
      purpose: template.purpose || "",
      timing: template.timing || "",
      subject: template.subject,
      content: template.content,
      campaignType: template.campaignType || "",
      funnelStage: template.funnelStage || "",
      campaignRole: template.campaignRole || "",
      isActive: template.isActive ?? true,
      headerImageUrl: template.headerImageUrl || "",
      styles: template.styles as any,
    });
    setIsLibraryDialogOpen(true);
  };

  const handleLibraryDialogClose = () => {
    setIsLibraryDialogOpen(false);
    setEditingLibraryTemplate(null);
    libraryTemplateForm.reset();
  };

  const onSubmitLibraryTemplate = (data: LibraryTemplateFormData) => {
    if (editingLibraryTemplate) {
      updateLibraryTemplateMutation.mutate({ id: editingLibraryTemplate.id, data });
    } else {
      createLibraryTemplateMutation.mutate(data);
    }
  };

  const handleRemoveLibraryImage = () => {
    libraryTemplateForm.setValue("headerImageUrl", "");
  };

  const sendTestEmailMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return await apiRequest("POST", `/api/email-templates/${templateId}/test-email`);
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Test email sent", 
        description: `Check your inbox at ${data.email}` 
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Failed to send test email", description: error.message, variant: "destructive" });
    },
  });


  const handleRemoveImage = () => {
    templateForm.setValue("headerImageUrl", "");
  };

  const campaignColumns = [
    {
      key: "subject",
      header: "Subject",
      cell: (email: EmailCampaign) => (
        <div className="font-medium max-w-md truncate">{email.subject}</div>
      ),
    },
    {
      key: "eventId",
      header: "Program",
      cell: (email: EmailCampaign) => (
        <div className="text-muted-foreground truncate max-w-[150px]">
          {eventMap.get(email.eventId) || "Unknown"}
        </div>
      ),
    },
    {
      key: "recipientType",
      header: "Recipients",
      cell: (email: EmailCampaign) => (
        <Badge variant="outline">{titleCase(email.recipientType || "all")}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (email: EmailCampaign) => {
        const config = statusConfig[email.status || "draft"];
        const StatusIcon = config.icon;
        return (
          <Badge variant={config.color} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {email.status || "draft"}
          </Badge>
        );
      },
    },
    {
      key: "scheduledAt",
      header: "Scheduled",
      cell: (email: EmailCampaign) =>
        email.scheduledAt
          ? new Date(email.scheduledAt).toLocaleString()
          : "-",
    },
    {
      key: "sentAt",
      header: "Sent",
      cell: (email: EmailCampaign) =>
        email.sentAt
          ? new Date(email.sentAt).toLocaleString()
          : "-",
    },
    {
      key: "actions",
      header: "",
      cell: (email: EmailCampaign) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditCampaign(email);
            }}
            data-testid={`button-edit-campaign-${email.id}`}
          >
            Edit
          </Button>
          {email.status === "draft" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                sendCampaignMutation.mutate(email.id);
              }}
              disabled={sendCampaignMutation.isPending}
              data-testid={`button-send-${email.id}`}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      className: "w-32",
    },
  ];

  const templateColumns = [
    {
      key: "name",
      header: "Template Name",
      cell: (template: EmailTemplate) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{template.name}</span>
          {template.libraryTemplateId && (
            <Badge variant="secondary" className="text-xs" title="Imported from template library">
              <Library className="h-3 w-3 mr-1" />
              Library
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      cell: (template: EmailTemplate) => (
        <div className="max-w-md truncate text-muted-foreground">{template.subject}</div>
      ),
    },
    {
      key: "campaignRole",
      header: "Campaign Role",
      cell: (template: EmailTemplate) => (
        <Badge variant="outline">{getCampaignRoleLabel(template.campaignRole || "general")}</Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (template: EmailTemplate) =>
        template.createdAt
          ? new Date(template.createdAt).toLocaleDateString()
          : "-",
    },
    {
      key: "actions",
      header: "",
      cell: (template: EmailTemplate) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleUseTemplate(template);
            }}
            title="Use template"
            data-testid={`button-use-template-${template.id}`}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditTemplate(template);
            }}
            data-testid={`button-edit-template-${template.id}`}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              deleteTemplateMutation.mutate(template.id);
            }}
            data-testid={`button-delete-template-${template.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: "w-40",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Email Campaigns"
        breadcrumbs={[{ label: "Email Campaigns" }]}
        actions={
          activeTab === "campaigns" ? (
            <div className="flex items-center gap-2">
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-event-filter">
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isCampaignDialogOpen} onOpenChange={(open) => open ? setIsCampaignDialogOpen(true) : handleCampaignDialogClose()}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-email">
                    <Plus className="h-4 w-4 mr-2" />
                    New Campaign
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingEmail ? "Edit Campaign" : "Create Email Campaign"}</DialogTitle>
                  <DialogDescription>
                    {editingEmail ? "Update your email campaign" : "Compose a new email to send to attendees"}
                  </DialogDescription>
                </DialogHeader>
                <Form {...campaignForm}>
                  <form onSubmit={campaignForm.handleSubmit(onSubmitCampaign)} className="space-y-4">
                    <EventSelectField control={campaignForm.control} />
                    <FormField
                      control={campaignForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-1">
                              <Input {...field} ref={campaignSubjectRef} placeholder="Email subject line" data-testid="input-subject" className="flex-1" />
                              <MergeTagPicker
                                onInsert={(tag) => field.onChange(field.value + tag)}
                                inputRef={campaignSubjectRef}
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={campaignForm.control}
                        name="recipientType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipients</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-recipients">
                                  <SelectValue placeholder="Select recipients" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">All Attendees</SelectItem>
                                <SelectItem value="confirmed">Confirmed Only</SelectItem>
                                <SelectItem value="pending">Pending Only</SelectItem>
                                <SelectItem value="speakers">Speakers</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={campaignForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-status">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={campaignForm.control}
                      name="scheduledAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Schedule For</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} data-testid="input-scheduled" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={campaignForm.control}
                      name="isInviteEmail"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Invite Email</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              When sent, this email will automatically update attendee status to "Invited"
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-campaign-invite-email"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={campaignForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <div className="flex items-start gap-1">
                              <Textarea
                                rows={10}
                                {...field}
                                ref={campaignContentRef}
                                placeholder="Write your email content here..."
                                data-testid="input-content"
                                className="flex-1"
                              />
                              <MergeTagPicker
                                onInsert={(tag) => field.onChange(field.value + tag)}
                                inputRef={campaignContentRef}
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="styling">
                        <AccordionTrigger data-testid="accordion-campaign-styling">
                          <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            Styling Options
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            {brandKits.length > 0 && (
                              <div className="flex items-center justify-between pb-2 border-b">
                                <span className="text-sm text-muted-foreground">Quick apply brand styling</span>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" data-testid="dropdown-campaign-apply-brand-kit">
                                      <Palette className="h-4 w-4 mr-2" />
                                      Apply Brand Kit
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {brandKits.map((kit) => (
                                      <DropdownMenuItem
                                        key={kit.id}
                                        data-testid={`dropdown-item-campaign-brand-kit-${kit.id}`}
                                        onClick={() => {
                                          campaignForm.setValue("styles.headingFont", kit.headingFontFamily || "");
                                          campaignForm.setValue("styles.headingColor", kit.textColor || "");
                                          campaignForm.setValue("styles.bodyFont", kit.fontFamily || "");
                                          campaignForm.setValue("styles.bodyColor", kit.textColor || "");
                                          toast({
                                            title: "Brand kit applied",
                                            description: `Applied "${kit.name}" styling to this campaign`,
                                          });
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div
                                            className="h-4 w-4 rounded border"
                                            style={{ backgroundColor: kit.primaryColor || "#6366f1" }}
                                          />
                                          <span>{kit.name}</span>
                                          {kit.isDefault && (
                                            <Badge variant="secondary" className="ml-1 text-xs">Default</Badge>
                                          )}
                                        </div>
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Text Alignment</Label>
                                <Select
                                  value={campaignForm.watch("styles.alignment") || "left"}
                                  onValueChange={(value) => campaignForm.setValue("styles.alignment", value as "left" | "center" | "right")}
                                >
                                  <SelectTrigger data-testid="select-campaign-alignment">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ALIGNMENT_OPTIONS.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Line Height</Label>
                                <Select
                                  value={campaignForm.watch("styles.lineHeight") || "normal"}
                                  onValueChange={(value) => campaignForm.setValue("styles.lineHeight", value as "tight" | "normal" | "relaxed")}
                                >
                                  <SelectTrigger data-testid="select-campaign-line-height">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {LINE_HEIGHT_OPTIONS.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="border-t pt-4">
                              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                <Type className="h-4 w-4" />
                                Heading Styles
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Heading Font</Label>
                                  <Select
                                    value={campaignForm.watch("styles.headingFont") || "default"}
                                    onValueChange={(value) => campaignForm.setValue("styles.headingFont", value === "default" ? "" : value)}
                                  >
                                    <SelectTrigger data-testid="select-campaign-heading-font">
                                      <SelectValue placeholder="Default" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="default">Default</SelectItem>
                                      {FONT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Heading Size</Label>
                                  <Select
                                    value={campaignForm.watch("styles.headingSize") || "2xl"}
                                    onValueChange={(value) => campaignForm.setValue("styles.headingSize", value as any)}
                                  >
                                    <SelectTrigger data-testid="select-campaign-heading-size">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {HEADING_SIZE_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Heading Weight</Label>
                                  <Select
                                    value={campaignForm.watch("styles.headingWeight") || "semibold"}
                                    onValueChange={(value) => campaignForm.setValue("styles.headingWeight", value as any)}
                                  >
                                    <SelectTrigger data-testid="select-campaign-heading-weight">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {HEADING_WEIGHT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Heading Color</Label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={campaignForm.watch("styles.headingColor") || "#1f2937"}
                                      onChange={(e) => campaignForm.setValue("styles.headingColor", e.target.value)}
                                      className="h-9 w-12 rounded border cursor-pointer"
                                      data-testid="input-campaign-heading-color-picker"
                                    />
                                    <Input
                                      value={campaignForm.watch("styles.headingColor") || ""}
                                      onChange={(e) => campaignForm.setValue("styles.headingColor", e.target.value)}
                                      placeholder="#1f2937"
                                      className="flex-1 font-mono text-sm"
                                      data-testid="input-campaign-heading-color"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="border-t pt-4">
                              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                <Type className="h-4 w-4" />
                                Body Styles
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Body Font</Label>
                                  <Select
                                    value={campaignForm.watch("styles.bodyFont") || "default"}
                                    onValueChange={(value) => campaignForm.setValue("styles.bodyFont", value === "default" ? "" : value)}
                                  >
                                    <SelectTrigger data-testid="select-campaign-body-font">
                                      <SelectValue placeholder="Default" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="default">Default</SelectItem>
                                      {FONT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Body Size</Label>
                                  <Select
                                    value={campaignForm.watch("styles.bodySize") || "base"}
                                    onValueChange={(value) => campaignForm.setValue("styles.bodySize", value as any)}
                                  >
                                    <SelectTrigger data-testid="select-campaign-body-size">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {BODY_SIZE_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2 col-span-2">
                                  <Label>Body Color</Label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={campaignForm.watch("styles.bodyColor") || "#4b5563"}
                                      onChange={(e) => campaignForm.setValue("styles.bodyColor", e.target.value)}
                                      className="h-9 w-12 rounded border cursor-pointer"
                                      data-testid="input-campaign-body-color-picker"
                                    />
                                    <Input
                                      value={campaignForm.watch("styles.bodyColor") || ""}
                                      onChange={(e) => campaignForm.setValue("styles.bodyColor", e.target.value)}
                                      placeholder="#4b5563"
                                      className="flex-1 font-mono text-sm"
                                      data-testid="input-campaign-body-color"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={handleCampaignDialogClose}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createCampaignMutation.isPending || updateCampaignMutation.isPending}
                        data-testid="button-submit-email"
                      >
                        {createCampaignMutation.isPending || updateCampaignMutation.isPending
                          ? "Saving..."
                          : editingEmail
                          ? "Update"
                          : "Create Campaign"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
              </Dialog>
            </div>
          ) : (
            <Dialog open={isTemplateDialogOpen} onOpenChange={(open) => open ? setIsTemplateDialogOpen(true) : handleTemplateDialogClose()}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-template">
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingTemplate ? "Edit Template" : "Create Email Template"}</DialogTitle>
                  <DialogDescription>
                    {editingTemplate ? "Update your email template" : "Create a reusable email template for campaigns"}
                  </DialogDescription>
                </DialogHeader>
                <Form {...templateForm}>
                  <form onSubmit={templateForm.handleSubmit(onSubmitTemplate)} className="space-y-4">
                    <FormField
                      control={templateForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Welcome Email" data-testid="input-template-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Campaign Classification Section */}
                    <div className="space-y-4 rounded-lg border p-4">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Campaign Classification</h4>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Classify this template to help organize your campaigns and track performance in the Acquisition Funnel.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={templateForm.control}
                          name="campaignType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Campaign Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-template-campaign-type">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {CAMPAIGN_TYPE_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">Purpose of the campaign</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={templateForm.control}
                          name="funnelStage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Funnel Stage</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-template-funnel-stage">
                                    <SelectValue placeholder="Select stage" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {FUNNEL_STAGE_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">Where in the funnel?</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={templateForm.control}
                          name="campaignRole"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Campaign Role</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || "general"}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-template-campaign-role">
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {CAMPAIGN_ROLE_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">What job does this email do?</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* Tag Intelligence Preview */}
                      {(templateForm.watch("campaignType") || templateForm.watch("funnelStage") || templateForm.watch("campaignRole")) && (
                        <div className="rounded-md bg-muted p-3">
                          <p className="text-sm text-muted-foreground">Sandbox will treat this email as:</p>
                          <p className="font-medium mt-1">
                            {CAMPAIGN_TYPE_OPTIONS.find(o => o.value === templateForm.watch("campaignType"))?.label || "—"}{" "}
                            → {FUNNEL_STAGE_OPTIONS.find(o => o.value === templateForm.watch("funnelStage"))?.label || "—"}{" "}
                            → {CAMPAIGN_ROLE_OPTIONS.find(o => o.value === templateForm.watch("campaignRole"))?.label || "—"}
                          </p>
                        </div>
                      )}
                    </div>
                    <FormField
                      control={templateForm.control}
                      name="isInviteEmail"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Invite Email</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              When sent, this email will automatically update attendee status to "Invited"
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-invite-email"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={templateForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject Line</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-1">
                              <Input {...field} ref={templateSubjectRef} placeholder="Email subject" data-testid="input-template-subject" className="flex-1" />
                              <MergeTagPicker
                                onInsert={(tag) => field.onChange(field.value + tag)}
                                inputRef={templateSubjectRef}
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={templateForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Content</FormLabel>
                          <FormControl>
                            <div className="flex items-start gap-1">
                              <Textarea
                                rows={12}
                                {...field}
                                ref={templateContentRef}
                                placeholder="Write your email template content here. Use properties like {{event.name}}, {{attendee.firstName}}..."
                                data-testid="input-template-content"
                                className="flex-1"
                              />
                              <MergeTagPicker
                                onInsert={(tag) => field.onChange(field.value + tag)}
                                inputRef={templateContentRef}
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={templateForm.control}
                      name="headerImageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Header Image URL (Optional)</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Input
                                  {...field}
                                  placeholder="https://example.com/header-image.png"
                                  data-testid="input-header-image-url"
                                  className="flex-1"
                                />
                                {field.value && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleRemoveImage}
                                    data-testid="button-remove-header-image"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              {field.value && (
                                <div className="relative">
                                  <img
                                    src={field.value}
                                    alt="Header preview"
                                    className="w-full max-h-40 object-contain rounded-md border"
                                    data-testid="img-header-preview"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                    onLoad={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'block';
                                    }}
                                  />
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Enter a URL to an image. Recommended size: 600x150 pixels. The image will appear at the top of the email.
                              </p>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="styling">
                        <AccordionTrigger data-testid="accordion-template-styling">
                          <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            Styling Options
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            {brandKits.length > 0 && (
                              <div className="flex items-center justify-between pb-2 border-b">
                                <span className="text-sm text-muted-foreground">Quick apply brand styling</span>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" data-testid="dropdown-template-apply-brand-kit">
                                      <Palette className="h-4 w-4 mr-2" />
                                      Apply Brand Kit
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {brandKits.map((kit) => (
                                      <DropdownMenuItem
                                        key={kit.id}
                                        data-testid={`dropdown-item-template-brand-kit-${kit.id}`}
                                        onClick={() => {
                                          templateForm.setValue("styles.headingFont", kit.headingFontFamily || "");
                                          templateForm.setValue("styles.headingColor", kit.textColor || "");
                                          templateForm.setValue("styles.bodyFont", kit.fontFamily || "");
                                          templateForm.setValue("styles.bodyColor", kit.textColor || "");
                                          toast({
                                            title: "Brand kit applied",
                                            description: `Applied "${kit.name}" styling to this template`,
                                          });
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div
                                            className="h-4 w-4 rounded border"
                                            style={{ backgroundColor: kit.primaryColor || "#6366f1" }}
                                          />
                                          <span>{kit.name}</span>
                                          {kit.isDefault && (
                                            <Badge variant="secondary" className="ml-1 text-xs">Default</Badge>
                                          )}
                                        </div>
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Text Alignment</Label>
                                <Select
                                  value={templateForm.watch("styles.alignment") || "left"}
                                  onValueChange={(value) => templateForm.setValue("styles.alignment", value as "left" | "center" | "right")}
                                >
                                  <SelectTrigger data-testid="select-template-alignment">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ALIGNMENT_OPTIONS.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Line Height</Label>
                                <Select
                                  value={templateForm.watch("styles.lineHeight") || "normal"}
                                  onValueChange={(value) => templateForm.setValue("styles.lineHeight", value as "tight" | "normal" | "relaxed")}
                                >
                                  <SelectTrigger data-testid="select-template-line-height">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {LINE_HEIGHT_OPTIONS.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="border-t pt-4">
                              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                <Type className="h-4 w-4" />
                                Heading Styles
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Heading Font</Label>
                                  <Select
                                    value={templateForm.watch("styles.headingFont") || "default"}
                                    onValueChange={(value) => templateForm.setValue("styles.headingFont", value === "default" ? "" : value)}
                                  >
                                    <SelectTrigger data-testid="select-template-heading-font">
                                      <SelectValue placeholder="Default" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="default">Default</SelectItem>
                                      {FONT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Heading Size</Label>
                                  <Select
                                    value={templateForm.watch("styles.headingSize") || "2xl"}
                                    onValueChange={(value) => templateForm.setValue("styles.headingSize", value as any)}
                                  >
                                    <SelectTrigger data-testid="select-template-heading-size">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {HEADING_SIZE_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Heading Weight</Label>
                                  <Select
                                    value={templateForm.watch("styles.headingWeight") || "semibold"}
                                    onValueChange={(value) => templateForm.setValue("styles.headingWeight", value as any)}
                                  >
                                    <SelectTrigger data-testid="select-template-heading-weight">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {HEADING_WEIGHT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Heading Color</Label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={templateForm.watch("styles.headingColor") || "#1f2937"}
                                      onChange={(e) => templateForm.setValue("styles.headingColor", e.target.value)}
                                      className="h-9 w-12 rounded border cursor-pointer"
                                      data-testid="input-template-heading-color-picker"
                                    />
                                    <Input
                                      value={templateForm.watch("styles.headingColor") || ""}
                                      onChange={(e) => templateForm.setValue("styles.headingColor", e.target.value)}
                                      placeholder="#1f2937"
                                      className="flex-1 font-mono text-sm"
                                      data-testid="input-template-heading-color"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="border-t pt-4">
                              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                <Type className="h-4 w-4" />
                                Body Styles
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Body Font</Label>
                                  <Select
                                    value={templateForm.watch("styles.bodyFont") || "default"}
                                    onValueChange={(value) => templateForm.setValue("styles.bodyFont", value === "default" ? "" : value)}
                                  >
                                    <SelectTrigger data-testid="select-template-body-font">
                                      <SelectValue placeholder="Default" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="default">Default</SelectItem>
                                      {FONT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Body Size</Label>
                                  <Select
                                    value={templateForm.watch("styles.bodySize") || "base"}
                                    onValueChange={(value) => templateForm.setValue("styles.bodySize", value as any)}
                                  >
                                    <SelectTrigger data-testid="select-template-body-size">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {BODY_SIZE_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2 col-span-2">
                                  <Label>Body Color</Label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={templateForm.watch("styles.bodyColor") || "#4b5563"}
                                      onChange={(e) => templateForm.setValue("styles.bodyColor", e.target.value)}
                                      className="h-9 w-12 rounded border cursor-pointer"
                                      data-testid="input-template-body-color-picker"
                                    />
                                    <Input
                                      value={templateForm.watch("styles.bodyColor") || ""}
                                      onChange={(e) => templateForm.setValue("styles.bodyColor", e.target.value)}
                                      placeholder="#4b5563"
                                      className="flex-1 font-mono text-sm"
                                      data-testid="input-template-body-color"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div className="flex justify-between gap-2 pt-4">
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={handleTemplateDialogClose}>
                          Cancel
                        </Button>
                        {editingTemplate && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => sendTestEmailMutation.mutate(editingTemplate.id)}
                            disabled={sendTestEmailMutation.isPending}
                            data-testid="button-send-test-email"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {sendTestEmailMutation.isPending ? "Sending..." : "Send Test Email"}
                          </Button>
                        )}
                      </div>
                      <Button
                        type="submit"
                        disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                        data-testid="button-submit-template"
                      >
                        {createTemplateMutation.isPending || updateTemplateMutation.isPending
                          ? "Saving..."
                          : editingTemplate
                          ? "Update Template"
                          : "Create Template"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="campaigns" data-testid="tab-campaigns">
                <Mail className="h-4 w-4 mr-2" />
                Campaigns
              </TabsTrigger>
              <TabsTrigger value="templates" data-testid="tab-templates">
                <FileText className="h-4 w-4 mr-2" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="library" data-testid="tab-library">
                <Library className="h-4 w-4 mr-2" />
                Template Library
              </TabsTrigger>
            </TabsList>

            <TabsContent value="campaigns">
              {!emailsLoading && emails.length === 0 ? (
                <EmptyState
                  icon={Mail}
                  title="No email campaigns yet"
                  description="Create email campaigns to communicate with your attendees"
                  action={{
                    label: "New Campaign",
                    onClick: () => setIsCampaignDialogOpen(true),
                  }}
                />
              ) : (
                <DataTable
                  columns={campaignColumns}
                  data={filteredEmails}
                  isLoading={emailsLoading}
                  emptyMessage="No email campaigns found"
                  getRowKey={(email) => email.id}
                />
              )}
            </TabsContent>

            <TabsContent value="templates">
              {!templatesLoading && templates.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No email templates yet"
                  description="Create reusable templates for consistent email communications"
                  action={{
                    label: "New Template",
                    onClick: () => setIsTemplateDialogOpen(true),
                  }}
                />
              ) : (
                <DataTable
                  columns={templateColumns}
                  data={templates}
                  isLoading={templatesLoading}
                  emptyMessage="No email templates found"
                  getRowKey={(template) => template.id}
                />
              )}
            </TabsContent>

            <TabsContent value="library">
              {isSuperAdmin && (
                <div className="flex justify-end mb-4">
                  <Button size="sm" onClick={() => setIsLibraryDialogOpen(true)} data-testid="button-add-library-template">
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Library
                  </Button>
                </div>
              )}
              {libraryLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
              ) : libraryTemplates.length === 0 ? (
                <EmptyState
                  icon={Library}
                  title="No library templates available"
                  description={isSuperAdmin ? "Add templates to the library to share across organizations." : "The template library is empty. Super admins can add templates to share across organizations."}
                  action={isSuperAdmin ? {
                    label: "Add Template",
                    onClick: () => setIsLibraryDialogOpen(true),
                  } : undefined}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {libraryTemplates
                    .filter((template) => isSuperAdmin || template.isActive !== false)
                    .map((template) => (
                    <Card 
                      key={template.id} 
                      className={`hover-elevate ${template.isActive === false ? "opacity-60" : ""}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base line-clamp-1">{template.name}</CardTitle>
                          <div className="flex items-center gap-1 shrink-0">
                            {template.isActive === false && (
                              <Badge variant="outline" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                        </div>
                        {template.description && (
                          <CardDescription className="text-sm line-clamp-2">{template.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pt-2">
                        <div className="text-sm text-muted-foreground mb-3 line-clamp-1">
                          Subject: {template.subject}
                        </div>
                        {(template.campaignType || template.funnelStage || template.campaignRole) && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {template.campaignType && (
                              <Badge variant="outline" className="text-xs">
                                {CAMPAIGN_TYPE_OPTIONS.find(o => o.value === template.campaignType)?.label || template.campaignType}
                              </Badge>
                            )}
                            {template.funnelStage && (
                              <Badge variant="outline" className="text-xs">
                                {FUNNEL_STAGE_OPTIONS.find(o => o.value === template.funnelStage)?.label || template.funnelStage}
                              </Badge>
                            )}
                            {template.campaignRole && (
                              <Badge variant="outline" className="text-xs">
                                {CAMPAIGN_ROLE_OPTIONS.find(o => o.value === template.campaignRole)?.label || template.campaignRole}
                              </Badge>
                            )}
                          </div>
                        )}
                        {isSuperAdmin && (
                          <div className="flex items-center justify-between mb-3 py-2 border-t">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`active-${template.id}`} className="text-sm">Active</Label>
                              <Switch
                                id={`active-${template.id}`}
                                checked={template.isActive !== false}
                                onCheckedChange={(checked) => 
                                  toggleLibraryTemplateActiveMutation.mutate({ id: template.id, isActive: checked })
                                }
                                data-testid={`switch-active-library-template-${template.id}`}
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditLibraryTemplate(template)}
                                data-testid={`button-edit-library-template-${template.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteLibraryTemplateMutation.mutate(template.id)}
                                data-testid={`button-delete-library-template-${template.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedLibraryTemplate(template)} data-testid={`button-preview-library-${template.id}`}>
                                Preview
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                              <DialogHeader>
                                <DialogTitle>{template.name}</DialogTitle>
                                <DialogDescription>{template.subject}</DialogDescription>
                              </DialogHeader>
                              <div 
                                className="prose prose-sm max-w-none border rounded-md p-4 bg-muted/30"
                                dangerouslySetInnerHTML={{ __html: template.content }}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button 
                            size="sm" 
                            onClick={() => importLibraryTemplateMutation.mutate({ templateId: template.id })}
                            disabled={importLibraryTemplateMutation.isPending}
                            data-testid={`button-import-library-${template.id}`}
                          >
                            {importLibraryTemplateMutation.isPending ? "Importing..." : "Import"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Library Template Dialog for Super Admins */}
              <Dialog open={isLibraryDialogOpen} onOpenChange={(open) => open ? setIsLibraryDialogOpen(true) : handleLibraryDialogClose()}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingLibraryTemplate ? "Edit Library Template" : "Add Library Template"}</DialogTitle>
                    <DialogDescription>
                      {editingLibraryTemplate ? "Update this template in the shared library" : "Create a template to share across all organizations"}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...libraryTemplateForm}>
                    <form onSubmit={libraryTemplateForm.handleSubmit(onSubmitLibraryTemplate)} className="space-y-4">
                      <FormField
                        control={libraryTemplateForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Welcome Email" data-testid="input-library-template-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={libraryTemplateForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Brief description of this template" data-testid="input-library-template-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={libraryTemplateForm.control}
                        name="purpose"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Purpose (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Drive registrations, nurture leads" data-testid="input-library-template-purpose" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={libraryTemplateForm.control}
                        name="timing"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timing (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., 2 weeks before event, immediately after registration" data-testid="input-library-template-timing" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Campaign Classification Section */}
                      <div className="space-y-4 rounded-lg border p-4">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">Campaign Classification</h4>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>These fields help Sandbox understand the purpose of each email so campaigns can be automated, measured, and optimized.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          These fields help Sandbox automate sequencing, measurement, and attribution.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={libraryTemplateForm.control}
                            name="campaignType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Campaign Type *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-library-campaign-type">
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {CAMPAIGN_TYPE_OPTIONS.map(opt => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">What kind of campaign does this email belong to?</p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={libraryTemplateForm.control}
                            name="funnelStage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Funnel Stage *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-library-funnel-stage">
                                      <SelectValue placeholder="Select stage" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {FUNNEL_STAGE_OPTIONS.map(opt => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">Where does this email sit in the attendee journey?</p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={libraryTemplateForm.control}
                            name="campaignRole"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Campaign Role *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-library-campaign-role">
                                      <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {CAMPAIGN_ROLE_OPTIONS.map(opt => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">What job does this email perform in the campaign?</p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        {/* Tag Intelligence Preview */}
                        {(libraryTemplateForm.watch("campaignType") || libraryTemplateForm.watch("funnelStage") || libraryTemplateForm.watch("campaignRole")) && (
                          <div className="rounded-md bg-muted p-3">
                            <p className="text-sm text-muted-foreground">Sandbox will treat this email as:</p>
                            <p className="font-medium mt-1">
                              {CAMPAIGN_TYPE_OPTIONS.find(o => o.value === libraryTemplateForm.watch("campaignType"))?.label || "—"}{" "}
                              → {FUNNEL_STAGE_OPTIONS.find(o => o.value === libraryTemplateForm.watch("funnelStage"))?.label || "—"}{" "}
                              → {CAMPAIGN_ROLE_OPTIONS.find(o => o.value === libraryTemplateForm.watch("campaignRole"))?.label || "—"}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <FormField
                        control={libraryTemplateForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Active</FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Active templates are visible to all organizations
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-library-template-active"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={libraryTemplateForm.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject Line</FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-1">
                                <Input {...field} ref={librarySubjectRef} placeholder="Email subject" data-testid="input-library-template-subject" className="flex-1" />
                                <MergeTagPicker
                                  onInsert={(tag) => field.onChange(field.value + tag)}
                                  inputRef={librarySubjectRef}
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={libraryTemplateForm.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Content</FormLabel>
                            <FormControl>
                              <div className="flex items-start gap-1">
                                <Textarea
                                  rows={12}
                                  {...field}
                                  ref={libraryContentRef}
                                  placeholder="Write your email template content here. Use merge tags like {{event.name}}, {{attendee.firstName}}..."
                                  data-testid="input-library-template-content"
                                  className="flex-1"
                                />
                                <MergeTagPicker
                                  onInsert={(tag) => field.onChange(field.value + tag)}
                                  inputRef={libraryContentRef}
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={libraryTemplateForm.control}
                        name="headerImageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Header Image URL (Optional)</FormLabel>
                            <FormControl>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Input
                                    {...field}
                                    placeholder="https://example.com/header-image.png"
                                    data-testid="input-library-header-image-url"
                                    className="flex-1"
                                  />
                                  {field.value && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={handleRemoveLibraryImage}
                                      data-testid="button-remove-library-header-image"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                                {field.value && (
                                  <div className="relative">
                                    <img
                                      src={field.value}
                                      alt="Header preview"
                                      className="w-full max-h-40 object-contain rounded-md border"
                                      data-testid="img-library-header-preview"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                      onLoad={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'block';
                                      }}
                                    />
                                  </div>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Enter a URL to an image. Recommended size: 600x150 pixels.
                                </p>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="styling">
                          <AccordionTrigger data-testid="accordion-library-template-styling">
                            <div className="flex items-center gap-2">
                              <Palette className="h-4 w-4" />
                              Styling Options
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Text Alignment</Label>
                                  <Select
                                    value={libraryTemplateForm.watch("styles.alignment") || "left"}
                                    onValueChange={(value) => libraryTemplateForm.setValue("styles.alignment", value as "left" | "center" | "right")}
                                  >
                                    <SelectTrigger data-testid="select-library-template-alignment">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ALIGNMENT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Line Height</Label>
                                  <Select
                                    value={libraryTemplateForm.watch("styles.lineHeight") || "normal"}
                                    onValueChange={(value) => libraryTemplateForm.setValue("styles.lineHeight", value as "tight" | "normal" | "relaxed")}
                                  >
                                    <SelectTrigger data-testid="select-library-template-line-height">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {LINE_HEIGHT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="border-t pt-4">
                                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                  <Type className="h-4 w-4" />
                                  Heading Styles
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Heading Font</Label>
                                    <Select
                                      value={libraryTemplateForm.watch("styles.headingFont") || "default"}
                                      onValueChange={(value) => libraryTemplateForm.setValue("styles.headingFont", value === "default" ? "" : value)}
                                    >
                                      <SelectTrigger data-testid="select-library-template-heading-font">
                                        <SelectValue placeholder="Default" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="default">Default</SelectItem>
                                        {FONT_OPTIONS.map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Heading Size</Label>
                                    <Select
                                      value={libraryTemplateForm.watch("styles.headingSize") || "2xl"}
                                      onValueChange={(value) => libraryTemplateForm.setValue("styles.headingSize", value as any)}
                                    >
                                      <SelectTrigger data-testid="select-library-template-heading-size">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {HEADING_SIZE_OPTIONS.map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Heading Weight</Label>
                                    <Select
                                      value={libraryTemplateForm.watch("styles.headingWeight") || "semibold"}
                                      onValueChange={(value) => libraryTemplateForm.setValue("styles.headingWeight", value as any)}
                                    >
                                      <SelectTrigger data-testid="select-library-template-heading-weight">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {HEADING_WEIGHT_OPTIONS.map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Heading Color</Label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="color"
                                        value={libraryTemplateForm.watch("styles.headingColor") || "#1f2937"}
                                        onChange={(e) => libraryTemplateForm.setValue("styles.headingColor", e.target.value)}
                                        className="h-9 w-12 rounded border cursor-pointer"
                                        data-testid="input-library-template-heading-color-picker"
                                      />
                                      <Input
                                        value={libraryTemplateForm.watch("styles.headingColor") || ""}
                                        onChange={(e) => libraryTemplateForm.setValue("styles.headingColor", e.target.value)}
                                        placeholder="#1f2937"
                                        className="flex-1 font-mono text-sm"
                                        data-testid="input-library-template-heading-color"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="border-t pt-4">
                                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                  <Type className="h-4 w-4" />
                                  Body Styles
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Body Font</Label>
                                    <Select
                                      value={libraryTemplateForm.watch("styles.bodyFont") || "default"}
                                      onValueChange={(value) => libraryTemplateForm.setValue("styles.bodyFont", value === "default" ? "" : value)}
                                    >
                                      <SelectTrigger data-testid="select-library-template-body-font">
                                        <SelectValue placeholder="Default" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="default">Default</SelectItem>
                                        {FONT_OPTIONS.map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Body Size</Label>
                                    <Select
                                      value={libraryTemplateForm.watch("styles.bodySize") || "base"}
                                      onValueChange={(value) => libraryTemplateForm.setValue("styles.bodySize", value as any)}
                                    >
                                      <SelectTrigger data-testid="select-library-template-body-size">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {BODY_SIZE_OPTIONS.map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2 col-span-2">
                                    <Label>Body Color</Label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="color"
                                        value={libraryTemplateForm.watch("styles.bodyColor") || "#4b5563"}
                                        onChange={(e) => libraryTemplateForm.setValue("styles.bodyColor", e.target.value)}
                                        className="h-9 w-12 rounded border cursor-pointer"
                                        data-testid="input-library-template-body-color-picker"
                                      />
                                      <Input
                                        value={libraryTemplateForm.watch("styles.bodyColor") || ""}
                                        onChange={(e) => libraryTemplateForm.setValue("styles.bodyColor", e.target.value)}
                                        placeholder="#4b5563"
                                        className="flex-1 font-mono text-sm"
                                        data-testid="input-library-template-body-color"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={handleLibraryDialogClose}>
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createLibraryTemplateMutation.isPending || updateLibraryTemplateMutation.isPending}
                          data-testid="button-submit-library-template"
                        >
                          {createLibraryTemplateMutation.isPending || updateLibraryTemplateMutation.isPending
                            ? "Saving..."
                            : editingLibraryTemplate
                            ? "Update Template"
                            : "Add to Library"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
