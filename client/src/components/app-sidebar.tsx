import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  ChevronDown,
  Building2,
  Shield,
  ClipboardList,
  Plug,
  FileText,
  TrendingUp,
  Target,
  Zap,
  PieChart,
  Megaphone,
  UserPlus,
  Activity,
  Sparkles,
  HandshakeIcon,
  Send,
  LineChart,
  ListTodo,
  Truck,
  Wallet,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const performanceSubItems = [
  { title: "GTM Overview", path: "/" },
  { title: "Acquisition Health", path: "/acquisition" },
  { title: "Engagement Signals", path: "/engagement-signals" },
  { title: "Revenue Impact", path: "/revenue-snapshot" },
];

const audienceSubItems = [
  { title: "All Audience", path: "/attendees" },
  { title: "Import Audience", path: "/import-attendees" },
  { title: "Audience Types", path: "/attendee-types" },
  { title: "Activation Keys", path: "/invite-codes" },
  { title: "Activation Links", path: "/activation-links" },
  { title: "Access Packages", path: "/packages" },
];

const campaignsSubItems = [
  { title: "Email Campaigns", path: "/emails" },
  { title: "Email Analytics", path: "/email-analytics" },
  { title: "Social Media", path: "/social" },
];

const contentSubItems = [
  { title: "All Experiences", path: "/sessions" },
  { title: "Contributors", path: "/speakers" },
  { title: "Content Pillars", path: "/tracks" },
  { title: "Rooms", path: "/rooms" },
];

const revenueSubItems = [
  { title: "Pipeline Influence", path: "/pipeline" },
  { title: "Sales Handoff", path: "/sales-handoff" },
  { title: "Follow-Up Performance", path: "/follow-up" },
  { title: "ROI Reporting", path: "/roi" },
];

const executionSubItems = [
  { title: "Run of Show", path: "/run-of-show" },
  { title: "Deliverables", path: "/deliverables" },
  { title: "Vendors", path: "/vendors" },
  { title: "Investment Health", path: "/budget" },
];

const programSubItems = [
  { title: "All Programs", path: "/events" },
  { title: "Acquisition Flow", path: "/registration" },
  { title: "Arrivals", path: "/check-in" },
  { title: "Properties", path: "/custom-fields" },
  { title: "Program Hub", path: "/site-builder" },
  { title: "Sponsors", path: "/sponsors" },
  { title: "Sponsor Tasks", path: "/sponsor-tasks" },
];

const myTasksItems = [
  { title: "My Deliverables", icon: CheckSquare, path: "/my-deliverables" },
  { title: "Reviewer Portal", icon: ClipboardList, path: "/reviewer/portal" },
];

interface UserOrganization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user, organization, hasPermission, isOwner } = useAuth();
  const [wizardOpen, setWizardOpen] = useState(false);

  // Fetch all organizations user belongs to
  const { data: userOrganizations = [] } = useQuery<UserOrganization[]>({
    queryKey: ["/api/auth/organizations"],
  });

  // Mutation to switch organizations
  const switchOrgMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const res = await apiRequest("POST", "/api/auth/organization/switch", { organizationId });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate all queries to refresh data for new org
      queryClient.invalidateQueries();
      // Force page reload to ensure all data is refreshed
      window.location.reload();
    },
  });

  const isPerformanceActive = location === "/" || location === "/acquisition" || location === "/engagement-signals" || location === "/revenue-snapshot";
  const isGtmActive = location === "/attendees" || location === "/import-attendees" || location === "/attendee-types" || location === "/invite-codes" || location === "/activation-links" || location === "/packages" || location === "/emails" || location === "/email-analytics" || location === "/social";
  const isEngagementActive = location === "/sessions" || location === "/speakers" || location === "/tracks" || location === "/rooms";
  const isRevenueActive = location === "/pipeline" || location === "/sales-handoff" || location === "/follow-up" || location === "/roi";
  const isExecutionActive = location === "/run-of-show" || location === "/deliverables" || location === "/vendors" || location === "/budget";
  const isProgramActive = location === "/events" || location === "/registration" || location === "/check-in" || location === "/site-builder" || location === "/custom-fields" || location === "/sponsors" || location === "/sponsor-tasks";
  const isContentActive = location === "/content" || location === "/documents" || location === "/call-for-papers";
  
  const isSuperAdmin = user?.email?.toLowerCase().endsWith("@makemysandbox.com") ?? false;
  
  // Permission checks for each section
  const canViewPrograms = hasPermission('programs');
  const canViewPerformance = hasPermission('performance');
  const canViewGoToMarket = hasPermission('goToMarket');
  const canViewEngagement = hasPermission('engagement');
  const canViewExecution = hasPermission('execution');
  const canViewRevenueRoi = hasPermission('revenueRoi');

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
        {organization && (
          <div className="mt-2">
            {userOrganizations.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 text-sm text-muted-foreground hover-elevate rounded-md px-1 py-0.5 -mx-1 w-full"
                    data-testid="button-organization-switcher"
                  >
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1 text-left" title={organization.name}>
                      {organization.name}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {userOrganizations.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => {
                        if (org.id !== organization.id) {
                          switchOrgMutation.mutate(org.id);
                        }
                      }}
                      disabled={switchOrgMutation.isPending}
                      className="flex items-center gap-2"
                      data-testid={`dropdown-org-${org.id}`}
                    >
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate flex-1">{org.name}</span>
                      {org.id === organization.id && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span className="truncate" title={organization.name} data-testid="text-organization-name">
                  {organization.name}
                </span>
              </div>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {canViewPrograms && (
        <SidebarGroup>
          <SidebarGroupLabel>Programs</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen={isProgramActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isProgramActive}
                      data-testid="nav-programs"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Program Setup</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {programSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === item.path}
                          >
                            <Link
                              href={item.path}
                              data-testid={`nav-${item.title.toLowerCase().replace(/ /g, "-")}`}
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

              <Collapsible defaultOpen={isContentActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isContentActive}
                      data-testid="nav-content"
                    >
                      <FolderOpen className="h-4 w-4" />
                      <span>Content</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={location === "/content"}
                        >
                          <Link href="/content" data-testid="nav-media-library">
                            <span>Media Library</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={location === "/documents"}
                        >
                          <Link href="/documents" data-testid="nav-documents">
                            <span>Documents</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={location === "/call-for-papers"}
                        >
                          <Link href="/call-for-papers" data-testid="nav-call-for-papers">
                            <span>Call for Papers</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {canViewPerformance && (
        <SidebarGroup>
          <SidebarGroupLabel>Performance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen={isPerformanceActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isPerformanceActive}
                      data-testid="nav-performance"
                    >
                      <TrendingUp className="h-4 w-4" />
                      <span>Analytics</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {performanceSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === item.path}
                          >
                            <Link
                              href={item.path}
                              data-testid={`nav-${item.title.toLowerCase().replace(/ /g, "-")}`}
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {canViewGoToMarket && (
        <SidebarGroup>
          <SidebarGroupLabel>Go-To-Market</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen={location === "/attendees" || location === "/import-attendees" || location === "/attendee-types" || location === "/invite-codes" || location === "/packages"} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={location === "/attendees" || location === "/import-attendees" || location === "/attendee-types" || location === "/invite-codes" || location === "/packages"}
                      data-testid="nav-audience"
                    >
                      <Target className="h-4 w-4" />
                      <span>Audience</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {audienceSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === item.path}
                          >
                            <Link
                              href={item.path}
                              data-testid={`nav-${item.title.toLowerCase().replace(/ /g, "-")}`}
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

              <Collapsible defaultOpen={location === "/emails" || location === "/email-analytics" || location === "/social"} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={location === "/emails" || location === "/email-analytics" || location === "/social"}
                      data-testid="nav-campaigns"
                    >
                      <Megaphone className="h-4 w-4" />
                      <span>Campaigns</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {campaignsSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === item.path}
                          >
                            <Link
                              href={item.path}
                              data-testid={`nav-${item.title.toLowerCase().replace(/ /g, "-")}`}
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {canViewEngagement && (
        <SidebarGroup>
          <SidebarGroupLabel>Engagement</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen={location === "/sessions" || location === "/speakers" || location === "/tracks" || location === "/rooms"} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={location === "/sessions" || location === "/speakers" || location === "/tracks" || location === "/rooms"}
                      data-testid="nav-content-experiences"
                    >
                      <Presentation className="h-4 w-4" />
                      <span>Content Experiences</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {contentSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location === item.path}
                          >
                            <Link
                              href={item.path}
                              data-testid={`nav-${item.title.toLowerCase().replace(/ /g, "-")}`}
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

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {organization?.enableRevenueRoi && canViewRevenueRoi && (
          <SidebarGroup>
            <SidebarGroupLabel>Revenue & ROI</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {revenueSubItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.path}
                      data-testid={`nav-${item.title.toLowerCase().replace(/ /g, "-")}`}
                    >
                      <Link href={item.path}>
                        {item.title === "Pipeline Influence" && <PieChart className="h-4 w-4" />}
                        {item.title === "Sales Handoff" && <HandshakeIcon className="h-4 w-4" />}
                        {item.title === "Follow-Up Performance" && <Send className="h-4 w-4" />}
                        {item.title === "ROI Reporting" && <LineChart className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {canViewExecution && (
        <SidebarGroup>
          <SidebarGroupLabel>Execution</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/run-of-show"}
                  data-testid="nav-run-of-show"
                >
                  <Link href="/run-of-show">
                    <ListTodo className="h-4 w-4" />
                    <span>Run of Show</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/deliverables"}
                  data-testid="nav-deliverables"
                >
                  <Link href="/deliverables">
                    <CheckSquare className="h-4 w-4" />
                    <span>Deliverables</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/vendors"}
                  data-testid="nav-vendors"
                >
                  <Link href="/vendors">
                    <Truck className="h-4 w-4" />
                    <span>Vendors</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/budget"}
                  data-testid="nav-budget"
                >
                  <Link href="/budget">
                    <Wallet className="h-4 w-4" />
                    <span>Investment Health</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>My Tasks</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {myTasksItems.map((item) => (
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
          <Collapsible defaultOpen={location === "/my-organization" || location === "/team-members"} className="group/collapsible">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={location === "/my-organization" || location === "/team-members"}
                  data-testid="nav-my-organization"
                >
                  <Building2 className="h-4 w-4" />
                  <span>My Organization</span>
                  <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={location === "/my-organization"}
                      data-testid="nav-my-organization-details"
                    >
                      <Link href="/my-organization">
                        <span>Organization Details</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={location === "/team-members"}
                      data-testid="nav-team-members"
                    >
                      <Link href="/team-members">
                        <span>Team Members</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
          <Collapsible defaultOpen={location === "/settings" || location === "/integrations"} className="group/collapsible">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={location === "/settings" || location === "/integrations"}
                  data-testid="nav-settings"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                  <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={location === "/settings"}
                      data-testid="nav-settings-general"
                    >
                      <Link href="/settings">
                        <span>General</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      asChild
                      isActive={location === "/integrations"}
                      data-testid="nav-integrations"
                    >
                      <Link href="/integrations">
                        <span>Integrations</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
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
