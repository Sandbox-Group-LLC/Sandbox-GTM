import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
      <Toaster />
    </QueryClientProvider>
  );
}
