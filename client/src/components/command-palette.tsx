import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Mic2,
  FolderOpen,
  DollarSign,
  CheckSquare,
  Mail,
  Share2,
  Settings,
  QrCode,
  BarChart3,
  Building2,
  Search,
  UserPlus,
  CalendarPlus,
} from "lucide-react";
import type { Event, Attendee, Speaker } from "@shared/schema";

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const navigationItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/", keywords: ["home", "overview"] },
  { title: "Events", icon: Calendar, path: "/events", keywords: ["event", "conference"] },
  { title: "All Attendees", icon: Users, path: "/attendees", keywords: ["registrants", "participants"] },
  { title: "Attendee Types", icon: Users, path: "/attendee-types", keywords: ["types", "categories"] },
  { title: "Custom Fields", icon: Settings, path: "/custom-fields", keywords: ["fields", "form"] },
  { title: "Packages", icon: CheckSquare, path: "/packages", keywords: ["tickets", "pricing"] },
  { title: "Invite Codes", icon: UserPlus, path: "/invite-codes", keywords: ["codes", "invitations"] },
  { title: "Check-In", icon: QrCode, path: "/check-in", keywords: ["scan", "qr"] },
  { title: "Sessions", icon: Calendar, path: "/sessions", keywords: ["agenda", "schedule"] },
  { title: "Speakers", icon: Mic2, path: "/speakers", keywords: ["presenters"] },
  { title: "Content", icon: FolderOpen, path: "/content", keywords: ["files", "documents"] },
  { title: "Budget", icon: DollarSign, path: "/budget", keywords: ["money", "finance"] },
  { title: "Deliverables", icon: CheckSquare, path: "/deliverables", keywords: ["tasks", "todo"] },
  { title: "Email Campaigns", icon: Mail, path: "/emails", keywords: ["newsletter", "marketing"] },
  { title: "Social Media", icon: Share2, path: "/social", keywords: ["posts", "twitter"] },
  { title: "Site Builder", icon: Building2, path: "/site-builder", keywords: ["pages", "website"] },
  { title: "Integrations", icon: Settings, path: "/integrations", keywords: ["connect", "social", "email", "mailchimp"] },
  { title: "Registration Flow", icon: CalendarPlus, path: "/registration", keywords: ["signup", "form"] },
  { title: "Settings", icon: Settings, path: "/settings", keywords: ["preferences", "config"] },
  { title: "My Organization", icon: Building2, path: "/my-organization", keywords: ["org", "company"] },
];

const quickActions = [
  { title: "Create New Event", icon: CalendarPlus, path: "/events", action: "create-event" },
  { title: "Add Attendee", icon: UserPlus, path: "/attendees", action: "add-attendee" },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [, setLocation] = useLocation();

  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: isOpen,
  });

  const { data: attendees = [] } = useQuery<Attendee[]>({
    queryKey: ["/api/attendees"],
    enabled: isOpen,
  });

  const { data: speakers = [] } = useQuery<Speaker[]>({
    queryKey: ["/api/speakers"],
    enabled: isOpen,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen, setOpen]);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, [setOpen]);

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." data-testid="command-palette-input" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          {quickActions.map((action) => (
            <CommandItem
              key={action.action}
              onSelect={() => runCommand(() => setLocation(action.path))}
              data-testid={`command-${action.action}`}
            >
              <action.icon className="mr-2 h-4 w-4" />
              <span>{action.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => runCommand(() => setLocation(item.path))}
              keywords={item.keywords}
              data-testid={`command-nav-${item.path.replace("/", "") || "dashboard"}`}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {events.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Events">
              {events.slice(0, 5).map((event) => (
                <CommandItem
                  key={event.id}
                  onSelect={() => runCommand(() => setLocation(`/events?selected=${event.id}`))}
                  data-testid={`command-event-${event.id}`}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>{event.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {attendees.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Attendees">
              {attendees.slice(0, 5).map((attendee) => (
                <CommandItem
                  key={attendee.id}
                  onSelect={() => runCommand(() => setLocation(`/attendees?search=${attendee.email}`))}
                  data-testid={`command-attendee-${attendee.id}`}
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span>{attendee.firstName} {attendee.lastName}</span>
                  <span className="ml-2 text-muted-foreground text-xs">{attendee.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {speakers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Speakers">
              {speakers.slice(0, 5).map((speaker) => (
                <CommandItem
                  key={speaker.id}
                  onSelect={() => runCommand(() => setLocation(`/speakers?selected=${speaker.id}`))}
                  data-testid={`command-speaker-${speaker.id}`}
                >
                  <Mic2 className="mr-2 h-4 w-4" />
                  <span>{speaker.firstName} {speaker.lastName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function CommandPaletteTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 rounded-md border border-border hover-elevate"
        data-testid="command-palette-trigger"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
