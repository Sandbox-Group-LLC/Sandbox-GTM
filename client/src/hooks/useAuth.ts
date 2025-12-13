import { useQuery } from "@tanstack/react-query";
import type { User, Organization } from "@shared/schema";

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

  return {
    user: user || null,
    organization: organization || null,
    isLoading: userLoading || (!!user && orgLoading),
    isAuthenticated: !!user,
  };
}

export function useOrganization() {
  const { organization, isLoading } = useAuth();
  return { organization, isLoading };
}
