import { useState, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Users, Search, Download, Settings2, ArrowUpDown, ArrowUp, ArrowDown, Filter, X } from "lucide-react";
import { EventSelectField } from "@/components/event-select-field";
import type { Attendee, Event, CustomField, InviteCode, Package } from "@shared/schema";

const ATTENDEE_TYPE_OPTIONS = [
  { value: "attendee", label: "Attendee" },
  { value: "vendor", label: "Vendor" },
  { value: "employee", label: "Employee" },
  { value: "press_media", label: "Press & Media" },
  { value: "analyst", label: "Analyst" },
  { value: "sponsor", label: "Sponsor" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "waitlist", label: "Waitlist" },
  { value: "cancelled", label: "Cancelled" },
];

type ColumnConfig = {
  key: string;
  header: string;
  sortable?: boolean;
  getValue?: (attendee: Attendee) => string | number | boolean | null;
};

const ALL_COLUMNS: ColumnConfig[] = [
  { key: "name", header: "Name", sortable: true, getValue: (a) => `${a.firstName} ${a.lastName}` },
  { key: "email", header: "Email", sortable: true, getValue: (a) => a.email },
  { key: "event", header: "Event", sortable: true, getValue: (a) => a.eventId },
  { key: "phone", header: "Phone", sortable: true, getValue: (a) => a.phone || "" },
  { key: "company", header: "Company", sortable: true, getValue: (a) => a.company || "" },
  { key: "jobTitle", header: "Job Title", sortable: true, getValue: (a) => a.jobTitle || "" },
  { key: "attendeeType", header: "Type", sortable: true, getValue: (a) => a.attendeeType || "" },
  { key: "ticketType", header: "Ticket", sortable: true, getValue: (a) => a.ticketType || "" },
  { key: "package", header: "Package", sortable: true, getValue: (a) => a.packageId || "" },
  { key: "inviteCode", header: "Invite Code", sortable: true, getValue: (a) => a.inviteCodeId || "" },
  { key: "status", header: "Status", sortable: true, getValue: (a) => a.registrationStatus || "pending" },
  { key: "checkedIn", header: "Checked In", sortable: true, getValue: (a) => a.checkedIn ? "Yes" : "No" },
  { key: "notes", header: "Notes", sortable: false, getValue: (a) => a.notes || "" },
];

const DEFAULT_VISIBLE_COLUMNS = ["name", "email", "company", "ticketType", "status"];

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
} | null;

const attendeeFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  inviteCode: z.string().optional(),
  attendeeType: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  ticketType: z.string().optional(),
  registrationStatus: z.string().default("pending"),
  notes: z.string().optional(),
  customData: z.record(z.union([z.string(), z.boolean(), z.array(z.string())])).optional(),
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
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: attendees = [], isLoading } = useQuery<Attendee[]>({
    queryKey: ["/api/attendees"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: customFields = [] } = useQuery<CustomField[]>({
    queryKey: ["/api/custom-fields"],
  });

  const { data: inviteCodes = [] } = useQuery<InviteCode[]>({
    queryKey: ["/api/invite-codes"],
  });

  const { data: packages = [] } = useQuery<Package[]>({
    queryKey: ["/api/packages"],
  });

  const activeCustomFields = useMemo(() => {
    return customFields
      .filter((f) => f.isActive)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [customFields]);

  const eventLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    events.forEach((event) => {
      lookup[event.id] = event.name;
    });
    return lookup;
  }, [events]);

  const inviteCodeLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    inviteCodes.forEach((code) => {
      lookup[code.id] = code.code;
    });
    return lookup;
  }, [inviteCodes]);

  const packageLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    packages.forEach((pkg) => {
      lookup[pkg.id] = pkg.name;
    });
    return lookup;
  }, [packages]);

  const form = useForm<AttendeeFormData>({
    resolver: zodResolver(attendeeFormSchema),
    defaultValues: {
      eventId: "",
      inviteCode: "",
      attendeeType: "",
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
    const usedInviteCode = attendee.inviteCodeId ? inviteCodeLookup[attendee.inviteCodeId] || "" : "";
    const existingCustomData = (attendee.customData as Record<string, string | boolean | string[]> | null) || {};
    form.reset({
      eventId: attendee.eventId,
      inviteCode: usedInviteCode,
      attendeeType: attendee.attendeeType || "",
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      email: attendee.email,
      phone: attendee.phone || "",
      company: attendee.company || "",
      jobTitle: attendee.jobTitle || "",
      ticketType: attendee.ticketType || "",
      registrationStatus: attendee.registrationStatus || "pending",
      notes: attendee.notes || "",
      customData: existingCustomData,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingAttendee(null);
    form.reset();
  };

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns((prev) =>
      prev.includes(columnKey)
        ? prev.filter((k) => k !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleSort = (columnKey: string) => {
    setSortConfig((prev) => {
      if (prev?.key === columnKey) {
        if (prev.direction === "asc") {
          return { key: columnKey, direction: "desc" };
        }
        return null;
      }
      return { key: columnKey, direction: "asc" };
    });
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setSearchQuery("");
  };

  const hasActiveFilters = statusFilter !== "all" || typeFilter !== "all" || searchQuery !== "";

  const processedAttendees = useMemo(() => {
    let result = [...attendees];

    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter((attendee) =>
        attendee.firstName.toLowerCase().includes(searchLower) ||
        attendee.lastName.toLowerCase().includes(searchLower) ||
        attendee.email.toLowerCase().includes(searchLower) ||
        (attendee.company?.toLowerCase().includes(searchLower) ?? false)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((attendee) => attendee.registrationStatus === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== "all") {
      result = result.filter((attendee) => attendee.attendeeType === typeFilter);
    }

    // Apply sorting
    if (sortConfig) {
      const columnConfig = ALL_COLUMNS.find((c) => c.key === sortConfig.key);
      if (columnConfig?.getValue) {
        result.sort((a, b) => {
          let aVal = columnConfig.getValue!(a);
          let bVal = columnConfig.getValue!(b);
          
          // For event column, sort by event name not ID
          if (sortConfig.key === "event") {
            aVal = eventLookup[a.eventId] || "";
            bVal = eventLookup[b.eventId] || "";
          }
          
          const aIsEmpty = aVal === null || aVal === undefined || aVal === "";
          const bIsEmpty = bVal === null || bVal === undefined || bVal === "";
          
          // Handle null/empty values consistently - push to end
          if (aIsEmpty && bIsEmpty) return 0;
          if (aIsEmpty) return 1;
          if (bIsEmpty) return -1;
          
          let comparison = 0;
          if (typeof aVal === "string" && typeof bVal === "string") {
            comparison = aVal.localeCompare(bVal);
          } else if (typeof aVal === "number" && typeof bVal === "number") {
            comparison = aVal - bVal;
          } else {
            comparison = String(aVal).localeCompare(String(bVal));
          }
          
          return sortConfig.direction === "asc" ? comparison : -comparison;
        });
      }
    }

    return result;
  }, [attendees, searchQuery, statusFilter, typeFilter, sortConfig, eventLookup]);

  const getSortIcon = (columnKey: string) => {
    if (sortConfig?.key !== columnKey) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortConfig.direction === "asc" 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const columns = useMemo(() => {
    const visibleColumnConfigs = ALL_COLUMNS.filter((col) => visibleColumns.includes(col.key));
    
    const dynamicColumns = visibleColumnConfigs.map((colConfig) => {
      const baseColumn = {
        key: colConfig.key,
        header: colConfig.sortable ? (
          <button
            type="button"
            className="flex items-center hover-elevate px-1 py-0.5 rounded -ml-1"
            onClick={() => handleSort(colConfig.key)}
            data-testid={`button-sort-${colConfig.key}`}
          >
            {colConfig.header}
            {getSortIcon(colConfig.key)}
          </button>
        ) : colConfig.header,
        cell: (attendee: Attendee) => {
          switch (colConfig.key) {
            case "name":
              return (
                <div className="font-medium">
                  {attendee.firstName} {attendee.lastName}
                </div>
              );
            case "email":
              return <span className="text-muted-foreground">{attendee.email}</span>;
            case "event":
              return eventLookup[attendee.eventId] || "-";
            case "status":
              return (
                <Badge variant={statusColors[attendee.registrationStatus || "pending"]}>
                  {attendee.registrationStatus || "pending"}
                </Badge>
              );
            case "attendeeType":
              const typeOption = ATTENDEE_TYPE_OPTIONS.find(t => t.value === attendee.attendeeType);
              return typeOption?.label || attendee.attendeeType || "-";
            case "checkedIn":
              return attendee.checkedIn ? (
                <Badge variant="default">Yes</Badge>
              ) : (
                <Badge variant="outline">No</Badge>
              );
            case "inviteCode":
              return attendee.inviteCodeId ? inviteCodeLookup[attendee.inviteCodeId] || "-" : "-";
            case "package":
              return attendee.packageId ? packageLookup[attendee.packageId] || "-" : "-";
            default:
              const value = colConfig.getValue?.(attendee);
              return value || "-";
          }
        },
      };
      return baseColumn;
    });

    // Add custom field columns
    activeCustomFields.forEach((customField) => {
      const customFieldKey = `custom_${customField.name}`;
      if (visibleColumns.includes(customFieldKey)) {
        dynamicColumns.push({
          key: customFieldKey,
          header: customField.label,
          cell: (attendee: Attendee) => {
            const customData = attendee.customData as Record<string, string | boolean | string[]> | null | undefined;
            if (!customData || customData[customField.name] === undefined || customData[customField.name] === null) {
              return "-";
            }
            const value = customData[customField.name];
            if (typeof value === "boolean") {
              return value ? "Yes" : "No";
            }
            if (Array.isArray(value)) {
              return value.join(", ");
            }
            return String(value) || "-";
          },
        });
      }
    });

    // Always add actions column at the end
    dynamicColumns.push({
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
    });

    return dynamicColumns;
  }, [visibleColumns, sortConfig, eventLookup, inviteCodeLookup, packageLookup, activeCustomFields]);

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
                  <EventSelectField control={form.control} />
                  <FormField
                    control={form.control}
                    name="inviteCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invite Code (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Enter invite code to auto-apply type and package"
                            data-testid="input-invite-code" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="attendeeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attendee Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-attendee-type">
                              <SelectValue placeholder="Select attendee type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ATTENDEE_TYPE_OPTIONS.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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

                  {activeCustomFields.length > 0 && (
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="text-sm font-medium text-muted-foreground">Custom Fields</h4>
                      {activeCustomFields.map((customField) => (
                        <FormField
                          key={customField.id}
                          control={form.control}
                          name={`customData.${customField.name}` as const}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{customField.label}</FormLabel>
                              <FormControl>
                                {customField.fieldType === "checkbox" ? (
                                  <div className="flex items-center">
                                    <Checkbox
                                      checked={field.value as boolean || false}
                                      onCheckedChange={field.onChange}
                                      data-testid={`checkbox-custom-${customField.name}`}
                                    />
                                    <span className="ml-2 text-sm text-muted-foreground">
                                      {field.value ? "Yes" : "No"}
                                    </span>
                                  </div>
                                ) : customField.fieldType === "select" ? (
                                  <Select
                                    onValueChange={field.onChange}
                                    value={(field.value as string) || ""}
                                  >
                                    <SelectTrigger data-testid={`select-custom-${customField.name}`}>
                                      <SelectValue placeholder={`Select ${customField.label}`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(customField.options || []).map((option) => (
                                        <SelectItem key={option} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : customField.fieldType === "textarea" ? (
                                  <Textarea
                                    {...field}
                                    value={(field.value as string) || ""}
                                    data-testid={`textarea-custom-${customField.name}`}
                                  />
                                ) : (
                                  <Input
                                    {...field}
                                    type={customField.fieldType === "number" ? "number" : "text"}
                                    value={(field.value as string) || ""}
                                    data-testid={`input-custom-${customField.name}`}
                                  />
                                )}
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  )}

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
          {/* Search and controls row */}
          <div className="flex items-center gap-3 flex-wrap">
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
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-status">
                <Filter className="h-4 w-4 mr-2 opacity-50" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-type">
                <Filter className="h-4 w-4 mr-2 opacity-50" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ATTENDEE_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}

            {/* Column Visibility Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-column-settings">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 max-h-80 overflow-y-auto" align="end">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm mb-3">Toggle Columns</h4>
                  {ALL_COLUMNS.map((column) => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`col-${column.key}`}
                        checked={visibleColumns.includes(column.key)}
                        onCheckedChange={() => toggleColumn(column.key)}
                        data-testid={`checkbox-column-${column.key}`}
                      />
                      <label
                        htmlFor={`col-${column.key}`}
                        className="text-sm cursor-pointer"
                      >
                        {column.header}
                      </label>
                    </div>
                  ))}
                  {activeCustomFields.length > 0 && (
                    <>
                      <div className="border-t my-2 pt-2">
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Custom Fields</h4>
                      </div>
                      {activeCustomFields.map((field) => {
                        const fieldKey = `custom_${field.name}`;
                        return (
                          <div key={fieldKey} className="flex items-center space-x-2">
                            <Checkbox
                              id={`col-${fieldKey}`}
                              checked={visibleColumns.includes(fieldKey)}
                              onCheckedChange={() => toggleColumn(fieldKey)}
                              data-testid={`checkbox-column-${fieldKey}`}
                            />
                            <label
                              htmlFor={`col-${fieldKey}`}
                              className="text-sm cursor-pointer"
                            >
                              {field.label}
                            </label>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="sm" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Results count */}
          {!isLoading && attendees.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {processedAttendees.length} of {attendees.length} attendees
            </div>
          )}

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
              data={processedAttendees}
              isLoading={isLoading}
              emptyMessage="No attendees match your filters"
              getRowKey={(attendee) => attendee.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
