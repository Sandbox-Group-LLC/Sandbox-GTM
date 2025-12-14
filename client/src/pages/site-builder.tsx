import { useState } from "react";
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
} from "lucide-react";
import type { Event, EventPage, EventPageTheme } from "@shared/schema";

type PageType = "landing" | "registration" | "portal";

type SectionType = "hero" | "text" | "cta" | "features" | "countdown" | "speakers" | "agenda" | "faq" | "testimonials" | "gallery";

interface Section {
  id: string;
  type: SectionType;
  order: number;
  config: Record<string, unknown>;
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
];

const SECTION_SPACING_OPTIONS = [
  { value: "compact", label: "Compact" },
  { value: "normal", label: "Normal" },
  { value: "relaxed", label: "Relaxed" },
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

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: pages = [], isLoading: pagesLoading } = useQuery<EventPage[]>({
    queryKey: ["/api/events", selectedEventId, "pages"],
    enabled: !!selectedEventId,
  });

  const currentPage = pages.find((p) => p.pageType === activeTab);
  const sections = (currentPage?.sections as Section[]) || [];

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "pages"] });
      toast({ title: "Page saved successfully" });
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

  const handleUpdateSection = (sectionId: string, config: Record<string, unknown>) => {
    const updatedSections = sections.map((s) =>
      s.id === sectionId ? { ...s, config } : s
    );
    saveMutation.mutate({ pageType: activeTab, sections: updatedSections });
    setIsSectionEditorOpen(false);
    setEditingSection(null);
  };

  const handleUpdateTheme = (updates: Partial<EventPageTheme>) => {
    const newTheme: EventPageTheme = {
      ...currentPage?.theme,
      ...updates,
    };
    saveMutation.mutate({ pageType: activeTab, sections: sections, theme: newTheme });
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const currentTheme = currentPage?.theme || {};

  const getSectionIcon = (type: SectionType) => {
    const sectionType = SECTION_TYPES.find((s) => s.type === type);
    return sectionType?.icon || Layout;
  };

  const getSectionLabel = (type: SectionType) => {
    const sectionType = SECTION_TYPES.find((s) => s.type === type);
    return sectionType?.label || type;
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
                title="Preview"
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

      <div className="flex-1 overflow-auto p-6">
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
                  <TabsList className="w-full justify-start mb-6">
                    {PAGE_TYPES.map((pt) => (
                      <TabsTrigger
                        key={pt.value}
                        value={pt.value}
                        className="flex items-center gap-2"
                        data-testid={`tab-${pt.value}`}
                      >
                        {pt.label}
                        {pages.find((p) => p.pageType === pt.value)?.isPublished && (
                          <Badge variant="secondary" className="text-xs">Live</Badge>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {PAGE_TYPES.map((pt) => (
                    <TabsContent key={pt.value} value={pt.value} className="space-y-4">
                      <div className="flex items-center justify-between gap-4 mb-4">
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
                          <div className="flex items-center justify-end">
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
                                      className="flex items-center gap-3 p-3 border rounded-md bg-card"
                                      data-testid={`section-item-${section.id}`}
                                    >
                                      <div className="flex flex-col gap-1">
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
                                      <Icon className="h-5 w-5 text-muted-foreground" />
                                      <div className="flex-1">
                                        <span className="font-medium">{getSectionLabel(section.type)}</span>
                                        <Badge variant="outline" className="ml-2 text-xs">
                                          {section.type}
                                        </Badge>
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
                          theme={currentTheme}
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
              onSave={(config) => handleUpdateSection(editingSection.id, config)}
              onCancel={() => {
                setIsSectionEditorOpen(false);
                setEditingSection(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SectionEditorProps {
  section: Section;
  onSave: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}

function SectionEditor({ section, onSave, onCancel }: SectionEditorProps) {
  const [config, setConfig] = useState<Record<string, unknown>>(section.config);

  const updateConfig = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const renderFields = () => {
    switch (section.type) {
      case "hero":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={(config.title as string) || ""}
                onChange={(e) => updateConfig("title", e.target.value)}
                placeholder="Enter hero title"
                data-testid="input-hero-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Textarea
                id="subtitle"
                value={(config.subtitle as string) || ""}
                onChange={(e) => updateConfig("subtitle", e.target.value)}
                placeholder="Enter subtitle text"
                data-testid="input-hero-subtitle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buttonText">Button Text</Label>
              <Input
                id="buttonText"
                value={(config.buttonText as string) || ""}
                onChange={(e) => updateConfig("buttonText", e.target.value)}
                placeholder="Register Now"
                data-testid="input-hero-button-text"
              />
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
              <Input
                id="heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="Section heading"
                data-testid="input-text-heading"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={(config.content as string) || ""}
                onChange={(e) => updateConfig("content", e.target.value)}
                placeholder="Enter your text content"
                rows={5}
                data-testid="input-text-content"
              />
            </div>
          </>
        );
      case "cta":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="heading">Heading</Label>
              <Input
                id="heading"
                value={(config.heading as string) || ""}
                onChange={(e) => updateConfig("heading", e.target.value)}
                placeholder="Ready to Join?"
                data-testid="input-cta-heading"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={(config.description as string) || ""}
                onChange={(e) => updateConfig("description", e.target.value)}
                placeholder="Brief description"
                data-testid="input-cta-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buttonText">Button Text</Label>
              <Input
                id="buttonText"
                value={(config.buttonText as string) || ""}
                onChange={(e) => updateConfig("buttonText", e.target.value)}
                placeholder="Get Started"
                data-testid="input-cta-button-text"
              />
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
            <p className="text-sm text-muted-foreground">
              Speakers are automatically pulled from event data
            </p>
          </>
        );
      case "agenda":
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
            <p className="text-sm text-muted-foreground">
              Sessions are automatically pulled from event data
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
      default:
        return <p className="text-muted-foreground">No configuration available for this section type.</p>;
    }
  };

  return (
    <div className="space-y-4 pt-4">
      {renderFields()}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(config)} data-testid="button-save-section">
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
        </div>
      </div>
    </div>
  );
}
