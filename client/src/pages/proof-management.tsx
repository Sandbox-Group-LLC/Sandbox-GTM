import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Search,
  Eye,
  FileImage,
  Clock,
  X,
  User,
} from "lucide-react";
import type { ProofRequest, Event } from "@shared/schema";

interface ProofRequestWithDetails extends ProofRequest {
  designer?: { firstName: string | null; lastName: string | null; email: string } | null;
  submittedByDesigner?: { firstName: string | null; lastName: string | null; email: string } | null;
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

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending_upload", label: "Pending Upload" },
  { value: "pending_review", label: "Pending Review" },
  { value: "revision_requested", label: "Revision Requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function ProofManagement() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [vendorSearch, setVendorSearch] = useState("");
  const [areaSearch, setAreaSearch] = useState("");

  const { data: proofRequests, isLoading } = useQuery<ProofRequestWithDetails[]>({
    queryKey: ["/api/proof-requests"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
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
        title="Proof Submissions"
        description="Review and manage designer proof submissions"
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
                {hasFilters ? "No submissions match your filters." : "No submissions yet. Designers can create submissions from the Designer Portal."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Submitted By</TableHead>
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
                {filteredRequests.map((request) => {
                  const submitter = request.submittedByDesigner || request.designer;
                  const submitterName = submitter
                    ? `${submitter.firstName || ""} ${submitter.lastName || ""}`.trim() || submitter.email
                    : "-";
                  return (
                    <TableRow key={request.id} data-testid={`row-proof-request-${request.id}`}>
                      <TableCell className="font-medium" data-testid={`text-title-${request.id}`}>
                        {request.title}
                      </TableCell>
                      <TableCell data-testid={`text-submitter-${request.id}`}>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {submitterName}
                        </div>
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
                        <StatusBadge status={request.status || "pending_review"} />
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
