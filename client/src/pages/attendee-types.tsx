import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, UserCheck, Trash2 } from "lucide-react";
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
  { value: "vendor", label: "Vendor" },
  { value: "employee", label: "Employee" },
  { value: "press & media", label: "Press & Media" },
  { value: "analyst", label: "Analyst" },
  { value: "sponsor", label: "Sponsor" },
];

export default function AttendeeTypes() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<AttendeeType | null>(null);

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

  const createMutation = useMutation({
    mutationFn: async (data: AttendeeTypeFormData) => {
      return await apiRequest("POST", "/api/attendee-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendee-types"] });
      toast({ title: "Attendee type added successfully" });
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

  const getEventName = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    return event?.name || "Unknown Event";
  };

  const getTypeLabel = (typeValue: string) => {
    const typeOption = typeOptions.find((t) => t.value === typeValue);
    return typeOption?.label || typeValue;
  };

  const columns = [
    {
      key: "event",
      header: "Event",
      cell: (attendeeType: AttendeeType) => (
        <div className="font-medium" data-testid={`text-event-${attendeeType.id}`}>
          {getEventName(attendeeType.eventId)}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (attendeeType: AttendeeType) => (
        <span data-testid={`text-type-${attendeeType.id}`}>{getTypeLabel(attendeeType.type)}</span>
      ),
    },
    {
      key: "capacity",
      header: "Capacity",
      cell: (attendeeType: AttendeeType) => (
        <span data-testid={`text-capacity-${attendeeType.id}`}>{attendeeType.capacity || 0}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (attendeeType: AttendeeType) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(attendeeType);
            }}
            data-testid={`button-edit-${attendeeType.id}`}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(attendeeType.id);
            }}
            data-testid={`button-delete-${attendeeType.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
      className: "w-32",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Attendee Types"
        breadcrumbs={[{ label: "Events" }, { label: "Attendee Types" }]}
        actions={
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
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {!isLoading && attendeeTypes.length === 0 ? (
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
            <DataTable
              columns={columns}
              data={attendeeTypes}
              isLoading={isLoading}
              emptyMessage="No attendee types found"
              getRowKey={(attendeeType) => attendeeType.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
