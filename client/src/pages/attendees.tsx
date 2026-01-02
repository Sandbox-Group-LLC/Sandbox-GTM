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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { titleCase } from "@/lib/utils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Users, Search, Download, Settings2, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Trash2, Eye, Mail, ExternalLink, Copy, Info, Flame, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EventSelectField } from "@/components/event-select-field";
import type { Attendee, Event, CustomField, InviteCode, Package, Organization, EmailTemplate, ActivationLink, IntentExplanation } from "@shared/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Send, Loader2, Link2 } from "lucide-react";

interface AttendeeEmailMessage {
  id: string;
  subject: string | null;
  recipientEmail: string;
  status: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
  openCount: number | null;
  clickCount: number | null;
}

const ATTENDEE_TYPE_OPTIONS = [
  { value: "attendee", label: "Attendee" },
  { value: "speaker", label: "Speaker" },
  { value: "vendor", label: "Vendor" },
  { value: "employee", label: "Employee" },
  { value: "press_media", label: "Press & Media" },
  { value: "analyst", label: "Analyst" },
  { value: "sponsor", label: "Sponsor" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "invited", label: "Invited" },
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
  { key: "package", header: "Access Package", sortable: true, getValue: (a) => a.packageId || "" },
  { key: "inviteCode", header: "Activation Key", sortable: true, getValue: (a) => a.inviteCodeId || "" },
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

function formatOpportunityBucket(bucket: string): string {
  const labels: Record<string, string> = {
    under_10k: '<$10k',
    '10k_to_50k': '$10k-$50k',
    '50k_to_100k': '$50k-$100k',
    over_100k: '$100k+',
  };
  return labels[bucket] || bucket;
}

function generateCRMNote(
  explanation: IntentExplanation,
  intentStatus: string,
  contactName: string,
  company: string | null
): string {
  const lines: string[] = [];
  
  const statusLabel = intentStatus === 'hot_lead' ? 'Hot Lead' : 'High-Intent';
  lines.push(`[${statusLabel}] ${contactName}${company ? ` - ${company}` : ''}`);
  lines.push('');

  if (explanation.primary_reasons.length > 0) {
    lines.push('Primary Reasons:');
    for (const reason of explanation.primary_reasons) {
      lines.push(`• ${reason}`);
    }
    lines.push('');
  }

  if (explanation.supporting_signals.length > 0) {
    lines.push('Supporting Signals:');
    for (const signal of explanation.supporting_signals) {
      lines.push(`• ${signal}`);
    }
    lines.push('');
  }

  if (explanation.contra_signals && explanation.contra_signals.length > 0) {
    lines.push('Context / Caveats:');
    for (const contra of explanation.contra_signals) {
      lines.push(`• ${contra.context}`);
    }
    lines.push('');
  }

  if (explanation.context) {
    lines.push('Note:');
    lines.push(`• ${explanation.context}`);
    lines.push('');
  }

  lines.push(`Momentum Score: ${explanation.totals.momentum_score}/10`);
  if (explanation.totals.highest_intent_level_seen) {
    lines.push(`Highest Intent Level: ${explanation.totals.highest_intent_level_seen}`);
  }
  if (explanation.totals.max_opportunity_bucket_seen) {
    lines.push(`Max Opportunity: ${formatOpportunityBucket(explanation.totals.max_opportunity_bucket_seen)}`);
  }

  return lines.join('\n');
}

export default function Attendees() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  const [viewingAttendee, setViewingAttendee] = useState<Attendee | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [isBulkEmailDialogOpen, setIsBulkEmailDialogOpen] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<string>("");
  const [bulkEditValue, setBulkEditValue] = useState<string>("");
  const [bulkEmailTemplateId, setBulkEmailTemplateId] = useState<string>("");

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

  const { data: activationLinks = [] } = useQuery<ActivationLink[]>({
    queryKey: ["/api/activation-links"],
  });

  const { data: organization } = useQuery<Organization>({
    queryKey: ["/api/auth/organization"],
  });

  const { data: attendeeEmails = [], isLoading: emailsLoading } = useQuery<AttendeeEmailMessage[]>({
    queryKey: ["/api/organizations", organization?.id, "attendees", viewingAttendee?.id, "email-messages"],
    enabled: !!organization?.id && !!viewingAttendee?.id,
    queryFn: async () => {
      const res = await fetch(
        `/api/organizations/${organization!.id}/attendees/${viewingAttendee!.id}/email-messages`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch email messages");
      return res.json();
    },
  });

  const { data: emailTemplates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ attendeeId, templateId }: { attendeeId: string; templateId: string }) => {
      return await apiRequest(
        "POST",
        `/api/organizations/${organization!.id}/attendees/${attendeeId}/send-email`,
        { templateId }
      );
    },
    onSuccess: () => {
      toast({ title: "Email sent successfully" });
      setSelectedTemplateId("");
      queryClient.invalidateQueries({ 
        queryKey: ["/api/organizations", organization?.id, "attendees", viewingAttendee?.id, "email-messages"] 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to send email", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ attendeeIds, updates }: { attendeeIds: string[]; updates: Record<string, unknown> }) => {
      return await apiRequest("POST", "/api/attendees/bulk-update", { attendeeIds, updates });
    },
    onSuccess: (data: { success: number; failed: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendees"] });
      toast({ 
        title: "Bulk update completed",
        description: `${data.success} updated, ${data.failed} failed`
      });
      setSelectedIds(new Set());
      setIsBulkEditDialogOpen(false);
      setBulkEditField("");
      setBulkEditValue("");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const bulkEmailMutation = useMutation({
    mutationFn: async ({ attendeeIds, templateId }: { attendeeIds: string[]; templateId: string }) => {
      return await apiRequest("POST", "/api/attendees/bulk-email", { attendeeIds, templateId });
    },
    onSuccess: (data: { success: number; failed: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendees"] });
      toast({ 
        title: "Bulk email completed",
        description: `${data.success} sent, ${data.failed} failed`
      });
      setSelectedIds(new Set());
      setIsBulkEmailDialogOpen(false);
      setBulkEmailTemplateId("");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Failed to send emails", description: error.message, variant: "destructive" });
    },
  });

  const toggleSelectAll = () => {
    const allFilteredIds = new Set(processedAttendees.map(a => a.id));
    const allSelected = processedAttendees.every(a => selectedIds.has(a.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(allFilteredIds);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkEdit = () => {
    if (!bulkEditField || selectedIds.size === 0) return;
    
    let updates: Record<string, unknown> = {};
    
    switch (bulkEditField) {
      case "status":
        updates = { registrationStatus: bulkEditValue };
        break;
      case "type":
        updates = { attendeeType: bulkEditValue };
        break;
      case "ticketType":
        updates = { ticketType: bulkEditValue };
        break;
      case "checkedIn":
        updates = { checkedIn: bulkEditValue === "true" };
        break;
      case "notes":
        updates = { notes: bulkEditValue };
        break;
    }
    
    bulkUpdateMutation.mutate({ attendeeIds: Array.from(selectedIds), updates });
  };

  const handleBulkEmail = () => {
    if (!bulkEmailTemplateId || selectedIds.size === 0) return;
    bulkEmailMutation.mutate({ attendeeIds: Array.from(selectedIds), templateId: bulkEmailTemplateId });
  };

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

  const eventSlugLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    events.forEach((event) => {
      if (event.publicSlug) {
        lookup[event.id] = event.publicSlug;
      }
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

  const activationLinkLookup = useMemo(() => {
    const lookup: Record<string, ActivationLink> = {};
    activationLinks.forEach((link) => {
      lookup[link.id] = link;
    });
    return lookup;
  }, [activationLinks]);

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
      customData: {},
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AttendeeFormData) => {
      return await apiRequest("POST", "/api/attendees", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Audience member added successfully" });
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
      toast({ title: "Audience member updated successfully" });
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/attendees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Audience member deleted successfully" });
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

  const handleDelete = (attendee: Attendee) => {
    if (confirm(`Are you sure you want to delete ${attendee.firstName} ${attendee.lastName}?`)) {
      deleteMutation.mutate(attendee.id);
    }
  };

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
    setEventFilter("all");
    setSearchQuery("");
  };

  const hasActiveFilters = statusFilter !== "all" || typeFilter !== "all" || eventFilter !== "all" || searchQuery !== "";

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

    // Apply event filter
    if (eventFilter !== "all") {
      result = result.filter((attendee) => attendee.eventId === eventFilter);
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
  }, [attendees, searchQuery, statusFilter, typeFilter, eventFilter, sortConfig, eventLookup]);

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
    
    const allFilteredSelected = processedAttendees.length > 0 && processedAttendees.every(a => selectedIds.has(a.id));
    const someSelected = processedAttendees.some(a => selectedIds.has(a.id));
    
    const dynamicColumns: Array<{ key: string; header: React.ReactNode; cell: (attendee: Attendee) => React.ReactNode }> = [];
    
    dynamicColumns.push({
      key: "select",
      header: (
        <Checkbox
          checked={allFilteredSelected}
          onCheckedChange={toggleSelectAll}
          aria-label="Select all"
          data-testid="checkbox-select-all"
          className={someSelected && !allFilteredSelected ? "opacity-50" : ""}
        />
      ),
      cell: (attendee: Attendee) => (
        <Checkbox
          checked={selectedIds.has(attendee.id)}
          onCheckedChange={() => toggleSelectOne(attendee.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${attendee.firstName} ${attendee.lastName}`}
          data-testid={`checkbox-select-${attendee.id}`}
        />
      ),
    });
    
    visibleColumnConfigs.forEach((colConfig) => {
      dynamicColumns.push({
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
                  {titleCase(attendee.registrationStatus || "pending")}
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
      });
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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setViewingAttendee(attendee);
            }}
            data-testid={`button-view-${attendee.id}`}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(attendee);
            }}
            data-testid={`button-delete-${attendee.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    });

    return dynamicColumns;
  }, [visibleColumns, sortConfig, eventLookup, inviteCodeLookup, packageLookup, activeCustomFields, selectedIds, processedAttendees]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Audience"
        breadcrumbs={[{ label: "Audience" }]}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleDialogClose()}>
            <DialogTrigger asChild>
              <Button size="icon" className="sm:w-auto sm:px-4" data-testid="button-add-attendee">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Member</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAttendee ? "Edit Audience Member" : "Add New Audience Member"}</DialogTitle>
                <DialogDescription>
                  {editingAttendee ? "Update audience member information" : "Enter the audience member details below"}
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
                        <FormLabel>Activation Key (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Enter activation key to auto-apply type and package"
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
                            <SelectItem value="invited">Invited</SelectItem>
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

                  {customFields.filter(cf => cf.isActive && !cf.attendeeOnly).length > 0 && (
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-medium text-sm">Properties</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {customFields
                          .filter(cf => cf.isActive && !cf.attendeeOnly)
                          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                          .map((cf) => {
                            const currentValue = form.watch(`customData.${cf.name}`);
                            
                            if (cf.fieldType === "checkbox") {
                              return (
                                <FormItem key={cf.id} className="flex items-center gap-2 col-span-2">
                                  <Checkbox
                                    checked={currentValue === true || currentValue === "true"}
                                    onCheckedChange={(checked) => {
                                      const customData = form.getValues("customData") || {};
                                      form.setValue("customData", { ...customData, [cf.name]: checked });
                                    }}
                                    data-testid={`input-custom-${cf.name}`}
                                  />
                                  <FormLabel className="!mt-0 cursor-pointer">
                                    {cf.label}
                                    {cf.required && <span className="text-destructive ml-1">*</span>}
                                  </FormLabel>
                                </FormItem>
                              );
                            }
                            
                            if (cf.fieldType === "select" && cf.options) {
                              return (
                                <FormItem key={cf.id}>
                                  <FormLabel>
                                    {cf.label}
                                    {cf.required && <span className="text-destructive ml-1">*</span>}
                                  </FormLabel>
                                  <Select
                                    value={(currentValue as string) || ""}
                                    onValueChange={(value) => {
                                      const customData = form.getValues("customData") || {};
                                      form.setValue("customData", { ...customData, [cf.name]: value });
                                    }}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid={`select-custom-${cf.name}`}>
                                        <SelectValue placeholder={`Select ${cf.label}`} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {cf.options.map((option) => (
                                        <SelectItem key={option} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              );
                            }
                            
                            if (cf.fieldType === "multiselect" && cf.options) {
                              const selectedValues = Array.isArray(currentValue) ? currentValue : [];
                              return (
                                <FormItem key={cf.id} className="col-span-2">
                                  <FormLabel>
                                    {cf.label}
                                    {cf.required && <span className="text-destructive ml-1">*</span>}
                                  </FormLabel>
                                  <div className="flex flex-wrap gap-2 p-2 border rounded-md">
                                    {cf.options.map((option) => (
                                      <label key={option} className="flex items-center gap-1 text-sm cursor-pointer">
                                        <Checkbox
                                          checked={selectedValues.includes(option)}
                                          onCheckedChange={(checked) => {
                                            const customData = form.getValues("customData") || {};
                                            const newValues = checked
                                              ? [...selectedValues, option]
                                              : selectedValues.filter(v => v !== option);
                                            form.setValue("customData", { ...customData, [cf.name]: newValues });
                                          }}
                                          data-testid={`checkbox-custom-${cf.name}-${option}`}
                                        />
                                        {option}
                                      </label>
                                    ))}
                                  </div>
                                </FormItem>
                              );
                            }
                            
                            if (cf.fieldType === "textarea") {
                              return (
                                <FormItem key={cf.id} className="col-span-2">
                                  <FormLabel>
                                    {cf.label}
                                    {cf.required && <span className="text-destructive ml-1">*</span>}
                                  </FormLabel>
                                  <FormControl>
                                    <Textarea
                                      value={(currentValue as string) || ""}
                                      onChange={(e) => {
                                        const customData = form.getValues("customData") || {};
                                        form.setValue("customData", { ...customData, [cf.name]: e.target.value });
                                      }}
                                      data-testid={`input-custom-${cf.name}`}
                                    />
                                  </FormControl>
                                </FormItem>
                              );
                            }
                            
                            return (
                              <FormItem key={cf.id}>
                                <FormLabel>
                                  {cf.label}
                                  {cf.required && <span className="text-destructive ml-1">*</span>}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type={cf.fieldType === "number" ? "number" : cf.fieldType === "email" ? "email" : "text"}
                                    value={(currentValue as string) || ""}
                                    onChange={(e) => {
                                      const customData = form.getValues("customData") || {};
                                      form.setValue("customData", { ...customData, [cf.name]: e.target.value });
                                    }}
                                    data-testid={`input-custom-${cf.name}`}
                                  />
                                </FormControl>
                              </FormItem>
                            );
                          })}
                      </div>
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
                placeholder="Search audience..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            
            {/* Event Filter */}
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-event">
                <SelectValue placeholder="Filter by event" />
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
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Properties</h4>
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

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border" data-testid="bulk-action-toolbar">
              <div className="flex items-center gap-2">
                <Checkbox checked={true} disabled className="pointer-events-none" />
                <span className="text-sm font-medium" data-testid="text-selected-count">
                  {selectedIds.size} selected
                </span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkEditDialogOpen(true)}
                  data-testid="button-bulk-edit"
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  Edit Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkEmailDialogOpen(true)}
                  data-testid="button-bulk-email"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email Selected
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  data-testid="button-clear-selection"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          {/* Results count */}
          {!isLoading && attendees.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {processedAttendees.length} of {attendees.length} audience members
            </div>
          )}

          {!isLoading && attendees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No audience members yet"
              description="Start by adding your first audience member to the program"
              action={{
                label: "Add Audience Member",
                onClick: () => setIsDialogOpen(true),
              }}
            />
          ) : (
            <DataTable
              columns={columns}
              data={processedAttendees}
              isLoading={isLoading}
              emptyMessage="No audience members match your filters"
              getRowKey={(attendee) => attendee.id}
            />
          )}
        </div>
      </div>

      <Sheet open={!!viewingAttendee} onOpenChange={(open) => !open && setViewingAttendee(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto" data-testid="sheet-attendee-details">
          <SheetHeader>
            <SheetTitle>Audience Member Details</SheetTitle>
            <SheetDescription>
              View audience member information and email activity
            </SheetDescription>
          </SheetHeader>

          {viewingAttendee && (
            <div className="mt-6 space-y-6">
              {/* Intent & Follow-Up Ready Section - only shows for qualified contacts */}
              {(viewingAttendee.intentStatus === 'hot_lead' || viewingAttendee.intentStatus === 'high_intent') && viewingAttendee.intentExplanation && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Intent & Follow-Up Ready</h3>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="text-xs">This contact has qualified signals indicating follow-up readiness. Copy the CRM note to paste directly into Salesforce, HubSpot, or other CRM systems.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        data-testid="button-copy-crm-note"
                        onClick={async () => {
                          const explanation = viewingAttendee.intentExplanation as IntentExplanation;
                          const note = generateCRMNote(
                            explanation,
                            viewingAttendee.intentStatus || 'high_intent',
                            `${viewingAttendee.firstName} ${viewingAttendee.lastName}`,
                            viewingAttendee.company
                          );
                          try {
                            await navigator.clipboard.writeText(note);
                            toast({
                              title: "Copied to clipboard",
                              description: "CRM note has been copied to your clipboard.",
                            });
                          } catch {
                            toast({
                              title: "Copy failed",
                              description: "Unable to copy to clipboard. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy CRM Note
                      </Button>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {viewingAttendee.intentStatus === 'hot_lead' ? (
                        <Badge variant="destructive" className="gap-1">
                          <Flame className="h-3 w-3" />
                          Hot Lead
                        </Badge>
                      ) : (
                        <Badge variant="default" className="gap-1">
                          <TrendingUp className="h-3 w-3" />
                          High-Intent
                        </Badge>
                      )}
                      {(viewingAttendee.intentExplanation as IntentExplanation).totals.momentum_score != null && (
                        <span className="text-xs text-muted-foreground">
                          Momentum: {(viewingAttendee.intentExplanation as IntentExplanation).totals.momentum_score}/10
                        </span>
                      )}
                    </div>

                    {/* Primary Reasons */}
                    {(viewingAttendee.intentExplanation as IntentExplanation).primary_reasons.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium text-muted-foreground">Primary Reasons</div>
                        <ul className="space-y-1">
                          {(viewingAttendee.intentExplanation as IntentExplanation).primary_reasons.map((reason, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <span className="text-muted-foreground mt-0.5">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Supporting Signals */}
                    {(viewingAttendee.intentExplanation as IntentExplanation).supporting_signals.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium text-muted-foreground">Supporting Signals</div>
                        <ul className="space-y-1">
                          {(viewingAttendee.intentExplanation as IntentExplanation).supporting_signals.map((signal, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="mt-0.5">•</span>
                              <span>{signal}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Context / Caveats */}
                    {(viewingAttendee.intentExplanation as IntentExplanation).contra_signals && 
                     (viewingAttendee.intentExplanation as IntentExplanation).contra_signals.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Context / Caveats</div>
                        <ul className="space-y-1">
                          {(viewingAttendee.intentExplanation as IntentExplanation).contra_signals.map((contra, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                              <span className="mt-0.5">•</span>
                              <span>{contra.context}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Footer Stats */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                      {(viewingAttendee.intentExplanation as IntentExplanation).totals.highest_intent_level_seen && (
                        <span>Highest Intent: {(viewingAttendee.intentExplanation as IntentExplanation).totals.highest_intent_level_seen}</span>
                      )}
                      {(viewingAttendee.intentExplanation as IntentExplanation).totals.max_opportunity_bucket_seen && (
                        <span>Max Opportunity: {formatOpportunityBucket((viewingAttendee.intentExplanation as IntentExplanation).totals.max_opportunity_bucket_seen!)}</span>
                      )}
                      {(viewingAttendee.intentExplanation as IntentExplanation).totals.total_interactions_count > 0 && (
                        <span>{(viewingAttendee.intentExplanation as IntentExplanation).totals.total_interactions_count} Product Interaction{(viewingAttendee.intentExplanation as IntentExplanation).totals.total_interactions_count === 1 ? '' : 's'}</span>
                      )}
                    </div>
                  </div>

                  <Separator />
                </>
              )}

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Name</div>
                    <div className="font-medium" data-testid="text-attendee-name">
                      {viewingAttendee.firstName} {viewingAttendee.lastName}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="font-medium" data-testid="text-attendee-email">
                      {viewingAttendee.email}
                    </div>
                  </div>
                  {viewingAttendee.phone && (
                    <div>
                      <div className="text-xs text-muted-foreground">Phone</div>
                      <div className="font-medium">{viewingAttendee.phone}</div>
                    </div>
                  )}
                  {viewingAttendee.company && (
                    <div>
                      <div className="text-xs text-muted-foreground">Company</div>
                      <div className="font-medium">{viewingAttendee.company}</div>
                    </div>
                  )}
                  {viewingAttendee.jobTitle && (
                    <div>
                      <div className="text-xs text-muted-foreground">Job Title</div>
                      <div className="font-medium">{viewingAttendee.jobTitle}</div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Registration Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Event</div>
                    <div className="font-medium">
                      {eventLookup[viewingAttendee.eventId] || viewingAttendee.eventId}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge variant={statusColors[viewingAttendee.registrationStatus || "pending"]}>
                      {titleCase(viewingAttendee.registrationStatus || "pending")}
                    </Badge>
                  </div>
                  {viewingAttendee.attendeeType && (
                    <div>
                      <div className="text-xs text-muted-foreground">Type</div>
                      <div className="font-medium">
                        {ATTENDEE_TYPE_OPTIONS.find(t => t.value === viewingAttendee.attendeeType)?.label || viewingAttendee.attendeeType}
                      </div>
                    </div>
                  )}
                  {viewingAttendee.ticketType && (
                    <div>
                      <div className="text-xs text-muted-foreground">Ticket Type</div>
                      <div className="font-medium">{viewingAttendee.ticketType}</div>
                    </div>
                  )}
                  {viewingAttendee.packageId && (
                    <div>
                      <div className="text-xs text-muted-foreground">Package</div>
                      <div className="font-medium">
                        {packageLookup[viewingAttendee.packageId] || "-"}
                      </div>
                    </div>
                  )}
                  {viewingAttendee.inviteCodeId && (
                    <div>
                      <div className="text-xs text-muted-foreground">Activation Key</div>
                      <div className="font-medium">
                        {inviteCodeLookup[viewingAttendee.inviteCodeId] || "-"}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground">Checked In</div>
                    <Badge variant={viewingAttendee.checkedIn ? "default" : "outline"}>
                      {viewingAttendee.checkedIn ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
                {viewingAttendee.notes && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Notes</div>
                    <div className="text-sm">{viewingAttendee.notes}</div>
                  </div>
                )}
              </div>

              {(viewingAttendee.activationLinkId || viewingAttendee.utmSource || viewingAttendee.utmMedium || viewingAttendee.utmCampaign) && (
                <>
                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-muted-foreground">Attribution</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {viewingAttendee.activationLinkId && activationLinkLookup[viewingAttendee.activationLinkId] && (
                        <div className="col-span-2">
                          <div className="text-xs text-muted-foreground">Activation Link</div>
                          <div className="font-medium" data-testid="text-attribution-link">
                            {activationLinkLookup[viewingAttendee.activationLinkId].name}
                          </div>
                        </div>
                      )}
                      {viewingAttendee.utmSource && (
                        <div>
                          <div className="text-xs text-muted-foreground">Source</div>
                          <div className="font-medium" data-testid="text-utm-source">
                            {viewingAttendee.utmSource}
                          </div>
                        </div>
                      )}
                      {viewingAttendee.utmMedium && (
                        <div>
                          <div className="text-xs text-muted-foreground">Medium</div>
                          <div className="font-medium" data-testid="text-utm-medium">
                            {viewingAttendee.utmMedium}
                          </div>
                        </div>
                      )}
                      {viewingAttendee.utmCampaign && (
                        <div>
                          <div className="text-xs text-muted-foreground">Campaign</div>
                          <div className="font-medium" data-testid="text-utm-campaign">
                            {viewingAttendee.utmCampaign}
                          </div>
                        </div>
                      )}
                      {viewingAttendee.utmContent && (
                        <div>
                          <div className="text-xs text-muted-foreground">Content</div>
                          <div className="font-medium" data-testid="text-utm-content">
                            {viewingAttendee.utmContent}
                          </div>
                        </div>
                      )}
                      {viewingAttendee.utmTerm && (
                        <div>
                          <div className="text-xs text-muted-foreground">Term</div>
                          <div className="font-medium" data-testid="text-utm-term">
                            {viewingAttendee.utmTerm}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Preview As Attendee Buttons */}
              {viewingAttendee && eventSlugLookup[viewingAttendee.eventId] && (
                <>
                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-muted-foreground">Preview As Attendee</h3>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const slug = eventSlugLookup[viewingAttendee.eventId];
                          const spoofUrl = `/event/${slug}?spoof=${viewingAttendee.id}&orgId=${organization?.id}`;
                          window.open(spoofUrl, '_blank');
                        }}
                        data-testid="button-preview-landing"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Landing Page
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const slug = eventSlugLookup[viewingAttendee.eventId];
                          const spoofUrl = `/event/${slug}/register?spoof=${viewingAttendee.id}&orgId=${organization?.id}`;
                          window.open(spoofUrl, '_blank');
                        }}
                        data-testid="button-preview-registration"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Registration
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const slug = eventSlugLookup[viewingAttendee.eventId];
                          const spoofUrl = `/event/${slug}/portal?spoof=${viewingAttendee.id}&orgId=${organization?.id}`;
                          window.open(spoofUrl, '_blank');
                        }}
                        data-testid="button-preview-portal"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Portal
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Preview pages with visibility conditions applied for this attendee
                    </p>
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-muted-foreground">Send Email</h3>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={selectedTemplateId}
                    onValueChange={setSelectedTemplateId}
                  >
                    <SelectTrigger className="w-[240px]" data-testid="select-email-template">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailTemplates.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          No email templates available
                        </div>
                      ) : (
                        emailTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    onClick={() => {
                      if (viewingAttendee && selectedTemplateId) {
                        sendEmailMutation.mutate({
                          attendeeId: viewingAttendee.id,
                          templateId: selectedTemplateId,
                        });
                      }
                    }}
                    disabled={!selectedTemplateId || sendEmailMutation.isPending}
                    data-testid="button-send-email"
                  >
                    {sendEmailMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-muted-foreground">Email Activity</h3>
                </div>
                
                {emailsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading emails...</div>
                ) : attendeeEmails.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No emails have been sent to this audience member yet.
                  </div>
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Sent</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Opens</TableHead>
                          <TableHead>Clicks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendeeEmails.map((email) => (
                          <TableRow key={email.id} data-testid={`row-email-${email.id}`}>
                            <TableCell className="font-medium text-sm">
                              {email.subject || "(No subject)"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {email.sentAt ? format(new Date(email.sentAt), "MMM d, h:mm a") : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  email.status === "delivered" || email.status === "opened" || email.status === "clicked" 
                                    ? "default" 
                                    : email.status === "bounced" || email.status === "complained" || email.status === "failed"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {email.status ? email.status.charAt(0).toUpperCase() + email.status.slice(1) : "Sent"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {email.openCount || 0}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {email.clickCount || 0}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {selectedIds.size} Attendees</DialogTitle>
            <DialogDescription>
              Update a field for all selected audience members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Field to Update</label>
              <Select value={bulkEditField} onValueChange={(value) => { setBulkEditField(value); setBulkEditValue(""); }}>
                <SelectTrigger data-testid="select-bulk-edit-field">
                  <SelectValue placeholder="Select a field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="ticketType">Ticket Type</SelectItem>
                  <SelectItem value="checkedIn">Checked In</SelectItem>
                  <SelectItem value="notes">Notes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bulkEditField && (
              <div className="space-y-2">
                <label className="text-sm font-medium">New Value</label>
                {bulkEditField === "status" && (
                  <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                    <SelectTrigger data-testid="select-bulk-edit-value">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {bulkEditField === "type" && (
                  <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                    <SelectTrigger data-testid="select-bulk-edit-value">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTENDEE_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {bulkEditField === "ticketType" && (
                  <Input
                    value={bulkEditValue}
                    onChange={(e) => setBulkEditValue(e.target.value)}
                    placeholder="Enter ticket type"
                    data-testid="input-bulk-edit-value"
                  />
                )}
                {bulkEditField === "checkedIn" && (
                  <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                    <SelectTrigger data-testid="select-bulk-edit-value">
                      <SelectValue placeholder="Select check-in status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {bulkEditField === "notes" && (
                  <Textarea
                    value={bulkEditValue}
                    onChange={(e) => setBulkEditValue(e.target.value)}
                    placeholder="Enter notes"
                    data-testid="textarea-bulk-edit-value"
                  />
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsBulkEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkEdit}
              disabled={!bulkEditField || !bulkEditValue || bulkUpdateMutation.isPending}
              data-testid="button-submit-bulk-edit"
            >
              {bulkUpdateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                `Update ${selectedIds.size} Attendees`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkEmailDialogOpen} onOpenChange={setIsBulkEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email {selectedIds.size} Attendees</DialogTitle>
            <DialogDescription>
              Send an email to all selected audience members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Template</label>
              <Select value={bulkEmailTemplateId} onValueChange={setBulkEmailTemplateId}>
                <SelectTrigger data-testid="select-bulk-email-template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No email templates available
                    </div>
                  ) : (
                    emailTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              This will send the selected email template to {selectedIds.size} audience members.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsBulkEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkEmail}
              disabled={!bulkEmailTemplateId || bulkEmailMutation.isPending}
              data-testid="button-submit-bulk-email"
            >
              {bulkEmailMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send to {selectedIds.size} Attendees
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
