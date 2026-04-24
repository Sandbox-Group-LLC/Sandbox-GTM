import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import type { User, Organization, FeaturePermission } from "@shared/schema";

interface Membership {
  role: string;
  permissions: string[];
  organizationId: string;
  isSuperAdminContext?: boolean;
}

interface UserWithSuperAdmin extends User {
  isSuperAdmin?: boolean;
  activeOrganizationId?: string | null;
}

export function useAuth() {
  const { isLoaded: clerkLoaded, isSignedIn } = useClerkAuth();

  const { data: user, isLoading: userLoading } = useQuery<UserWithSuperAdmin | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: clerkLoaded && !!isSignedIn,
  });

  const { data: organization, isLoading: orgLoading } = useQuery<Organization | null>({
    queryKey: ["/api/auth/organization"],
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });

  const { data: membership, isLoading: membershipLoading } = useQuery<Membership | null>({
    queryKey: ["/api/auth/membership"],
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });

  const isOwner = membership?.role === 'owner';
  const isSuperAdminContext = membership?.isSuperAdminContext === true;
  
  const hasPermission = (permission: FeaturePermission): boolean => {
    // While membership is loading, don't show any sections (return false)
    if (!membership) return false;
    // Super admins in super admin context have all permissions
    if (isSuperAdminContext || membership.role === 'super_admin') return true;
    // Owners always have all permissions
    if (isOwner) return true;
    // Defensively default to empty array if permissions is null/undefined
    const permissions = Array.isArray(membership.permissions) ? membership.permissions : [];
    return permissions.includes(permission);
  };

  // For super admins, /api/auth/organization now returns the switched org's full data
  // so we just use the organization query result directly - no need to override
  // The activeOrganizationId in user is just for identification purposes

  return {
    user: user || null,
    organization: organization || null,
    membership: membership || null,
    isOwner,
    hasPermission,
    isLoading: !clerkLoaded || (clerkLoaded && !!isSignedIn && (userLoading || (!!user && (orgLoading || membershipLoading)))),
    isAuthenticated: clerkLoaded && !!isSignedIn && !!user,
  };
}

export function useOrganization() {
  const { organization, isLoading } = useAuth();
  return { organization, isLoading };
}
