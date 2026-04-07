/**
 * useAuth — cookie-based auth
 *
 * Tokens are in httpOnly cookies — JS can't read them directly.
 * We fetch /api/auth/me to know who's logged in. The browser
 * automatically sends the httpOnly cookies with every request.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  stationId: string | null;
  eventId: string | null;
}

async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) return null;
  const data = await res.json();
  return data.user || null;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: fetchMe,
    staleTime: 5 * 60 * 1000, // re-check every 5 min
    retry: false,
  });

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    queryClient.clear();
    window.location.href = "/login";
  };

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isStaff: user?.role === "staff" || user?.role === "admin",
    isSponsorAdmin: user?.role === "sponsor_admin",
    logout,
  };
}
