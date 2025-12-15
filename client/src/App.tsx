import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Events from "@/pages/events";
import Attendees from "@/pages/attendees";
import Sessions from "@/pages/sessions";
import Speakers from "@/pages/speakers";
import Content from "@/pages/content";
import Budget from "@/pages/budget";
import Deliverables from "@/pages/deliverables";
import Emails from "@/pages/emails";
import Social from "@/pages/social";
import Settings from "@/pages/settings";
import CheckIn from "@/pages/check-in";
import Analytics from "@/pages/analytics";
import PublicEvent from "@/pages/public-event";
import PublicRegistration from "@/pages/public-registration";
import PublicPortal from "@/pages/public-portal";
import AttendeeTypes from "@/pages/attendee-types";
import RegistrationFlow from "@/pages/registration-flow";
import Packages from "@/pages/packages";
import InviteCodes from "@/pages/invite-codes";
import SiteBuilder from "@/pages/site-builder";
import AdminOrganizations from "@/pages/admin-organizations";
import MyOrganization from "@/pages/my-organization";
import CustomFields from "@/pages/custom-fields";
import PrivacyPolicy from "@/pages/privacy-policy";
import Tracks from "@/pages/tracks";
import Rooms from "@/pages/rooms";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/event/:slug/register" component={PublicRegistration} />
        <Route path="/event/:slug/portal" component={PublicPortal} />
        <Route path="/event/:slug" component={PublicEvent} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/events" component={Events} />
        <Route path="/attendee-types" component={AttendeeTypes} />
        <Route path="/registration" component={RegistrationFlow} />
        <Route path="/attendees" component={Attendees} />
        <Route path="/packages" component={Packages} />
        <Route path="/custom-fields" component={CustomFields} />
        <Route path="/invite-codes" component={InviteCodes} />
        <Route path="/site-builder" component={SiteBuilder} />
        <Route path="/check-in" component={CheckIn} />
        <Route path="/sessions" component={Sessions} />
        <Route path="/tracks" component={Tracks} />
        <Route path="/rooms" component={Rooms} />
        <Route path="/speakers" component={Speakers} />
        <Route path="/content" component={Content} />
        <Route path="/budget" component={Budget} />
        <Route path="/deliverables" component={Deliverables} />
        <Route path="/emails" component={Emails} />
        <Route path="/social" component={Social} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/settings" component={Settings} />
        <Route path="/my-organization" component={MyOrganization} />
        <Route path="/admin/organizations" component={AdminOrganizations} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/event/:slug/register" component={PublicRegistration} />
        <Route path="/event/:slug/portal" component={PublicPortal} />
        <Route path="/event/:slug" component={PublicEvent} />
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="event-cms-theme">
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
