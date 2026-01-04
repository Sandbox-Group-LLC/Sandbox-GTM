import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, BookOpen, Trash2, Pencil } from "lucide-react";
import type { HelpArticle } from "@shared/schema";

const CATEGORIES = [
  "Getting Started",
  "Events & Programs",
  "Attendees & Registration",
  "Sessions & Agenda",
  "Rooms & Venues",
  "Campaigns & Email",
  "Integrations",
  "Account Settings",
  "Other",
] as const;

const articleFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  keywords: z.string().optional(),
  displayOrder: z.number().int().default(0),
  isPublished: z.boolean().default(true),
});

type ArticleFormData = z.infer<typeof articleFormSchema>;

export default function HelpCenter() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<HelpArticle | null>(null);

  const { data: articles = [], isLoading } = useQuery<HelpArticle[]>({
    queryKey: ["/api/help-articles"],
  });

  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: "",
      category: "",
      content: "",
      keywords: "",
      displayOrder: 0,
      isPublished: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ArticleFormData) => {
      const payload = {
        ...data,
        keywords: data.keywords ? data.keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
      };
      return await apiRequest("POST", "/api/help-articles", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/help-articles"] });
      toast({ title: "Article created successfully" });
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
    mutationFn: async ({ id, data }: { id: string; data: ArticleFormData }) => {
      const payload = {
        ...data,
        keywords: data.keywords ? data.keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
      };
      return await apiRequest("PATCH", `/api/help-articles/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/help-articles"] });
      toast({ title: "Article updated successfully" });
      setIsDialogOpen(false);
      setEditingArticle(null);
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
      return await apiRequest("DELETE", `/api/help-articles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/help-articles"] });
      toast({ title: "Article deleted successfully" });
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

  const onSubmit = (data: ArticleFormData) => {
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (article: HelpArticle) => {
    setEditingArticle(article);
    form.reset({
      title: article.title,
      category: article.category || "",
      content: article.content,
      keywords: article.keywords?.join(", ") || "",
      displayOrder: article.displayOrder || 0,
      isPublished: article.isPublished ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this article?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingArticle(null);
    form.reset();
  };

  const openAddDialog = () => {
    setEditingArticle(null);
    form.reset({
      title: "",
      category: "",
      content: "",
      keywords: "",
      displayOrder: 0,
      isPublished: true,
    });
    setIsDialogOpen(true);
  };

  const sortedArticles = [...articles].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading articles...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Help Center"
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Help Center" }]}
        actions={
          <Button size="sm" onClick={openAddDialog} data-testid="button-new-article">
            <Plus className="h-4 w-4 mr-2" />
            New Article
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {articles.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No articles yet"
              description="Create help documentation articles to assist your users"
              action={{
                label: "Create Article",
                onClick: openAddDialog,
              }}
            />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>Documentation</CardTitle>
                <Button size="sm" onClick={openAddDialog} data-testid="button-new-article-card">
                  <Plus className="h-4 w-4 mr-2" />
                  New Article
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedArticles.map((article) => (
                      <TableRow key={article.id} data-testid={`row-article-${article.id}`}>
                        <TableCell className="font-medium" data-testid={`text-title-${article.id}`}>
                          {article.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`text-category-${article.id}`}>
                          {article.category || "-"}
                        </TableCell>
                        <TableCell data-testid={`status-${article.id}`}>
                          {article.isPublished ? (
                            <Badge variant="default" className="no-default-hover-elevate">Published</Badge>
                          ) : (
                            <Badge variant="secondary" className="no-default-hover-elevate">Draft</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`text-order-${article.id}`}>
                          {article.displayOrder || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(article)}
                              data-testid={`button-edit-article-${article.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(article.id)}
                              data-testid={`button-delete-article-${article.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : handleDialogClose())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingArticle ? "Edit Article" : "New Article"}</DialogTitle>
            <DialogDescription>
              {editingArticle ? "Update the article details below" : "Create a new help documentation article"}
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
                      <Input placeholder="Article title" {...field} data-testid="input-article-title" />
                    </FormControl>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-article-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
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
                        placeholder="Write your article content here..."
                        className="min-h-[200px]"
                        {...field}
                        data-testid="textarea-article-content"
                      />
                    </FormControl>
                    <FormDescription>Supports Markdown formatting</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keywords</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="keyword1, keyword2, keyword3"
                        {...field}
                        data-testid="input-article-keywords"
                      />
                    </FormControl>
                    <FormDescription>Comma-separated list of keywords for search</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[150px]">
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-article-order"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isPublished"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-3 min-w-[200px]">
                      <div className="space-y-0.5">
                        <FormLabel>Published</FormLabel>
                        <FormDescription className="text-xs">
                          Make this article visible
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-article-published"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleDialogClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingArticle
                    ? "Update"
                    : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
