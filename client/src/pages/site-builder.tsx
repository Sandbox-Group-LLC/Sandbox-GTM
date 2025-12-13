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
} from "lucide-react";
import type { Event, EventPage } from "@shared/schema";

type PageType = "landing" | "registration" | "portal";

type SectionType = "hero" | "text" | "cta" | "features";

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
    default:
      return {};
  }
};

export default function SiteBuilder() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<PageType>("landing");
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
    mutationFn: async (data: { pageType: PageType; sections: Section[]; isPublished?: boolean }) => {
      return await apiRequest("POST", `/api/events/${selectedEventId}/pages`, {
        eventId: selectedEventId,
        pageType: data.pageType,
        sections: data.sections,
        isPublished: data.isPublished ?? currentPage?.isPublished ?? false,
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

  const selectedEvent = events.find((e) => e.id === selectedEventId);

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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedEvent?.publicSlug) {
                    window.open(`/event/${selectedEvent.publicSlug}`, "_blank");
                  } else {
                    toast({ 
                      title: "No public URL", 
                      description: "Set a public slug for this event to enable preview",
                      variant: "destructive"
                    });
                  }
                }}
                data-testid="button-preview"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
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
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{pt.label}</h3>
                          <p className="text-sm text-muted-foreground">{pt.description}</p>
                        </div>
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
