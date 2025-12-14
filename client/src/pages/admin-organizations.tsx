import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatsCard } from "@/components/stats-card";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Calendar, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import type { Organization } from "@shared/schema";

interface OrganizationWithStats extends Organization {
  memberCount: number;
  eventCount: number;
  attendeeCount: number;
}

export default function AdminOrganizations() {
  const { user } = useAuth();
  
  const { data: organizations, isLoading } = useQuery<OrganizationWithStats[]>({
    queryKey: ["/api/admin/organizations"],
    enabled: !!user?.isAdmin,
  });

  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader 
          title="Organizations" 
          breadcrumbs={[{ label: "Admin" }, { label: "Organizations" }]}
        />
        <div className="flex-1 overflow-auto p-6">
          <EmptyState
            icon={Building2}
            title="Access Denied"
            description="You don't have permission to view this page. Admin privileges are required."
          />
        </div>
      </div>
    );
  }

  const totalOrgs = organizations?.length || 0;
  const totalMembers = organizations?.reduce((sum, org) => sum + org.memberCount, 0) || 0;
  const totalEvents = organizations?.reduce((sum, org) => sum + org.eventCount, 0) || 0;
  const totalAttendees = organizations?.reduce((sum, org) => sum + org.attendeeCount, 0) || 0;

  const columns = [
    { 
      key: "name", 
      header: "Name",
      cell: (org: OrganizationWithStats) => org.name,
    },
    { 
      key: "slug", 
      header: "Slug",
      cell: (org: OrganizationWithStats) => org.slug,
    },
    { 
      key: "memberCount", 
      header: "Members",
      cell: (org: OrganizationWithStats) => (
        <Badge variant="secondary" className="font-mono" data-testid={`badge-members-${org.id}`}>
          {org.memberCount}
        </Badge>
      ),
    },
    { 
      key: "eventCount", 
      header: "Events",
      cell: (org: OrganizationWithStats) => (
        <Badge variant="secondary" className="font-mono" data-testid={`badge-events-${org.id}`}>
          {org.eventCount}
        </Badge>
      ),
    },
    { 
      key: "attendeeCount", 
      header: "Attendees",
      cell: (org: OrganizationWithStats) => (
        <Badge variant="secondary" className="font-mono" data-testid={`badge-attendees-${org.id}`}>
          {org.attendeeCount}
        </Badge>
      ),
    },
    { 
      key: "createdAt", 
      header: "Created",
      cell: (org: OrganizationWithStats) => org.createdAt ? format(new Date(org.createdAt), "MMM d, yyyy") : "-",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Organizations" 
        breadcrumbs={[{ label: "Admin" }, { label: "Organizations" }]}
      />
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : (
            <>
              <StatsCard
                title="Total Organizations"
                value={totalOrgs}
                icon={Building2}
                data-testid="stat-total-orgs"
              />
              <StatsCard
                title="Total Members"
                value={totalMembers}
                icon={Users}
                data-testid="stat-total-members"
              />
              <StatsCard
                title="Total Events"
                value={totalEvents}
                icon={Calendar}
                data-testid="stat-total-events"
              />
              <StatsCard
                title="Total Attendees"
                value={totalAttendees}
                icon={UserCheck}
                data-testid="stat-total-attendees"
              />
            </>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-64" />
        ) : !organizations?.length ? (
          <EmptyState
            icon={Building2}
            title="No Organizations Yet"
            description="Organizations will appear here when users sign up."
          />
        ) : (
          <DataTable
            columns={columns}
            data={organizations}
            getRowKey={(org) => org.id}
          />
        )}
      </div>
    </div>
  );
}
