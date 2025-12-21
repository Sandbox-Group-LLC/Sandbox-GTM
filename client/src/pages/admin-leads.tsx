import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Mail, Building2, Phone, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import type { MarketingLead } from "@shared/schema";
import { titleCase } from "@/lib/utils";

const statusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
];

function getStatusVariant(status: string): "default" | "secondary" | "outline" {
  switch (status) {
    case "new":
      return "default";
    case "contacted":
      return "secondary";
    case "qualified":
      return "outline";
    case "converted":
      return "default";
    default:
      return "secondary";
  }
}

export default function AdminLeads() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: leads, isLoading } = useQuery<MarketingLead[]>({
    queryKey: ["/api/admin/leads"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/leads/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
      toast({
        title: "Status Updated",
        description: "Lead status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lead status",
        variant: "destructive",
      });
    },
  });

  const columns = [
    {
      header: "Name",
      accessorKey: "firstName",
      cell: (lead: MarketingLead) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{lead.firstName} {lead.lastName}</span>
        </div>
      ),
    },
    {
      header: "Email",
      accessorKey: "email",
      cell: (lead: MarketingLead) => (
        <a 
          href={`mailto:${lead.email}`} 
          className="flex items-center gap-2 text-primary hover:underline"
          data-testid={`link-email-${lead.id}`}
        >
          <Mail className="h-4 w-4" />
          {lead.email}
        </a>
      ),
    },
    {
      header: "Company",
      accessorKey: "company",
      cell: (lead: MarketingLead) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span>{lead.company || "-"}</span>
        </div>
      ),
    },
    {
      header: "Job Title",
      accessorKey: "jobTitle",
      cell: (lead: MarketingLead) => lead.jobTitle || "-",
    },
    {
      header: "Phone",
      accessorKey: "phone",
      cell: (lead: MarketingLead) => lead.phone ? (
        <a 
          href={`tel:${lead.phone}`} 
          className="flex items-center gap-2 hover:underline"
          data-testid={`link-phone-${lead.id}`}
        >
          <Phone className="h-4 w-4 text-muted-foreground" />
          {lead.phone}
        </a>
      ) : "-",
    },
    {
      header: "Source",
      accessorKey: "source",
      cell: (lead: MarketingLead) => (
        <Badge variant="outline">{titleCase(lead.source || "unknown")}</Badge>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (lead: MarketingLead) => (
        <Select
          value={lead.status || "new"}
          onValueChange={(value) => updateStatusMutation.mutate({ id: lead.id, status: value })}
        >
          <SelectTrigger 
            className="w-32" 
            data-testid={`select-status-${lead.id}`}
          >
            <SelectValue>
              <Badge variant={getStatusVariant(lead.status || "new")}>
                {titleCase(lead.status || "new")}
              </Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      header: "Submitted",
      accessorKey: "createdAt",
      cell: (lead: MarketingLead) => (
        <span className="text-muted-foreground text-sm">
          {lead.createdAt ? format(new Date(lead.createdAt), "MMM d, yyyy h:mm a") : "-"}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Marketing Leads"
        description="View and manage leads from the pricing page contact form"
      />

      {leads && leads.length > 0 ? (
        <DataTable
          columns={columns}
          data={leads}
          searchable
          searchPlaceholder="Search leads..."
          getRowKey={(lead) => lead.id}
        />
      ) : (
        <EmptyState
          icon={Users}
          title="No Leads Yet"
          description="Leads from the pricing page contact form will appear here."
        />
      )}
    </div>
  );
}
