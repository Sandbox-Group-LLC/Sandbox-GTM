import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Ticket, Trash2 } from "lucide-react";
import type { InviteCode, Event, AttendeeType } from "@shared/schema";

const inviteCodeFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  code: z.string().min(1, "Code is required"),
  quantity: z.coerce.number().min(1).nullable(),
  attendeeTypeId: z.string().nullable(),
  isActive: z.boolean().default(true),
});

type InviteCodeFormData = z.infer<typeof inviteCodeFormSchema>;

export default function InviteCodes() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<InviteCode | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [isUnlimited, setIsUnlimited] = useState(true);

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

  const createMutation = useMutation({
    mutationFn: async (data: InviteCodeFormData) => {
      return await apiRequest("POST", "/api/invite-codes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invite-codes"] });
      toast({ title: "Invite code created successfully" });
      setIsDialogOpen(false);
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

  const getEventName = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    return event?.name || "Unknown Event";
  };

  const columns = [
    {
      header: "Code",
      key: "code",
      cell: (row: InviteCode) => (
        <span className="font-mono font-medium" data-testid={`text-code-${row.id}`}>{row.code}</span>
      ),
    },
    {
      header: "Event",
      key: "eventId",
      cell: (row: InviteCode) => (
        <span data-testid={`text-event-${row.id}`}>{getEventName(row.eventId)}</span>
      ),
    },
    {
      header: "Quantity",
      key: "quantity",
      cell: (row: InviteCode) => (
        <span data-testid={`text-quantity-${row.id}`}>
          {row.quantity === null ? (
            "Unlimited"
          ) : (
            `${row.usedCount ?? 0} / ${row.quantity}`
          )}
        </span>
      ),
    },
    {
      header: "Status",
      key: "isActive",
      cell: (row: InviteCode) => (
        <Badge variant={row.isActive ? "default" : "secondary"} data-testid={`badge-status-${row.id}`}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      cell: (row: InviteCode) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row)}
            data-testid={`button-edit-${row.id}`}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row.id)}
            data-testid={`button-delete-${row.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Invite Codes"
        breadcrumbs={[{ label: "Invite Codes" }]}
        actions={
          <div className="flex items-center gap-4">
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
          <DataTable 
            columns={columns} 
            data={inviteCodes} 
            getRowKey={(row) => row.id}
          />
        )}
      </div>
    </div>
  );
}
