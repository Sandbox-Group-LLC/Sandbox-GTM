import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, UserCheck, Trash2, ChevronDown, ChevronRight, Calendar } from "lucide-react";
import { EventSelectField } from "@/components/event-select-field";
import type { AttendeeType, Event } from "@shared/schema";

const attendeeTypeFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  type: z.string().min(1, "Type is required"),
  capacity: z.coerce.number().min(0, "Capacity must be 0 or greater").default(0),
});

type AttendeeTypeFormData = z.infer<typeof attendeeTypeFormSchema>;

const typeOptions = [
  { value: "attendee", label: "Attendee" },
  { value: "speaker", label: "Speaker" },
  { value: "vendor", label: "Vendor" },
  { value: "employee", label: "Employee" },
  { value: "press & media", label: "Press & Media" },
  { value: "analyst", label: "Analyst" },
  { value: "sponsor", label: "Sponsor" },
];

interface GroupedAttendeeTypes {
  eventId: string;
  eventName: string;
  types: AttendeeType[];
}

export default function AttendeeTypes() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<AttendeeType | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const { data: attendeeTypes = [], isLoading } = useQuery<AttendeeType[]>({
    queryKey: ["/api/attendee-types"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const form = useForm<AttendeeTypeFormData>({
    resolver: zodResolver(attendeeTypeFormSchema),
    defaultValues: {
      eventId: "",
      type: "",
      capacity: 0,
    },
  });

  const groupedData = useMemo(() => {
    const eventMap = new Map<string, GroupedAttendeeTypes>();
    
    attendeeTypes.forEach((type) => {
      if (!eventMap.has(type.eventId)) {
        const event = events.find((e) => e.id === type.eventId);
        eventMap.set(type.eventId, {
          eventId: type.eventId,
          eventName: event?.name || "Unknown Event",
          types: [],
        });
      }
      eventMap.get(type.eventId)!.types.push(type);
    });
    
    return Array.from(eventMap.values()).sort((a, b) => 
      a.eventName.localeCompare(b.eventName)
    );
  }, [attendeeTypes, events]);

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
    mutationFn: async (data: AttendeeTypeFormData) => {
      return await apiRequest("POST", "/api/attendee-types", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendee-types"] });
      toast({ title: "Attendee type added successfully" });
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
    mutationFn: async ({ id, data }: { id: string; data: AttendeeTypeFormData }) => {
      return await apiRequest("PATCH", `/api/attendee-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendee-types"] });
      toast({ title: "Attendee type updated successfully" });
      setIsDialogOpen(false);
      setEditingType(null);
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
      return await apiRequest("DELETE", `/api/attendee-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendee-types"] });
      toast({ title: "Attendee type deleted successfully" });
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

  const onSubmit = (data: AttendeeTypeFormData) => {
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (attendeeType: AttendeeType) => {
    setEditingType(attendeeType);
    form.reset({
      eventId: attendeeType.eventId,
      type: attendeeType.type,
      capacity: attendeeType.capacity || 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this attendee type?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingType(null);
    form.reset();
  };

  const getTypeLabel = (typeValue: string) => {
    const typeOption = typeOptions.find((t) => t.value === typeValue);
    return typeOption?.label || typeValue;
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Attendee Types"
        breadcrumbs={[{ label: "Audience", href: "/attendees" }, { label: "Attendee Types" }]}
        actions={
          <div className="flex items-center gap-2">
            {groupedData.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={expandAll} data-testid="button-expand-all">
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll} data-testid="button-collapse-all">
                  Collapse All
                </Button>
              </>
            )}
            <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleDialogClose()}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-attendee-type">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Attendee Type
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingType ? "Edit Attendee Type" : "Add New Attendee Type"}</DialogTitle>
                  <DialogDescription>
                    {editingType ? "Update attendee type information" : "Define a new attendee type with capacity"}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <EventSelectField control={form.control} />
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {typeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
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
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capacity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              data-testid="input-capacity"
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
                        data-testid="button-submit-attendee-type"
                      >
                        {createMutation.isPending || updateMutation.isPending
                          ? "Saving..."
                          : editingType
                          ? "Update"
                          : "Add Type"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          ) : attendeeTypes.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No attendee types yet"
              description="Start by adding your first attendee type to define capacity limits"
              action={{
                label: "Add Attendee Type",
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
                            <span className="text-sm text-muted-foreground" data-testid={`text-type-count-${group.eventId}`}>
                              {group.types.length} {group.types.length === 1 ? "type" : "types"}
                            </span>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Capacity</TableHead>
                                <TableHead className="w-32"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.types.map((attendeeType) => (
                                <TableRow key={attendeeType.id} data-testid={`row-attendee-type-${attendeeType.id}`}>
                                  <TableCell data-testid={`text-type-${attendeeType.id}`}>
                                    {getTypeLabel(attendeeType.type)}
                                  </TableCell>
                                  <TableCell data-testid={`text-capacity-${attendeeType.id}`}>
                                    {attendeeType.capacity || 0}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(attendeeType)}
                                        data-testid={`button-edit-${attendeeType.id}`}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(attendeeType.id)}
                                        data-testid={`button-delete-${attendeeType.id}`}
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
