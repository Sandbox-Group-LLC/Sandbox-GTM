import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

interface SignupStatusResponse {
  requiresInvite: boolean;
  userIsSuperAdmin: boolean;
  redemption: {
    id: number;
    userId: string;
    inviteCodeId: number;
    redeemedAt: string;
  } | null;
}

export function useSignupStatus() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<SignupStatusResponse>({
    queryKey: ["/api/auth/signup-status"],
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });

  return {
    requiresInvite: data?.requiresInvite ?? false,
    userIsSuperAdmin: data?.userIsSuperAdmin ?? false,
    redemption: data?.redemption ?? null,
    isLoading,
  };
}
