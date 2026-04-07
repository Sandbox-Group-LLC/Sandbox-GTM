import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Component, type ReactNode } from "react";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";
import Dashboard from "./pages/dashboard";
import Connect from "./pages/connect";
import CheckIn from "./pages/check-in";
import MomentsAdmin from "./pages/moments";
import MomentLive from "./pages/moment-live";
import DemoStations from "./pages/demo-stations";
import MeetingsPage from "./pages/meetings";
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
            {(this.state.error as Error).message}
            {"\n\n"}
            {(this.state.error as Error).stack}
          </pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16, padding: "8px 16px" }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="min-h-screen bg-background text-foreground">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/connect" component={Connect} />
            <Route path="/check-in" component={CheckIn} />
            <Route path="/moments" component={MomentsAdmin} />
            <Route path="/moment/:momentId" component={MomentLive} />
            <Route path="/stations" component={DemoStations} />
            <Route path="/meetings" component={MeetingsPage} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </ErrorBoundary>
      <Toaster />
    </QueryClientProvider>
  );
}
