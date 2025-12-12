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
import { Plus, Users, Search, Download } from "lucide-react";
import type { Attendee } from "@shared/schema";

const attendeeFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  ticketType: z.string().optional(),
  registrationStatus: z.string().default("pending"),
  notes: z.string().optional(),
});

type AttendeeFormData = z.infer<typeof attendeeFormSchema>;

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
  waitlist: "outline",
};

export default function Attendees() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);

  const { data: attendees = [], isLoading } = useQuery<Attendee[]>({
    queryKey: ["/api/attendees"],
  });

  const form = useForm<AttendeeFormData>({
    resolver: zodResolver(attendeeFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      jobTitle: "",
      ticketType: "",
      registrationStatus: "pending",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AttendeeFormData) => {
      return await apiRequest("POST", "/api/attendees", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Attendee added successfully" });
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
    mutationFn: async ({ id, data }: { id: string; data: AttendeeFormData }) => {
      return await apiRequest("PATCH", `/api/attendees/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendees"] });
      toast({ title: "Attendee updated successfully" });
      setIsDialogOpen(false);
      setEditingAttendee(null);
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

  const onSubmit = (data: AttendeeFormData) => {
    if (editingAttendee) {
      updateMutation.mutate({ id: editingAttendee.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (attendee: Attendee) => {
    setEditingAttendee(attendee);
    form.reset({
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      email: attendee.email,
      phone: attendee.phone || "",
      company: attendee.company || "",
      jobTitle: attendee.jobTitle || "",
      ticketType: attendee.ticketType || "",
      registrationStatus: attendee.registrationStatus || "pending",
      notes: attendee.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingAttendee(null);
    form.reset();
  };

  const filteredAttendees = attendees.filter((attendee) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      attendee.firstName.toLowerCase().includes(searchLower) ||
      attendee.lastName.toLowerCase().includes(searchLower) ||
      attendee.email.toLowerCase().includes(searchLower) ||
      (attendee.company?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (attendee: Attendee) => (
        <div className="font-medium">
          {attendee.firstName} {attendee.lastName}
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      cell: (attendee: Attendee) => (
        <span className="text-muted-foreground">{attendee.email}</span>
      ),
    },
    {
      key: "company",
      header: "Company",
      cell: (attendee: Attendee) => attendee.company || "-",
    },
    {
      key: "ticketType",
      header: "Ticket",
      cell: (attendee: Attendee) => attendee.ticketType || "-",
    },
    {
      key: "status",
      header: "Status",
      cell: (attendee: Attendee) => (
        <Badge variant={statusColors[attendee.registrationStatus || "pending"]}>
          {attendee.registrationStatus || "pending"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (attendee: Attendee) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(attendee);
          }}
          data-testid={`button-edit-${attendee.id}`}
        >
          Edit
        </Button>
      ),
      className: "w-20",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Attendees"
        breadcrumbs={[{ label: "Attendees" }]}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleDialogClose()}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-attendee">
                <Plus className="h-4 w-4 mr-2" />
                Add Attendee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAttendee ? "Edit Attendee" : "Add New Attendee"}</DialogTitle>
                <DialogDescription>
                  {editingAttendee ? "Update attendee information" : "Enter the attendee details below"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ticketType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ticket Type</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., VIP, General" data-testid="input-ticket-type" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-company" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-job-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="registrationStatus"
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
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="waitlist">Waitlist</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-notes" />
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
                      data-testid="button-submit-attendee"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? "Saving..."
                        : editingAttendee
                        ? "Update"
                        : "Add Attendee"}
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
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search attendees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Button variant="outline" size="sm" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {!isLoading && attendees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No attendees yet"
              description="Start by adding your first attendee to the event"
              action={{
                label: "Add Attendee",
                onClick: () => setIsDialogOpen(true),
              }}
            />
          ) : (
            <DataTable
              columns={columns}
              data={filteredAttendees}
              isLoading={isLoading}
              emptyMessage="No attendees match your search"
              getRowKey={(attendee) => attendee.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
