import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Clerk token injected by ClerkTokenSync in App.tsx
let clerkTokenGetter: (() => Promise<string | null>) | null = null;
export function setClerkTokenGetter(getter: () => Promise<string | null>) {
  clerkTokenGetter = getter;
}
async function getAuthHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const token = clerkTokenGetter ? await clerkTokenGetter() : null;
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const authHeaders = await getAuthHeaders(data ? { "Content-Type": "application/json" } : {});
  const res = await fetch(url, {
    method,
    headers: authHeaders,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(queryKey.join("/") as string, {
      headers: authHeaders,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }
    
    // Handle 403 INVITE_REQUIRED gracefully for auth endpoints
    // This allows the UI to handle the invite code flow without throwing
    if (res.status === 403) {
      const url = queryKey.join("/");
      if (url.includes("/api/auth/organization") || url.includes("/api/auth/membership")) {
        return null;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
