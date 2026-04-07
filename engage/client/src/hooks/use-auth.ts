import { useState, useEffect, useCallback } from "react";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  stationId: string | null;
  eventId: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem("engage_user");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("engage_token")
  );

  const logout = useCallback(() => {
    localStorage.removeItem("engage_token");
    localStorage.removeItem("engage_user");
    setUser(null);
    setToken(null);
    window.location.href = "/login";
  }, []);

  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff" || user?.role === "admin";
  const isSponsorAdmin = user?.role === "sponsor_admin";
  const isAuthenticated = !!user && !!token;

  return { user, token, isAuthenticated, isAdmin, isStaff, isSponsorAdmin, logout };
}

/** Add Bearer token to fetch headers */
export function authHeaders(token: string | null): Record<string, string> {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
