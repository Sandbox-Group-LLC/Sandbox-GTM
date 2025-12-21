import { useQuery } from "@tanstack/react-query";
import type { User, Organization, FeaturePermission } from "@shared/schema";

interface Membership {
  role: string;
  permissions: string[];
  organizationId: string;
}

export function useAuth() {
  const { data: user, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000,
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
  
  const hasPermission = (permission: FeaturePermission): boolean => {
    // While membership is loading, don't show any sections (return false)
    if (!membership) return false;
    // Owners always have all permissions
    if (isOwner) return true;
    // Defensively default to empty array if permissions is null/undefined
    const permissions = Array.isArray(membership.permissions) ? membership.permissions : [];
    return permissions.includes(permission);
  };

  return {
    user: user || null,
    organization: organization || null,
    membership: membership || null,
    isOwner,
    hasPermission,
    isLoading: userLoading || (!!user && (orgLoading || membershipLoading)),
    isAuthenticated: !!user,
  };
}

export function useOrganization() {
  const { organization, isLoading } = useAuth();
  return { organization, isLoading };
}
