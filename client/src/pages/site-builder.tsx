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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
} from "lucide-react";
import type { Event, EventPage, EventPageTheme } from "@shared/schema";
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

type PageType = "landing" | "registration" | "portal";

type SectionType = "hero" | "text" | "cta" | "features" | "countdown" | "speakers" | "agenda" | "faq" | "testimonials" | "gallery" | "html" | "sponsors" | "map" | "video" | "footer";

interface SectionStyles {
  backgroundColor?: string;
  textColor?: string;
  paddingTop?: 'none' | 'small' | 'medium' | 'large';
  paddingBottom?: 'none' | 'small' | 'medium' | 'large';
  customClass?: string;
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
      return { title: "Welcome to Our Event", subtitle: "", buttonText: "Register Now", buttonLink: "", backgroundImage: "" };
    case "text":
      return { heading: "", content: "", alignment: "left" };
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
  const justAppliedTemplateRef = useRef(false);

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: pages = [], isLoading: pagesLoading } = useQuery<EventPage[]>({
    queryKey: ["/api/events", selectedEventId, "pages"],
    enabled: !!selectedEventId,
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
    mutationFn: async (data: { pageType: PageType; sections: Section[]; isPublished?: boolean; theme?: EventPageTheme }) => {
      return await apiRequest("POST", `/api/events/${selectedEventId}/pages`, {
        eventId: selectedEventId,
        pageType: data.pageType,
        sections: data.sections,
        isPublished: data.isPublished ?? currentPage?.isPublished ?? false,
        theme: data.theme ?? currentPage?.theme,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "pages"] });
      // Reset template flag after fresh data has been fetched
      justAppliedTemplateRef.current = false;
      toast({ title: "Page saved successfully" });
    },
    onError: (error: Error) => {
      // Reset template flag on error so preview can resync
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

  const selectedEvent = events.find((e) => e.id === selectedEventId);
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
        title="Site Builder"
        breadcrumbs={[{ label: "Events", href: "/events" }, { label: "Site Builder" }]}
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
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                          <h3 className="font-medium">{pt.label}</h3>
                          <p className="text-sm text-muted-foreground">{pt.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
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
                        </div>
                      </div>

                      {activeSubTab === "content" ? (
                        <>
                          <div className="flex items-center justify-end gap-2">
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
                          </div>

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
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Eye className="h-3 w-3" />
                Live Preview
              </div>
            </div>
            <ScrollArea className="h-[calc(100%-48px)]">
              <div 
                className="event-page-custom p-4"
                style={{
                  ...getThemeStyles(previewTheme),
                  backgroundColor: previewTheme?.backgroundColor || undefined,
                  color: previewTheme?.textColor || undefined,
                  fontFamily: previewTheme?.bodyFont ? `"${previewTheme.bodyFont}", sans-serif` : undefined,
                  gap: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <GoogleFontsLoader fonts={[previewTheme?.headingFont, previewTheme?.bodyFont].filter(Boolean) as string[]} />
                {previewTheme?.customCss && (
                  <style dangerouslySetInnerHTML={{ __html: scopeCustomCss(sanitizeCustomCss(previewTheme.customCss)) }} />
                )}
                {previewSections.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Add sections to see preview</div>
                ) : (
                  previewSections.sort((a, b) => a.order - b.order).map((section) => (
                    <div
                      key={section.id}
                      data-testid={`preview-section-${section.id}`}
                      className={editingSection?.id === section.id ? "ring-2 ring-primary ring-offset-2 rounded-md" : ""}
                    >
                      <SectionRenderer section={section} event={previewEvent} theme={previewTheme} isHighlighted={editingSection?.id === section.id} />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Section</DialogTitle>
            <DialogDescription>
              Choose a section type to add to your page
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-4">
            {SECTION_TYPES.map((st) => (
              <button
                key={st.type}
                onClick={() => handleAddSection(st.type)}
                className="flex flex-col items-center gap-2 p-4 border rounded-md hover-elevate text-center"
                data-testid={`button-section-${st.type}`}
              >
                <st.icon className="h-8 w-8 text-muted-foreground" />
                <span className="font-medium">{st.label}</span>
                <span className="text-xs text-muted-foreground">{st.description}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSectionEditorOpen} onOpenChange={setIsSectionEditorOpen}>
        <DialogContent className="max-w-lg">
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
    </div>
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
}

function SectionEditor({ section, onSave, onCancel, onConfigChange }: SectionEditorProps) {
  const [config, setConfig] = useState<Record<string, unknown>>(section.config);
  const [styles, setStyles] = useState<SectionStyles>(section.styles || {});

  const updateConfig = (key: string, value: unknown) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onConfigChange?.(newConfig, styles);
  };

  const updateStyles = (key: keyof SectionStyles, value: string | undefined) => {
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
          </>
        );
      case "text":
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
                Enter raw HTML code. Use merge tags to insert dynamic content.
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
                  Add custom CSS classes to this section for advanced styling
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(config, styles)} data-testid="button-save-section">
          Save Changes
        </Button>
      </div>
    </div>
  );
}

interface StylesEditorProps {
  theme: EventPageTheme;
  onUpdateTheme: (updates: Partial<EventPageTheme>) => void;
  isPending: boolean;
}

function StylesEditor({ theme, onUpdateTheme, isPending }: StylesEditorProps) {
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
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="primaryColor"
                value={theme.primaryColor || "#3b82f6"}
                onChange={(e) => onUpdateTheme({ primaryColor: e.target.value })}
                disabled={isPending}
                className="h-9 w-12 rounded border cursor-pointer"
                data-testid="input-primary-color"
              />
              <Input
                value={theme.primaryColor || "#3b82f6"}
                onChange={(e) => onUpdateTheme({ primaryColor: e.target.value })}
                disabled={isPending}
                className="flex-1 font-mono text-sm"
                data-testid="input-primary-color-text"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryColor">Secondary</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="secondaryColor"
                value={theme.secondaryColor || "#64748b"}
                onChange={(e) => onUpdateTheme({ secondaryColor: e.target.value })}
                disabled={isPending}
                className="h-9 w-12 rounded border cursor-pointer"
                data-testid="input-secondary-color"
              />
              <Input
                value={theme.secondaryColor || "#64748b"}
                onChange={(e) => onUpdateTheme({ secondaryColor: e.target.value })}
                disabled={isPending}
                className="flex-1 font-mono text-sm"
                data-testid="input-secondary-color-text"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="backgroundColor">Background</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="backgroundColor"
                value={theme.backgroundColor || "#ffffff"}
                onChange={(e) => onUpdateTheme({ backgroundColor: e.target.value })}
                disabled={isPending}
                className="h-9 w-12 rounded border cursor-pointer"
                data-testid="input-background-color"
              />
              <Input
                value={theme.backgroundColor || "#ffffff"}
                onChange={(e) => onUpdateTheme({ backgroundColor: e.target.value })}
                disabled={isPending}
                className="flex-1 font-mono text-sm"
                data-testid="input-background-color-text"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="textColor">Text</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="textColor"
                value={theme.textColor || "#1f2937"}
                onChange={(e) => onUpdateTheme({ textColor: e.target.value })}
                disabled={isPending}
                className="h-9 w-12 rounded border cursor-pointer"
                data-testid="input-text-color"
              />
              <Input
                value={theme.textColor || "#1f2937"}
                onChange={(e) => onUpdateTheme({ textColor: e.target.value })}
                disabled={isPending}
                className="flex-1 font-mono text-sm"
                data-testid="input-text-color-text"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="textSecondaryColor">Text Secondary</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="textSecondaryColor"
                value={theme.textSecondaryColor || "#6b7280"}
                onChange={(e) => onUpdateTheme({ textSecondaryColor: e.target.value })}
                disabled={isPending}
                className="h-9 w-12 rounded border cursor-pointer"
                data-testid="input-text-secondary-color"
              />
              <Input
                value={theme.textSecondaryColor || "#6b7280"}
                onChange={(e) => onUpdateTheme({ textSecondaryColor: e.target.value })}
                disabled={isPending}
                className="flex-1 font-mono text-sm"
                data-testid="input-text-secondary-color-text"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="buttonColor">Button</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="buttonColor"
                value={theme.buttonColor || "#3b82f6"}
                onChange={(e) => onUpdateTheme({ buttonColor: e.target.value })}
                disabled={isPending}
                className="h-9 w-12 rounded border cursor-pointer"
                data-testid="input-button-color"
              />
              <Input
                value={theme.buttonColor || "#3b82f6"}
                onChange={(e) => onUpdateTheme({ buttonColor: e.target.value })}
                disabled={isPending}
                className="flex-1 font-mono text-sm"
                data-testid="input-button-color-text"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="buttonTextColor">Button Text</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="buttonTextColor"
                value={theme.buttonTextColor || "#ffffff"}
                onChange={(e) => onUpdateTheme({ buttonTextColor: e.target.value })}
                disabled={isPending}
                className="h-9 w-12 rounded border cursor-pointer"
                data-testid="input-button-text-color"
              />
              <Input
                value={theme.buttonTextColor || "#ffffff"}
                onChange={(e) => onUpdateTheme({ buttonTextColor: e.target.value })}
                disabled={isPending}
                className="flex-1 font-mono text-sm"
                data-testid="input-button-text-color-text"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardBackground">Card Background</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="cardBackground"
                value={theme.cardBackground || "#f9fafb"}
                onChange={(e) => onUpdateTheme({ cardBackground: e.target.value })}
                disabled={isPending}
                className="h-9 w-12 rounded border cursor-pointer"
                data-testid="input-card-background"
              />
              <Input
                value={theme.cardBackground || "#f9fafb"}
                onChange={(e) => onUpdateTheme({ cardBackground: e.target.value })}
                disabled={isPending}
                className="flex-1 font-mono text-sm"
                data-testid="input-card-background-text"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="borderColor">Border Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="borderColor"
                value={theme.borderColor || "#e5e7eb"}
                onChange={(e) => onUpdateTheme({ borderColor: e.target.value })}
                disabled={isPending}
                className="h-9 w-12 rounded border cursor-pointer"
                data-testid="input-border-color"
              />
              <Input
                value={theme.borderColor || "#e5e7eb"}
                onChange={(e) => onUpdateTheme({ borderColor: e.target.value })}
                disabled={isPending}
                className="flex-1 font-mono text-sm"
                data-testid="input-border-color-text"
              />
            </div>
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
              <p className="text-xs text-muted-foreground">
                Full Width applies only to HTML sections. All other section blocks retain 10% left and right margins.
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
          <Code className="h-5 w-5 text-muted-foreground" />
          <h4 className="font-medium">Custom CSS</h4>
        </div>
        <div className="space-y-2">
          <Label htmlFor="customCss">Custom Styles</Label>
          <Textarea
            id="customCss"
            value={theme.customCss || ""}
            onChange={(e) => onUpdateTheme({ customCss: e.target.value })}
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
          <p className="text-xs text-muted-foreground">
            Add custom CSS to style your event page. Use the <code className="bg-muted px-1 rounded">.event-page-custom</code> prefix to scope your styles to the event page only.
          </p>
        </div>
      </div>
    </div>
  );
}
