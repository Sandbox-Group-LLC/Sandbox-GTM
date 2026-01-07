import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  FileImage,
  Calendar,
  Clock,
  Loader2,
  Filter,
  X,
} from "lucide-react";
import type { ProofRequest, Designer, Event } from "@shared/schema";

interface ProofRequestWithDetails extends ProofRequest {
  designer?: { firstName: string | null; lastName: string | null; email: string } | null;
  event?: { name: string } | null;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending_upload":
      return (
        <Badge variant="secondary" data-testid="badge-status-pending-upload">
          <Clock className="w-3 h-3 mr-1" />
          Pending Upload
        </Badge>
      );
    case "pending_review":
      return (
        <Badge className="bg-blue-600 dark:bg-blue-700" data-testid="badge-status-pending-review">
          <FileImage className="w-3 h-3 mr-1" />
          Pending Review
        </Badge>
      );
    case "approved":
      return (
        <Badge className="bg-green-600 dark:bg-green-700" data-testid="badge-status-approved">
          Approved
        </Badge>
      );
    case "revision_requested":
      return (
        <Badge className="bg-orange-500 dark:bg-orange-600" data-testid="badge-status-revision">
          Revision Requested
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" data-testid="badge-status-rejected">
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" data-testid={`badge-status-${status}`}>
          {status}
        </Badge>
      );
  }
}

function PriorityBadge({ priority }: { priority: string }) {
  switch (priority) {
    case "urgent":
      return <Badge variant="destructive" className="text-xs">Urgent</Badge>;
    case "high":
      return <Badge className="bg-orange-500 dark:bg-orange-600 text-xs">High</Badge>;
    case "normal":
      return <Badge variant="secondary" className="text-xs">Normal</Badge>;
    case "low":
      return <Badge variant="outline" className="text-xs">Low</Badge>;
    default:
      return null;
  }
}

const createProofRequestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  designerId: z.string().min(1, "Designer is required"),
  eventId: z.string().optional(),
  printVendor: z.string().optional(),
  area: z.string().optional(),
  category: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.string().default("normal"),
});

type CreateProofRequestFormValues = z.infer<typeof createProofRequestSchema>;

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending_upload", label: "Pending Upload" },
  { value: "pending_review", label: "Pending Review" },
  { value: "revision_requested", label: "Revision Requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function ProofManagement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [vendorSearch, setVendorSearch] = useState("");
  const [areaSearch, setAreaSearch] = useState("");

  const { data: proofRequests, isLoading } = useQuery<ProofRequestWithDetails[]>({
    queryKey: ["/api/proof-requests"],
  });

  const { data: designers = [] } = useQuery<Designer[]>({
    queryKey: ["/api/designers"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const form = useForm<CreateProofRequestFormValues>({
    resolver: zodResolver(createProofRequestSchema),
    defaultValues: {
      title: "",
      description: "",
      designerId: "",
      eventId: "",
      printVendor: "",
      area: "",
      category: "",
      dueDate: "",
      priority: "normal",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateProofRequestFormValues) => {
      const payload = {
        ...data,
        eventId: data.eventId || null,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      };
      const res = await apiRequest("POST", "/api/proof-requests", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Proof request created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/proof-requests"] });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredRequests = proofRequests?.filter((request) => {
    if (statusFilter !== "all" && request.status !== statusFilter) return false;
    if (eventFilter !== "all" && request.eventId !== eventFilter) return false;
    if (vendorSearch && !request.printVendor?.toLowerCase().includes(vendorSearch.toLowerCase())) return false;
    if (areaSearch && !request.area?.toLowerCase().includes(areaSearch.toLowerCase())) return false;
    return true;
  }) || [];

  const hasFilters = statusFilter !== "all" || eventFilter !== "all" || vendorSearch || areaSearch;

  const clearFilters = () => {
    setStatusFilter("all");
    setEventFilter("all");
    setVendorSearch("");
    setAreaSearch("");
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <PageHeader
        title="Proof Management"
        description="Manage graphic proof requests and approvals"
      />

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-event-filter">
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Vendor..."
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              className="pl-9 w-[150px]"
              data-testid="input-vendor-search"
            />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Area..."
              value={areaSearch}
              onChange={(e) => setAreaSearch(e.target.value)}
              className="pl-9 w-[150px]"
              data-testid="input-area-search"
            />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-request">
              <Plus className="h-4 w-4 mr-2" />
              Create Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Proof Request</DialogTitle>
              <DialogDescription>
                Create a new proof request and assign it to a designer.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Event Banner Design" {...field} data-testid="input-title" />
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
                        <Textarea placeholder="Describe the requirements..." {...field} data-testid="input-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="designerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designer *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-designer">
                            <SelectValue placeholder="Select designer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {designers.map((designer) => (
                            <SelectItem key={designer.id} value={designer.id}>
                              {designer.firstName} {designer.lastName} ({designer.email})
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
                  name="eventId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event (optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-event">
                            <SelectValue placeholder="Select event" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No Event</SelectItem>
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="printVendor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Print Vendor</FormLabel>
                        <FormControl>
                          <Input placeholder="Vendor name" {...field} data-testid="input-vendor" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Area</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Main Stage" {...field} data-testid="input-area" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Signage" {...field} data-testid="input-category" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-priority">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map((option) => (
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
                </div>

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-due-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-request">
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Request"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <FileImage className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {hasFilters ? "No proof requests match your filters." : "No proof requests yet."}
              </p>
              {!hasFilters && (
                <Button className="mt-4" onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Request
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Designer</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id} data-testid={`row-proof-request-${request.id}`}>
                    <TableCell className="font-medium" data-testid={`text-title-${request.id}`}>
                      {request.title}
                    </TableCell>
                    <TableCell data-testid={`text-designer-${request.id}`}>
                      {request.designer
                        ? `${request.designer.firstName || ""} ${request.designer.lastName || ""}`.trim() || request.designer.email
                        : "-"}
                    </TableCell>
                    <TableCell data-testid={`text-event-${request.id}`}>
                      {request.event?.name || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-vendor-${request.id}`}>
                      {request.printVendor || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-area-${request.id}`}>
                      {request.area || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-category-${request.id}`}>
                      {request.category || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-due-date-${request.id}`}>
                      {request.dueDate
                        ? format(new Date(request.dueDate), "MMM d, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {request.priority && <PriorityBadge priority={request.priority} />}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status || "pending_upload"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLocation(`/proof-requests/${request.id}`)}
                          data-testid={`button-view-${request.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
