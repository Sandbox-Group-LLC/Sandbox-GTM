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
import { Plus, Mail, Send, Clock, CheckCircle, FileText } from "lucide-react";
import type { EmailCampaign } from "@shared/schema";

const emailFormSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  recipientType: z.string().default("all"),
  status: z.string().default("draft"),
  scheduledAt: z.string().optional(),
});

type EmailFormData = z.infer<typeof emailFormSchema>;

const statusConfig: Record<string, { icon: typeof FileText; color: "default" | "secondary" | "outline" }> = {
  draft: { icon: FileText, color: "secondary" },
  scheduled: { icon: Clock, color: "outline" },
  sent: { icon: CheckCircle, color: "default" },
};

export default function Emails() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<EmailCampaign | null>(null);

  const { data: emails = [], isLoading } = useQuery<EmailCampaign[]>({
    queryKey: ["/api/emails"],
  });

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      subject: "",
      content: "",
      recipientType: "all",
      status: "draft",
      scheduledAt: "",
    },
  });

  const createMutation = useMutation({
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
      setIsDialogOpen(false);
      setEditingEmail(null);
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

  const onSubmit = (data: EmailFormData) => {
    if (editingEmail) {
      updateMutation.mutate({ id: editingEmail.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (email: EmailCampaign) => {
    setEditingEmail(email);
    form.reset({
      subject: email.subject,
      content: email.content,
      recipientType: email.recipientType || "all",
      status: email.status || "draft",
      scheduledAt: email.scheduledAt ? new Date(email.scheduledAt).toISOString().slice(0, 16) : "",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingEmail(null);
    form.reset();
  };

  const columns = [
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
              handleEdit(email);
            }}
            data-testid={`button-edit-${email.id}`}
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

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Email Campaigns"
        breadcrumbs={[{ label: "Email Campaigns" }]}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleDialogClose()}>
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
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
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
                      control={form.control}
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
                      control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit-email"
                    >
                      {createMutation.isPending || updateMutation.isPending
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
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {!isLoading && emails.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No email campaigns yet"
              description="Create email campaigns to communicate with your attendees"
              action={{
                label: "New Campaign",
                onClick: () => setIsDialogOpen(true),
              }}
            />
          ) : (
            <DataTable
              columns={columns}
              data={emails}
              isLoading={isLoading}
              emptyMessage="No email campaigns found"
              getRowKey={(email) => email.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
