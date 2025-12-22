import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Plus,
  Layout,
  GripVertical,
  Trash2,
  Settings,
  Eye,
  EyeOff,
  Globe,
  Type,
  Image,
  MousePointer,
  Grid3X3,
  Timer,
  Users,
  Calendar,
  HelpCircle,
  Quote,
  Images,
  Palette,
  Paintbrush,
  Code,
  Award,
  MapPin,
  Video,
  Mail,
  PanelRightClose,
  PanelRight,
  Sparkles,
  AlertTriangle,
  Menu,
  Search,
  Monitor,
  Tablet,
  Smartphone,
  History,
  RotateCcw,
  Loader2,
  Columns2,
  LayoutGrid,
  FileText,
  Hotel,
  User,
  QrCode,
  AlignLeft,
  AlignCenter,
  AlignRight,
  X,
  BarChart3,
  Columns3,
  Edit,
} from "lucide-react";
import { format } from "date-fns";
import type { Event, EventPage, EventPageTheme, EventSession, Speaker, EventSponsor, CustomFont } from "@shared/schema";
import { MergeTagPicker } from "@/components/merge-tag-picker";
import { SectionRenderer, GoogleFontsLoader, getThemeStyles, scopeCustomCss, sanitizeCustomCss } from "@/pages/public-event";
import { eventTemplates, TEMPLATE_CATEGORIES, type EventTemplate, type TemplateCategory } from "@/lib/site-templates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type PageType = "landing" | "registration" | "portal" | "confirmation";

type SectionType = "hero" | "text" | "cta" | "features" | "countdown" | "speakers" | "agenda" | "faq" | "testimonials" | "gallery" | "html" | "sponsors" | "map" | "video" | "footer" | "navigation" | "columns" | "columns-flex" | "layout-columns" | "registration-form" | "housing" | "attendee-profile" | "attendee-qrcode";

interface SingleCondition {
  property: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
  value: string;
}

interface VisibilityCondition {
  enabled: boolean;
  logic: 'and' | 'or';
  conditions: SingleCondition[];
}

interface SectionStyles {
  backgroundColor?: string;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  gridJustify?: 'start' | 'center';
  paddingTop?: 'none' | 'small' | 'medium' | 'large';
  paddingBottom?: 'none' | 'small' | 'medium' | 'large';
  paddingLeft?: 'none' | 'small' | 'medium' | 'large';
  paddingRight?: 'none' | 'small' | 'medium' | 'large';
  customClass?: string;
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  visibilityCondition?: VisibilityCondition;
}

// Helper to normalize old visibility condition format to new format
function normalizeVisibilityCondition(
  raw: VisibilityCondition | { enabled: boolean; property: string; operator: string; value: string } | undefined
): VisibilityCondition {
  if (!raw) {
    return { enabled: false, logic: 'and', conditions: [] };
  }
  // Check if this is the new format (has conditions array)
  if ('conditions' in raw && Array.isArray(raw.conditions)) {
    return {
      enabled: raw.enabled,
      logic: raw.logic || 'and',
      conditions: raw.conditions
    };
  }
  // Migrate old format (property/operator/value directly on object)
  const oldFormat = raw as { enabled: boolean; property?: string; operator?: string; value?: string };
  if (oldFormat.property) {
    return {
      enabled: oldFormat.enabled,
      logic: 'and',
      conditions: [{
        property: oldFormat.property,
        operator: (oldFormat.operator || 'equals') as SingleCondition['operator'],
        value: oldFormat.value || ''
      }]
    };
  }
  return { enabled: raw.enabled, logic: 'and', conditions: [] };
}

interface Section {
  id: string;
  type: SectionType;
  order: number;
  config: Record<string, unknown>;
  styles?: SectionStyles;
}

const PAGE_TYPES: { value: PageType; label: string; description: string }[] = [
  { value: "landing", label: "Landing Page", description: "Public event information page" },
  { value: "registration", label: "Registration", description: "Registration form and flow" },
  { value: "portal", label: "Attendee Portal", description: "Post-registration attendee area" },
  { value: "confirmation", label: "Confirmation", description: "Post-registration confirmation page" },
];

const SECTION_TYPES: { type: SectionType; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { type: "hero", label: "Hero Section", icon: Image, description: "Large header with image and title" },
  { type: "text", label: "Text Block", icon: Type, description: "Rich text content area" },
  { type: "cta", label: "Call to Action", icon: MousePointer, description: "Button with action prompt" },
  { type: "features", label: "Features Grid", icon: Grid3X3, description: "Grid of feature cards" },
  { type: "countdown", label: "Countdown Timer", icon: Timer, description: "Countdown to event start" },
  { type: "speakers", label: "Speakers Grid", icon: Users, description: "Display event speakers" },
  { type: "agenda", label: "Agenda Schedule", icon: Calendar, description: "Event sessions timeline" },
  { type: "faq", label: "FAQ Accordion", icon: HelpCircle, description: "Frequently asked questions" },
  { type: "testimonials", label: "Testimonials", icon: Quote, description: "Quotes from past attendees" },
  { type: "gallery", label: "Image Gallery", icon: Images, description: "Photo grid display" },
  { type: "html", label: "Custom HTML", icon: Code, description: "Raw HTML code block" },
  { type: "sponsors", label: "Sponsors", icon: Award, description: "Sponsor logos with tier levels" },
  { type: "map", label: "Event Map", icon: MapPin, description: "Embedded Google Maps location" },
  { type: "video", label: "Video", icon: Video, description: "Embedded YouTube/Vimeo video" },
  { type: "footer", label: "Footer", icon: Mail, description: "Contact info, links, social media" },
  { type: "navigation", label: "Navigation Bar", icon: Menu, description: "Header navigation with links" },
  { type: "columns", label: "Simple Columns", icon: Columns2, description: "Multi-column layout with text" },
  { type: "columns-flex", label: "Flexible Columns", icon: LayoutGrid, description: "Columns with icons, images, buttons" },
  { type: "layout-columns", label: "Layout Columns", icon: Columns3, description: "Multi-column layout with nested sections" },
  { type: "registration-form", label: "Registration Form", icon: FileText, description: "Embed the event registration form" },
  { type: "housing", label: "Hotel Housing", icon: Hotel, description: "Hotel booking section for Passkey integration" },
  { type: "attendee-profile", label: "Attendee Profile", icon: User, description: "Display and edit attendee profile information" },
  { type: "attendee-qrcode", label: "Check-in QR Code", icon: QrCode, description: "Display attendee check-in QR code" },
];

const GOOGLE_FONTS = [
  { value: "Inter", label: "Inter" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Lato", label: "Lato" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Poppins", label: "Poppins" },
  { value: "Oswald", label: "Oswald" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Raleway", label: "Raleway" },
  { value: "Source Sans Pro", label: "Source Sans Pro" },
  { value: "Merriweather", label: "Merriweather" },
  { value: "Nunito", label: "Nunito" },
];

const BORDER_RADIUS_OPTIONS = [
  { value: "none", label: "None" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "pill", label: "Pill" },
];

const BUTTON_STYLE_OPTIONS = [
  { value: "filled", label: "Filled" },
  { value: "outline", label: "Outline" },
];

const CONTAINER_WIDTH_OPTIONS = [
  { value: "narrow", label: "Narrow (768px)" },
  { value: "standard", label: "Standard (1024px)" },
  { value: "wide", label: "Wide (1280px)" },
  { value: "full", label: "Full Width (100%)" },
];

const SECTION_SPACING_OPTIONS = [
  { value: "compact", label: "Compact" },
  { value: "normal", label: "Normal" },
  { value: "relaxed", label: "Relaxed" },
];

const TEXT_DECORATION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "underline", label: "Underline Links" },
  { value: "uppercase", label: "Uppercase Headings" },
  { value: "capitalize", label: "Capitalize Headings" },
];

const getDefaultConfig = (type: SectionType): Record<string, unknown> => {
  switch (type) {
    case "hero":
      return { title: "Welcome to Our Event", subtitle: "", buttonText: "Register Now", buttonLink: "", backgroundImage: "", cardBackgroundColor: "" };
    case "text":
      return { 
        heading: "", 
        content: "", 
        alignment: "left",
        headingSize: "2xl",
        bodySize: "base",
        headingFont: "",
        bodyFont: "",
        headingColor: "",
        bodyColor: "",
        lineHeight: "normal",
        headingWeight: "semibold",
        maxWidth: "none",
      };
    case "cta":
      return { heading: "Ready to Join?", description: "", buttonText: "Get Started", buttonLink: "" };
    case "features":
      return { heading: "What's Included", features: [] };
    case "countdown":
      return { heading: "Event Starts In", useEventDate: true, customDate: "" };
    case "speakers":
      return { heading: "Meet Our Speakers", showBio: true, columns: 3 };
    case "agenda":
      return { heading: "Event Schedule", showRoom: true, showTrack: true };
    case "faq":
      return { heading: "Frequently Asked Questions", items: [] };
    case "testimonials":
      return { heading: "What Attendees Say", items: [] };
    case "gallery":
      return { heading: "Event Gallery", images: [], columns: 3 };
    case "html":
      return { content: "" };
    case "sponsors":
      return { heading: "Our Sponsors", sponsors: [] };
    case "map":
      return { heading: "Event Location", embedUrl: "", useEventAddress: true };
    case "video":
      return { heading: "", videoUrl: "", autoplay: false };
    case "footer":
      return { 
        showContactInfo: true, 
        email: "", 
        phone: "", 
        address: "",
        links: [],
        showSocialIcons: true,
        facebookUrl: "",
        twitterUrl: "",
        linkedinUrl: "",
        instagramUrl: "",
        copyright: ""
      };
    case "navigation":
      return { 
        logo: "", 
        links: [
          { label: "Home", url: "/event/{{slug}}" },
          { label: "Register", url: "/event/{{slug}}/register" },
        ], 
        showEventTitle: true,
        sticky: false,
        style: "light"
      };
    case "columns":
      return {
        heading: "",
        columnCount: 2,
        columns: [
          { heading: "Column 1", content: "Add your content here" },
          { heading: "Column 2", content: "Add your content here" },
        ]
      };
    case "columns-flex":
      return {
        heading: "",
        columnCount: 3,
        columns: [
          { icon: "star", heading: "Feature 1", content: "Description here", imageUrl: "", buttonText: "", buttonLink: "" },
          { icon: "zap", heading: "Feature 2", content: "Description here", imageUrl: "", buttonText: "", buttonLink: "" },
          { icon: "heart", heading: "Feature 3", content: "Description here", imageUrl: "", buttonText: "", buttonLink: "" },
        ]
      };
    case "layout-columns":
      return {
        heading: "",
        columnCount: 2,
        columnWidths: "equal",
        gap: "md",
        columns: [
          { sections: [] },
          { sections: [] },
        ]
      };
    case "registration-form":
      return {
        heading: "Register Now",
        description: "Complete the form below to register for this event.",
        showHeading: true,
      };
    case "housing":
      return { 
        heading: "Hotel Accommodations", 
        description: "Book your hotel room through our official room block for special event rates.",
        buttonText: "Book Your Hotel Room",
        showWhenDisabled: false 
      };
    case "attendee-profile":
      return {
        heading: "Your Profile",
        description: "Your registration information",
        allowEdit: true,
      };
    case "attendee-qrcode":
      return {
        heading: "Check-In Code",
        description: "Show this code at the event check-in",
      };
    default:
      return {};
  }
};

export default function SiteBuilder() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<PageType>("landing");
  const [activeSubTab, setActiveSubTab] = useState<"content" | "styles">("content");
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [isSectionEditorOpen, setIsSectionEditorOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSections, setPreviewSections] = useState<Section[]>([]);
  const [previewTheme, setPreviewTheme] = useState<EventPageTheme | undefined>();
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  const [pendingTemplate, setPendingTemplate] = useState<EventTemplate | null>(null);
  const [isTemplateConfirmOpen, setIsTemplateConfirmOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<string | null>(null);
  const justAppliedTemplateRef = useRef(false);

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: pages = [], isLoading: pagesLoading } = useQuery<EventPage[]>({
    queryKey: ["/api/events", selectedEventId, "pages"],
    enabled: !!selectedEventId,
  });

  const { data: sessions = [] } = useQuery<EventSession[]>({
    queryKey: ["/api/sessions", selectedEventId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions?eventId=${selectedEventId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const { data: speakers = [] } = useQuery<Speaker[]>({
    queryKey: ["/api/speakers", selectedEventId],
    queryFn: async () => {
      const res = await fetch(`/api/speakers?eventId=${selectedEventId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch speakers");
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const { data: sponsors = [] } = useQuery<EventSponsor[]>({
    queryKey: ["/api/events", selectedEventId, "sponsors"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${selectedEventId}/sponsors`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sponsors");
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  
  const { data: customFonts = [] } = useQuery<CustomFont[]>({
    queryKey: ["/api/custom-fonts"],
    enabled: !!selectedEvent?.organizationId,
  });

  const currentPage = pages.find((p) => p.pageType === activeTab);
  const sections = (currentPage?.sections as Section[]) || [];

  useEffect(() => {
    // Skip sync while waiting for template data to be persisted
    if (justAppliedTemplateRef.current) {
      return;
    }
    setPreviewSections(sections);
    setPreviewTheme(currentPage?.theme);
  }, [sections, currentPage?.theme]);

  const saveMutation = useMutation({
    mutationFn: async (data: { pageType: PageType; sections: Section[]; isPublished?: boolean; theme?: EventPageTheme; seo?: { title?: string; description?: string; ogImage?: string } }) => {
      const response = await apiRequest("POST", `/api/events/${selectedEventId}/pages`, {
        eventId: selectedEventId,
        pageType: data.pageType,
        sections: data.sections,
        isPublished: data.isPublished ?? currentPage?.isPublished ?? false,
        theme: data.theme ?? currentPage?.theme,
        seo: data.seo ?? currentPage?.seo,
      });
      const savedPage = await response.json();
      if (savedPage?.id) {
        await apiRequest("POST", `/api/events/${selectedEventId}/pages/${savedPage.id}/versions`, {
          sections: data.sections,
          theme: data.theme ?? currentPage?.theme ?? {},
          seo: data.seo ?? currentPage?.seo ?? {},
        });
      }
      return savedPage;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "pages"] });
      if (currentPage?.id) {
        await queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "pages", currentPage.id, "versions"] });
      }
      justAppliedTemplateRef.current = false;
      toast({ title: "Page saved successfully" });
    },
    onError: (error: Error) => {
      justAppliedTemplateRef.current = false;
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (isPublished: boolean) => {
      return await apiRequest("POST", `/api/events/${selectedEventId}/pages`, {
        eventId: selectedEventId,
        pageType: activeTab,
        sections: sections,
        isPublished,
        theme: currentPage?.theme,
      });
    },
    onSuccess: (_, isPublished) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "pages"] });
      toast({ title: isPublished ? "Page published" : "Page unpublished" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAddSection = (type: SectionType) => {
    const newSection: Section = {
      id: crypto.randomUUID(),
      type,
      order: sections.length,
      config: getDefaultConfig(type),
    };
    const updatedSections = [...sections, newSection];
    saveMutation.mutate({ pageType: activeTab, sections: updatedSections });
    setIsAddSectionOpen(false);
  };

  const handleDeleteSection = (sectionId: string) => {
    const updatedSections = sections
      .filter((s) => s.id !== sectionId)
      .map((s, index) => ({ ...s, order: index }));
    saveMutation.mutate({ pageType: activeTab, sections: updatedSections });
  };

  const handleMoveSection = (sectionId: string, direction: "up" | "down") => {
    const index = sections.findIndex((s) => s.id === sectionId);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === sections.length - 1) return;

    const newSections = [...sections];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newSections[index], newSections[swapIndex]] = [newSections[swapIndex], newSections[index]];
    const updatedSections = newSections.map((s, i) => ({ ...s, order: i }));
    saveMutation.mutate({ pageType: activeTab, sections: updatedSections });
  };

  const handleUpdateSection = (sectionId: string, config: Record<string, unknown>, styles?: SectionStyles) => {
    const updatedSections = sections.map((s) => {
      if (s.id !== sectionId) return s;
      // Merge styles instead of replacing to preserve existing style overrides
      const mergedStyles = styles !== undefined 
        ? { ...(s.styles || {}), ...styles }
        : s.styles;
      return { ...s, config, styles: mergedStyles };
    });
    saveMutation.mutate({ pageType: activeTab, sections: updatedSections });
    setIsSectionEditorOpen(false);
    setEditingSection(null);
  };

  const handleUpdateTheme = (updates: Partial<EventPageTheme>) => {
    // Sanitize customCss before saving to ensure stored CSS is always safe
    const sanitizedUpdates = updates.customCss !== undefined
      ? { ...updates, customCss: sanitizeCustomCss(updates.customCss) }
      : updates;
    
    const newTheme: EventPageTheme = {
      ...(previewTheme ?? currentPage?.theme ?? {}),
      ...sanitizedUpdates,
    };
    // Update preview immediately for real-time feedback
    setPreviewTheme(newTheme);
    // Persist to server
    saveMutation.mutate({ pageType: activeTab, sections: sections, theme: newTheme });
  };

  const handleUpdateSeo = (updates: { title?: string; description?: string; ogImage?: string }) => {
    const newSeo = { ...(currentPage?.seo ?? {}), ...updates };
    saveMutation.mutate({ pageType: activeTab, sections, seo: newSeo });
  };

  const handleApplyTemplate = (template: EventTemplate) => {
    if (sections.length > 0) {
      setPendingTemplate(template);
      setIsTemplateConfirmOpen(true);
    } else {
      applyTemplate(template);
    }
  };

  const applyTemplate = (template: EventTemplate) => {
    justAppliedTemplateRef.current = true;
    const newSections: Section[] = template.sections.map((s, index) => ({
      id: crypto.randomUUID(),
      type: s.type as SectionType,
      order: index,
      config: s.config,
    }));
    saveMutation.mutate({ 
      pageType: activeTab, 
      sections: newSections, 
      theme: template.theme as EventPageTheme 
    });
    setPreviewSections(newSections);
    setPreviewTheme(template.theme as EventPageTheme);
    setIsTemplatePickerOpen(false);
    setPendingTemplate(null);
    setIsTemplateConfirmOpen(false);
    toast({ title: "Template applied", description: `"${template.name}" template has been applied` });
  };

  const filteredTemplates = templateCategoryFilter === 'all' 
    ? eventTemplates 
    : eventTemplates.filter(t => t.category === templateCategoryFilter);

  const currentTheme = currentPage?.theme || {};

  const previewEvent: Event = selectedEvent || {
    id: "preview",
    organizationId: "",
    name: "Preview Event",
    description: "Preview of your event page",
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    location: "Event Location",
    publicSlug: "preview",
    registrationOpen: true,
    isPublic: true,
    status: "draft",
  };

  const getSectionIcon = (type: SectionType) => {
    const sectionType = SECTION_TYPES.find((s) => s.type === type);
    return sectionType?.icon || Layout;
  };

  const getSectionLabel = (type: SectionType) => {
    const sectionType = SECTION_TYPES.find((s) => s.type === type);
    return sectionType?.label || type;
  };

  const SectionPreview = ({ section }: { section: Section }) => {
    const config = section.config;
    let previewText = "";
    
    switch (section.type) {
      case "hero":
        previewText = (config.title as string) || "Hero section";
        break;
      case "text":
        const textContent = (config.content as string) || "";
        previewText = (config.heading as string) || (textContent.length > 50 ? textContent.substring(0, 50) + "..." : textContent) || "Text block";
        break;
      case "cta":
        previewText = `${(config.heading as string) || "Call to Action"}${(config.buttonText as string) ? ` - "${config.buttonText}"` : ""}`;
        break;
      case "features":
        const features = (config.features as Array<unknown>) || [];
        previewText = `${(config.heading as string) || "Features"} (${features.length} items)`;
        break;
      case "countdown":
        previewText = (config.heading as string) || "Countdown timer";
        break;
      case "speakers":
        previewText = (config.heading as string) || "Speakers grid";
        break;
      case "agenda":
        previewText = (config.heading as string) || "Event schedule";
        break;
      case "faq":
        const faqItems = (config.items as Array<unknown>) || [];
        previewText = `${(config.heading as string) || "FAQ"} (${faqItems.length} items)`;
        break;
      case "testimonials":
        const testimonials = (config.items as Array<unknown>) || [];
        previewText = `${(config.heading as string) || "Testimonials"} (${testimonials.length} items)`;
        break;
      case "gallery":
        const images = (config.images as Array<unknown>) || [];
        previewText = `${(config.heading as string) || "Gallery"} (${images.length} images)`;
        break;
      case "html":
        previewText = "Custom HTML block";
        break;
      case "sponsors":
        const sponsors = (config.sponsors as Array<unknown>) || [];
        previewText = `${(config.heading as string) || "Sponsors"} (${sponsors.length} sponsors)`;
        break;
      case "map":
        previewText = (config.heading as string) || "Event location map";
        break;
      case "video":
        previewText = (config.heading as string) || (config.videoUrl as string) || "Video embed";
        break;
      case "footer":
        const footerParts = [];
        if (config.email) footerParts.push("email");
        if (config.phone) footerParts.push("phone");
        if (config.showSocialIcons) footerParts.push("social");
        previewText = footerParts.length > 0 ? `Footer: ${footerParts.join(", ")}` : "Footer section";
        break;
      case "navigation":
        const navLinks = (config.links as Array<{ label: string; url: string }>) || [];
        previewText = `Navigation bar (${navLinks.length} links)`;
        break;
      case "columns":
        const simpleColCount = (config.columnCount as number) || 2;
        previewText = `${(config.heading as string) || "Columns"} (${simpleColCount} columns)`;
        break;
      case "columns-flex":
        const flexColCount = (config.columnCount as number) || 3;
        previewText = `${(config.heading as string) || "Flexible Columns"} (${flexColCount} columns)`;
        break;
      case "layout-columns":
        const layoutColCount = (config.columnCount as number) || 2;
        const layoutColumns = (config.columns as Array<{ sections: Array<unknown> }>) || [];
        const totalNestedSections = layoutColumns.reduce((sum, col) => sum + (col.sections?.length || 0), 0);
        previewText = `Layout (${layoutColCount} columns, ${totalNestedSections} sections)`;
        break;
      case "registration-form":
        previewText = (config.heading as string) || "Registration form";
        break;
      case "housing":
        previewText = (config.heading as string) || "Hotel Housing";
        break;
      default:
        previewText = "Section content";
    }
    
    return (
      <p className="text-sm text-muted-foreground truncate" data-testid={`section-preview-${section.id}`}>
        {previewText}
      </p>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Program Hub"
        breadcrumbs={[{ label: "Programs", href: "/events" }, { label: "Program Hub" }]}
        actions={
          selectedEventId && (
            <div className="flex items-center gap-1">
              <Button
                variant={showPreview ? "default" : "outline"}
                size="icon"
                onClick={() => setShowPreview(!showPreview)}
                data-testid="button-toggle-preview"
                title={showPreview ? "Hide Preview" : "Show Preview"}
              >
                {showPreview ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (selectedEvent?.publicSlug) {
                    const baseUrl = `/event/${selectedEvent.publicSlug}`;
                    const previewUrl = activeTab === "landing" 
                      ? baseUrl 
                      : activeTab === "registration" 
                        ? `${baseUrl}/register`
                        : `${baseUrl}/portal`;
                    window.open(previewUrl, "_blank");
                  } else {
                    toast({ 
                      title: "No public URL", 
                      description: "Set a public slug for this event to enable preview",
                      variant: "destructive"
                    });
                  }
                }}
                data-testid="button-preview"
                title="Preview in new tab"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsVersionHistoryOpen(true)}
                disabled={!currentPage?.id}
                data-testid="button-history"
                title="Version History"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant={currentPage?.isPublished ? "outline" : "default"}
                size="sm"
                onClick={() => publishMutation.mutate(!currentPage?.isPublished)}
                disabled={publishMutation.isPending}
                data-testid="button-publish"
              >
                <Globe className="h-4 w-4 mr-2" />
                {currentPage?.isPublished ? "Unpublish" : "Publish"}
              </Button>
            </div>
          )
        }
      />

      <div className="flex-1 flex overflow-hidden">
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} overflow-auto p-6 transition-all duration-300`}>
          <div className="max-w-5xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Select Event
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedEventId}
                onValueChange={setSelectedEventId}
              >
                <SelectTrigger data-testid="select-event">
                  <SelectValue placeholder="Choose an event to customize" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {!selectedEventId ? (
            <EmptyState
              icon={Layout}
              title="Select an Event"
              description="Choose an event from the dropdown above to start customizing its pages"
            />
          ) : pagesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-muted-foreground">Loading pages...</div>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PageType)}>
                  <div className="overflow-x-auto -mx-2 px-2 mb-6">
                    <TabsList className="w-auto inline-flex">
                      {PAGE_TYPES.map((pt) => (
                        <TabsTrigger
                          key={pt.value}
                          value={pt.value}
                          className="flex items-center gap-2 whitespace-nowrap"
                          data-testid={`tab-${pt.value}`}
                        >
                          {pt.label}
                          {pages.find((p) => p.pageType === pt.value)?.isPublished && (
                            <Badge variant="secondary" className="text-xs">Live</Badge>
                          )}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {PAGE_TYPES.map((pt) => (
                    <TabsContent key={pt.value} value={pt.value} className="space-y-4">
                      <div className="flex flex-col gap-3 mb-4">
                        <div>
                          <h3 className="font-medium">{pt.label}</h3>
                          <p className="text-sm text-muted-foreground">{pt.description}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant={activeSubTab === "content" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setActiveSubTab("content")}
                            data-testid="tab-content"
                          >
                            <Layout className="h-4 w-4 mr-2" />
                            Content
                          </Button>
                          <Button
                            variant={activeSubTab === "styles" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setActiveSubTab("styles")}
                            data-testid="tab-styles"
                          >
                            <Palette className="h-4 w-4 mr-2" />
                            Styles
                          </Button>
                          {activeSubTab === "content" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsTemplatePickerOpen(true)}
                                data-testid="button-templates"
                              >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Templates
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setIsAddSectionOpen(true)}
                                data-testid="button-add-section"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Section
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {activeSubTab === "content" ? (
                        <>

                          {sections.length === 0 ? (
                            <div className="border-2 border-dashed rounded-md p-12 text-center">
                              <Layout className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                              <h4 className="font-medium mb-2">No sections yet</h4>
                              <p className="text-sm text-muted-foreground mb-4">
                                Add sections to build your {pt.label.toLowerCase()}
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => setIsAddSectionOpen(true)}
                                data-testid="button-add-first-section"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add First Section
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {sections
                                .sort((a, b) => a.order - b.order)
                                .map((section, index) => {
                                  const Icon = getSectionIcon(section.type);
                                  return (
                                    <div
                                      key={section.id}
                                      className="flex items-start gap-3 p-3 border rounded-md bg-card"
                                      data-testid={`section-item-${section.id}`}
                                    >
                                      <div className="flex flex-col gap-1 pt-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => handleMoveSection(section.id, "up")}
                                          disabled={index === 0 || saveMutation.isPending}
                                          data-testid={`button-move-up-${section.id}`}
                                        >
                                          <GripVertical className="h-4 w-4 rotate-90" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => handleMoveSection(section.id, "down")}
                                          disabled={index === sections.length - 1 || saveMutation.isPending}
                                          data-testid={`button-move-down-${section.id}`}
                                        >
                                          <GripVertical className="h-4 w-4 rotate-90" />
                                        </Button>
                                      </div>
                                      <Icon className="h-5 w-5 text-muted-foreground mt-1" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium">{getSectionLabel(section.type)}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {section.type}
                                          </Badge>
                                        </div>
                                        <SectionPreview section={section} />
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setEditingSection(section);
                                            setIsSectionEditorOpen(true);
                                          }}
                                          data-testid={`button-edit-${section.id}`}
                                        >
                                          <Settings className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDeleteSection(section.id)}
                                          disabled={saveMutation.isPending}
                                          data-testid={`button-delete-${section.id}`}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </>
                      ) : (
                        <StylesEditor
                          theme={previewTheme || currentTheme}
                          onUpdateTheme={handleUpdateTheme}
                          isPending={saveMutation.isPending}
                          seo={currentPage?.seo}
                          onUpdateSeo={handleUpdateSeo}
                          customFonts={customFonts}
                        />
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          )}
          </div>
        </div>

        {showPreview && (
          <div
            data-testid="preview-pane"
            className="w-1/2 border-l bg-background overflow-auto"
          >
            <div className="p-4 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Eye className="h-3 w-3" />
                  Live Preview
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
                    onClick={() => setPreviewDevice('desktop')}
                    data-testid="button-preview-desktop"
                    title="Desktop view"
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={previewDevice === 'tablet' ? 'default' : 'ghost'}
                    onClick={() => setPreviewDevice('tablet')}
                    data-testid="button-preview-tablet"
                    title="Tablet view (768px)"
                  >
                    <Tablet className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
                    onClick={() => setPreviewDevice('mobile')}
                    data-testid="button-preview-mobile"
                    title="Mobile view (375px)"
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <ScrollArea className="h-[calc(100%-48px)]">
              <div 
                className={`event-page-custom ${previewTheme?.pagePadding === 'none' ? '' : 'p-4'} mx-auto`}
                style={{
                  ...getThemeStyles(previewTheme),
                  backgroundColor: previewTheme?.backgroundColor || undefined,
                  color: previewTheme?.textColor || undefined,
                  fontFamily: previewTheme?.bodyFont ? `"${previewTheme.bodyFont}", sans-serif` : undefined,
                  gap: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  width: previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '768px' : '375px',
                  maxWidth: '100%',
                  transition: 'width 0.2s ease-in-out',
                }}
              >
                <GoogleFontsLoader fonts={[previewTheme?.headingFont, previewTheme?.bodyFont].filter(Boolean) as string[]} />
                {previewTheme?.customCss && (
                  <style dangerouslySetInnerHTML={{ __html: scopeCustomCss(sanitizeCustomCss(previewTheme.customCss)) }} />
                )}
                {previewSections.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Add sections to see preview</div>
                ) : (
                  previewSections
                    .filter((section) => {
                      const isMobilePreview = previewDevice === 'mobile';
                      const isDesktopPreview = previewDevice === 'desktop' || previewDevice === 'tablet';
                      if (isMobilePreview && section.styles?.hideOnMobile) return false;
                      if (isDesktopPreview && section.styles?.hideOnDesktop) return false;
                      return true;
                    })
                    .sort((a, b) => a.order - b.order)
                    .map((section) => (
                      <div
                        key={section.id}
                        data-testid={`preview-section-${section.id}`}
                        className={editingSection?.id === section.id ? "ring-2 ring-primary ring-offset-2 rounded-md" : ""}
                      >
                        <SectionRenderer section={section} event={previewEvent} sessions={sessions} speakers={speakers} sponsors={sponsors} theme={previewTheme} isHighlighted={editingSection?.id === section.id} isPreview={true} />
                      </div>
                    ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Add Section</DialogTitle>
            <DialogDescription>
              Choose a section type to add to your page
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-4">
              {SECTION_TYPES.map((st) => (
                <button
                  key={st.type}
                  onClick={() => handleAddSection(st.type)}
                  className="flex flex-row items-center gap-3 p-3 border rounded-md hover-elevate text-left md:flex-col md:text-center md:p-4"
                  data-testid={`button-section-${st.type}`}
                >
                  <st.icon className="h-6 w-6 flex-shrink-0 text-muted-foreground md:h-8 md:w-8" />
                  <div className="min-w-0 flex-1 md:flex-none">
                    <span className="font-medium text-sm block">{st.label}</span>
                    <span className="text-xs text-muted-foreground line-clamp-2">{st.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isSectionEditorOpen} onOpenChange={setIsSectionEditorOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {editingSection ? getSectionLabel(editingSection.type) : "Section"}
            </DialogTitle>
            <DialogDescription>
              Configure the content and appearance of this section
            </DialogDescription>
          </DialogHeader>
          {editingSection && (
            <SectionEditor
              section={editingSection}
              onSave={(config, styles) => handleUpdateSection(editingSection.id, config, styles)}
              onCancel={() => {
                setIsSectionEditorOpen(false);
                setEditingSection(null);
              }}
              onConfigChange={(config, styles) => {
                setPreviewSections(prev => prev.map(s => 
                  s.id === editingSection.id ? { ...s, config, styles } : s
                ));
              }}
              eventId={selectedEventId}
              customFonts={customFonts}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isTemplatePickerOpen} onOpenChange={setIsTemplatePickerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]" data-testid="dialog-templates">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Choose a Template
            </DialogTitle>
            <DialogDescription>
              Select a professionally designed template to jumpstart your event page
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              variant={templateCategoryFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setTemplateCategoryFilter('all')}
              data-testid="filter-all"
            >
              All
            </Button>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                size="sm"
                variant={templateCategoryFilter === cat.value ? 'default' : 'outline'}
                onClick={() => setTemplateCategoryFilter(cat.value)}
                data-testid={`filter-${cat.value}`}
              >
                {cat.label}
              </Button>
            ))}
          </div>
          <ScrollArea className="h-[50vh] mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pr-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-md overflow-hidden hover-elevate"
                  data-testid={`template-card-${template.id}`}
                >
                  <div 
                    className="h-24 flex items-end p-3"
                    style={{ 
                      backgroundColor: template.theme.backgroundColor || '#ffffff',
                      borderBottom: `4px solid ${template.theme.primaryColor || '#3b82f6'}`
                    }}
                  >
                    <div className="flex gap-1">
                      <div 
                        className="w-4 h-4 rounded-sm" 
                        style={{ backgroundColor: template.theme.primaryColor || '#3b82f6' }} 
                        title="Primary"
                      />
                      <div 
                        className="w-4 h-4 rounded-sm" 
                        style={{ backgroundColor: template.theme.secondaryColor || '#60a5fa' }} 
                        title="Secondary"
                      />
                      <div 
                        className="w-4 h-4 rounded-sm border" 
                        style={{ backgroundColor: template.theme.cardBackground || '#f8fafc' }} 
                        title="Card"
                      />
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm leading-tight">{template.name}</h4>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {TEMPLATE_CATEGORIES.find(c => c.value === template.category)?.label || template.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleApplyTemplate(template)}
                      data-testid={`button-apply-template-${template.id}`}
                    >
                      Apply Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isTemplateConfirmOpen} onOpenChange={setIsTemplateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Replace Existing Content?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This page already has {sections.length} section{sections.length !== 1 ? 's' : ''}. 
              Applying a template will replace all existing sections and theme settings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingTemplate(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => pendingTemplate && applyTemplate(pendingTemplate)}
              data-testid="button-confirm-apply-template"
            >
              Replace Content
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {currentPage?.id && (
        <VersionHistoryDialog
          open={isVersionHistoryOpen}
          onOpenChange={setIsVersionHistoryOpen}
          eventId={selectedEventId}
          pageId={currentPage.id}
          versionToRestore={versionToRestore}
          setVersionToRestore={setVersionToRestore}
        />
      )}
    </div>
  );
}

interface PageVersion {
  id: string;
  organizationId: string;
  eventPageId: string;
  version: number;
  label: string | null;
  sections: Array<{
    id: string;
    type: string;
    order: number;
    config: Record<string, unknown>;
    styles?: SectionStyles;
  }> | null;
  theme: EventPageTheme | null;
  seo: { title?: string; description?: string; ogImage?: string } | null;
  createdAt: Date | null;
}

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  pageId: string;
  versionToRestore: string | null;
  setVersionToRestore: (id: string | null) => void;
}

function VersionHistoryDialog({ 
  open, 
  onOpenChange, 
  eventId, 
  pageId,
  versionToRestore,
  setVersionToRestore
}: VersionHistoryDialogProps) {
  const { toast } = useToast();

  const { data: versions = [], isLoading: versionsLoading } = useQuery<PageVersion[]>({
    queryKey: ["/api/events", eventId, "pages", pageId, "versions"],
    enabled: open && !!eventId && !!pageId,
  });

  const restoreMutation = useMutation({
    mutationFn: async (versionId: string) => {
      return await apiRequest("POST", `/api/events/${eventId}/pages/${pageId}/versions/${versionId}/restore`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "pages"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "pages", pageId, "versions"] });
      toast({ title: "Version restored successfully" });
      setVersionToRestore(null);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setVersionToRestore(null);
    },
  });

  const handleRestoreConfirm = () => {
    if (versionToRestore) {
      restoreMutation.mutate(versionToRestore);
    }
  };

  const formatVersionDate = (date: Date | null) => {
    if (!date) return "Unknown date";
    try {
      return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  return (
    <>
      <Dialog open={open && !versionToRestore} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg" data-testid="dialog-version-history">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </DialogTitle>
            <DialogDescription>
              View and restore previous versions of this page.
            </DialogDescription>
          </DialogHeader>
          
          {versionsLoading ? (
            <div className="flex items-center justify-center py-8" data-testid="versions-loading">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="versions-empty">
              No version history available yet.
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2" data-testid="versions-list">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-md border"
                    data-testid={`version-item-${version.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium" data-testid={`version-number-${version.id}`}>
                          Version {version.version}
                        </span>
                        {version.label && (
                          <Badge variant="secondary" className="text-xs" data-testid={`version-label-${version.id}`}>
                            {version.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid={`version-date-${version.id}`}>
                        {formatVersionDate(version.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVersionToRestore(version.id)}
                      data-testid={`button-restore-${version.id}`}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!versionToRestore} onOpenChange={(open) => !open && setVersionToRestore(null)}>
        <AlertDialogContent data-testid="dialog-restore-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Restore Version?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current page content with this version. A new version will be created with the current content before restoring.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setVersionToRestore(null)}
              disabled={restoreMutation.isPending}
              data-testid="button-cancel-restore"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRestoreConfirm}
              disabled={restoreMutation.isPending}
              data-testid="button-confirm-restore"
            >
              {restoreMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                "Restore Version"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const PADDING_OPTIONS = [
  { value: "none", label: "None" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

interface SectionEditorProps {
  section: Section;
  onSave: (config: Record<string, unknown>, styles?: SectionStyles) => void;
  onCancel: () => void;
  onConfigChange?: (config: Record<string, unknown>, styles?: SectionStyles) => void;
  eventId?: string;
  customFonts?: CustomFont[];
}

const AI_SUPPORTED_SECTIONS: SectionType[] = ["hero", "text", "cta", "features", "faq", "testimonials"];

interface NestedSectionEditorProps {
  section: Section;
  onUpdate: (config: Record<string, unknown>, styles: SectionStyles) => void;
  customFonts?: CustomFont[];
}

function NestedSectionEditor({ section, onUpdate, customFonts = [] }: NestedSectionEditorProps) {
  const [config, setConfig] = useState<Record<string, unknown>>(section.config);
  const [styles, setStyles] = useState<SectionStyles>(section.styles || {});

  const updateConfig = (key: string, value: unknown) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdate(newConfig, styles);
  };

  const updateStyles = (key: keyof SectionStyles, value: string | boolean | undefined | VisibilityCondition) => {
    const newStyles = { ...styles, [key]: value };
    setStyles(newStyles);
    onUpdate(config, newStyles);
  };

  const renderNestedFields = () => {
    switch (section.type) {
      case "hero":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="nested-title">Title</Label>
              <Input
                id="nested-title"
                value={(config.title as string) || ""}
                onChange={(e) => updateConfig("title", e.target.value)}
                placeholder="Enter hero title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nested-subtitle">Subtitle</Label>
              <Textarea
                id="nested-subtitle"
                value={(config.subtitle as string) || ""}
                onChange={(e) => updateConfig("subtitle", e.target.value)}
                placeholder="Enter subtitle text"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nested-buttonText">Button Text</Label>
              <Input
                id="nested-buttonText"
                value={(config.buttonText as string) || ""}
                onChange={(e) => updateConfig("buttonText", e.target.value)}
                placeholder="Register Now"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nested-buttonLink">Button Link</Label>
              <Input
                id="nested-buttonLink"
                value={(config.buttonLink as string) || ""}
                onChange={(e) => updateConfig("buttonLink", e.target.value)}
                placeholder="/register"
              />
            </div>
          </>
        );
      case "text":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="nested-heading">Heading</Label>
              <Input
                id="nested-heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="Section heading"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nested-content">Content</Label>
              <Textarea
                id="nested-content"
                value={(config.content as string) || ""}
                onChange={(e) => updateConfig("content", e.target.value)}
                placeholder="Enter your text content"
                rows={5}
              />
            </div>
          </>
        );
      case "cta":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="nested-cta-heading">Heading</Label>
              <Input
                id="nested-cta-heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="Ready to Join?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nested-description">Description</Label>
              <Textarea
                id="nested-description"
                value={(config.description as string) || ""}
                onChange={(e) => updateConfig("description", e.target.value)}
                placeholder="Brief description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nested-cta-buttonText">Button Text</Label>
              <Input
                id="nested-cta-buttonText"
                value={(config.buttonText as string) || ""}
                onChange={(e) => updateConfig("buttonText", e.target.value)}
                placeholder="Get Started"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nested-cta-buttonLink">Button Link</Label>
              <Input
                id="nested-cta-buttonLink"
                value={(config.buttonLink as string) || ""}
                onChange={(e) => updateConfig("buttonLink", e.target.value)}
                placeholder="/register"
              />
            </div>
          </>
        );
      case "features":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="nested-features-heading">Section Heading</Label>
              <Input
                id="nested-features-heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="What's Included"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Feature items can be configured after adding to the column
            </p>
          </>
        );
      case "countdown":
        return (
          <div className="space-y-2">
            <Label htmlFor="nested-countdown-heading">Heading</Label>
            <Input
              id="nested-countdown-heading"
              value={(config.heading as string) || ""}
              onChange={(e) => updateConfig("heading", e.target.value)}
              placeholder="Event Starts In"
            />
          </div>
        );
      case "speakers":
      case "sponsors":
      case "agenda":
        return (
          <div className="space-y-2">
            <Label htmlFor="nested-section-heading">Heading</Label>
            <Input
              id="nested-section-heading"
              value={(config.heading as string) || ""}
              onChange={(e) => updateConfig("heading", e.target.value)}
              placeholder="Section Heading"
            />
          </div>
        );
      case "video":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="nested-video-heading">Heading (optional)</Label>
              <Input
                id="nested-video-heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="Watch the Video"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nested-video-url">Video URL</Label>
              <Input
                id="nested-video-url"
                value={(config.videoUrl as string) || ""}
                onChange={(e) => updateConfig("videoUrl", e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </>
        );
      case "html":
        return (
          <div className="space-y-2">
            <Label htmlFor="nested-html">Custom HTML</Label>
            <Textarea
              id="nested-html"
              value={(config.html as string) || ""}
              onChange={(e) => updateConfig("html", e.target.value)}
              placeholder="<div>Your custom HTML here</div>"
              rows={8}
              className="font-mono text-sm"
            />
          </div>
        );
      default:
        return (
          <p className="text-muted-foreground">
            Basic configuration for this section type. Edit the heading or content as needed.
          </p>
        );
    }
  };

  return (
    <div className="space-y-4">
      {renderNestedFields()}
      <div className="space-y-2">
        <Label htmlFor="nested-bg-color">Background Color (optional)</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            id="nested-bg-color"
            value={styles.backgroundColor || "#ffffff"}
            onChange={(e) => updateStyles("backgroundColor", e.target.value)}
            className="h-9 w-12 rounded border cursor-pointer"
          />
          <Input
            value={styles.backgroundColor || ""}
            onChange={(e) => updateStyles("backgroundColor", e.target.value || undefined)}
            placeholder="Default"
            className="flex-1 font-mono text-sm"
          />
        </div>
      </div>
    </div>
  );
}

function SectionEditor({ section, onSave, onCancel, onConfigChange, eventId, customFonts = [] }: SectionEditorProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<Record<string, unknown>>(section.config);
  const [styles, setStyles] = useState<SectionStyles>(section.styles || {});
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  const supportsAiGeneration = AI_SUPPORTED_SECTIONS.includes(section.type);

  const handleAiGenerate = async () => {
    if (!eventId) {
      toast({ title: "Error", description: "Please select an event first", variant: "destructive" });
      return;
    }

    setIsAiGenerating(true);
    try {
      const response = await apiRequest("POST", "/api/ai/generate-content", {
        sectionType: section.type,
        eventId,
        customPrompt: customPrompt || undefined,
      });
      
      const generatedContent = await response.json();
      
      // Merge generated content with existing config
      const newConfig = { ...config };
      
      switch (section.type) {
        case "hero":
          if (generatedContent.title) newConfig.title = generatedContent.title;
          if (generatedContent.subtitle) newConfig.subtitle = generatedContent.subtitle;
          if (generatedContent.buttonText) newConfig.buttonText = generatedContent.buttonText;
          break;
        case "text":
          if (generatedContent.heading) newConfig.heading = generatedContent.heading;
          if (generatedContent.content) newConfig.content = generatedContent.content;
          break;
        case "cta":
          if (generatedContent.heading) newConfig.heading = generatedContent.heading;
          if (generatedContent.description) newConfig.description = generatedContent.description;
          if (generatedContent.buttonText) newConfig.buttonText = generatedContent.buttonText;
          break;
        case "features":
          if (generatedContent.heading) newConfig.heading = generatedContent.heading;
          if (generatedContent.features) newConfig.features = generatedContent.features;
          break;
        case "faq":
          if (generatedContent.heading) newConfig.heading = generatedContent.heading;
          if (generatedContent.items) newConfig.items = generatedContent.items;
          break;
        case "testimonials":
          if (generatedContent.heading) newConfig.heading = generatedContent.heading;
          if (generatedContent.items) newConfig.items = generatedContent.items;
          break;
      }
      
      setConfig(newConfig);
      onConfigChange?.(newConfig, styles);
      setAiPromptOpen(false);
      setCustomPrompt("");
      
      const disclaimerMsg = section.type === "testimonials" 
        ? " Note: These are sample testimonials - replace with real ones." 
        : "";
      toast({ title: "Content generated", description: `AI content applied to ${section.type} section.${disclaimerMsg}` });
    } catch (error: any) {
      toast({ 
        title: "Generation failed", 
        description: error.message || "Failed to generate content", 
        variant: "destructive" 
      });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const updateConfig = (key: string, value: unknown) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onConfigChange?.(newConfig, styles);
  };

  const updateStyles = (key: keyof SectionStyles, value: string | boolean | undefined | VisibilityCondition) => {
    const newStyles = { ...styles, [key]: value };
    setStyles(newStyles);
    onConfigChange?.(config, newStyles);
  };

  const renderFields = () => {
    switch (section.type) {
      case "hero":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <div className="flex items-center gap-1">
                <Input
                  id="title"
                  value={(config.title as string) || ""}
                  onChange={(e) => updateConfig("title", e.target.value)}
                  placeholder="Enter hero title"
                  data-testid="input-hero-title"
                  className="flex-1"
                />
                <MergeTagPicker
                  categories={["event", "organization"]}
                  onInsert={(tag) => updateConfig("title", ((config.title as string) || "") + tag)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <div className="flex items-start gap-1">
                <Textarea
                  id="subtitle"
                  value={(config.subtitle as string) || ""}
                  onChange={(e) => updateConfig("subtitle", e.target.value)}
                  placeholder="Enter subtitle text"
                  data-testid="input-hero-subtitle"
                  className="flex-1"
                />
                <MergeTagPicker
                  categories={["event", "organization"]}
                  onInsert={(tag) => updateConfig("subtitle", ((config.subtitle as string) || "") + tag)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="buttonText">Button Text</Label>
              <div className="flex items-center gap-1">
                <Input
                  id="buttonText"
                  value={(config.buttonText as string) || ""}
                  onChange={(e) => updateConfig("buttonText", e.target.value)}
                  placeholder="Register Now"
                  data-testid="input-hero-button-text"
                  className="flex-1"
                />
                <MergeTagPicker
                  categories={["event", "organization"]}
                  onInsert={(tag) => updateConfig("buttonText", ((config.buttonText as string) || "") + tag)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="buttonLink">Button Link</Label>
              <Input
                id="buttonLink"
                value={(config.buttonLink as string) || ""}
                onChange={(e) => updateConfig("buttonLink", e.target.value)}
                placeholder="/register"
                data-testid="input-hero-button-link"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardBackgroundColor">Card Background Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="cardBackgroundColor"
                  value={(config.cardBackgroundColor as string) || "#f3f4f6"}
                  onChange={(e) => updateConfig("cardBackgroundColor", e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                  data-testid="input-hero-card-bg-color"
                />
                <Input
                  value={(config.cardBackgroundColor as string) || ""}
                  onChange={(e) => updateConfig("cardBackgroundColor", e.target.value || undefined)}
                  placeholder="Default (theme)"
                  className="flex-1 font-mono text-sm"
                  data-testid="input-hero-card-bg-color-text"
                />
              </div>
              <p className="text-xs text-muted-foreground">Leave empty to use theme card background</p>
            </div>
          </>
        );
      case "text":
        const textAlignOptions = [
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
        ];
        const headingSizeOptions = [
          { value: "lg", label: "Small (lg)" },
          { value: "xl", label: "Medium (xl)" },
          { value: "2xl", label: "Large (2xl)" },
          { value: "3xl", label: "Extra Large (3xl)" },
          { value: "4xl", label: "Huge (4xl)" },
        ];
        const bodySizeOptions = [
          { value: "sm", label: "Small" },
          { value: "base", label: "Normal" },
          { value: "lg", label: "Large" },
          { value: "xl", label: "Extra Large" },
        ];
        const headingWeightOptions = [
          { value: "normal", label: "Normal" },
          { value: "medium", label: "Medium" },
          { value: "semibold", label: "Semibold" },
          { value: "bold", label: "Bold" },
        ];
        const lineHeightOptions = [
          { value: "tight", label: "Tight" },
          { value: "normal", label: "Normal" },
          { value: "relaxed", label: "Relaxed" },
          { value: "loose", label: "Loose" },
        ];
        const maxWidthOptions = [
          { value: "none", label: "Full Width" },
          { value: "prose", label: "Prose (65ch)" },
          { value: "2xl", label: "Medium (672px)" },
          { value: "4xl", label: "Large (896px)" },
        ];
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="heading">Heading</Label>
              <div className="flex items-center gap-1">
                <Input
                  id="heading"
                  value={(config.heading as string) || ""}
                  onChange={(e) => updateConfig("heading", e.target.value)}
                  placeholder="Section heading"
                  data-testid="input-text-heading"
                  className="flex-1"
                />
                <MergeTagPicker
                  categories={["event", "organization"]}
                  onInsert={(tag) => updateConfig("heading", ((config.heading as string) || "") + tag)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <div className="flex items-start gap-1">
                <Textarea
                  id="content"
                  value={(config.content as string) || ""}
                  onChange={(e) => updateConfig("content", e.target.value)}
                  placeholder="Enter your text content"
                  rows={5}
                  data-testid="input-text-content"
                  className="flex-1"
                />
                <MergeTagPicker
                  categories={["event", "organization"]}
                  onInsert={(tag) => updateConfig("content", ((config.content as string) || "") + tag)}
                />
              </div>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="text-formatting">
                <AccordionTrigger data-testid="accordion-text-formatting">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Text Formatting
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Text Alignment</Label>
                      <Select
                        value={(config.alignment as string) || "left"}
                        onValueChange={(value) => updateConfig("alignment", value)}
                      >
                        <SelectTrigger data-testid="select-text-alignment">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {textAlignOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Content Max Width</Label>
                      <Select
                        value={(config.maxWidth as string) || "none"}
                        onValueChange={(value) => updateConfig("maxWidth", value)}
                      >
                        <SelectTrigger data-testid="select-text-max-width">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {maxWidthOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Line Height</Label>
                      <Select
                        value={(config.lineHeight as string) || "normal"}
                        onValueChange={(value) => updateConfig("lineHeight", value)}
                      >
                        <SelectTrigger data-testid="select-text-line-height">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {lineHeightOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="heading-styles">
                <AccordionTrigger data-testid="accordion-heading-styles">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Heading Styles
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Heading Font</Label>
                      <Select
                        value={(config.headingFont as string) || "theme"}
                        onValueChange={(value) => updateConfig("headingFont", value === "theme" ? "" : value)}
                      >
                        <SelectTrigger data-testid="select-heading-font">
                          <SelectValue placeholder="Use theme font" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="theme">Use Theme Font</SelectItem>
                          {customFonts.length > 0 && (
                            <>
                              <SelectItem value="__custom_header" disabled className="text-xs text-muted-foreground font-semibold">
                                Custom Fonts
                              </SelectItem>
                              {customFonts.map((font) => (
                                <SelectItem key={`custom-${font.id}`} value={font.name}>
                                  {font.displayName || font.name}
                                </SelectItem>
                              ))}
                              <SelectItem value="__google_header" disabled className="text-xs text-muted-foreground font-semibold">
                                Google Fonts
                              </SelectItem>
                            </>
                          )}
                          {GOOGLE_FONTS.map((font) => (
                            <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Heading Size</Label>
                      <Select
                        value={(config.headingSize as string) || "2xl"}
                        onValueChange={(value) => updateConfig("headingSize", value)}
                      >
                        <SelectTrigger data-testid="select-heading-size">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {headingSizeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Heading Weight</Label>
                      <Select
                        value={(config.headingWeight as string) || "semibold"}
                        onValueChange={(value) => updateConfig("headingWeight", value)}
                      >
                        <SelectTrigger data-testid="select-heading-weight">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {headingWeightOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Heading Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={(config.headingColor as string) || "#1f2937"}
                          onChange={(e) => updateConfig("headingColor", e.target.value)}
                          className="h-9 w-12 rounded border cursor-pointer"
                          data-testid="input-heading-color-picker"
                        />
                        <Input
                          value={(config.headingColor as string) || ""}
                          onChange={(e) => updateConfig("headingColor", e.target.value || "")}
                          placeholder="Use theme color"
                          className="flex-1 font-mono text-sm"
                          data-testid="input-heading-color"
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="body-styles">
                <AccordionTrigger data-testid="accordion-body-styles">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Body Text Styles
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Body Font</Label>
                      <Select
                        value={(config.bodyFont as string) || "theme"}
                        onValueChange={(value) => updateConfig("bodyFont", value === "theme" ? "" : value)}
                      >
                        <SelectTrigger data-testid="select-body-font">
                          <SelectValue placeholder="Use theme font" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="theme">Use Theme Font</SelectItem>
                          {customFonts.length > 0 && (
                            <>
                              <SelectItem value="__custom_header" disabled className="text-xs text-muted-foreground font-semibold">
                                Custom Fonts
                              </SelectItem>
                              {customFonts.map((font) => (
                                <SelectItem key={`custom-${font.id}`} value={font.name}>
                                  {font.displayName || font.name}
                                </SelectItem>
                              ))}
                              <SelectItem value="__google_header" disabled className="text-xs text-muted-foreground font-semibold">
                                Google Fonts
                              </SelectItem>
                            </>
                          )}
                          {GOOGLE_FONTS.map((font) => (
                            <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Body Text Size</Label>
                      <Select
                        value={(config.bodySize as string) || "base"}
                        onValueChange={(value) => updateConfig("bodySize", value)}
                      >
                        <SelectTrigger data-testid="select-body-size">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {bodySizeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Body Text Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={(config.bodyColor as string) || "#4b5563"}
                          onChange={(e) => updateConfig("bodyColor", e.target.value)}
                          className="h-9 w-12 rounded border cursor-pointer"
                          data-testid="input-body-color-picker"
                        />
                        <Input
                          value={(config.bodyColor as string) || ""}
                          onChange={(e) => updateConfig("bodyColor", e.target.value || "")}
                          placeholder="Use theme color"
                          className="flex-1 font-mono text-sm"
                          data-testid="input-body-color"
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        );
      case "cta":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="heading">Heading</Label>
              <div className="flex items-center gap-1">
                <Input
                  id="heading"
                  value={(config.heading as string) || ""}
                  onChange={(e) => updateConfig("heading", e.target.value)}
                  placeholder="Ready to Join?"
                  data-testid="input-cta-heading"
                  className="flex-1"
                />
                <MergeTagPicker
                  categories={["event", "organization"]}
                  onInsert={(tag) => updateConfig("heading", ((config.heading as string) || "") + tag)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <div className="flex items-start gap-1">
                <Textarea
                  id="description"
                  value={(config.description as string) || ""}
                  onChange={(e) => updateConfig("description", e.target.value)}
                  placeholder="Brief description"
                  data-testid="input-cta-description"
                  className="flex-1"
                />
                <MergeTagPicker
                  categories={["event", "organization"]}
                  onInsert={(tag) => updateConfig("description", ((config.description as string) || "") + tag)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="buttonText">Button Text</Label>
              <div className="flex items-center gap-1">
                <Input
                  id="buttonText"
                  value={(config.buttonText as string) || ""}
                  onChange={(e) => updateConfig("buttonText", e.target.value)}
                  placeholder="Get Started"
                  data-testid="input-cta-button-text"
                  className="flex-1"
                />
                <MergeTagPicker
                  categories={["event", "organization"]}
                  onInsert={(tag) => updateConfig("buttonText", ((config.buttonText as string) || "") + tag)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="buttonLink">Button Link</Label>
              <Input
                id="buttonLink"
                value={(config.buttonLink as string) || ""}
                onChange={(e) => updateConfig("buttonLink", e.target.value)}
                placeholder="/register"
                data-testid="input-cta-button-link"
              />
            </div>
          </>
        );
      case "features":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="heading">Section Heading</Label>
              <Input
                id="heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="What's Included"
                data-testid="input-features-heading"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Feature items can be configured in advanced settings
            </p>
          </>
        );
      case "countdown":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="heading">Section Heading</Label>
              <Input
                id="heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="Event Starts In"
                data-testid="input-countdown-heading"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useEventDate"
                checked={(config.useEventDate as boolean) ?? true}
                onChange={(e) => updateConfig("useEventDate", e.target.checked)}
                className="h-4 w-4"
                data-testid="checkbox-use-event-date"
              />
              <Label htmlFor="useEventDate">Use event start date</Label>
            </div>
            {!(config.useEventDate as boolean) && (
              <div className="space-y-2">
                <Label htmlFor="customDate">Custom Target Date</Label>
                <Input
                  id="customDate"
                  type="datetime-local"
                  value={(config.customDate as string) || ""}
                  onChange={(e) => updateConfig("customDate", e.target.value)}
                  data-testid="input-countdown-custom-date"
                />
              </div>
            )}
          </>
        );
      case "speakers":
        const speakersDataSource = (config.dataSource as string) || "dynamic";
        const speakersDynamicFilters = (config.dynamicFilters as { limit?: number; showFeaturedOnly?: boolean }) || {};
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="heading">Section Heading</Label>
              <Input
                id="heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="Meet Our Speakers"
                data-testid="input-speakers-heading"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showBio"
                checked={(config.showBio as boolean) ?? true}
                onChange={(e) => updateConfig("showBio", e.target.checked)}
                className="h-4 w-4"
                data-testid="checkbox-show-bio"
              />
              <Label htmlFor="showBio">Show speaker bios</Label>
            </div>
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select
                value={speakersDataSource}
                onValueChange={(value) => updateConfig("dataSource", value)}
              >
                <SelectTrigger data-testid="select-speakers-data-source">
                  <SelectValue placeholder="Select data source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dynamic">Dynamic (from database)</SelectItem>
                  <SelectItem value="manual">Manual (static config)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {speakersDataSource === "dynamic" && (
              <div className="space-y-3 p-3 border rounded-md">
                <Label className="text-sm font-medium">Dynamic Filters</Label>
                <div className="space-y-2">
                  <Label htmlFor="speakersLimit">Limit (0 = no limit)</Label>
                  <Input
                    id="speakersLimit"
                    type="number"
                    min={0}
                    value={speakersDynamicFilters.limit || 0}
                    onChange={(e) => updateConfig("dynamicFilters", { ...speakersDynamicFilters, limit: parseInt(e.target.value) || 0 })}
                    data-testid="input-speakers-limit"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showFeaturedOnly"
                    checked={speakersDynamicFilters.showFeaturedOnly ?? false}
                    onChange={(e) => updateConfig("dynamicFilters", { ...speakersDynamicFilters, showFeaturedOnly: e.target.checked })}
                    className="h-4 w-4"
                    data-testid="checkbox-speakers-featured-only"
                  />
                  <Label htmlFor="showFeaturedOnly">Show featured speakers only</Label>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {speakersDataSource === "dynamic" ? "Speakers are automatically pulled from event data" : "Configure speakers manually in the database"}
            </p>
          </>
        );
      case "agenda":
        const agendaDataSource = (config.dataSource as string) || "dynamic";
        const agendaDynamicFilters = (config.dynamicFilters as { limit?: number; filterByTrack?: string; filterByDay?: string }) || {};
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="heading">Section Heading</Label>
              <Input
                id="heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="Event Schedule"
                data-testid="input-agenda-heading"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showRoom"
                checked={(config.showRoom as boolean) ?? true}
                onChange={(e) => updateConfig("showRoom", e.target.checked)}
                className="h-4 w-4"
                data-testid="checkbox-show-room"
              />
              <Label htmlFor="showRoom">Show room/location</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showTrack"
                checked={(config.showTrack as boolean) ?? true}
                onChange={(e) => updateConfig("showTrack", e.target.checked)}
                className="h-4 w-4"
                data-testid="checkbox-show-track"
              />
              <Label htmlFor="showTrack">Show track badges</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tabsByTrack"
                checked={(config.tabsByTrack as boolean) ?? false}
                onChange={(e) => updateConfig("tabsByTrack", e.target.checked)}
                className="h-4 w-4"
                data-testid="checkbox-tabs-by-track"
              />
              <Label htmlFor="tabsByTrack">Show tabs by content pillar/track</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tabsByDay"
                checked={(config.tabsByDay as boolean) ?? false}
                onChange={(e) => updateConfig("tabsByDay", e.target.checked)}
                className="h-4 w-4"
                data-testid="checkbox-tabs-by-day"
              />
              <Label htmlFor="tabsByDay">Show tabs by day</Label>
            </div>
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select
                value={agendaDataSource}
                onValueChange={(value) => updateConfig("dataSource", value)}
              >
                <SelectTrigger data-testid="select-agenda-data-source">
                  <SelectValue placeholder="Select data source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dynamic">Dynamic (from database)</SelectItem>
                  <SelectItem value="manual">Manual (static config)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {agendaDataSource === "dynamic" && (
              <div className="space-y-3 p-3 border rounded-md">
                <Label className="text-sm font-medium">Dynamic Filters</Label>
                <div className="space-y-2">
                  <Label htmlFor="agendaLimit">Limit (0 = no limit)</Label>
                  <Input
                    id="agendaLimit"
                    type="number"
                    min={0}
                    value={agendaDynamicFilters.limit || 0}
                    onChange={(e) => updateConfig("dynamicFilters", { ...agendaDynamicFilters, limit: parseInt(e.target.value) || 0 })}
                    data-testid="input-agenda-limit"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filterByTrack">Filter by Track</Label>
                  <Input
                    id="filterByTrack"
                    value={agendaDynamicFilters.filterByTrack || ""}
                    onChange={(e) => updateConfig("dynamicFilters", { ...agendaDynamicFilters, filterByTrack: e.target.value })}
                    placeholder="Leave empty for all tracks"
                    data-testid="input-agenda-filter-track"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filterByDay">Filter by Day</Label>
                  <Input
                    id="filterByDay"
                    value={agendaDynamicFilters.filterByDay || ""}
                    onChange={(e) => updateConfig("dynamicFilters", { ...agendaDynamicFilters, filterByDay: e.target.value })}
                    placeholder="e.g., Day 1, Monday"
                    data-testid="input-agenda-filter-day"
                  />
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {agendaDataSource === "dynamic" ? "Sessions are automatically pulled from event data" : "Configure sessions manually in the database"}
            </p>
          </>
        );
      case "faq":
        const faqItems = (config.items as Array<{ question: string; answer: string }>) || [];
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="heading">Section Heading</Label>
              <Input
                id="heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="Frequently Asked Questions"
                data-testid="input-faq-heading"
              />
            </div>
            <div className="space-y-3">
              <Label>FAQ Items</Label>
              {faqItems.map((item, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-md">
                  <Input
                    placeholder="Question"
                    value={item.question}
                    onChange={(e) => {
                      const newItems = [...faqItems];
                      newItems[index] = { ...item, question: e.target.value };
                      updateConfig("items", newItems);
                    }}
                    data-testid={`input-faq-question-${index}`}
                  />
                  <Textarea
                    placeholder="Answer"
                    value={item.answer}
                    onChange={(e) => {
                      const newItems = [...faqItems];
                      newItems[index] = { ...item, answer: e.target.value };
                      updateConfig("items", newItems);
                    }}
                    data-testid={`input-faq-answer-${index}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newItems = faqItems.filter((_, i) => i !== index);
                      updateConfig("items", newItems);
                    }}
                    data-testid={`button-remove-faq-${index}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => updateConfig("items", [...faqItems, { question: "", answer: "" }])}
                data-testid="button-add-faq"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </>
        );
      case "testimonials":
        const testimonialItems = (config.items as Array<{ quote: string; author: string; role: string }>) || [];
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="heading">Section Heading</Label>
              <Input
                id="heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="What Attendees Say"
                data-testid="input-testimonials-heading"
              />
            </div>
            <div className="space-y-3">
              <Label>Testimonials</Label>
              {testimonialItems.map((item, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-md">
                  <Textarea
                    placeholder="Quote"
                    value={item.quote}
                    onChange={(e) => {
                      const newItems = [...testimonialItems];
                      newItems[index] = { ...item, quote: e.target.value };
                      updateConfig("items", newItems);
                    }}
                    data-testid={`input-testimonial-quote-${index}`}
                  />
                  <Input
                    placeholder="Author name"
                    value={item.author}
                    onChange={(e) => {
                      const newItems = [...testimonialItems];
                      newItems[index] = { ...item, author: e.target.value };
                      updateConfig("items", newItems);
                    }}
                    data-testid={`input-testimonial-author-${index}`}
                  />
                  <Input
                    placeholder="Role/Company"
                    value={item.role}
                    onChange={(e) => {
                      const newItems = [...testimonialItems];
                      newItems[index] = { ...item, role: e.target.value };
                      updateConfig("items", newItems);
                    }}
                    data-testid={`input-testimonial-role-${index}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newItems = testimonialItems.filter((_, i) => i !== index);
                      updateConfig("items", newItems);
                    }}
                    data-testid={`button-remove-testimonial-${index}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => updateConfig("items", [...testimonialItems, { quote: "", author: "", role: "" }])}
                data-testid="button-add-testimonial"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Testimonial
              </Button>
            </div>
          </>
        );
      case "gallery":
        const galleryImages = (config.images as Array<{ url: string; caption: string }>) || [];
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="heading">Section Heading</Label>
              <Input
                id="heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="Event Gallery"
                data-testid="input-gallery-heading"
              />
            </div>
            <div className="space-y-3">
              <Label>Gallery Images</Label>
              {galleryImages.map((item, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-md">
                  <Input
                    placeholder="Image URL"
                    value={item.url}
                    onChange={(e) => {
                      const newImages = [...galleryImages];
                      newImages[index] = { ...item, url: e.target.value };
                      updateConfig("images", newImages);
                    }}
                    data-testid={`input-gallery-url-${index}`}
                  />
                  <Input
                    placeholder="Caption (optional)"
                    value={item.caption}
                    onChange={(e) => {
                      const newImages = [...galleryImages];
                      newImages[index] = { ...item, caption: e.target.value };
                      updateConfig("images", newImages);
                    }}
                    data-testid={`input-gallery-caption-${index}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newImages = galleryImages.filter((_, i) => i !== index);
                      updateConfig("images", newImages);
                    }}
                    data-testid={`button-remove-image-${index}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => updateConfig("images", [...galleryImages, { url: "", caption: "" }])}
                data-testid="button-add-image"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Image
              </Button>
            </div>
          </>
        );
      case "html":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="htmlContent">HTML Code</Label>
              <div className="flex items-start gap-1">
                <Textarea
                  id="htmlContent"
                  value={(config.content as string) || ""}
                  onChange={(e) => updateConfig("content", e.target.value)}
                  placeholder="<div>Your custom HTML here...</div>"
                  rows={10}
                  className="font-mono text-sm flex-1"
                  data-testid="input-html-content"
                />
                <MergeTagPicker
                  categories={["event", "organization"]}
                  onInsert={(tag) => updateConfig("content", ((config.content as string) || "") + tag)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter raw HTML code. Use properties to insert dynamic content.
              </p>
            </div>
          </>
        );
      case "sponsors":
        const sponsorItems = (config.sponsors as Array<{ name: string; logoUrl: string; tier: string; url: string }>) || [];
        const sponsorsDataSource = (config.dataSource as string) || "dynamic";
        const sponsorsDynamicFilters = (config.dynamicFilters as { limit?: number; filterByTier?: string; sortOrder?: string }) || {};
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="heading">Section Heading</Label>
              <Input
                id="heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="Our Sponsors"
                data-testid="input-sponsors-heading"
              />
            </div>
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select
                value={sponsorsDataSource}
                onValueChange={(value) => updateConfig("dataSource", value)}
              >
                <SelectTrigger data-testid="select-sponsors-data-source">
                  <SelectValue placeholder="Select data source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dynamic">Dynamic (from database)</SelectItem>
                  <SelectItem value="manual">Manual (static config)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {sponsorsDataSource === "dynamic" && (
              <div className="space-y-3 p-3 border rounded-md">
                <Label className="text-sm font-medium">Dynamic Filters</Label>
                <div className="space-y-2">
                  <Label htmlFor="sponsorsLimit">Limit (0 = no limit)</Label>
                  <Input
                    id="sponsorsLimit"
                    type="number"
                    min={0}
                    value={sponsorsDynamicFilters.limit || 0}
                    onChange={(e) => updateConfig("dynamicFilters", { ...sponsorsDynamicFilters, limit: parseInt(e.target.value) || 0 })}
                    data-testid="input-sponsors-limit"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filterByTier">Filter by Tier</Label>
                  <Select
                    value={sponsorsDynamicFilters.filterByTier || ""}
                    onValueChange={(value) => updateConfig("dynamicFilters", { ...sponsorsDynamicFilters, filterByTier: value === "all" ? "" : value })}
                  >
                    <SelectTrigger data-testid="select-sponsors-filter-tier">
                      <SelectValue placeholder="All tiers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="bronze">Bronze</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Select
                    value={sponsorsDynamicFilters.sortOrder || "tier"}
                    onValueChange={(value) => updateConfig("dynamicFilters", { ...sponsorsDynamicFilters, sortOrder: value })}
                  >
                    <SelectTrigger data-testid="select-sponsors-sort-order">
                      <SelectValue placeholder="Select sort order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tier">By Tier (Gold first)</SelectItem>
                      <SelectItem value="name">By Name (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">
                  Sponsors are automatically pulled from event data
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Card Color Mode</Label>
              <Select
                value={(config.cardColorMode as string) || "tier"}
                onValueChange={(value) => updateConfig("cardColorMode", value)}
              >
                <SelectTrigger data-testid="select-sponsors-card-color-mode">
                  <SelectValue placeholder="Select color mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tier">Tier Colors (Gold/Silver/Bronze)</SelectItem>
                  <SelectItem value="theme">Theme Colors (Use card background)</SelectItem>
                  <SelectItem value="custom">Custom Colors</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose whether sponsor cards use tier-based colors, theme settings, or custom colors.
              </p>
            </div>
            {(config.cardColorMode as string) === "custom" && (
              <div className="space-y-3 p-3 border rounded-md">
                <Label className="text-sm font-medium">Custom Card Colors</Label>
                <div className="space-y-2">
                  <Label htmlFor="cardBackgroundColor">Card Background</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={(config.cardBackgroundColor as string) || "#f9fafb"}
                      onChange={(e) => updateConfig("cardBackgroundColor", e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                      data-testid="input-sponsors-card-bg-color"
                    />
                    <Input
                      value={(config.cardBackgroundColor as string) || ""}
                      onChange={(e) => updateConfig("cardBackgroundColor", e.target.value || undefined)}
                      placeholder="#f9fafb"
                      className="flex-1 font-mono text-sm"
                      data-testid="input-sponsors-card-bg-text"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardTextColor">Card Text Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={(config.cardTextColor as string) || "#1f2937"}
                      onChange={(e) => updateConfig("cardTextColor", e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                      data-testid="input-sponsors-card-text-color"
                    />
                    <Input
                      value={(config.cardTextColor as string) || ""}
                      onChange={(e) => updateConfig("cardTextColor", e.target.value || undefined)}
                      placeholder="#1f2937"
                      className="flex-1 font-mono text-sm"
                      data-testid="input-sponsors-card-text-text"
                    />
                  </div>
                </div>
              </div>
            )}
            {sponsorsDataSource === "manual" && (
              <div className="space-y-3">
                <Label>Sponsors</Label>
                {sponsorItems.map((item, index) => (
                  <div key={index} className="space-y-2 p-3 border rounded-md">
                    <Input
                      placeholder="Sponsor name"
                      value={item.name}
                      onChange={(e) => {
                        const newItems = [...sponsorItems];
                        newItems[index] = { ...item, name: e.target.value };
                        updateConfig("sponsors", newItems);
                      }}
                      data-testid={`input-sponsor-name-${index}`}
                    />
                    <Input
                      placeholder="Logo URL"
                      value={item.logoUrl}
                      onChange={(e) => {
                        const newItems = [...sponsorItems];
                        newItems[index] = { ...item, logoUrl: e.target.value };
                        updateConfig("sponsors", newItems);
                      }}
                      data-testid={`input-sponsor-logo-${index}`}
                    />
                    <Select
                      value={item.tier || "gold"}
                      onValueChange={(value) => {
                        const newItems = [...sponsorItems];
                        newItems[index] = { ...item, tier: value };
                        updateConfig("sponsors", newItems);
                      }}
                    >
                      <SelectTrigger data-testid={`select-sponsor-tier-${index}`}>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gold">Gold</SelectItem>
                        <SelectItem value="silver">Silver</SelectItem>
                        <SelectItem value="bronze">Bronze</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Website URL (optional)"
                      value={item.url || ""}
                      onChange={(e) => {
                        const newItems = [...sponsorItems];
                        newItems[index] = { ...item, url: e.target.value };
                        updateConfig("sponsors", newItems);
                      }}
                      data-testid={`input-sponsor-url-${index}`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newItems = sponsorItems.filter((_, i) => i !== index);
                        updateConfig("sponsors", newItems);
                      }}
                      data-testid={`button-remove-sponsor-${index}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => updateConfig("sponsors", [...sponsorItems, { name: "", logoUrl: "", tier: "gold", url: "" }])}
                  data-testid="button-add-sponsor"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sponsor
                </Button>
              </div>
            )}
          </>
        );
      case "map":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="heading">Section Heading</Label>
              <Input
                id="heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="Event Location"
                data-testid="input-map-heading"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useEventAddress"
                checked={(config.useEventAddress as boolean) ?? true}
                onChange={(e) => updateConfig("useEventAddress", e.target.checked)}
                className="h-4 w-4"
                data-testid="checkbox-use-event-address"
              />
              <Label htmlFor="useEventAddress">Use event address for map</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="embedUrl">Google Maps Embed URL (optional)</Label>
              <Input
                id="embedUrl"
                value={(config.embedUrl as string) || ""}
                onChange={(e) => updateConfig("embedUrl", e.target.value)}
                placeholder="https://www.google.com/maps/embed?..."
                data-testid="input-map-embed-url"
              />
              <p className="text-xs text-muted-foreground">
                Paste the embed URL from Google Maps. Leave blank to auto-generate from event address.
              </p>
            </div>
          </>
        );
      case "video":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="heading">Section Heading (optional)</Label>
              <Input
                id="heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="Watch Our Promo Video"
                data-testid="input-video-heading"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL</Label>
              <Input
                id="videoUrl"
                value={(config.videoUrl as string) || ""}
                onChange={(e) => updateConfig("videoUrl", e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                data-testid="input-video-url"
              />
              <p className="text-xs text-muted-foreground">
                Paste a YouTube or Vimeo URL. The video will be embedded automatically.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoplay"
                checked={(config.autoplay as boolean) ?? false}
                onChange={(e) => updateConfig("autoplay", e.target.checked)}
                className="h-4 w-4"
                data-testid="checkbox-video-autoplay"
              />
              <Label htmlFor="autoplay">Autoplay (muted)</Label>
            </div>
          </>
        );
      case "navigation":
        const navLinks = (config.links as Array<{ label: string; url: string }>) || [];
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                value={(config.logo as string) || ""}
                onChange={(e) => updateConfig("logo", e.target.value)}
                placeholder="https://example.com/logo.png"
                data-testid="input-nav-logo"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="showEventTitle"
                checked={(config.showEventTitle as boolean) !== false}
                onCheckedChange={(checked) => updateConfig("showEventTitle", checked)}
                data-testid="switch-show-event-title"
              />
              <Label htmlFor="showEventTitle">Show Event Title</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="sticky"
                checked={(config.sticky as boolean) === true}
                onCheckedChange={(checked) => updateConfig("sticky", checked)}
                data-testid="switch-sticky"
              />
              <Label htmlFor="sticky">Sticky Navigation</Label>
            </div>
            <div className="space-y-2">
              <Label>Style</Label>
              <Select
                value={(config.style as string) || "light"}
                onValueChange={(value) => updateConfig("style", value)}
              >
                <SelectTrigger data-testid="select-nav-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="transparent">Transparent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Navigation Links</Label>
              {navLinks.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Label"
                    value={item.label}
                    onChange={(e) => {
                      const newItems = [...navLinks];
                      newItems[index] = { ...item, label: e.target.value };
                      updateConfig("links", newItems);
                    }}
                    data-testid={`input-nav-link-label-${index}`}
                  />
                  <Input
                    placeholder="URL"
                    value={item.url}
                    onChange={(e) => {
                      const newItems = [...navLinks];
                      newItems[index] = { ...item, url: e.target.value };
                      updateConfig("links", newItems);
                    }}
                    data-testid={`input-nav-link-url-${index}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newItems = navLinks.filter((_, i) => i !== index);
                      updateConfig("links", newItems);
                    }}
                    data-testid={`button-remove-nav-link-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => updateConfig("links", [...navLinks, { label: "New Link", url: "" }])}
                data-testid="button-add-nav-link"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </div>
          </>
        );
      case "footer":
        const footerLinks = (config.links as Array<{ label: string; url: string }>) || [];
        return (
          <>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showContactInfo"
                checked={(config.showContactInfo as boolean) ?? true}
                onChange={(e) => updateConfig("showContactInfo", e.target.checked)}
                className="h-4 w-4"
                data-testid="checkbox-show-contact-info"
              />
              <Label htmlFor="showContactInfo">Show contact information</Label>
            </div>
            {(config.showContactInfo as boolean) !== false && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={(config.email as string) || ""}
                    onChange={(e) => updateConfig("email", e.target.value)}
                    placeholder="contact@example.com"
                    data-testid="input-footer-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={(config.phone as string) || ""}
                    onChange={(e) => updateConfig("phone", e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    data-testid="input-footer-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={(config.address as string) || ""}
                    onChange={(e) => updateConfig("address", e.target.value)}
                    placeholder="123 Main St, City, State 12345"
                    data-testid="input-footer-address"
                  />
                </div>
              </>
            )}
            <div className="space-y-3">
              <Label>Footer Links</Label>
              {footerLinks.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Label"
                    value={item.label}
                    onChange={(e) => {
                      const newItems = [...footerLinks];
                      newItems[index] = { ...item, label: e.target.value };
                      updateConfig("links", newItems);
                    }}
                    data-testid={`input-footer-link-label-${index}`}
                  />
                  <Input
                    placeholder="URL"
                    value={item.url}
                    onChange={(e) => {
                      const newItems = [...footerLinks];
                      newItems[index] = { ...item, url: e.target.value };
                      updateConfig("links", newItems);
                    }}
                    data-testid={`input-footer-link-url-${index}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newItems = footerLinks.filter((_, i) => i !== index);
                      updateConfig("links", newItems);
                    }}
                    data-testid={`button-remove-footer-link-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => updateConfig("links", [...footerLinks, { label: "", url: "" }])}
                data-testid="button-add-footer-link"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showSocialIcons"
                checked={(config.showSocialIcons as boolean) ?? true}
                onChange={(e) => updateConfig("showSocialIcons", e.target.checked)}
                className="h-4 w-4"
                data-testid="checkbox-show-social-icons"
              />
              <Label htmlFor="showSocialIcons">Show social media icons</Label>
            </div>
            {(config.showSocialIcons as boolean) !== false && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Facebook URL"
                  value={(config.facebookUrl as string) || ""}
                  onChange={(e) => updateConfig("facebookUrl", e.target.value)}
                  data-testid="input-footer-facebook"
                />
                <Input
                  placeholder="Twitter/X URL"
                  value={(config.twitterUrl as string) || ""}
                  onChange={(e) => updateConfig("twitterUrl", e.target.value)}
                  data-testid="input-footer-twitter"
                />
                <Input
                  placeholder="LinkedIn URL"
                  value={(config.linkedinUrl as string) || ""}
                  onChange={(e) => updateConfig("linkedinUrl", e.target.value)}
                  data-testid="input-footer-linkedin"
                />
                <Input
                  placeholder="Instagram URL"
                  value={(config.instagramUrl as string) || ""}
                  onChange={(e) => updateConfig("instagramUrl", e.target.value)}
                  data-testid="input-footer-instagram"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="copyright">Copyright Text</Label>
              <Input
                id="copyright"
                value={(config.copyright as string) || ""}
                onChange={(e) => updateConfig("copyright", e.target.value)}
                placeholder="© 2024 Your Company. All rights reserved."
                data-testid="input-footer-copyright"
              />
            </div>
          </>
        );
      case "columns":
        const simpleColumns = (config.columns as Array<{ heading: string; content: string }>) || [];
        const columnCount = (config.columnCount as number) || 2;
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="columns-heading">Section Heading</Label>
              <Input
                id="columns-heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="Optional section heading"
                data-testid="input-columns-heading"
              />
            </div>
            <div className="space-y-2">
              <Label>Number of Columns</Label>
              <Select
                value={String(columnCount)}
                onValueChange={(value) => {
                  const newCount = parseInt(value);
                  const currentColumns = [...simpleColumns];
                  while (currentColumns.length < newCount) {
                    currentColumns.push({ heading: `Column ${currentColumns.length + 1}`, content: "Add your content here" });
                  }
                  updateConfig("columnCount", newCount);
                  updateConfig("columns", currentColumns.slice(0, newCount));
                }}
              >
                <SelectTrigger data-testid="select-column-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <Label>Column Content</Label>
              {simpleColumns.slice(0, columnCount).map((col, index) => (
                <Card key={index} className="p-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Column {index + 1}</span>
                    </div>
                    <Input
                      placeholder="Column heading"
                      value={col.heading}
                      onChange={(e) => {
                        const newCols = [...simpleColumns];
                        newCols[index] = { ...col, heading: e.target.value };
                        updateConfig("columns", newCols);
                      }}
                      data-testid={`input-column-heading-${index}`}
                    />
                    <Textarea
                      placeholder="Column content..."
                      value={col.content}
                      onChange={(e) => {
                        const newCols = [...simpleColumns];
                        newCols[index] = { ...col, content: e.target.value };
                        updateConfig("columns", newCols);
                      }}
                      rows={3}
                      data-testid={`textarea-column-content-${index}`}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </>
        );
      case "columns-flex":
        const flexColumns = (config.columns as Array<{ icon: string; heading: string; content: string; imageUrl: string; buttonText: string; buttonLink: string }>) || [];
        const flexColumnCount = (config.columnCount as number) || 3;
        const iconOptions = ["star", "zap", "heart", "check", "award", "target", "users", "calendar", "mail", "phone", "globe", "map-pin"];
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="flex-columns-heading">Section Heading</Label>
              <Input
                id="flex-columns-heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="Optional section heading"
                data-testid="input-flex-columns-heading"
              />
            </div>
            <div className="space-y-2">
              <Label>Number of Columns</Label>
              <Select
                value={String(flexColumnCount)}
                onValueChange={(value) => {
                  const newCount = parseInt(value);
                  const currentColumns = [...flexColumns];
                  while (currentColumns.length < newCount) {
                    currentColumns.push({ icon: "star", heading: `Feature ${currentColumns.length + 1}`, content: "Description here", imageUrl: "", buttonText: "", buttonLink: "" });
                  }
                  updateConfig("columnCount", newCount);
                  updateConfig("columns", currentColumns.slice(0, newCount));
                }}
              >
                <SelectTrigger data-testid="select-flex-column-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <Label>Column Content</Label>
              {flexColumns.slice(0, flexColumnCount).map((col, index) => (
                <Card key={index} className="p-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Column {index + 1}</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Icon</Label>
                      <Select
                        value={col.icon || "star"}
                        onValueChange={(value) => {
                          const newCols = [...flexColumns];
                          newCols[index] = { ...col, icon: value };
                          updateConfig("columns", newCols);
                        }}
                      >
                        <SelectTrigger data-testid={`select-column-icon-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {iconOptions.map((icon) => (
                            <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      placeholder="Heading"
                      value={col.heading}
                      onChange={(e) => {
                        const newCols = [...flexColumns];
                        newCols[index] = { ...col, heading: e.target.value };
                        updateConfig("columns", newCols);
                      }}
                      data-testid={`input-flex-column-heading-${index}`}
                    />
                    <Textarea
                      placeholder="Description..."
                      value={col.content}
                      onChange={(e) => {
                        const newCols = [...flexColumns];
                        newCols[index] = { ...col, content: e.target.value };
                        updateConfig("columns", newCols);
                      }}
                      rows={2}
                      data-testid={`textarea-flex-column-content-${index}`}
                    />
                    <Input
                      placeholder="Image URL (optional)"
                      value={col.imageUrl}
                      onChange={(e) => {
                        const newCols = [...flexColumns];
                        newCols[index] = { ...col, imageUrl: e.target.value };
                        updateConfig("columns", newCols);
                      }}
                      data-testid={`input-flex-column-image-${index}`}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Button text"
                        value={col.buttonText}
                        onChange={(e) => {
                          const newCols = [...flexColumns];
                          newCols[index] = { ...col, buttonText: e.target.value };
                          updateConfig("columns", newCols);
                        }}
                        data-testid={`input-flex-column-button-text-${index}`}
                      />
                      <Input
                        placeholder="Button link"
                        value={col.buttonLink}
                        onChange={(e) => {
                          const newCols = [...flexColumns];
                          newCols[index] = { ...col, buttonLink: e.target.value };
                          updateConfig("columns", newCols);
                        }}
                        data-testid={`input-flex-column-button-link-${index}`}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        );
      case "layout-columns":
        const layoutColCount = (config.columnCount as number) || 2;
        const layoutColumns = (config.columns as Array<{ sections: Section[] }>) || [];
        const layoutWidths = (config.columnWidths as string) || "equal";
        const layoutGap = (config.gap as string) || "md";
        const nestableSectionTypes = SECTION_TYPES.filter(s => s.type !== "layout-columns");
        
        const addNestedSection = (colIndex: number, sectionType: SectionType) => {
          const newSection: Section = {
            id: crypto.randomUUID(),
            type: sectionType,
            config: getDefaultConfig(sectionType),
            styles: {}
          };
          const newColumns = [...layoutColumns];
          if (!newColumns[colIndex]) {
            newColumns[colIndex] = { sections: [] };
          }
          newColumns[colIndex] = {
            ...newColumns[colIndex],
            sections: [...(newColumns[colIndex].sections || []), newSection]
          };
          updateConfig("columns", newColumns);
        };
        
        const removeNestedSection = (colIndex: number, sectionIndex: number) => {
          const newColumns = [...layoutColumns];
          newColumns[colIndex] = {
            ...newColumns[colIndex],
            sections: newColumns[colIndex].sections.filter((_, i) => i !== sectionIndex)
          };
          updateConfig("columns", newColumns);
        };
        
        const updateNestedSection = (colIndex: number, sectionIndex: number, newConfig: Record<string, unknown>, newStyles: SectionStyles) => {
          const newColumns = [...layoutColumns];
          const updatedSection = {
            ...newColumns[colIndex].sections[sectionIndex],
            config: newConfig,
            styles: newStyles
          };
          newColumns[colIndex] = {
            ...newColumns[colIndex],
            sections: newColumns[colIndex].sections.map((s, i) => i === sectionIndex ? updatedSection : s)
          };
          updateConfig("columns", newColumns);
        };
        
        const getNestedSectionLabel = (type: SectionType) => {
          const sectionType = SECTION_TYPES.find((s) => s.type === type);
          return sectionType?.label || type;
        };
        
        const getNestedSectionIcon = (type: SectionType) => {
          const sectionType = SECTION_TYPES.find((s) => s.type === type);
          return sectionType?.icon || Layout;
        };
        
        const widthOptions = [
          { value: "equal", label: "Equal widths" },
          { value: "1-2", label: "1:2 ratio" },
          { value: "2-1", label: "2:1 ratio" },
          { value: "1-2-1", label: "1:2:1 ratio" },
          { value: "2-1-1", label: "2:1:1 ratio" },
          { value: "1-1-2", label: "1:1:2 ratio" },
        ];
        
        const gapOptions = [
          { value: "none", label: "None" },
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
        ];
        
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="layout-columns-heading">Section Heading (optional)</Label>
              <Input
                id="layout-columns-heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="Optional section heading"
                data-testid="input-layout-columns-heading"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number of Columns</Label>
                <Select
                  value={String(layoutColCount)}
                  onValueChange={(value) => {
                    const newCount = parseInt(value);
                    const currentColumns = [...layoutColumns];
                    while (currentColumns.length < newCount) {
                      currentColumns.push({ sections: [] });
                    }
                    updateConfig("columnCount", newCount);
                    updateConfig("columns", currentColumns.slice(0, newCount));
                  }}
                >
                  <SelectTrigger data-testid="select-layout-column-count">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Columns</SelectItem>
                    <SelectItem value="3">3 Columns</SelectItem>
                    <SelectItem value="4">4 Columns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Column Widths</Label>
                <Select
                  value={layoutWidths}
                  onValueChange={(value) => updateConfig("columnWidths", value)}
                >
                  <SelectTrigger data-testid="select-layout-column-widths">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {widthOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Gap Between Columns</Label>
              <Select
                value={layoutGap}
                onValueChange={(value) => updateConfig("gap", value)}
              >
                <SelectTrigger data-testid="select-layout-gap">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gapOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <Label>Column Contents</Label>
              {layoutColumns.slice(0, layoutColCount).map((col, colIndex) => (
                <Card key={colIndex} className="p-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Column {colIndex + 1}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" data-testid={`button-add-nested-section-${colIndex}`}>
                            <Plus className="h-3 w-3 mr-1" />
                            Add Section
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="max-h-64 overflow-y-auto">
                          {nestableSectionTypes.map((sType) => {
                            const STypeIcon = sType.icon;
                            return (
                              <DropdownMenuItem
                                key={sType.type}
                                onClick={() => addNestedSection(colIndex, sType.type as SectionType)}
                                data-testid={`menu-add-${sType.type}-${colIndex}`}
                              >
                                <STypeIcon className="h-4 w-4 mr-2" />
                                {sType.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {(col.sections || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No sections in this column. Add one above.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {col.sections.map((nestedSection, sectionIndex) => {
                          const NestedIcon = getNestedSectionIcon(nestedSection.type as SectionType);
                          return (
                            <div
                              key={nestedSection.id}
                              className="flex items-center gap-2 p-2 bg-muted rounded-md"
                              data-testid={`nested-section-${colIndex}-${sectionIndex}`}
                            >
                              <NestedIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm flex-1 truncate">
                                {getNestedSectionLabel(nestedSection.type as SectionType)}
                              </span>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    data-testid={`button-edit-nested-${colIndex}-${sectionIndex}`}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Edit {getNestedSectionLabel(nestedSection.type as SectionType)}</DialogTitle>
                                  </DialogHeader>
                                  <NestedSectionEditor
                                    section={nestedSection}
                                    onUpdate={(newConfig, newStyles) => updateNestedSection(colIndex, sectionIndex, newConfig, newStyles)}
                                    customFonts={customFonts}
                                  />
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeNestedSection(colIndex, sectionIndex)}
                                data-testid={`button-delete-nested-${colIndex}-${sectionIndex}`}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </>
        );
      case "registration-form":
        return (
          <>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="showHeading"
                checked={(config.showHeading as boolean) ?? true}
                onChange={(e) => updateConfig("showHeading", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
                data-testid="checkbox-show-heading"
              />
              <Label htmlFor="showHeading">Show Section Heading</Label>
            </div>
            {(config.showHeading as boolean) !== false && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="heading">Section Heading</Label>
                  <Input
                    id="heading"
                    value={(config.heading as string) || ""}
                    onChange={(e) => updateConfig("heading", e.target.value)}
                    placeholder="Register Now"
                    data-testid="input-registration-heading"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={(config.description as string) || ""}
                    onChange={(e) => updateConfig("description", e.target.value)}
                    placeholder="Complete the form below to register for this event."
                    rows={3}
                    data-testid="textarea-registration-description"
                  />
                </div>
              </>
            )}
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                The registration form will be automatically embedded here with your event's configured registration fields and packages.
              </p>
            </div>
          </>
        );
      case "housing":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="heading">Heading</Label>
              <Input
                id="heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="Hotel Accommodations"
                data-testid="input-housing-heading"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={(config.description as string) || ""}
                onChange={(e) => updateConfig("description", e.target.value)}
                placeholder="Book your hotel room through our official room block for special event rates."
                rows={3}
                data-testid="textarea-housing-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buttonText">Button Text</Label>
              <Input
                id="buttonText"
                value={(config.buttonText as string) || ""}
                onChange={(e) => updateConfig("buttonText", e.target.value)}
                placeholder="Book Your Hotel Room"
                data-testid="input-housing-button-text"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showWhenDisabled"
                checked={(config.showWhenDisabled as boolean) ?? false}
                onChange={(e) => updateConfig("showWhenDisabled", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
                data-testid="checkbox-housing-show-when-disabled"
              />
              <Label htmlFor="showWhenDisabled">Show section even when housing is not configured</Label>
            </div>
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                This section will display a button linking to your Passkey hotel booking portal. Configure your Passkey integration in the Integrations page to enable hotel booking.
              </p>
            </div>
          </>
        );
      default:
        return <p className="text-muted-foreground">No configuration available for this section type.</p>;
    }
  };

  return (
    <div className="space-y-4 pt-4">
      {renderFields()}
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="section-styling">
          <AccordionTrigger data-testid="accordion-section-styling">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Section Styling
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="section-bg-color">Background Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="section-bg-color"
                      value={styles.backgroundColor || "#ffffff"}
                      onChange={(e) => updateStyles("backgroundColor", e.target.value)}
                      className="h-9 w-12 rounded border cursor-pointer"
                      data-testid="input-section-bg-color"
                    />
                    <Input
                      value={styles.backgroundColor || ""}
                      onChange={(e) => updateStyles("backgroundColor", e.target.value || undefined)}
                      placeholder="Default"
                      className="flex-1 font-mono text-sm"
                      data-testid="input-section-bg-color-text"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section-text-color">Text Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="section-text-color"
                      value={styles.textColor || "#1f2937"}
                      onChange={(e) => updateStyles("textColor", e.target.value)}
                      className="h-9 w-12 rounded border cursor-pointer"
                      data-testid="input-section-text-color"
                    />
                    <Input
                      value={styles.textColor || ""}
                      onChange={(e) => updateStyles("textColor", e.target.value || undefined)}
                      placeholder="Default"
                      className="flex-1 font-mono text-sm"
                      data-testid="input-section-text-color-text"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Text Alignment</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant={styles.textAlign === 'left' || !styles.textAlign ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => updateStyles("textAlign", styles.textAlign === 'left' ? undefined : 'left')}
                    data-testid="button-align-left"
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={styles.textAlign === 'center' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => updateStyles("textAlign", styles.textAlign === 'center' ? undefined : 'center')}
                    data-testid="button-align-center"
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={styles.textAlign === 'right' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => updateStyles("textAlign", styles.textAlign === 'right' ? undefined : 'right')}
                    data-testid="button-align-right"
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Default alignment is left. Click same option again to reset.
                </p>
              </div>
              {(section.type === 'speakers' || section.type === 'sponsors') && (
                <div className="space-y-2">
                  <Label>Card Grid Alignment</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={!styles.gridJustify || styles.gridJustify === 'start' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => updateStyles("gridJustify", undefined)}
                      data-testid="button-grid-start"
                    >
                      <AlignLeft className="h-4 w-4 mr-2" />
                      Left
                    </Button>
                    <Button
                      type="button"
                      variant={styles.gridJustify === 'center' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => updateStyles("gridJustify", 'center')}
                      data-testid="button-grid-center"
                    >
                      <AlignCenter className="h-4 w-4 mr-2" />
                      Center
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Centers the card tiles when there are fewer items than columns.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="padding-top">Padding Top</Label>
                  <Select
                    value={styles.paddingTop || "medium"}
                    onValueChange={(value) => updateStyles("paddingTop", value as SectionStyles["paddingTop"])}
                  >
                    <SelectTrigger data-testid="select-section-padding-top">
                      <SelectValue placeholder="Select padding" />
                    </SelectTrigger>
                    <SelectContent>
                      {PADDING_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="padding-bottom">Padding Bottom</Label>
                  <Select
                    value={styles.paddingBottom || "medium"}
                    onValueChange={(value) => updateStyles("paddingBottom", value as SectionStyles["paddingBottom"])}
                  >
                    <SelectTrigger data-testid="select-section-padding-bottom">
                      <SelectValue placeholder="Select padding" />
                    </SelectTrigger>
                    <SelectContent>
                      {PADDING_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="padding-left">Padding Left</Label>
                  <Select
                    value={styles.paddingLeft || "medium"}
                    onValueChange={(value) => updateStyles("paddingLeft", value as SectionStyles["paddingLeft"])}
                  >
                    <SelectTrigger data-testid="select-section-padding-left">
                      <SelectValue placeholder="Select padding" />
                    </SelectTrigger>
                    <SelectContent>
                      {PADDING_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="padding-right">Padding Right</Label>
                  <Select
                    value={styles.paddingRight || "medium"}
                    onValueChange={(value) => updateStyles("paddingRight", value as SectionStyles["paddingRight"])}
                  >
                    <SelectTrigger data-testid="select-section-padding-right">
                      <SelectValue placeholder="Select padding" />
                    </SelectTrigger>
                    <SelectContent>
                      {PADDING_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-class">Custom CSS Class</Label>
                <Input
                  id="custom-class"
                  value={styles.customClass || ""}
                  onChange={(e) => updateStyles("customClass", e.target.value || undefined)}
                  placeholder="my-custom-class"
                  data-testid="input-section-custom-class"
                />
                <p className="text-xs text-muted-foreground">
                  This class is applied to the section wrapper. To style content inside, use descendant selectors in Custom CSS (e.g., <code className="bg-muted px-1 rounded">.my-class img</code>).
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="visibility">
          <AccordionTrigger data-testid="accordion-visibility">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Visibility
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="hide-mobile">Hide on Mobile</Label>
                  <p className="text-xs text-muted-foreground">
                    Section will be hidden on mobile devices
                  </p>
                </div>
                <Switch
                  id="hide-mobile"
                  checked={styles.hideOnMobile || false}
                  onCheckedChange={(checked) => updateStyles("hideOnMobile", checked)}
                  data-testid="switch-hide-mobile"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="hide-desktop">Hide on Desktop</Label>
                  <p className="text-xs text-muted-foreground">
                    Section will be hidden on desktop devices
                  </p>
                </div>
                <Switch
                  id="hide-desktop"
                  checked={styles.hideOnDesktop || false}
                  onCheckedChange={(checked) => updateStyles("hideOnDesktop", checked)}
                  data-testid="switch-hide-desktop"
                />
              </div>
              
              <Separator className="my-4" />
              
              {(() => {
                const normalized = normalizeVisibilityCondition(styles.visibilityCondition as VisibilityCondition | { enabled: boolean; property: string; operator: string; value: string } | undefined);
                return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="visibility-condition">Conditional Visibility</Label>
                    <p className="text-xs text-muted-foreground">
                      Show section only when attendee matches criteria
                    </p>
                  </div>
                  <Switch
                    id="visibility-condition"
                    checked={normalized.enabled}
                    onCheckedChange={(checked) => {
                      updateStyles("visibilityCondition", { ...normalized, enabled: checked });
                    }}
                    data-testid="switch-visibility-condition"
                  />
                </div>
                
                {normalized.enabled && (
                  <div className="space-y-3 p-3 rounded-md bg-muted/50 border">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Show when
                      </div>
                      <Select
                        value={normalized.logic}
                        onValueChange={(value) => {
                          updateStyles("visibilityCondition", { ...normalized, logic: value as 'and' | 'or' });
                        }}
                      >
                        <SelectTrigger className="w-24" data-testid="select-visibility-logic">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="and">ALL</SelectItem>
                          <SelectItem value="or">ANY</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">conditions match</span>
                    </div>
                    
                    <div className="space-y-2">
                      {normalized.conditions.map((condition, index) => (
                        <div key={index} className="flex flex-col gap-2 p-2 bg-background rounded border">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">Condition {index + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                const newConditions = [...normalized.conditions];
                                newConditions.splice(index, 1);
                                updateStyles("visibilityCondition", { ...normalized, conditions: newConditions });
                              }}
                              data-testid={`button-remove-condition-${index}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <Select
                            value={condition.property || ""}
                            onValueChange={(value) => {
                              const newConditions = [...normalized.conditions];
                              newConditions[index] = { ...newConditions[index], property: value };
                              updateStyles("visibilityCondition", { ...normalized, conditions: newConditions });
                            }}
                          >
                            <SelectTrigger data-testid={`select-condition-property-${index}`}>
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="attendeeType">Attendee Type</SelectItem>
                              <SelectItem value="registrationStatus">Registration Status</SelectItem>
                              <SelectItem value="ticketType">Ticket Type</SelectItem>
                              <SelectItem value="checkedIn">Checked In</SelectItem>
                              <SelectItem value="company">Company</SelectItem>
                              <SelectItem value="jobTitle">Job Title</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={condition.operator || "equals"}
                            onValueChange={(value) => {
                              const newConditions = [...normalized.conditions];
                              newConditions[index] = { ...newConditions[index], operator: value as SingleCondition['operator'] };
                              updateStyles("visibilityCondition", { ...normalized, conditions: newConditions });
                            }}
                          >
                            <SelectTrigger data-testid={`select-condition-operator-${index}`}>
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="not_equals">Does Not Equal</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="not_contains">Does Not Contain</SelectItem>
                              <SelectItem value="is_empty">Is Empty</SelectItem>
                              <SelectItem value="is_not_empty">Is Not Empty</SelectItem>
                            </SelectContent>
                          </Select>
                          {condition.operator !== 'is_empty' && condition.operator !== 'is_not_empty' && (
                            <>
                              {condition.property === 'checkedIn' ? (
                                <Select
                                  value={condition.value || ""}
                                  onValueChange={(value) => {
                                    const newConditions = [...normalized.conditions];
                                    newConditions[index] = { ...newConditions[index], value };
                                    updateStyles("visibilityCondition", { ...normalized, conditions: newConditions });
                                  }}
                                >
                                  <SelectTrigger data-testid={`select-condition-value-bool-${index}`}>
                                    <SelectValue placeholder="Select value" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">Yes (Checked In)</SelectItem>
                                    <SelectItem value="false">No (Not Checked In)</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : condition.property === 'registrationStatus' ? (
                                <Select
                                  value={condition.value || ""}
                                  onValueChange={(value) => {
                                    const newConditions = [...normalized.conditions];
                                    newConditions[index] = { ...newConditions[index], value };
                                    updateStyles("visibilityCondition", { ...normalized, conditions: newConditions });
                                  }}
                                >
                                  <SelectTrigger data-testid={`select-condition-value-status-${index}`}>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="invited">Invited</SelectItem>
                                    <SelectItem value="registered">Registered</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="waitlisted">Waitlisted</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="declined">Declined</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  value={condition.value || ""}
                                  onChange={(e) => {
                                    const newConditions = [...normalized.conditions];
                                    newConditions[index] = { ...newConditions[index], value: e.target.value };
                                    updateStyles("visibilityCondition", { ...normalized, conditions: newConditions });
                                  }}
                                  placeholder="Enter value to match"
                                  data-testid={`input-condition-value-${index}`}
                                />
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newCondition: SingleCondition = { property: '', operator: 'equals', value: '' };
                        updateStyles("visibilityCondition", { ...normalized, conditions: [...normalized.conditions, newCondition] });
                      }}
                      data-testid="button-add-condition"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Condition
                    </Button>
                    
                    {normalized.conditions.length > 0 && (
                      <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        This section will only be visible when{' '}
                        <strong>{normalized.logic === 'or' ? 'any' : 'all'}</strong>{' '}
                        of the {normalized.conditions.length} condition(s) match.
                      </div>
                    )}
                  </div>
                )}
              </div>
                );
              })()}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-between gap-2 pt-4">
        <div>
          {supportsAiGeneration && (
            <Popover open={aiPromptOpen} onOpenChange={setAiPromptOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  disabled={isAiGenerating || !eventId}
                  data-testid="button-ai-generate"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isAiGenerating ? "Generating..." : "AI Generate"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI Content Generator
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Generate content for this {section.type} section based on your event details.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai-prompt">Custom Instructions (optional)</Label>
                    <Textarea
                      id="ai-prompt"
                      placeholder="Add specific instructions for the AI..."
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      rows={3}
                      data-testid="input-ai-prompt"
                    />
                  </div>
                  {section.type === "testimonials" && (
                    <div className="flex items-start gap-2 p-2 rounded-md bg-muted">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Generated testimonials are examples only. Replace with real testimonials before publishing.
                      </p>
                    </div>
                  )}
                  <Button 
                    onClick={handleAiGenerate} 
                    disabled={isAiGenerating}
                    className="w-full"
                    data-testid="button-confirm-ai-generate"
                  >
                    {isAiGenerating ? "Generating..." : "Generate Content"}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(config, styles)} data-testid="button-save-section">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

interface StylesEditorProps {
  theme: EventPageTheme;
  onUpdateTheme: (updates: Partial<EventPageTheme>) => void;
  isPending: boolean;
  seo?: { title?: string; description?: string; ogImage?: string };
  onUpdateSeo: (updates: { title?: string; description?: string; ogImage?: string }) => void;
  customFonts?: CustomFont[];
}

// Debounced color input component to prevent saving on every keystroke
function DebouncedColorInput({ 
  id, 
  value, 
  defaultValue,
  onChange, 
  disabled, 
  testId 
}: { 
  id: string; 
  value: string | undefined; 
  defaultValue: string;
  onChange: (value: string) => void; 
  disabled?: boolean; 
  testId: string;
}) {
  const [localValue, setLocalValue] = useState(value || defaultValue);
  const [colorPickerValue, setColorPickerValue] = useState(value || defaultValue);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sync local value when prop changes (e.g., from external updates)
  useEffect(() => {
    setLocalValue(value || defaultValue);
    setColorPickerValue(value || defaultValue);
  }, [value, defaultValue]);
  
  const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex);
  
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Only save if it's a valid hex code (6 digits after #)
    if (isValidHex(newValue)) {
      setColorPickerValue(newValue);
      debounceRef.current = setTimeout(() => {
        onChange(newValue);
      }, 500);
    }
  };
  
  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    setColorPickerValue(newValue);
    // Color picker always returns valid hex, save immediately
    onChange(newValue);
  };
  
  const handleBlur = () => {
    // On blur, save if valid, otherwise revert to last valid value
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (isValidHex(localValue)) {
      onChange(localValue);
    } else {
      // Revert to the prop value if invalid
      setLocalValue(value || defaultValue);
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        id={id}
        value={colorPickerValue}
        onChange={handleColorPickerChange}
        disabled={disabled}
        className="h-9 w-12 rounded border cursor-pointer"
        data-testid={testId}
      />
      <Input
        value={localValue}
        onChange={handleTextChange}
        onBlur={handleBlur}
        disabled={disabled}
        className="flex-1 font-mono text-sm"
        data-testid={`${testId}-text`}
      />
    </div>
  );
}

function StylesEditor({ theme, onUpdateTheme, isPending, seo, onUpdateSeo, customFonts = [] }: StylesEditorProps) {
  const [localCss, setLocalCss] = useState(theme.customCss || "");
  const [cssHasChanges, setCssHasChanges] = useState(false);
  
  // Sync local CSS when theme changes from external source (e.g., template applied)
  useEffect(() => {
    setLocalCss(theme.customCss || "");
    setCssHasChanges(false);
  }, [theme.customCss]);
  
  const handleCssChange = (value: string) => {
    setLocalCss(value);
    setCssHasChanges(value !== (theme.customCss || ""));
  };
  
  const handleSaveCss = () => {
    onUpdateTheme({ customCss: localCss });
    setCssHasChanges(false);
  };
  
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Type className="h-5 w-5 text-muted-foreground" />
          <h4 className="font-medium">Typography</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="headingFont">Heading Font</Label>
            <Select
              value={theme.headingFont || "Inter"}
              onValueChange={(value) => onUpdateTheme({ headingFont: value })}
              disabled={isPending}
            >
              <SelectTrigger data-testid="select-heading-font">
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                {customFonts.length > 0 && (
                  <>
                    <SelectItem value="__custom_header" disabled className="text-xs text-muted-foreground font-semibold">
                      Custom Fonts
                    </SelectItem>
                    {customFonts.map((font) => (
                      <SelectItem key={`custom-${font.id}`} value={font.name}>
                        {font.displayName || font.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__google_header" disabled className="text-xs text-muted-foreground font-semibold">
                      Google Fonts
                    </SelectItem>
                  </>
                )}
                {GOOGLE_FONTS.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bodyFont">Body Font</Label>
            <Select
              value={theme.bodyFont || "Inter"}
              onValueChange={(value) => onUpdateTheme({ bodyFont: value })}
              disabled={isPending}
            >
              <SelectTrigger data-testid="select-body-font">
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                {customFonts.length > 0 && (
                  <>
                    <SelectItem value="__custom_header" disabled className="text-xs text-muted-foreground font-semibold">
                      Custom Fonts
                    </SelectItem>
                    {customFonts.map((font) => (
                      <SelectItem key={`custom-${font.id}`} value={font.name}>
                        {font.displayName || font.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__google_header" disabled className="text-xs text-muted-foreground font-semibold">
                      Google Fonts
                    </SelectItem>
                  </>
                )}
                {GOOGLE_FONTS.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Paintbrush className="h-5 w-5 text-muted-foreground" />
          <h4 className="font-medium">Colors</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary</Label>
            <DebouncedColorInput
              id="primaryColor"
              value={theme.primaryColor}
              defaultValue="#3b82f6"
              onChange={(value) => onUpdateTheme({ primaryColor: value })}
              disabled={isPending}
              testId="input-primary-color"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryColor">Secondary</Label>
            <DebouncedColorInput
              id="secondaryColor"
              value={theme.secondaryColor}
              defaultValue="#64748b"
              onChange={(value) => onUpdateTheme({ secondaryColor: value })}
              disabled={isPending}
              testId="input-secondary-color"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="backgroundColor">Background</Label>
            <DebouncedColorInput
              id="backgroundColor"
              value={theme.backgroundColor}
              defaultValue="#ffffff"
              onChange={(value) => onUpdateTheme({ backgroundColor: value })}
              disabled={isPending}
              testId="input-background-color"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="textColor">Text</Label>
            <DebouncedColorInput
              id="textColor"
              value={theme.textColor}
              defaultValue="#1f2937"
              onChange={(value) => onUpdateTheme({ textColor: value })}
              disabled={isPending}
              testId="input-text-color"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="textSecondaryColor">Text Secondary</Label>
            <DebouncedColorInput
              id="textSecondaryColor"
              value={theme.textSecondaryColor}
              defaultValue="#6b7280"
              onChange={(value) => onUpdateTheme({ textSecondaryColor: value })}
              disabled={isPending}
              testId="input-text-secondary-color"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buttonColor">Button</Label>
            <DebouncedColorInput
              id="buttonColor"
              value={theme.buttonColor}
              defaultValue="#3b82f6"
              onChange={(value) => onUpdateTheme({ buttonColor: value })}
              disabled={isPending}
              testId="input-button-color"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buttonTextColor">Button Text</Label>
            <DebouncedColorInput
              id="buttonTextColor"
              value={theme.buttonTextColor}
              defaultValue="#ffffff"
              onChange={(value) => onUpdateTheme({ buttonTextColor: value })}
              disabled={isPending}
              testId="input-button-text-color"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buttonBorderColor">Button Border</Label>
            <DebouncedColorInput
              id="buttonBorderColor"
              value={theme.buttonBorderColor}
              defaultValue=""
              onChange={(value) => onUpdateTheme({ buttonBorderColor: value })}
              disabled={isPending}
              testId="input-button-border-color"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardBackground">Card Background</Label>
            <DebouncedColorInput
              id="cardBackground"
              value={theme.cardBackground}
              defaultValue="#f9fafb"
              onChange={(value) => onUpdateTheme({ cardBackground: value })}
              disabled={isPending}
              testId="input-card-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="borderColor">Border Color</Label>
            <DebouncedColorInput
              id="borderColor"
              value={theme.borderColor}
              defaultValue="#e5e7eb"
              onChange={(value) => onUpdateTheme({ borderColor: value })}
              disabled={isPending}
              testId="input-border-color"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layout className="h-5 w-5 text-muted-foreground" />
          <h4 className="font-medium">Layout</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="borderRadius">Border Radius</Label>
            <Select
              value={theme.borderRadius || "medium"}
              onValueChange={(value) => onUpdateTheme({ borderRadius: value as EventPageTheme["borderRadius"] })}
              disabled={isPending}
            >
              <SelectTrigger data-testid="select-border-radius">
                <SelectValue placeholder="Select radius" />
              </SelectTrigger>
              <SelectContent>
                {BORDER_RADIUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="buttonStyle">Button Style</Label>
            <Select
              value={theme.buttonStyle || "filled"}
              onValueChange={(value) => onUpdateTheme({ buttonStyle: value as EventPageTheme["buttonStyle"] })}
              disabled={isPending}
            >
              <SelectTrigger data-testid="select-button-style">
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                {BUTTON_STYLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="containerWidth">Container Width</Label>
            <Select
              value={theme.containerWidth || "standard"}
              onValueChange={(value) => onUpdateTheme({ containerWidth: value as EventPageTheme["containerWidth"] })}
              disabled={isPending}
            >
              <SelectTrigger data-testid="select-container-width">
                <SelectValue placeholder="Select width" />
              </SelectTrigger>
              <SelectContent>
                {CONTAINER_WIDTH_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {theme.containerWidth === "full" && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Warning: This will remove all horizontal margins for all content.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sectionSpacing">Section Spacing</Label>
            <Select
              value={theme.sectionSpacing || "normal"}
              onValueChange={(value) => onUpdateTheme({ sectionSpacing: value as EventPageTheme["sectionSpacing"] })}
              disabled={isPending}
            >
              <SelectTrigger data-testid="select-section-spacing">
                <SelectValue placeholder="Select spacing" />
              </SelectTrigger>
              <SelectContent>
                {SECTION_SPACING_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pagePadding">Page Padding</Label>
            <Select
              value={theme.pagePadding || "standard"}
              onValueChange={(value) => onUpdateTheme({ pagePadding: value as EventPageTheme["pagePadding"] })}
              disabled={isPending}
            >
              <SelectTrigger data-testid="select-page-padding">
                <SelectValue placeholder="Select padding" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="none">None (Edge-to-Edge)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Set to "None" for full-bleed sections that extend to the page edges.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="textDecoration">Text Decoration</Label>
            <Select
              value={theme.textDecoration || "none"}
              onValueChange={(value) => onUpdateTheme({ textDecoration: value as EventPageTheme["textDecoration"] })}
              disabled={isPending}
            >
              <SelectTrigger data-testid="select-text-decoration">
                <SelectValue placeholder="Select decoration" />
              </SelectTrigger>
              <SelectContent>
                {TEXT_DECORATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <h4 className="font-medium">SEO & Social Sharing</h4>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seoTitle">Meta Title</Label>
            <Input
              id="seoTitle"
              value={seo?.title || ""}
              onChange={(e) => onUpdateSeo({ title: e.target.value })}
              disabled={isPending}
              placeholder="Page title for search engines"
              data-testid="input-seo-title"
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 50-60 characters (max 160)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seoDescription">Meta Description</Label>
            <Textarea
              id="seoDescription"
              value={seo?.description || ""}
              onChange={(e) => onUpdateSeo({ description: e.target.value })}
              disabled={isPending}
              placeholder="Brief description for search engine results"
              rows={3}
              data-testid="textarea-seo-description"
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 150-160 characters (max 320)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seoOgImage">Open Graph Image URL</Label>
            <Input
              id="seoOgImage"
              value={seo?.ogImage || ""}
              onChange={(e) => onUpdateSeo({ ogImage: e.target.value })}
              disabled={isPending}
              placeholder="https://example.com/image.jpg"
              data-testid="input-seo-og-image"
            />
            <p className="text-xs text-muted-foreground">
              Image displayed when shared on social media (recommended: 1200x630px)
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-medium">Custom CSS</h4>
          </div>
          {cssHasChanges && (
            <Badge variant="secondary" className="text-xs">Unsaved changes</Badge>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="customCss">Custom Styles</Label>
          <Textarea
            id="customCss"
            value={localCss}
            onChange={(e) => handleCssChange(e.target.value)}
            disabled={isPending}
            placeholder={`.event-page-custom h1 {
  /* Your custom styles */
}

.event-page-custom .section-hero {
  /* Hero section overrides */
}`}
            rows={10}
            className="font-mono text-sm"
            data-testid="textarea-custom-css"
          />
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Add custom CSS to style your event page. Styles are automatically scoped to your event page using <code className="bg-muted px-1 rounded">.event-page-custom</code>.
            </p>
            <p className="text-xs text-muted-foreground">
              To target a section with a Custom CSS Class, use the class name directly (e.g., <code className="bg-muted px-1 rounded">.banner</code>). To style content inside that section, use descendant selectors (e.g., <code className="bg-muted px-1 rounded">.banner img</code>).
            </p>
            <div className="flex justify-end">
              <Button 
                onClick={handleSaveCss} 
                disabled={!cssHasChanges || isPending}
                size="sm"
                data-testid="button-save-custom-css"
              >
                Save CSS
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h4 className="font-medium">Google Analytics</h4>
        </div>
        <div className="space-y-2">
          <Label htmlFor="googleTagId">Google Tag (Measurement ID)</Label>
          <Input
            id="googleTagId"
            value={theme.googleTagId || ""}
            onChange={(e) => onUpdateTheme({ googleTagId: e.target.value })}
            disabled={isPending}
            placeholder="G-XXXXXXXXXX"
            data-testid="input-google-tag-id"
          />
          <p className="text-xs text-muted-foreground">
            Enter your Google Analytics 4 Measurement ID to track visitor analytics for this page. 
            Find it in Google Analytics under Admin &gt; Data Streams &gt; Web.
          </p>
        </div>
      </div>
    </div>
  );
}
