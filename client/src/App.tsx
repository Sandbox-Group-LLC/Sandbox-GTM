import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useSignupStatus } from "@/hooks/useSignupStatus";
import { OrgSwitcher } from "@/components/org-switcher";
import { SuperAdminBanner } from "@/components/super-admin-banner";
import type { BrandKit as BrandKitType } from "@shared/schema";
import NotFound from "@/pages/not-found";
import RequireInviteCode from "@/pages/require-invite-code";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Events from "@/pages/events";
import Attendees from "@/pages/attendees";
import Sessions from "@/pages/sessions";
import Speakers from "@/pages/speakers";
import Content from "@/pages/content";
import Budget from "@/pages/budget";
import Deliverables from "@/pages/deliverables";
import MyDeliverables from "@/pages/my-deliverables";
import Emails from "@/pages/emails";
import Social from "@/pages/social";
import Settings from "@/pages/settings";
import CheckIn from "@/pages/check-in";
import PublicEvent, { PublicCustomPage, PublicLivePage } from "@/pages/public-event";
import PublicRegistration from "@/pages/public-registration";
import PublicPortal from "@/pages/public-portal";
import AttendeeLogin from "@/pages/attendee-login";
import AttendeePortal from "@/pages/attendee-portal";
import AttendeeTypes from "@/pages/attendee-types";
import RegistrationFlow from "@/pages/registration-flow";
import Packages from "@/pages/packages";
import InviteCodes from "@/pages/invite-codes";
import ActivationLinks from "@/pages/activation-links";
import SiteBuilder from "@/pages/site-builder";
import AdminOrganizations from "@/pages/admin-organizations";
import AdminLeads from "@/pages/admin-leads";
import AdminMarketing from "@/pages/admin-marketing";
import MyOrganization from "@/pages/my-organization";
import CustomFields from "@/pages/custom-fields";
import PrivacyPolicy from "@/pages/privacy-policy";
import Tracks from "@/pages/tracks";
import Topics from "@/pages/topics";
import Rooms from "@/pages/rooms";
import ImportAttendees from "@/pages/import-attendees";
import CallForPapers from "@/pages/call-for-papers";
import PublicCfp from "@/pages/public-cfp";
import ReviewerPortal from "@/pages/reviewer-portal";
import EmailAnalytics from "@/pages/email-analytics";
import Integrations from "@/pages/integrations";
import Signup from "@/pages/signup";
import Sponsors from "@/pages/sponsors";
import SponsorTasks from "@/pages/sponsor-tasks";
import SponsorPortal from "@/pages/sponsor-portal";
import SponsorPortalAcceptInvite from "@/pages/sponsor-portal-accept-invite";
import Documents from "@/pages/documents";
import SharedDocument from "@/pages/shared-document";
import Acquisition from "@/pages/acquisition";
import EngagementSignals from "@/pages/engagement-signals";
import RevenueSnapshot from "@/pages/revenue-snapshot";
import Pipeline from "@/pages/pipeline";
import SalesHandoff from "@/pages/sales-handoff";
import FollowUp from "@/pages/follow-up";
import ROI from "@/pages/roi";
import RunOfShow from "@/pages/run-of-show";
import Vendors from "@/pages/vendors";
import TeamMembers from "@/pages/team-members";
import AcceptInvitation from "@/pages/accept-invitation";
import Pricing from "@/pages/pricing";
import AudienceTargeting from "@/pages/audience-targeting";
import EngagementMoments from "@/pages/engagement-moments";
import ProductEngagement from "@/pages/product-engagement";
import MomentLauncher from "@/pages/moment-launcher";
import PortalLiveMoments from "@/pages/portal-live-moments";
import PublicMoment from "@/pages/public-moment";
import PortalMoment from "@/pages/portal-moment";
import BrandKit from "@/pages/brand-kit";
import Meetings from "@/pages/meetings";
import MeetingPortal from "@/pages/meeting-portal";
import MeetingPortalAccept from "@/pages/meeting-portal-accept";
import MeetingPortalLogin from "@/pages/meeting-portal-login";
import MeetingPortalMagic from "@/pages/meeting-portal-magic";
import BadgeGenerator from "@/pages/badge-generator";
import HelpCenter from "@/pages/help-center";
import { HelpChatWidget } from "@/components/help-chat-widget";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };
  const { user, organization } = useAuth();

  const { data: defaultBrandKit } = useQuery<BrandKitType | null>({
    queryKey: ["/api/brand-kits/default", organization?.id],
    queryFn: async () => {
      const res = await fetch("/api/brand-kits/default", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch brand kit");
      }
      return res.json();
    },
    enabled: !!user && !!organization?.id,
    retry: false,
    staleTime: 0,
  });

  const showHeader = user?.isSuperAdmin || defaultBrandKit?.logoUrl;

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          {user?.isSuperAdmin && <SuperAdminBanner />}
          {showHeader && (
            <header className="flex items-center justify-between gap-4 px-4 py-2 border-b shrink-0">
              <div className="flex items-center gap-4">
                {defaultBrandKit?.logoUrl && (
                  <img
                    src={defaultBrandKit.logoUrl}
                    alt="Organization Logo"
                    className="h-8 max-w-32 object-contain"
                    data-testid="img-header-logo"
                  />
                )}
              </div>
              <div className="flex items-center gap-4">
                {user?.isSuperAdmin && <OrgSwitcher />}
              </div>
            </header>
          )}
          <main className="flex-1 flex flex-col overflow-auto">
            {children}
          </main>
        </div>
      </div>
      <HelpChatWidget />
    </SidebarProvider>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const { requiresInvite, userIsSuperAdmin, redemption, isLoading: signupStatusLoading } = useSignupStatus();
  const [location, navigate] = useLocation();
  
  // Determine if this is a public event page (should render outside sidebar layout)
  const isPublicEventPage = location.startsWith('/event/') || location.startsWith('/sponsor-portal') || location.startsWith('/portal/') || location.startsWith('/meeting-portal');

  // Check for pending invite code after authentication and redirect to accept-invitation page
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const pendingCode = localStorage.getItem("pendingInviteCode");
      if (pendingCode) {
        localStorage.removeItem("pendingInviteCode");
        console.log("[App] Redirecting to accept-invitation with pending code");
        navigate(`/accept-invitation?code=${encodeURIComponent(pendingCode)}`);
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

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
        <Route path="/pricing" component={Pricing} />
        <Route path="/signup" component={Signup} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/event/:slug/register" component={PublicRegistration} />
        <Route path="/event/:slug/portal" component={AttendeePortal} />
        <Route path="/event/:slug/login" component={AttendeeLogin} />
        <Route path="/event/:slug/cfp" component={PublicCfp} />
        <Route path="/event/:slug/live" component={PublicLivePage} />
        <Route path="/event/:slug/moment/:momentId" component={PublicMoment} />
        <Route path="/event/:slug/page/:pageSlug" component={PublicCustomPage} />
        <Route path="/event/:slug" component={PublicEvent} />
        <Route path="/sponsor-portal/accept-invite" component={SponsorPortalAcceptInvite} />
        <Route path="/sponsor-portal" component={SponsorPortal} />
        <Route path="/meeting-portal/accept/:inviteCode" component={MeetingPortalAccept} />
        <Route path="/meeting-portal/magic/:token" component={MeetingPortalMagic} />
        <Route path="/meeting-portal/login" component={MeetingPortalLogin} />
        <Route path="/meeting-portal" component={MeetingPortal} />
        <Route path="/documents/shared/:token" component={SharedDocument} />
        <Route path="/accept-invitation" component={AcceptInvitation} />
        <Route path="/portal/:eventId/moment/:momentId" component={PortalMoment} />
        <Route path="/portal/:eventId/live" component={PortalLiveMoments} />
        <Route component={Landing} />
      </Switch>
    );
  }

  if (signupStatusLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (requiresInvite && !userIsSuperAdmin && !redemption) {
    return <RequireInviteCode />;
  }

  // Public event pages should render outside of AuthenticatedLayout
  // to avoid layout conflicts with sidebar/admin chrome
  if (isPublicEventPage) {
    return (
      <Switch>
        <Route path="/event/:slug/register" component={PublicRegistration} />
        <Route path="/event/:slug/portal" component={AttendeePortal} />
        <Route path="/event/:slug/login" component={AttendeeLogin} />
        <Route path="/event/:slug/cfp" component={PublicCfp} />
        <Route path="/event/:slug/live" component={PublicLivePage} />
        <Route path="/event/:slug/moment/:momentId" component={PublicMoment} />
        <Route path="/event/:slug/page/:pageSlug" component={PublicCustomPage} />
        <Route path="/event/:slug" component={PublicEvent} />
        <Route path="/sponsor-portal/accept-invite" component={SponsorPortalAcceptInvite} />
        <Route path="/sponsor-portal" component={SponsorPortal} />
        <Route path="/meeting-portal/accept/:inviteCode" component={MeetingPortalAccept} />
        <Route path="/meeting-portal/magic/:token" component={MeetingPortalMagic} />
        <Route path="/meeting-portal/login" component={MeetingPortalLogin} />
        <Route path="/meeting-portal" component={MeetingPortal} />
        <Route path="/portal/:eventId/moment/:momentId" component={PortalMoment} />
        <Route path="/portal/:eventId/live" component={PortalLiveMoments} />
        <Route component={NotFound} />
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
        <Route path="/import-attendees" component={ImportAttendees} />
        <Route path="/badge-generator" component={BadgeGenerator} />
        <Route path="/packages" component={Packages} />
        <Route path="/custom-fields" component={CustomFields} />
        <Route path="/invite-codes" component={InviteCodes} />
        <Route path="/activation-links" component={ActivationLinks} />
        <Route path="/site-builder" component={SiteBuilder} />
        <Route path="/check-in" component={CheckIn} />
        <Route path="/sessions" component={Sessions} />
        <Route path="/tracks" component={Tracks} />
        <Route path="/topics" component={Topics} />
        <Route path="/rooms" component={Rooms} />
        <Route path="/call-for-papers" component={CallForPapers} />
        <Route path="/reviewer/portal" component={ReviewerPortal} />
        <Route path="/reviewer">{() => { window.location.href = "/reviewer/portal"; return null; }}</Route>
        <Route path="/speakers" component={Speakers} />
        <Route path="/sponsors" component={Sponsors} />
        <Route path="/sponsor-tasks" component={SponsorTasks} />
        <Route path="/content" component={Content} />
        <Route path="/documents" component={Documents} />
        <Route path="/budget" component={Budget} />
        <Route path="/deliverables" component={Deliverables} />
        <Route path="/my-deliverables" component={MyDeliverables} />
        <Route path="/emails" component={Emails} />
        <Route path="/email-analytics" component={EmailAnalytics} />
        <Route path="/social" component={Social} />
        <Route path="/integrations" component={Integrations} />
        <Route path="/settings" component={Settings} />
        <Route path="/brand-kit" component={BrandKit} />
        <Route path="/my-organization" component={MyOrganization} />
        <Route path="/team-members" component={TeamMembers} />
        <Route path="/admin/organizations" component={AdminOrganizations} />
        <Route path="/admin/leads" component={AdminLeads} />
        <Route path="/admin/marketing" component={AdminMarketing} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/accept-invitation" component={AcceptInvitation} />
        <Route path="/acquisition" component={Acquisition} />
        <Route path="/audience-targeting" component={AudienceTargeting} />
        <Route path="/engagement-moments" component={EngagementMoments} />
        <Route path="/product-engagement" component={ProductEngagement} />
        <Route path="/moment-launcher" component={MomentLauncher} />
        <Route path="/engagement-signals" component={EngagementSignals} />
        <Route path="/revenue-snapshot" component={RevenueSnapshot} />
        <Route path="/pipeline" component={Pipeline} />
        <Route path="/sales-handoff" component={SalesHandoff} />
        <Route path="/follow-up" component={FollowUp} />
        <Route path="/roi" component={ROI} />
        <Route path="/run-of-show" component={RunOfShow} />
        <Route path="/vendors" component={Vendors} />
        <Route path="/meetings" component={Meetings} />
        <Route path="/help-center" component={HelpCenter} />
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
