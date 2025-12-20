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
import { queryClient, apiRequest } from "@/lib/queryClient";
import { titleCase } from "@/lib/utils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Switch } from "@/components/ui/switch";
import { Plus, Mail, Send, Clock, CheckCircle, FileText, Copy, Trash2, X, Type, Palette } from "lucide-react";
import { EventSelectField } from "@/components/event-select-field";
import { MergeTagPicker } from "@/components/merge-tag-picker";
import type { EmailCampaign, EmailTemplate } from "@shared/schema";

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
  category: z.string().default("general"),
  headerImageUrl: z.string().optional(),
  isInviteEmail: z.boolean().default(false),
  styles: emailStylesSchema,
});

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

const statusConfig: Record<string, { icon: typeof FileText; color: "default" | "secondary" | "outline" }> = {
  draft: { icon: FileText, color: "secondary" },
  scheduled: { icon: Clock, color: "outline" },
  sent: { icon: CheckCircle, color: "default" },
};

const categoryLabels: Record<string, string> = {
  general: "General",
  registration: "Registration",
  reminder: "Reminder",
  confirmation: "Confirmation",
  followup: "Follow-up",
};

export default function Emails() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("campaigns");
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<EmailCampaign | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  const campaignSubjectRef = useRef<HTMLInputElement>(null);
  const campaignContentRef = useRef<HTMLTextAreaElement>(null);
  const templateSubjectRef = useRef<HTMLInputElement>(null);
  const templateContentRef = useRef<HTMLTextAreaElement>(null);

  const { data: emailsData, isLoading: emailsLoading } = useQuery<EmailCampaign[] | null>({
    queryKey: ["/api/emails"],
  });
  const emails = emailsData ?? [];

  const { data: templatesData, isLoading: templatesLoading } = useQuery<EmailTemplate[] | null>({
    queryKey: ["/api/email-templates"],
  });
  const templates = templatesData ?? [];

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
      category: "general",
      headerImageUrl: "",
      isInviteEmail: false,
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
      category: template.category || "general",
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
        <div className="font-medium">{template.name}</div>
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
      key: "category",
      header: "Category",
      cell: (template: EmailTemplate) => (
        <Badge variant="outline">{categoryLabels[template.category || "general"] || template.category}</Badge>
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
                    <div className="grid grid-cols-2 gap-4">
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
                      <FormField
                        control={templateForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-template-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="general">General</SelectItem>
                                <SelectItem value="registration">Registration</SelectItem>
                                <SelectItem value="reminder">Reminder</SelectItem>
                                <SelectItem value="confirmation">Confirmation</SelectItem>
                                <SelectItem value="followup">Follow-up</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
                  data={emails}
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
          </Tabs>
        </div>
      </div>
    </div>
  );
}
