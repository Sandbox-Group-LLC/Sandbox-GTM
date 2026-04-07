import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Component, type ReactNode, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";
import { useAuth } from "./hooks/use-auth";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Connect from "./pages/connect";
import CheckIn from "./pages/check-in";
import MomentsAdmin from "./pages/moments";
import MomentLive from "./pages/moment-live";
import DemoStations from "./pages/demo-stations";
import MeetingsPage from "./pages/meetings";
import LeadsPage from "./pages/leads";
import NotFound from "./pages/not-found";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "monospace" }}>
          <h2 style={{ color: "red" }}>Runtime Error</h2>
          <pre style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, overflow: "auto" }}>
            {(this.state.error as Error).message}{"\n\n"}{(this.state.error as Error).stack}
          </pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16, padding: "8px 16px" }}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const PUBLIC_ROUTES = ["/login", "/moment/"];

function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, checking } = useAuth();
  const [location, navigate] = useLocation();
  const isPublic = PUBLIC_ROUTES.some(r => location.startsWith(r));

  useEffect(() => {
    if (!checking && !isAuthenticated && !isPublic) navigate("/login");
  }, [checking, isAuthenticated, isPublic, location]);

  // Still verifying cookie — show nothing to avoid flash
  if (checking && !isPublic) return null;

  if (!isAuthenticated && !isPublic) return null;

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="min-h-screen bg-background text-foreground">
          <AuthGuard>
            <Switch>
              <Route path="/login" component={Login} />
              <Route path="/" component={Dashboard} />
              <Route path="/connect" component={Connect} />
              <Route path="/check-in" component={CheckIn} />
              <Route path="/moments" component={MomentsAdmin} />
              <Route path="/moment/:momentId" component={MomentLive} />
              <Route path="/stations" component={DemoStations} />
              <Route path="/meetings" component={MeetingsPage} />
              <Route path="/leads" component={LeadsPage} />
              <Route component={NotFound} />
            </Switch>
          </AuthGuard>
        </div>
      </ErrorBoundary>
      <Toaster />
    </QueryClientProvider>
  );
}
