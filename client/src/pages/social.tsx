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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { titleCase } from "@/lib/utils";
import {
  Plus,
  Share2,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Clock,
  CheckCircle,
  FileText,
  Calendar,
  Link2,
  Unlink,
  AlertCircle,
  Send,
} from "lucide-react";
import { EventSelectField } from "@/components/event-select-field";
import type { SocialPost, SocialConnection } from "@shared/schema";

const socialFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  platform: z.string().min(1, "Platform is required"),
  content: z.string().min(1, "Content is required"),
  mediaUrl: z.string().optional(),
  scheduledAt: z.string().optional(),
  status: z.string().default("draft"),
});

type SocialFormData = z.infer<typeof socialFormSchema>;

const platformIcons: Record<string, typeof Twitter> = {
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  facebook: Facebook,
};

const platformColors: Record<string, string> = {
  twitter: "text-sky-500",
  linkedin: "text-blue-600",
  instagram: "text-pink-500",
  facebook: "text-blue-500",
};

const platformBgColors: Record<string, string> = {
  twitter: "bg-sky-500/10",
  linkedin: "bg-blue-600/10",
  instagram: "bg-pink-500/10",
  facebook: "bg-blue-500/10",
};

const statusConfig: Record<string, { icon: typeof FileText; color: "default" | "secondary" | "outline" }> = {
  draft: { icon: FileText, color: "secondary" },
  scheduled: { icon: Clock, color: "outline" },
  published: { icon: CheckCircle, color: "default" },
};

const platformNames: Record<string, string> = {
  twitter: "Twitter / X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
};

export default function Social() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("posts");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);

  const { data: posts = [], isLoading: postsLoading } = useQuery<SocialPost[]>({
    queryKey: ["/api/social"],
  });

  const { data: connections = [], isLoading: connectionsLoading } = useQuery<SocialConnection[]>({
    queryKey: ["/api/social-connections"],
  });

  const form = useForm<SocialFormData>({
    resolver: zodResolver(socialFormSchema),
    defaultValues: {
      eventId: "",
      platform: "",
      content: "",
      mediaUrl: "",
      scheduledAt: "",
      status: "draft",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SocialFormData) => {
      const payload = {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
      };
      return await apiRequest("POST", "/api/social", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social"] });
      toast({ title: "Post created successfully" });
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
    mutationFn: async ({ id, data }: { id: string; data: SocialFormData }) => {
      const payload = {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
      };
      return await apiRequest("PATCH", `/api/social/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social"] });
      toast({ title: "Post updated successfully" });
      setIsDialogOpen(false);
      setEditingPost(null);
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/social/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social"] });
      toast({ title: "Post deleted" });
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

  const handleConnect = (platform: string) => {
    if (platform === "linkedin") {
      window.location.href = "/api/social/linkedin/authorize";
    } else {
      connectMutation.mutate(platform);
    }
  };

  const connectMutation = useMutation({
    mutationFn: async (platform: string) => {
      return await apiRequest("POST", "/api/social-connections", { platform, accountName: `My ${platformNames[platform]} Account` });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-connections"] });
      toast({ title: "Platform connected", description: "Your account has been linked" });
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

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/social-connections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-connections"] });
      toast({ title: "Platform disconnected" });
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

  const onSubmit = (data: SocialFormData) => {
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (post: SocialPost) => {
    setEditingPost(post);
    form.reset({
      eventId: post.eventId,
      platform: post.platform,
      content: post.content,
      mediaUrl: post.mediaUrl || "",
      scheduledAt: post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : "",
      status: post.status || "draft",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingPost(null);
    form.reset();
  };

  const publishMutation = useMutation({
    mutationFn: async (postId: string) => {
      return await apiRequest("PATCH", `/api/social/${postId}`, { status: "published" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social"] });
      toast({ title: "Published", description: "Your post has been published successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Publishing failed", description: error.message, variant: "destructive" });
    },
  });

  const handlePublish = (post: SocialPost) => {
    const connection = connections.find(c => c.platform === post.platform && c.isActive);
    if (!connection) {
      toast({
        title: "Platform not connected",
        description: `Connect your ${platformNames[post.platform]} account first to enable direct posting.`,
        variant: "destructive",
      });
      return;
    }
    publishMutation.mutate(post.id);
  };

  const getConnectionForPlatform = (platform: string): SocialConnection | undefined => {
    return connections.find(c => c.platform === platform);
  };

  const groupedByMonth = posts.reduce((acc, post) => {
    const date = post.scheduledAt ? new Date(post.scheduledAt) : new Date(post.createdAt!);
    const monthKey = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(post);
    return acc;
  }, {} as Record<string, SocialPost[]>);

  const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const connectedCount = connections.filter(c => c.isActive && c.accountId).length;

  const allPlatforms = ["twitter", "linkedin", "instagram", "facebook"];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Social Media"
        breadcrumbs={[{ label: "Social Media" }]}
        actions={
          activeTab === "posts" && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleDialogClose()}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-post">
                  <Plus className="h-4 w-4 mr-2" />
                  New Post
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingPost ? "Edit Post" : "Create Social Post"}</DialogTitle>
                  <DialogDescription>
                    {editingPost ? "Update your social post" : "Plan your social media content"}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <EventSelectField control={form.control} />
                    <FormField
                      control={form.control}
                      name="platform"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Platform</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-platform">
                                <SelectValue placeholder="Select platform" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="twitter">Twitter / X</SelectItem>
                              <SelectItem value="linkedin">LinkedIn</SelectItem>
                              <SelectItem value="instagram">Instagram</SelectItem>
                              <SelectItem value="facebook">Facebook</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={4}
                              {...field}
                              placeholder="Write your post content..."
                              data-testid="input-content"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mediaUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Media URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." data-testid="input-media-url" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="scheduledAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Schedule For</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} data-testid="input-scheduled" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-status">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={handleDialogClose}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        data-testid="button-submit-post"
                      >
                        {createMutation.isPending || updateMutation.isPending
                          ? "Saving..."
                          : editingPost
                          ? "Update"
                          : "Create Post"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="posts" data-testid="tab-posts">
                <FileText className="h-4 w-4 mr-2" />
                Posts
              </TabsTrigger>
              <TabsTrigger value="connections" data-testid="tab-connections">
                <Link2 className="h-4 w-4 mr-2" />
                Connections
                {connectedCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{connectedCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="connections">
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Connect your social accounts</AlertTitle>
                  <AlertDescription>
                    Connect your social media accounts to enable direct posting and scheduling. Each platform requires its own API credentials for full functionality.
                  </AlertDescription>
                </Alert>

                {connectionsLoading ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-32" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {allPlatforms.map((platform) => {
                      const Icon = platformIcons[platform];
                      const connection = getConnectionForPlatform(platform);
                      const hasValidToken = connection && connection.isActive && connection.accountId;
                      const needsReconnect = connection && connection.isActive && !connection.accountId;

                      return (
                        <Card key={platform} data-testid={`card-connection-${platform}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-md ${platformBgColors[platform]}`}>
                                  <Icon className={`h-5 w-5 ${platformColors[platform]}`} />
                                </div>
                                <div>
                                  <CardTitle className="text-base">{platformNames[platform]}</CardTitle>
                                  {hasValidToken && connection.accountName && (
                                    <CardDescription>{connection.accountName}</CardDescription>
                                  )}
                                  {needsReconnect && (
                                    <CardDescription className="text-amber-600">Reconnection required</CardDescription>
                                  )}
                                </div>
                              </div>
                              <Badge variant={hasValidToken ? "default" : needsReconnect ? "secondary" : "outline"}>
                                {hasValidToken ? "Connected" : needsReconnect ? "Needs reconnect" : "Not connected"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {hasValidToken && connection ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => disconnectMutation.mutate(connection.id)}
                                disabled={disconnectMutation.isPending}
                                data-testid={`button-disconnect-${platform}`}
                              >
                                <Unlink className="h-4 w-4 mr-2" />
                                {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
                              </Button>
                            ) : needsReconnect ? (
                              <div className="space-y-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => handleConnect(platform)}
                                  disabled={connectMutation.isPending}
                                  data-testid={`button-reconnect-${platform}`}
                                >
                                  <Link2 className="h-4 w-4 mr-2" />
                                  {connectMutation.isPending ? "Connecting..." : "Reconnect Account"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => disconnectMutation.mutate(connection!.id)}
                                  disabled={disconnectMutation.isPending}
                                  data-testid={`button-remove-${platform}`}
                                >
                                  <Unlink className="h-4 w-4 mr-2" />
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => handleConnect(platform)}
                                disabled={connectMutation.isPending}
                                data-testid={`button-connect-${platform}`}
                              >
                                <Link2 className="h-4 w-4 mr-2" />
                                {connectMutation.isPending ? "Connecting..." : "Connect Account"}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">API Configuration Required</CardTitle>
                    <CardDescription>
                      To enable direct posting, you need to obtain API credentials from each platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Twitter className="h-4 w-4 text-sky-500" />
                        <span className="font-medium">Twitter/X:</span>
                        <span className="text-muted-foreground">Requires Developer Account and OAuth 2.0 credentials</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">LinkedIn:</span>
                        <span className="text-muted-foreground">Requires LinkedIn Marketing API access</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-pink-500" />
                        <span className="font-medium">Instagram:</span>
                        <span className="text-muted-foreground">Requires Facebook Business account with Instagram Graph API</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Facebook className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Facebook:</span>
                        <span className="text-muted-foreground">Requires Facebook App with Pages API permissions</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="posts">
              {postsLoading ? (
                <div className="space-y-6">
                  <Skeleton className="h-6 w-32" />
                  <div className="grid gap-4 md:grid-cols-2">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-40" />
                    ))}
                  </div>
                </div>
              ) : posts.length === 0 ? (
                <EmptyState
                  icon={Share2}
                  title="No social posts yet"
                  description="Plan and schedule your social media content to promote your event"
                  action={{
                    label: "New Post",
                    onClick: () => setIsDialogOpen(true),
                  }}
                />
              ) : (
                <div className="space-y-8">
                  {sortedMonths.map((month) => (
                    <div key={month}>
                      <div className="flex items-center gap-2 mb-4">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">{month}</h3>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {groupedByMonth[month]
                          .sort((a, b) => {
                            const dateA = a.scheduledAt ? new Date(a.scheduledAt) : new Date(a.createdAt!);
                            const dateB = b.scheduledAt ? new Date(b.scheduledAt) : new Date(b.createdAt!);
                            return dateA.getTime() - dateB.getTime();
                          })
                          .map((post) => {
                            const PlatformIcon = platformIcons[post.platform] || Share2;
                            const statusCfg = statusConfig[post.status || "draft"];
                            const StatusIcon = statusCfg.icon;
                            const scheduleDate = post.scheduledAt ? new Date(post.scheduledAt) : null;
                            const isConnected = connections.some(c => c.platform === post.platform && c.isActive);

                            return (
                              <Card
                                key={post.id}
                                className="hover-elevate cursor-pointer"
                                onClick={() => handleEdit(post)}
                                data-testid={`card-post-${post.id}`}
                              >
                                <CardHeader className="pb-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <PlatformIcon className={`h-5 w-5 ${platformColors[post.platform] || "text-foreground"}`} />
                                      <CardTitle className="text-sm capitalize">{post.platform}</CardTitle>
                                      {isConnected && (
                                        <Badge variant="outline" className="text-xs">Connected</Badge>
                                      )}
                                    </div>
                                    <Badge variant={statusCfg.color} className="gap-1">
                                      <StatusIcon className="h-3 w-3" />
                                      {titleCase(post.status || "draft")}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <p className="text-sm line-clamp-3">{post.content}</p>
                                  {scheduleDate && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {scheduleDate.toLocaleString()}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 pt-2">
                                    {post.status === "draft" && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePublish(post);
                                        }}
                                        data-testid={`button-publish-${post.id}`}
                                      >
                                        <Send className="h-3 w-3 mr-1" />
                                        Publish
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteMutation.mutate(post.id);
                                      }}
                                      className="text-muted-foreground"
                                      data-testid={`button-delete-${post.id}`}
                                    >
                                      Delete
                                    </Button>
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
          </Tabs>
        </div>
      </div>
    </div>
  );
}
