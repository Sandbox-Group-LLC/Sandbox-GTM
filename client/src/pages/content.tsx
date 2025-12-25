import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { titleCase } from "@/lib/utils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, FolderOpen, Search, FileText, Video, Image, Link as LinkIcon, File, ExternalLink, Copy, Trash2, ImageIcon, Users, Award, RefreshCw } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { ContentItem, ContentAsset, EventSession, EventSponsor, SponsorTaskCompletion, Event } from "@shared/schema";
import { EventSelectField } from "@/components/event-select-field";

const contentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  eventId: z.string().min(1, "Event is required"),
  sessionId: z.string().optional(),
  description: z.string().optional(),
  type: z.string().min(1, "Type is required"),
  fileUrl: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
  isPublic: z.boolean().default(false),
});

type ContentFormData = z.infer<typeof contentFormSchema>;

const typeIcons: Record<string, typeof FileText> = {
  document: FileText,
  video: Video,
  image: Image,
  link: LinkIcon,
  other: File,
};

const typeColors: Record<string, "default" | "secondary" | "outline"> = {
  document: "default",
  video: "secondary",
  image: "outline",
  link: "secondary",
  other: "outline",
};

// Sponsor tier ordering and display
const tierOrder = ["platinum", "gold", "silver", "bronze", "partner", "other"];
const tierColors: Record<string, string> = {
  platinum: "border-0 bg-gradient-to-r from-slate-200 to-slate-400 text-slate-900",
  gold: "border-0 bg-gradient-to-r from-yellow-300 to-yellow-500 text-yellow-900",
  silver: "border-0 bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900",
  bronze: "border-0 bg-gradient-to-r from-amber-600 to-amber-700 text-white",
  partner: "border-0 bg-blue-500 text-white",
  other: "border-0 bg-muted text-muted-foreground",
};

interface SponsorWithLogo extends EventSponsor {
  eventName?: string;
  logoFromTask?: string;
}

export default function Content() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("catalog");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [folderFilter, setFolderFilter] = useState<string>("all");

  const { data: contentItems = [], isLoading } = useQuery<ContentItem[]>({
    queryKey: ["/api/content"],
  });

  const { data: contentAssets = [], isLoading: assetsLoading } = useQuery<ContentAsset[]>({
    queryKey: ["/api/content/assets"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // Fetch all sponsors with their approved logo submissions
  const { data: sponsorLogos = [], isLoading: logosLoading } = useQuery<SponsorWithLogo[]>({
    queryKey: ["/api/sponsor-logos"],
    queryFn: async () => {
      // Get all sponsors first
      const sponsorsRes = await fetch("/api/sponsors", { credentials: "include" });
      if (!sponsorsRes.ok) return [];
      const sponsors: EventSponsor[] = await sponsorsRes.json();
      
      // Get all events for names
      const eventsRes = await fetch("/api/events", { credentials: "include" });
      const eventsList: Event[] = eventsRes.ok ? await eventsRes.json() : [];
      const eventMap = new Map(eventsList.map(e => [e.id, e.name]));
      
      // For each sponsor, check for approved logo task completions
      const sponsorsWithLogos: SponsorWithLogo[] = [];
      
      for (const sponsor of sponsors) {
        // Get task completions for this sponsor
        const completionsRes = await fetch(`/api/events/${sponsor.eventId}/sponsor-task-completions`, { credentials: "include" });
        let logoFromTask: string | undefined;
        
        if (completionsRes.ok) {
          const completions: SponsorTaskCompletion[] = await completionsRes.json();
          // Find approved logo_upload completions for this sponsor
          const logoCompletion = completions.find(c => 
            c.sponsorId === sponsor.id && 
            c.status === "approved" && 
            c.submittedData && 
            typeof c.submittedData === 'object' && 
            'logoUrl' in c.submittedData
          );
          if (logoCompletion?.submittedData) {
            logoFromTask = (logoCompletion.submittedData as Record<string, unknown>).logoUrl as string;
          }
        }
        
        // Only include sponsors that have a logo (either from logoUrl or task completion)
        if (sponsor.logoUrl || logoFromTask) {
          sponsorsWithLogos.push({
            ...sponsor,
            eventName: eventMap.get(sponsor.eventId) || "Unknown Event",
            logoFromTask,
          });
        }
      }
      
      return sponsorsWithLogos;
    },
  });

  const form = useForm<ContentFormData>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: {
      title: "",
      eventId: "",
      sessionId: "",
      description: "",
      type: "",
      fileUrl: "",
      category: "",
      tags: "",
      isPublic: false,
    },
  });

  const selectedEventId = form.watch("eventId");

  const { data: eventSessions = [] } = useQuery<EventSession[]>({
    queryKey: ["/api/sessions", selectedEventId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions?eventId=${selectedEventId}`);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: ContentFormData) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map((t) => t.trim()) : [],
      };
      return await apiRequest("POST", "/api/content", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      toast({ title: "Content added successfully" });
      setIsDialogOpen(false);
      form.reset();
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ContentFormData }) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map((t) => t.trim()) : [],
      };
      return await apiRequest("PATCH", `/api/content/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      toast({ title: "Content updated successfully" });
      setIsDialogOpen(false);
      setEditingContent(null);
      form.reset();
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

  const createAssetMutation = useMutation({
    mutationFn: async (data: { fileName: string; mimeType: string; byteSize: number; uploadUrl: string }) => {
      return await apiRequest("POST", "/api/content/assets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content/assets"] });
      toast({ title: "Image uploaded successfully" });
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

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/content/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content/assets"] });
      toast({ title: "Image deleted successfully" });
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

  const backfillSponsorsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/content/assets/backfill-sponsors");
    },
    onSuccess: (data: { updated: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content/assets"] });
      toast({ 
        title: "Sponsor data synced", 
        description: `Updated ${data.updated} asset${data.updated !== 1 ? 's' : ''} with sponsor tier information` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: ContentFormData) => {
    // Convert empty sessionId to null to avoid foreign key constraint violation
    const cleanedData = {
      ...data,
      sessionId: data.sessionId || null,
    };
    if (editingContent) {
      updateMutation.mutate({ id: editingContent.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const handleEdit = (item: ContentItem) => {
    setEditingContent(item);
    form.reset({
      title: item.title,
      eventId: item.eventId,
      sessionId: item.sessionId || "",
      description: item.description || "",
      type: item.type,
      fileUrl: item.fileUrl || "",
      category: item.category || "",
      tags: item.tags?.join(", ") || "",
      isPublic: item.isPublic || false,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingContent(null);
    form.reset();
  };

  const handleUploadComplete = (result: { fileName: string; mimeType: string; byteSize: number; uploadUrl: string }) => {
    createAssetMutation.mutate(result);
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "URL copied to clipboard" });
    } catch (error) {
      toast({ title: "Failed to copy URL", variant: "destructive" });
    }
  };

  const handleDeleteAsset = (id: string) => {
    if (confirm("Are you sure you want to delete this image?")) {
      deleteAssetMutation.mutate(id);
    }
  };

  const filteredContent = contentItems.filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(searchLower) ||
      (item.description?.toLowerCase().includes(searchLower) ?? false) ||
      (item.category?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const groupedContent = filteredContent.reduce((acc, item) => {
    const category = item.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ContentItem[]>);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Content"
        breadcrumbs={[{ label: "Content" }]}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList data-testid="content-tabs">
              <TabsTrigger value="catalog" data-testid="tab-catalog">Content Catalog</TabsTrigger>
              <TabsTrigger value="media" data-testid="tab-media">Media Library</TabsTrigger>
              <TabsTrigger value="sponsor-logos" data-testid="tab-sponsor-logos">Sponsor Logos</TabsTrigger>
            </TabsList>

            <TabsContent value="catalog" className="space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="relative max-w-md flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search"
                  />
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleDialogClose()}>
                  <DialogTrigger asChild>
                    <Button size="icon" className="sm:w-auto sm:px-4" data-testid="button-add-content">
                      <Plus className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Add Content</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingContent ? "Edit Content" : "Add New Content"}</DialogTitle>
                      <DialogDescription>
                        {editingContent ? "Update content details" : "Add a new resource to your content catalog"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <EventSelectField control={form.control} name="eventId" label="Event" required />
                        <FormField
                          control={form.control}
                          name="sessionId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Session (Optional)</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                                value={field.value || "none"}
                                disabled={!selectedEventId}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-sessionId">
                                    <SelectValue placeholder={!selectedEventId ? "Select an event first" : "Select a session"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">No session</SelectItem>
                                  {eventSessions.map((session) => (
                                    <SelectItem key={session.id} value={session.id}>
                                      {session.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>Optionally associate this content with a specific session</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} data-testid="input-description" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-type">
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="document">Document</SelectItem>
                                    <SelectItem value="video">Video</SelectItem>
                                    <SelectItem value="image">Image</SelectItem>
                                    <SelectItem value="link">Link</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., Presentations, Handouts" data-testid="input-category" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="fileUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>File URL</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="https://..." data-testid="input-file-url" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="tags"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tags</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Comma-separated tags" data-testid="input-tags" />
                              </FormControl>
                              <FormDescription>Separate multiple tags with commas</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="isPublic"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Make Public</FormLabel>
                                <FormDescription>
                                  Allow attendees to access this content
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-public"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-2 pt-4">
                          <Button type="button" variant="outline" onClick={handleDialogClose}>
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createMutation.isPending || updateMutation.isPending}
                            data-testid="button-submit-content"
                          >
                            {createMutation.isPending || updateMutation.isPending
                              ? "Saving..."
                              : editingContent
                              ? "Update"
                              : "Add Content"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-40" />
                  ))}
                </div>
              ) : contentItems.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="No content yet"
                  description="Build your content catalog by adding documents, videos, and other resources"
                  action={{
                    label: "Add Content",
                    onClick: () => setIsDialogOpen(true),
                  }}
                />
              ) : filteredContent.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No content matches your search</p>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedContent).map(([category, items]) => (
                    <div key={category}>
                      <h3 className="text-lg font-semibold mb-4">{category}</h3>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {items.map((item) => {
                          const TypeIcon = typeIcons[item.type] || File;
                          return (
                            <Card
                              key={item.id}
                              className="hover-elevate cursor-pointer"
                              onClick={() => handleEdit(item)}
                              data-testid={`card-content-${item.id}`}
                            >
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-md bg-muted">
                                      <TypeIcon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <CardTitle className="text-base truncate">{item.title}</CardTitle>
                                    </div>
                                  </div>
                                  <Badge variant={typeColors[item.type] || "outline"}>
                                    {titleCase(item.type)}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                {item.description && (
                                  <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                                )}
                                {item.tags && item.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {item.tags.slice(0, 3).map((tag, i) => (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                    {item.tags.length > 3 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{item.tags.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center justify-between pt-2">
                                  <Badge variant={item.isPublic ? "default" : "secondary"}>
                                    {item.isPublic ? "Public" : "Private"}
                                  </Badge>
                                  {item.fileUrl && (
                                    <a
                                      href={item.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="media" className="space-y-6">
              {(() => {
                // Compute unique folders from assets
                const folders = Array.from(new Set(contentAssets.map(a => a.folder).filter(Boolean))) as string[];
                const filteredAssets = folderFilter === "all" 
                  ? contentAssets 
                  : contentAssets.filter(a => (a.folder || "") === (folderFilter === "uncategorized" ? "" : folderFilter));
                
                return (
                  <>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <h2 className="text-lg font-semibold">Media Library</h2>
                        <p className="text-sm text-muted-foreground">
                          Upload images to use in your email templates
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {folders.length > 0 && (
                          <Select value={folderFilter} onValueChange={setFolderFilter}>
                            <SelectTrigger className="w-[180px]" data-testid="select-folder-filter">
                              <FolderOpen className="h-4 w-4 mr-2" />
                              <SelectValue placeholder="All Folders" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Files</SelectItem>
                              <SelectItem value="uncategorized">Uncategorized</SelectItem>
                              {folders.map(folder => (
                                <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {folderFilter === "Sponsor Logos" && (
                          <Button
                            variant="outline"
                            onClick={() => backfillSponsorsMutation.mutate()}
                            disabled={backfillSponsorsMutation.isPending}
                            data-testid="button-sync-sponsor-tiers"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${backfillSponsorsMutation.isPending ? 'animate-spin' : ''}`} />
                            {backfillSponsorsMutation.isPending ? 'Syncing...' : 'Sync Tier Data'}
                          </Button>
                        )}
                        <ObjectUploader
                          onComplete={handleUploadComplete}
                          accept="image/*"
                          buttonText="Upload Image"
                        />
                      </div>
                    </div>

                    {assetsLoading ? (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[...Array(8)].map((_, i) => (
                          <Skeleton key={i} className="aspect-square" />
                        ))}
                      </div>
                    ) : contentAssets.length === 0 ? (
                      <EmptyState
                        icon={ImageIcon}
                        title="No images yet"
                        description="Upload images to use in your email templates. Images will be publicly accessible for email rendering."
                        action={{
                          label: "Upload Image",
                          onClick: () => {},
                        }}
                      />
                    ) : filteredAssets.length === 0 ? (
                      <p className="text-center text-muted-foreground py-12">No images match this folder filter</p>
                    ) : folderFilter === "Sponsor Logos" ? (
                      // Group sponsor logos by tier
                      <div className="space-y-8">
                        {tierOrder
                          .filter(tier => filteredAssets.some(a => (a.sponsorTier || "other").toLowerCase() === tier))
                          .map(tier => {
                            const tierAssets = filteredAssets.filter(a => (a.sponsorTier || "other").toLowerCase() === tier);
                            if (tierAssets.length === 0) return null;
                            
                            return (
                              <div key={tier} className="space-y-4">
                                <div className="flex items-center gap-3">
                                  <Badge className={tierColors[tier] || tierColors.other}>
                                    {titleCase(tier)}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {tierAssets.length} logo{tierAssets.length !== 1 ? "s" : ""}
                                  </span>
                                </div>
                                
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                  {tierAssets.map((asset) => (
                                    <Card key={asset.id} className="overflow-hidden" data-testid={`card-asset-${asset.id}`}>
                                      <div className="aspect-video bg-white dark:bg-slate-900 p-4 flex items-center justify-center border-b">
                                        <img
                                          src={asset.publicUrl}
                                          alt={asset.fileName}
                                          className="max-h-full max-w-full object-contain"
                                          data-testid={`img-asset-${asset.id}`}
                                        />
                                      </div>
                                      <CardContent className="p-3 space-y-2">
                                        <p className="text-sm font-medium truncate" title={asset.fileName}>
                                          {asset.fileName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {asset.mimeType} • {Math.round((asset.byteSize || 0) / 1024)} KB
                                        </p>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => handleCopyUrl(asset.publicUrl)}
                                            data-testid={`button-copy-url-${asset.id}`}
                                          >
                                            <Copy className="h-3 w-3 mr-1" />
                                            Copy URL
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleDeleteAsset(asset.id)}
                                            disabled={deleteAssetMutation.isPending}
                                            data-testid={`button-delete-asset-${asset.id}`}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredAssets.map((asset) => (
                          <Card key={asset.id} className="overflow-hidden" data-testid={`card-asset-${asset.id}`}>
                            <div className="aspect-square bg-muted relative">
                              <img
                                src={asset.publicUrl}
                                alt={asset.fileName}
                                className="w-full h-full object-cover"
                                data-testid={`img-asset-${asset.id}`}
                              />
                              {asset.folder && (
                                <Badge 
                                  variant="secondary" 
                                  className="absolute top-2 left-2 text-xs"
                                >
                                  {asset.folder}
                                </Badge>
                              )}
                            </div>
                            <CardContent className="p-3 space-y-2">
                              <p className="text-sm font-medium truncate" title={asset.fileName}>
                                {asset.fileName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {asset.mimeType} • {Math.round((asset.byteSize || 0) / 1024)} KB
                              </p>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleCopyUrl(asset.publicUrl)}
                                  data-testid={`button-copy-url-${asset.id}`}
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy URL
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDeleteAsset(asset.id)}
                                  disabled={deleteAssetMutation.isPending}
                                  data-testid={`button-delete-asset-${asset.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </TabsContent>

            <TabsContent value="sponsor-logos" className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Sponsor Logos</h2>
                  <p className="text-sm text-muted-foreground">
                    All approved sponsor logos organized by sponsorship level
                  </p>
                </div>
              </div>

              {logosLoading ? (
                <div className="space-y-8">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-4">
                      <Skeleton className="h-6 w-32" />
                      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {[...Array(4)].map((_, j) => (
                          <Skeleton key={j} className="aspect-video" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : sponsorLogos.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="No sponsor logos yet"
                  description="Sponsor logos will appear here once sponsors submit and get their logo uploads approved."
                />
              ) : (
                <div className="space-y-8">
                  {tierOrder
                    .filter(tier => sponsorLogos.some(s => (s.tier || "other").toLowerCase() === tier))
                    .map(tier => {
                      const tierSponsors = sponsorLogos.filter(s => (s.tier || "other").toLowerCase() === tier);
                      if (tierSponsors.length === 0) return null;
                      
                      return (
                        <div key={tier} className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Badge className={tierColors[tier] || tierColors.other}>
                              {titleCase(tier)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {tierSponsors.length} sponsor{tierSponsors.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          
                          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {tierSponsors.map((sponsor) => {
                              const logoUrl = sponsor.logoFromTask || sponsor.logoUrl;
                              return (
                                <Card key={sponsor.id} className="overflow-hidden" data-testid={`card-sponsor-logo-${sponsor.id}`}>
                                  <div className="aspect-video bg-white dark:bg-slate-900 p-4 flex items-center justify-center border-b">
                                    {logoUrl ? (
                                      <img
                                        src={logoUrl}
                                        alt={`${sponsor.name} logo`}
                                        className="max-h-full max-w-full object-contain"
                                        data-testid={`img-sponsor-logo-${sponsor.id}`}
                                      />
                                    ) : (
                                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                                    )}
                                  </div>
                                  <CardContent className="p-3 space-y-2">
                                    <p className="text-sm font-medium truncate" title={sponsor.name}>
                                      {sponsor.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {sponsor.eventName}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => {
                                          if (logoUrl) {
                                            navigator.clipboard.writeText(logoUrl);
                                            toast({
                                              title: "Copied!",
                                              description: "Logo URL copied to clipboard",
                                            });
                                          }
                                        }}
                                        disabled={!logoUrl}
                                        data-testid={`button-copy-sponsor-logo-${sponsor.id}`}
                                      >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy URL
                                      </Button>
                                      {logoUrl && (
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          asChild
                                        >
                                          <a href={logoUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-sponsor-logo-${sponsor.id}`}>
                                            <ExternalLink className="h-4 w-4" />
                                          </a>
                                        </Button>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
