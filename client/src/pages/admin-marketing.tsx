import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  Link2,
  Plus,
  MoreHorizontal,
  Copy,
  Pencil,
  Trash2,
  Users,
  MousePointer,
  TrendingUp,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { MarketingActivationLink } from "@shared/schema";
import { titleCase } from "@/lib/utils";

const linkFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  destinationType: z.enum(["landing", "pricing", "lead-form", "signup"]),
  destinationUrl: z.string().url("Valid URL required"),
  utmSource: z.string().min(1, "Source is required"),
  utmMedium: z.string().min(1, "Medium is required"),
  utmCampaign: z.string().min(1, "Campaign is required"),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
  status: z.enum(["active", "paused", "archived"]),
});

type LinkFormData = z.infer<typeof linkFormSchema>;

interface MarketingAnalytics {
  uniqueVisitors: number;
  leads: number;
  conversionRate: number;
  topSource: string | null;
  channelBreakdown: Array<{ channel: string; visits: number }>;
}

function getStatusVariant(status: string): "default" | "secondary" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "paused":
      return "secondary";
    case "archived":
      return "outline";
    default:
      return "secondary";
  }
}

function getDestinationLabel(type: string): string {
  switch (type) {
    case "landing":
      return "Landing Page";
    case "pricing":
      return "Pricing Page";
    case "lead-form":
      return "Lead Form";
    case "signup":
      return "Sign Up";
    default:
      return type;
  }
}

export default function AdminMarketing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<MarketingActivationLink | null>(null);
  const [deletingLink, setDeletingLink] = useState<MarketingActivationLink | null>(null);

  const { data: links, isLoading: linksLoading } = useQuery<MarketingActivationLink[]>({
    queryKey: ["/api/admin/marketing-links"],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<MarketingAnalytics>({
    queryKey: ["/api/admin/marketing-analytics"],
  });

  const form = useForm<LinkFormData>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: {
      name: "",
      description: "",
      destinationType: "landing",
      destinationUrl: "https://www.makemysandbox.com",
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      utmContent: "",
      utmTerm: "",
      status: "active",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LinkFormData) => {
      const response = await apiRequest("POST", "/api/admin/marketing-links", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-analytics"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Link Created",
        description: "Marketing activation link has been created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create link",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LinkFormData> }) => {
      const response = await apiRequest("PATCH", `/api/admin/marketing-links/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-links"] });
      setEditingLink(null);
      form.reset();
      toast({
        title: "Link Updated",
        description: "Marketing activation link has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update link",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/marketing-links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-analytics"] });
      setDeletingLink(null);
      toast({
        title: "Link Deleted",
        description: "Marketing activation link has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete link",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (link: MarketingActivationLink) => {
    form.reset({
      name: link.name,
      description: link.description || "",
      destinationType: link.destinationType as "landing" | "pricing" | "lead-form" | "signup",
      destinationUrl: link.destinationUrl,
      utmSource: link.utmSource,
      utmMedium: link.utmMedium,
      utmCampaign: link.utmCampaign,
      utmContent: link.utmContent || "",
      utmTerm: link.utmTerm || "",
      status: link.status as "active" | "paused" | "archived",
    });
    setEditingLink(link);
  };

  const handleCopyLink = (link: MarketingActivationLink) => {
    const baseUrl = window.location.origin;
    const trackingUrl = `${baseUrl}/api/public/mkt/${link.shortCode}`;
    navigator.clipboard.writeText(trackingUrl);
    toast({
      title: "Link Copied",
      description: "Tracking URL copied to clipboard.",
    });
  };

  const onSubmit = (data: LinkFormData) => {
    if (editingLink) {
      updateMutation.mutate({ id: editingLink.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      header: "Name",
      accessorKey: "name",
      cell: (link: MarketingActivationLink) => (
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{link.name}</span>
          </div>
          {link.description && (
            <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
          )}
        </div>
      ),
    },
    {
      header: "Destination",
      accessorKey: "destinationType",
      cell: (link: MarketingActivationLink) => (
        <Badge variant="outline">{getDestinationLabel(link.destinationType)}</Badge>
      ),
    },
    {
      header: "UTM Parameters",
      accessorKey: "utmSource",
      cell: (link: MarketingActivationLink) => (
        <div className="text-sm space-y-1">
          <div><span className="text-muted-foreground">Source:</span> {link.utmSource}</div>
          <div><span className="text-muted-foreground">Medium:</span> {link.utmMedium}</div>
          <div><span className="text-muted-foreground">Campaign:</span> {link.utmCampaign}</div>
        </div>
      ),
    },
    {
      header: "Clicks",
      accessorKey: "clickCount",
      cell: (link: MarketingActivationLink) => (
        <div className="flex items-center gap-2">
          <MousePointer className="h-4 w-4 text-muted-foreground" />
          <span>{link.clickCount || 0}</span>
        </div>
      ),
    },
    {
      header: "Conversions",
      accessorKey: "conversionCount",
      cell: (link: MarketingActivationLink) => {
        const rate = (link.clickCount || 0) > 0 
          ? Math.round(((link.conversionCount || 0) / (link.clickCount || 1)) * 100) 
          : 0;
        return (
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span>{link.conversionCount || 0}</span>
            </div>
            <div className="text-xs text-muted-foreground">{rate}% rate</div>
          </div>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (link: MarketingActivationLink) => (
        <Badge variant={getStatusVariant(link.status)}>
          {titleCase(link.status)}
        </Badge>
      ),
    },
    {
      header: "Created",
      accessorKey: "createdAt",
      cell: (link: MarketingActivationLink) => (
        <span className="text-muted-foreground text-sm">
          {link.createdAt ? format(new Date(link.createdAt), "MMM d, yyyy") : "-"}
        </span>
      ),
    },
    {
      header: "",
      accessorKey: "id",
      cell: (link: MarketingActivationLink) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-actions-${link.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleCopyLink(link)}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Tracking URL
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(link.destinationUrl, "_blank")}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Destination
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(link)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setDeletingLink(link)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const LinkFormContent = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="LinkedIn Campaign Q1" {...field} data-testid="input-link-name" />
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
                  placeholder="Optional description..." 
                  {...field} 
                  data-testid="input-link-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="destinationType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-destination-type">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="landing">Landing Page</SelectItem>
                    <SelectItem value="pricing">Pricing Page</SelectItem>
                    <SelectItem value="lead-form">Lead Form</SelectItem>
                    <SelectItem value="signup">Sign Up</SelectItem>
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="destinationUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destination URL</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://www.makemysandbox.com" 
                  {...field} 
                  data-testid="input-destination-url"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="utmSource"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source</FormLabel>
                <FormControl>
                  <Input placeholder="linkedin" {...field} data-testid="input-utm-source" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="utmMedium"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Medium</FormLabel>
                <FormControl>
                  <Input placeholder="social" {...field} data-testid="input-utm-medium" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="utmCampaign"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Campaign</FormLabel>
                <FormControl>
                  <Input placeholder="q1-2025" {...field} data-testid="input-utm-campaign" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="utmContent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="banner-ad" {...field} data-testid="input-utm-content" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="utmTerm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Term (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="event-management" {...field} data-testid="input-utm-term" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button 
            type="submit" 
            disabled={createMutation.isPending || updateMutation.isPending}
            data-testid="button-submit-link"
          >
            {editingLink ? "Update Link" : "Create Link"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  if (linksLoading || analyticsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Marketing Analytics"
        description="Track marketing activation links and acquisition metrics"
        actions={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-link">
                <Plus className="h-4 w-4 mr-2" />
                Create Link
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Marketing Link</DialogTitle>
                <DialogDescription>
                  Create a trackable link for marketing campaigns.
                </DialogDescription>
              </DialogHeader>
              <LinkFormContent />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.uniqueVisitors || 0}</div>
            <p className="text-xs text-muted-foreground">From tracked links</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.leads || 0}</div>
            <p className="text-xs text-muted-foreground">Total form submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Visitors to leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Source</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.topSource || "N/A"}</div>
            <p className="text-xs text-muted-foreground">Highest traffic source</p>
          </CardContent>
        </Card>
      </div>

      {analytics?.channelBreakdown && analytics.channelBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Channel Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.channelBreakdown.map((channel) => {
                const maxVisits = Math.max(...analytics.channelBreakdown.map(c => c.visits));
                const percentage = maxVisits > 0 ? (channel.visits / maxVisits) * 100 : 0;
                return (
                  <div key={channel.channel} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium">{titleCase(channel.channel)}</div>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary rounded-full h-2 transition-all" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-16 text-sm text-muted-foreground text-right">
                      {channel.visits} visits
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Activation Links</h3>
        {links && links.length > 0 ? (
          <DataTable
            columns={columns}
            data={links}
            searchable
            searchPlaceholder="Search links..."
            getRowKey={(link) => link.id}
          />
        ) : (
          <EmptyState
            icon={Link2}
            title="No Marketing Links"
            description="Create your first marketing activation link to start tracking campaigns."
          />
        )}
      </div>

      <Dialog open={!!editingLink} onOpenChange={(open) => !open && setEditingLink(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Marketing Link</DialogTitle>
            <DialogDescription>
              Update the marketing activation link settings.
            </DialogDescription>
          </DialogHeader>
          <LinkFormContent />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingLink} onOpenChange={(open) => !open && setDeletingLink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Marketing Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingLink?.name}"? This will also delete all click tracking data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingLink && deleteMutation.mutate(deletingLink.id)}
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
