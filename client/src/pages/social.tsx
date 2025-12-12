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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Share2, Twitter, Linkedin, Instagram, Facebook, Clock, CheckCircle, FileText, Calendar } from "lucide-react";
import type { SocialPost } from "@shared/schema";

const socialFormSchema = z.object({
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

const statusConfig: Record<string, { icon: typeof FileText; color: "default" | "secondary" | "outline" }> = {
  draft: { icon: FileText, color: "secondary" },
  scheduled: { icon: Clock, color: "outline" },
  published: { icon: CheckCircle, color: "default" },
};

export default function Social() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);

  const { data: posts = [], isLoading } = useQuery<SocialPost[]>({
    queryKey: ["/api/social"],
  });

  const form = useForm<SocialFormData>({
    resolver: zodResolver(socialFormSchema),
    defaultValues: {
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

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Social Media"
        breadcrumbs={[{ label: "Social Media" }]}
        actions={
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
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {isLoading ? (
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
            sortedMonths.map((month) => (
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
                              </div>
                              <Badge variant={statusCfg.color} className="gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {post.status || "draft"}
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
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
