import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Presentation,
  Mic2,
  FolderOpen,
  DollarSign,
  CheckSquare,
  Mail,
  Share2,
  Settings,
  LogOut,
  QrCode,
  BarChart3,
  UserCheck,
  ChevronRight,
  Building2,
  Shield,
  ClipboardList,
} from "lucide-react";
import logoImage from "@assets/Orange_bug_-_no_background_1765765097769.png";
import { OnboardingChecklist } from "./onboarding-checklist";
import { OnboardingWizard } from "./onboarding-wizard";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

const mainMenuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Content", icon: FolderOpen, path: "/content" },
];

const sessionsSubItems = [
  { title: "All Sessions", path: "/sessions" },
  { title: "Speakers", path: "/speakers" },
  { title: "Tracks", path: "/tracks" },
  { title: "Rooms", path: "/rooms" },
  { title: "Call for Papers", path: "/call-for-papers" },
];

const attendeesSubItems = [
  { title: "All Attendees", path: "/attendees" },
  { title: "Import Attendees", path: "/import-attendees" },
  { title: "Attendee Types", path: "/attendee-types" },
  { title: "Invite Codes", path: "/invite-codes" },
  { title: "Packages", path: "/packages" },
];

const eventsSubItems = [
  { title: "All Events", path: "/events" },
  { title: "Check-In", path: "/check-in" },
  { title: "Registration", path: "/registration" },
  { title: "Site Builder", path: "/site-builder" },
  { title: "Custom Fields", path: "/custom-fields" },
];

const projectMenuItems = [
  { title: "Budget", icon: DollarSign, path: "/budget" },
  { title: "Deliverables", icon: CheckSquare, path: "/deliverables" },
];

const myReviewsItems = [
  { title: "Reviewer Portal", icon: ClipboardList, path: "/reviewer/portal" },
];

const marketingMenuItems = [
  { title: "Email Campaigns", icon: Mail, path: "/emails" },
  { title: "Social Media", icon: Share2, path: "/social" },
  { title: "Analytics", icon: BarChart3, path: "/analytics" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [wizardOpen, setWizardOpen] = useState(false);

  const isEventsActive = location === "/events" || location === "/check-in" || location === "/registration" || location === "/site-builder" || location === "/custom-fields";
  const isSessionsActive = location === "/sessions" || location === "/speakers" || location === "/tracks" || location === "/rooms" || location === "/call-for-papers";
  const isAttendeesActive = location === "/attendees" || location === "/import-attendees" || location === "/attendee-types" || location === "/invite-codes" || location === "/packages";
  
  const isSuperAdmin = user?.email?.toLowerCase().endsWith("@makemysandbox.com") ?? false;

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <img src={logoImage} alt="Sandbox" className="h-6 w-6" />
          <span className="font-semibold text-lg">Sandbox</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Event Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/"}
                  data-testid="nav-dashboard"
                >
                  <Link href="/">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible defaultOpen={isEventsActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isEventsActive}
                      data-testid="nav-events"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Events</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {eventsSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === item.path}
                          >
                            <Link
                              href={item.path}
                              data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                            >
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <Collapsible defaultOpen={isAttendeesActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isAttendeesActive}
                      data-testid="nav-attendees"
                    >
                      <Users className="h-4 w-4" />
                      <span>Attendees</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {attendeesSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === item.path}
                          >
                            <Link
                              href={item.path}
                              data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                            >
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              <Collapsible defaultOpen={isSessionsActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isSessionsActive}
                      data-testid="nav-sessions"
                    >
                      <Presentation className="h-4 w-4" />
                      <span>Sessions</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {sessionsSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === item.path}
                          >
                            <Link
                              href={item.path}
                              data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                            >
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {mainMenuItems.slice(1).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.path}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.path}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Marketing</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {marketingMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.path}
                    data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                  >
                    <Link href={item.path}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Project Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projectMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.path}
                    data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                  >
                    <Link href={item.path}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>My Reviews</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {myReviewsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.path}
                    data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                  >
                    <Link href={item.path}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/admin/organizations"}
                    data-testid="nav-admin-organizations"
                  >
                    <Link href="/admin/organizations">
                      <Building2 className="h-4 w-4" />
                      <span>Organizations</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        <OnboardingChecklist onOpenWizard={() => setWizardOpen(true)} />
      </SidebarContent>

      <OnboardingWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={user?.profileImageUrl || undefined}
              alt={user?.firstName || "User"}
              className="object-cover"
            />
            <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location === "/my-organization"}
              data-testid="nav-my-organization"
            >
              <Link href="/my-organization">
                <Building2 className="h-4 w-4" />
                <span>My Organization</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild data-testid="nav-settings">
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild data-testid="button-logout">
              <a href="/api/logout">
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
