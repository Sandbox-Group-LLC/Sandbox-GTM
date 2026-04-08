import { useState, useEffect, useCallback } from "react";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  stationId: string | null;
  eventId: string | null;
}

/**
 * Auth state — token lives in httpOnly cookie (server-managed, not readable by JS).
 * We verify auth status by calling /api/auth/me which reads the cookie server-side.
 * Non-sensitive user profile is cached in sessionStorage for instant reads.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = sessionStorage.getItem("engage_user");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const [checking, setChecking] = useState(!user); // skip check if we have cached user

  // Verify session is still valid on mount (cookie may have expired)
  useEffect(() => {
    if (user) return; // have cached user, trust it until a 401 comes back
    fetch("/api/auth/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) {
          setUser(data.user);
          sessionStorage.setItem("engage_user", JSON.stringify(data.user));
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch { /* continue regardless */ }
    sessionStorage.clear();
    // Hard redirect — nukes all React state and cookie cache
    window.location.replace("/login");
  }, []);

  return {
    user,
    checking,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isStaff: user?.role === "staff" || user?.role === "admin",
    isSponsorAdmin: user?.role === "sponsor_admin",
    logout,
  };
}
