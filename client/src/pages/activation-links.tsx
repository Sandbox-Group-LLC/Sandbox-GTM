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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Link2, Trash2, ChevronDown, ChevronRight, Copy, MousePointerClick, Users, Monitor, Smartphone, Tablet, Globe, UserCheck, Bot, TrendingUp, Pencil } from "lucide-react";
import { titleCase } from "@/lib/utils";
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

export default function ActivationLinks() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ActivationLink | null>(null);
  const [expandedLinks, setExpandedLinks] = useState<Set<string>>(new Set());
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

  interface ClickBreakdowns {
    devices: Array<{ type: string; count: number }>;
    browsers: Array<{ browser: string; count: number }>;
    countries: Array<{ country: string; countryCode: string | null; count: number }>;
    returningVisitors: { new: number; returning: number };
    botVsHuman: { human: number; bot: number };
  }

  const { data: breakdowns } = useQuery<ClickBreakdowns>({
    queryKey: ["/api/activation-links-breakdowns", selectedEventId],
    queryFn: async () => {
      const url = selectedEventId 
        ? `/api/activation-links-breakdowns?eventId=${selectedEventId}`
        : `/api/activation-links-breakdowns`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch breakdowns");
      return res.json();
    },
  });

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      case 'desktop': return <Monitor className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const kpiData = useMemo(() => {
    const totalLinks = activationLinks.length;
    const totalClicks = activationLinks.reduce((sum, link) => sum + (link.clickCount ?? 0), 0);
    const totalConversions = activationLinks.reduce((sum, link) => sum + (link.conversionCount ?? 0), 0);
    const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0.0";
    return { totalLinks, totalClicks, totalConversions, conversionRate };
  }, [activationLinks]);

  const getEventName = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    return event?.name || "Unknown Event";
  };

  const toggleLinkExpanded = (linkId: string) => {
    setExpandedLinks((prev) => {
      const next = new Set(prev);
      if (next.has(linkId)) {
        next.delete(linkId);
      } else {
        next.add(linkId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedLinks(new Set(activationLinks.map((link) => link.id)));
  };

  const collapseAll = () => {
    setExpandedLinks(new Set());
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
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const trackingUrl = `${baseUrl}/api/public/track/${shortCode}`;
    navigator.clipboard.writeText(trackingUrl);
    toast({ title: "Tracking URL copied to clipboard" });
  };

  const getInviteCodeName = (inviteCodeId: string | null) => {
    if (!inviteCodeId) return null;
    const code = inviteCodes.find((c) => c.id === inviteCodeId);
    return code?.code || null;
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Activation Links"
        breadcrumbs={[{ label: "Audience", href: "/attendees" }, { label: "Activation Links" }]}
        actions={
          <div className="flex items-center gap-1 sm:gap-2">
            <Select value={selectedEventId || "all"} onValueChange={(value) => setSelectedEventId(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[120px] sm:w-[180px]" data-testid="select-event-filter">
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
            {activationLinks.length > 1 && (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={expandAll} data-testid="button-expand-all">
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll} data-testid="button-collapse-all">
                  Collapse All
                </Button>
              </div>
            )}
            <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-activation-link" size="icon" className="sm:w-auto sm:px-4">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Link</span>
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
        <div className="max-w-7xl mx-auto space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Links</CardTitle>
                <Link2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="kpi-total-links">{kpiData.totalLinks}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="kpi-total-clicks">{kpiData.totalClicks.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="kpi-total-conversions">{kpiData.totalConversions.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="kpi-conversion-rate">{kpiData.conversionRate}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Breakdowns */}
          {breakdowns && (breakdowns.devices?.length > 0 || breakdowns.browsers?.length > 0 || breakdowns.countries?.length > 0) && (() => {
            const deviceTotal = breakdowns.devices?.reduce((a, b) => a + b.count, 0) || 0;
            const browserTotal = breakdowns.browsers?.reduce((a, b) => a + b.count, 0) || 0;
            const countryTotal = breakdowns.countries?.reduce((a, b) => a + b.count, 0) || 0;
            
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {breakdowns.devices && breakdowns.devices.length > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Device Types</CardTitle>
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {breakdowns.devices.map((device) => {
                          const pct = deviceTotal > 0 ? Math.round((device.count / deviceTotal) * 100) : 0;
                          return (
                            <div key={device.type} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {getDeviceIcon(device.type)}
                                <span className="text-sm">{titleCase(device.type)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{device.count}</span>
                                <Badge variant="secondary" className="text-xs">{pct}%</Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {breakdowns.browsers && breakdowns.browsers.length > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Browsers</CardTitle>
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {breakdowns.browsers.slice(0, 5).map((browser) => {
                          const pct = browserTotal > 0 ? Math.round((browser.count / browserTotal) * 100) : 0;
                          return (
                            <div key={browser.browser} className="flex items-center justify-between gap-2">
                              <span className="text-sm">{browser.browser}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{browser.count}</span>
                                <Badge variant="secondary" className="text-xs">{pct}%</Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {breakdowns.countries && breakdowns.countries.length > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Top Countries</CardTitle>
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {breakdowns.countries.slice(0, 5).map((country) => {
                          const pct = countryTotal > 0 ? Math.round((country.count / countryTotal) * 100) : 0;
                          return (
                            <div key={country.country} className="flex items-center justify-between gap-2">
                              <span className="text-sm">
                                {country.countryCode && <span className="mr-1">{country.countryCode}</span>}
                                {country.country}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{country.count}</span>
                                <Badge variant="secondary" className="text-xs">{pct}%</Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {breakdowns.returningVisitors && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Visitor Type</CardTitle>
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm">New Visitors</span>
                          <span className="text-sm font-medium">{breakdowns.returningVisitors.new || 0}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm">Returning Visitors</span>
                          <span className="text-sm font-medium">{breakdowns.returningVisitors.returning || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {breakdowns.botVsHuman && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Traffic Quality</CardTitle>
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm">Human Traffic</span>
                          <span className="text-sm font-medium">{breakdowns.botVsHuman.human || 0}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm">Bot Traffic</span>
                          <span className="text-sm text-muted-foreground">{breakdowns.botVsHuman.bot || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}

          {/* Activation Links List */}
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
            <div className="space-y-3">
              {activationLinks.map((link) => {
                const isExpanded = expandedLinks.has(link.id);
                const eventName = getEventName(link.eventId);
                return (
                  <Card key={link.id} data-testid={`card-activation-link-${link.id}`}>
                    <Collapsible open={isExpanded} onOpenChange={() => toggleLinkExpanded(link.id)}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover-elevate py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium truncate" data-testid={`text-link-name-${link.id}`}>
                                    {link.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs flex-shrink-0" data-testid={`badge-event-${link.id}`}>
                                    {eventName}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                                  <span data-testid={`text-source-medium-${link.id}`}>
                                    {link.utmSource} / {link.utmMedium}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                              <Badge variant="outline" className="gap-1" data-testid={`badge-clicks-${link.id}`}>
                                <MousePointerClick className="h-3 w-3" />
                                {link.clickCount ?? 0}
                              </Badge>
                              <Badge variant="outline" className="gap-1" data-testid={`badge-conversions-${link.id}`}>
                                <Users className="h-3 w-3" />
                                {link.conversionCount ?? 0}
                              </Badge>
                              <Badge 
                                variant={link.status === "active" ? "default" : "secondary"} 
                                data-testid={`badge-status-${link.id}`}
                              >
                                {link.status === "active" ? "Active" : "Paused"}
                              </Badge>
                              <div className="flex items-center gap-1 ml-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyTrackingUrl(link.shortCode);
                                  }}
                                  data-testid={`button-copy-${link.id}`}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(link);
                                  }}
                                  data-testid={`button-edit-${link.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(link.id);
                                  }}
                                  data-testid={`button-delete-${link.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 pb-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            <div>
                              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Campaign</div>
                              <div className="text-sm" data-testid={`text-campaign-${link.id}`}>{link.utmCampaign}</div>
                            </div>
                            {link.utmContent && (
                              <div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Content</div>
                                <div className="text-sm" data-testid={`text-content-${link.id}`}>{link.utmContent}</div>
                              </div>
                            )}
                            {link.utmTerm && (
                              <div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Term</div>
                                <div className="text-sm" data-testid={`text-term-${link.id}`}>{link.utmTerm}</div>
                              </div>
                            )}
                            {link.inviteCodeId && (
                              <div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Activation Key</div>
                                <div className="text-sm" data-testid={`text-invite-code-${link.id}`}>
                                  {getInviteCodeName(link.inviteCodeId) || "Unknown"}
                                </div>
                              </div>
                            )}
                            {link.baseUrl && (
                              <div className="md:col-span-2">
                                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Base URL</div>
                                <div className="text-sm truncate" data-testid={`text-base-url-${link.id}`}>{link.baseUrl}</div>
                              </div>
                            )}
                            {link.description && (
                              <div className="md:col-span-2 lg:col-span-3">
                                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Description</div>
                                <div className="text-sm" data-testid={`text-description-${link.id}`}>{link.description}</div>
                              </div>
                            )}
                          </div>
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
