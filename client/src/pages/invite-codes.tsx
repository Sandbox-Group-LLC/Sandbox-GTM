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
import { Plus, Ticket, Trash2, ChevronDown, ChevronRight, Calendar } from "lucide-react";
import type { InviteCode, Event, AttendeeType, Package } from "@shared/schema";

const inviteCodeFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  code: z.string().min(1, "Code is required"),
  quantity: z.coerce.number().min(1).nullable(),
  attendeeTypeId: z.string().nullable(),
  packageId: z.string().nullable(),
  isActive: z.boolean().default(true),
});

type InviteCodeFormData = z.infer<typeof inviteCodeFormSchema>;

interface GroupedInviteCodes {
  eventId: string;
  eventName: string;
  codes: InviteCode[];
}

export default function InviteCodes() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<InviteCode | null>(null);
  const [isUnlimited, setIsUnlimited] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: inviteCodes = [], isLoading } = useQuery<InviteCode[]>({
    queryKey: ["/api/invite-codes", selectedEventId],
    queryFn: async () => {
      const url = selectedEventId
        ? `/api/invite-codes?eventId=${selectedEventId}`
        : "/api/invite-codes";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch invite codes");
      return res.json();
    },
  });

  const form = useForm<InviteCodeFormData>({
    resolver: zodResolver(inviteCodeFormSchema),
    defaultValues: {
      eventId: "",
      code: "",
      quantity: null,
      attendeeTypeId: null,
      packageId: null,
      isActive: true,
    },
  });

  const formEventId = form.watch("eventId");

  const { data: attendeeTypes = [] } = useQuery<AttendeeType[]>({
    queryKey: ["/api/attendee-types", formEventId],
    queryFn: async () => {
      if (!formEventId) return [];
      const res = await fetch(`/api/attendee-types?eventId=${formEventId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch attendee types");
      return res.json();
    },
    enabled: !!formEventId,
  });

  const { data: packages = [] } = useQuery<Package[]>({
    queryKey: ["/api/events", formEventId, "packages"],
    queryFn: async () => {
      if (!formEventId) return [];
      const res = await fetch(`/api/events/${formEventId}/packages`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch packages");
      return res.json();
    },
    enabled: !!formEventId,
  });

  const groupedData = useMemo(() => {
    const eventMap = new Map<string, GroupedInviteCodes>();
    
    inviteCodes.forEach((code) => {
      if (!eventMap.has(code.eventId)) {
        const event = events.find((e) => e.id === code.eventId);
        eventMap.set(code.eventId, {
          eventId: code.eventId,
          eventName: event?.name || "Unknown Event",
          codes: [],
        });
      }
      eventMap.get(code.eventId)!.codes.push(code);
    });
    
    return Array.from(eventMap.values()).sort((a, b) => 
      a.eventName.localeCompare(b.eventName)
    );
  }, [inviteCodes, events]);

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
    mutationFn: async (data: InviteCodeFormData) => {
      return await apiRequest("POST", "/api/invite-codes", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invite-codes"] });
      toast({ title: "Invite code created successfully" });
      setIsDialogOpen(false);
      form.reset();
      setIsUnlimited(true);
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
    mutationFn: async ({ id, data }: { id: string; data: InviteCodeFormData }) => {
      return await apiRequest("PATCH", `/api/invite-codes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invite-codes"] });
      toast({ title: "Invite code updated successfully" });
      setIsDialogOpen(false);
      setEditingCode(null);
      form.reset();
      setIsUnlimited(true);
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
      return await apiRequest("DELETE", `/api/invite-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invite-codes"] });
      toast({ title: "Invite code deleted successfully" });
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

  const onSubmit = (data: InviteCodeFormData) => {
    const submitData = {
      ...data,
      quantity: isUnlimited ? null : data.quantity,
      attendeeTypeId: data.attendeeTypeId || null,
      packageId: data.packageId || null,
    };
    if (editingCode) {
      updateMutation.mutate({ id: editingCode.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (code: InviteCode) => {
    setEditingCode(code);
    setIsUnlimited(code.quantity === null);
    form.reset({
      eventId: code.eventId,
      code: code.code,
      quantity: code.quantity,
      attendeeTypeId: code.attendeeTypeId || null,
      packageId: code.packageId || null,
      isActive: code.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this invite code?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCode(null);
    setIsUnlimited(true);
    form.reset();
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Invite Codes"
        breadcrumbs={[{ label: "Invite Codes" }]}
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
                <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-invite-code">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Invite Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCode ? "Edit Invite Code" : "Add Invite Code"}</DialogTitle>
                  <DialogDescription>
                    {editingCode ? "Update the invite code details." : "Create a new invite code for event registration."}
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
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter invite code" {...field} data-testid="input-code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FormLabel>Quantity</FormLabel>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Unlimited</span>
                          <Switch
                            checked={isUnlimited}
                            onCheckedChange={setIsUnlimited}
                            data-testid="switch-unlimited"
                          />
                        </div>
                      </div>
                      {!isUnlimited && (
                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="Enter quantity limit"
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                  data-testid="input-quantity"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="attendeeTypeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Attendee Type (Optional)</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value === "none" ? null : value)} value={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-attendee-type">
                                <SelectValue placeholder="Select attendee type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {attendeeTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  {type.type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Optionally assign an attendee type when this code is used
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="packageId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Package (Optional)</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value === "none" ? null : value)} value={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-package">
                                <SelectValue placeholder="Select package" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {packages.map((pkg) => (
                                <SelectItem key={pkg.id} value={pkg.id}>
                                  {pkg.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Optionally assign a package when this code is used
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>Active</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-active"
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
                          : editingCode
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
          ) : inviteCodes.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No invite codes yet"
              description="Create your first invite code to manage event registration access."
              action={{
                label: "Add Invite Code",
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
                            <span className="text-sm text-muted-foreground" data-testid={`text-code-count-${group.eventId}`}>
                              {group.codes.length} {group.codes.length === 1 ? "code" : "codes"}
                            </span>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-32"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.codes.map((code) => (
                                <TableRow key={code.id} data-testid={`row-invite-code-${code.id}`}>
                                  <TableCell>
                                    <span className="font-mono font-medium" data-testid={`text-code-${code.id}`}>
                                      {code.code}
                                    </span>
                                  </TableCell>
                                  <TableCell data-testid={`text-quantity-${code.id}`}>
                                    {code.quantity === null ? (
                                      "Unlimited"
                                    ) : (
                                      `${code.usedCount ?? 0} / ${code.quantity}`
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={code.isActive ? "default" : "secondary"} data-testid={`badge-status-${code.id}`}>
                                      {code.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(code)}
                                        data-testid={`button-edit-${code.id}`}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(code.id)}
                                        data-testid={`button-delete-${code.id}`}
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
