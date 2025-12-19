import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  FormDescription,
} from "@/components/ui/form";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Link2, Trash2, ChevronDown, ChevronRight, Calendar, Copy, MousePointerClick, Users } from "lucide-react";
import type { ActivationLink, Event, InviteCode } from "@shared/schema";

const activationLinkFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  name: z.string().min(1, "Name is required"),
  utmSource: z.string().min(1, "UTM Source is required"),
  utmMedium: z.string().min(1, "UTM Medium is required"),
  utmCampaign: z.string().min(1, "UTM Campaign is required"),
  utmContent: z.string().nullable(),
  utmTerm: z.string().nullable(),
  inviteCodeId: z.string().nullable(),
  baseUrl: z.string().nullable(),
  description: z.string().nullable(),
  status: z.string().default("active"),
});

type ActivationLinkFormData = z.infer<typeof activationLinkFormSchema>;

interface GroupedActivationLinks {
  eventId: string;
  eventName: string;
  links: ActivationLink[];
}

export default function ActivationLinks() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ActivationLink | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: activationLinks = [], isLoading } = useQuery<ActivationLink[]>({
    queryKey: ["/api/activation-links", selectedEventId],
    queryFn: async () => {
      const url = selectedEventId
        ? `/api/activation-links?eventId=${selectedEventId}`
        : "/api/activation-links";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch activation links");
      return res.json();
    },
  });

  const form = useForm<ActivationLinkFormData>({
    resolver: zodResolver(activationLinkFormSchema),
    defaultValues: {
      eventId: "",
      name: "",
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      utmContent: null,
      utmTerm: null,
      inviteCodeId: null,
      baseUrl: null,
      description: null,
      status: "active",
    },
  });

  const formEventId = form.watch("eventId");

  const { data: inviteCodes = [] } = useQuery<InviteCode[]>({
    queryKey: ["/api/invite-codes", formEventId],
    queryFn: async () => {
      if (!formEventId) return [];
      const res = await fetch(`/api/invite-codes?eventId=${formEventId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch activation keys");
      return res.json();
    },
    enabled: !!formEventId,
  });

  const groupedData = useMemo(() => {
    const eventMap = new Map<string, GroupedActivationLinks>();
    
    activationLinks.forEach((link) => {
      if (!eventMap.has(link.eventId)) {
        const event = events.find((e) => e.id === link.eventId);
        eventMap.set(link.eventId, {
          eventId: link.eventId,
          eventName: event?.name || "Unknown Event",
          links: [],
        });
      }
      eventMap.get(link.eventId)!.links.push(link);
    });
    
    return Array.from(eventMap.values()).sort((a, b) => 
      a.eventName.localeCompare(b.eventName)
    );
  }, [activationLinks, events]);

  const toggleEventExpanded = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedEvents(new Set(groupedData.map((g) => g.eventId)));
  };

  const collapseAll = () => {
    setExpandedEvents(new Set());
  };

  const createMutation = useMutation({
    mutationFn: async (data: ActivationLinkFormData) => {
      return await apiRequest("POST", "/api/activation-links", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/activation-links"] });
      toast({ title: "Activation link created successfully" });
      setIsDialogOpen(false);
      form.reset();
      setExpandedEvents((prev) => {
        const next = new Set(prev);
        next.add(variables.eventId);
        return next;
      });
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
    mutationFn: async ({ id, data }: { id: string; data: ActivationLinkFormData }) => {
      return await apiRequest("PATCH", `/api/activation-links/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activation-links"] });
      toast({ title: "Activation link updated successfully" });
      setIsDialogOpen(false);
      setEditingLink(null);
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
      return await apiRequest("DELETE", `/api/activation-links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activation-links"] });
      toast({ title: "Activation link deleted successfully" });
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

  const onSubmit = (data: ActivationLinkFormData) => {
    const submitData = {
      ...data,
      utmContent: data.utmContent || null,
      utmTerm: data.utmTerm || null,
      inviteCodeId: data.inviteCodeId || null,
      baseUrl: data.baseUrl || null,
      description: data.description || null,
    };
    if (editingLink) {
      updateMutation.mutate({ id: editingLink.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (link: ActivationLink) => {
    setEditingLink(link);
    form.reset({
      eventId: link.eventId,
      name: link.name,
      utmSource: link.utmSource,
      utmMedium: link.utmMedium,
      utmCampaign: link.utmCampaign,
      utmContent: link.utmContent || null,
      utmTerm: link.utmTerm || null,
      inviteCodeId: link.inviteCodeId || null,
      baseUrl: link.baseUrl || null,
      description: link.description || null,
      status: link.status || "active",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this activation link?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingLink(null);
    form.reset();
  };

  const copyTrackingUrl = (shortCode: string | null) => {
    if (!shortCode) {
      toast({ title: "No tracking URL available", variant: "destructive" });
      return;
    }
    // Use VITE_APP_URL if available (production), otherwise fall back to current origin
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const trackingUrl = `${baseUrl}/api/public/track/${shortCode}`;
    navigator.clipboard.writeText(trackingUrl);
    toast({ title: "Tracking URL copied to clipboard" });
  };

  const isActive = form.watch("status") === "active";

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Activation Links"
        breadcrumbs={[{ label: "Audience", href: "/attendees" }, { label: "Activation Links" }]}
        actions={
          <div className="flex items-center gap-2">
            <Select value={selectedEventId || "all"} onValueChange={(value) => setSelectedEventId(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[200px]" data-testid="select-event-filter">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {groupedData.length > 1 && (
              <>
                <Button variant="outline" size="sm" onClick={expandAll} data-testid="button-expand-all">
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll} data-testid="button-collapse-all">
                  Collapse All
                </Button>
              </>
            )}
            <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-activation-link">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Activation Link
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingLink ? "Edit Activation Link" : "Add Activation Link"}</DialogTitle>
                  <DialogDescription>
                    {editingLink ? "Update the activation link details." : "Create a new trackable activation link for campaigns."}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="eventId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-event">
                                <SelectValue placeholder="Select an event" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {events.map((event) => (
                                <SelectItem key={event.id} value={event.id}>
                                  {event.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. LinkedIn Campaign Q1" {...field} data-testid="input-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="utmSource"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>UTM Source</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. linkedin" {...field} data-testid="input-utm-source" />
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
                            <FormLabel>UTM Medium</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. social" {...field} data-testid="input-utm-medium" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="utmCampaign"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>UTM Campaign</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. spring2024" {...field} data-testid="input-utm-campaign" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="utmContent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>UTM Content (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. banner_ad" 
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-utm-content" 
                              />
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
                            <FormLabel>UTM Term (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. event+marketing" 
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-utm-term" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="inviteCodeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Activation Key (Optional)</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value === "none" ? null : value)} value={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-invite-code">
                                <SelectValue placeholder="Select an activation key" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {inviteCodes.map((code) => (
                                <SelectItem key={code.id} value={code.id}>
                                  {code.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Optionally associate an activation key with this link
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="baseUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base URL (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Leave empty to use default registration page" 
                              {...field} 
                              value={field.value || ""} 
                              data-testid="input-base-url" 
                            />
                          </FormControl>
                          <FormDescription>
                            Custom destination URL. Leave empty to redirect to the event registration page.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add notes about this campaign link..." 
                              {...field} 
                              value={field.value || ""} 
                              data-testid="input-description" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>Active</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value === "active"}
                              onCheckedChange={(checked) => field.onChange(checked ? "active" : "paused")}
                              data-testid="switch-status"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={handleDialogClose} data-testid="button-cancel">
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        data-testid="button-submit"
                      >
                        {createMutation.isPending || updateMutation.isPending
                          ? "Saving..."
                          : editingLink
                          ? "Update"
                          : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          ) : activationLinks.length === 0 ? (
            <EmptyState
              icon={Link2}
              title="No activation links yet"
              description="Create your first activation link to track campaign performance."
              action={{
                label: "Add Activation Link",
                onClick: () => setIsDialogOpen(true),
              }}
            />
          ) : (
            <div className="space-y-4">
              {groupedData.map((group) => {
                const isExpanded = expandedEvents.has(group.eventId);
                return (
                  <Card key={group.eventId} data-testid={`card-event-group-${group.eventId}`}>
                    <Collapsible open={isExpanded} onOpenChange={() => toggleEventExpanded(group.eventId)}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover-elevate py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                              <Calendar className="h-5 w-5 text-muted-foreground" />
                              <CardTitle className="text-base" data-testid={`text-event-name-${group.eventId}`}>
                                {group.eventName}
                              </CardTitle>
                            </div>
                            <span className="text-sm text-muted-foreground" data-testid={`text-link-count-${group.eventId}`}>
                              {group.links.length} {group.links.length === 1 ? "link" : "links"}
                            </span>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Source / Medium</TableHead>
                                <TableHead>Campaign</TableHead>
                                <TableHead>Clicks</TableHead>
                                <TableHead>Conversions</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-40"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.links.map((link) => (
                                <TableRow key={link.id} data-testid={`row-activation-link-${link.id}`}>
                                  <TableCell>
                                    <span className="font-medium" data-testid={`text-name-${link.id}`}>
                                      {link.name}
                                    </span>
                                  </TableCell>
                                  <TableCell data-testid={`text-source-medium-${link.id}`}>
                                    <span className="text-muted-foreground">
                                      {link.utmSource} / {link.utmMedium}
                                    </span>
                                  </TableCell>
                                  <TableCell data-testid={`text-campaign-${link.id}`}>
                                    {link.utmCampaign}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="gap-1" data-testid={`badge-clicks-${link.id}`}>
                                      <MousePointerClick className="h-3 w-3" />
                                      {link.clickCount ?? 0}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="gap-1" data-testid={`badge-conversions-${link.id}`}>
                                      <Users className="h-3 w-3" />
                                      {link.conversionCount ?? 0}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={link.status === "active" ? "default" : "secondary"} 
                                      data-testid={`badge-status-${link.id}`}
                                    >
                                      {link.status === "active" ? "Active" : "Paused"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => copyTrackingUrl(link.shortCode)}
                                        data-testid={`button-copy-${link.id}`}
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(link)}
                                        data-testid={`button-edit-${link.id}`}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(link.id)}
                                        data-testid={`button-delete-${link.id}`}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
