import { useState } from "react";
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
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Mail, Send, Clock, CheckCircle, FileText, Copy, Trash2 } from "lucide-react";
import type { EmailCampaign, EmailTemplate } from "@shared/schema";

const emailFormSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  recipientType: z.string().default("all"),
  status: z.string().default("draft"),
  scheduledAt: z.string().optional(),
});

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().default("general"),
});

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

  const { data: emails = [], isLoading: emailsLoading } = useQuery<EmailCampaign[]>({
    queryKey: ["/api/emails"],
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const campaignForm = useForm<EmailFormData>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      subject: "",
      content: "",
      recipientType: "all",
      status: "draft",
      scheduledAt: "",
    },
  });

  const templateForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      subject: "",
      content: "",
      category: "general",
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
      subject: email.subject,
      content: email.content,
      recipientType: email.recipientType || "all",
      status: email.status || "draft",
      scheduledAt: email.scheduledAt ? new Date(email.scheduledAt).toISOString().slice(0, 16) : "",
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
    });
    setIsTemplateDialogOpen(true);
  };

  const handleUseTemplate = (template: EmailTemplate) => {
    campaignForm.reset({
      subject: template.subject,
      content: template.content,
      recipientType: "all",
      status: "draft",
      scheduledAt: "",
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
        <Badge variant="outline">{email.recipientType || "all"}</Badge>
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
                toast({ title: "Email sending not configured", description: "Connect an email service to send campaigns" });
              }}
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
                    <FormField
                      control={campaignForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Email subject line" data-testid="input-subject" />
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
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={10}
                              {...field}
                              placeholder="Write your email content here..."
                              data-testid="input-content"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject Line</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Email subject" data-testid="input-template-subject" />
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
                            <Textarea
                              rows={12}
                              {...field}
                              placeholder="Write your email template content here. Use {{name}}, {{event}}, {{date}} for dynamic values..."
                              data-testid="input-template-content"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={handleTemplateDialogClose}>
                        Cancel
                      </Button>
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
