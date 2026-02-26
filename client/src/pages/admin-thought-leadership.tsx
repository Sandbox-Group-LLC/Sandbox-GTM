import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Clock,
  Eye,
} from "lucide-react";
import { format } from "date-fns";

interface Article {
  id: string;
  title: string;
  slug: string;
  contentHtml: string | null;
  contentMarkdown: string | null;
  metaDescription: string | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  author: string | null;
  status: string;
  lang: string | null;
  tags: string[] | null;
  readTimeMinutes: number | null;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ArticleForm {
  title: string;
  slug: string;
  contentHtml: string;
  metaDescription: string;
  heroImageUrl: string;
  heroImageAlt: string;
  author: string;
  status: string;
  lang: string;
  tags: string;
}

const emptyForm: ArticleForm = {
  title: "",
  slug: "",
  contentHtml: "",
  metaDescription: "",
  heroImageUrl: "",
  heroImageAlt: "",
  author: "",
  status: "draft",
  lang: "en",
  tags: "",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminThoughtLeadership() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleForm>(emptyForm);
  const [autoSlug, setAutoSlug] = useState(true);

  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ["/api/thought-leadership/articles"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ArticleForm) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
        contentHtml: data.contentHtml || null,
        metaDescription: data.metaDescription || null,
        heroImageUrl: data.heroImageUrl || null,
        heroImageAlt: data.heroImageAlt || null,
        author: data.author || null,
      };
      if (editingId) {
        return apiRequest("PATCH", `/api/thought-leadership/articles/${editingId}`, payload);
      }
      return apiRequest("POST", "/api/thought-leadership/articles", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/thought-leadership/articles"] });
      toast({ title: editingId ? "Article updated" : "Article created" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Error saving article", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/thought-leadership/articles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/thought-leadership/articles"] });
      toast({ title: "Article deleted" });
      setDeleteDialogOpen(false);
      setDeletingId(null);
    },
    onError: () => {
      toast({ title: "Error deleting article", variant: "destructive" });
    },
  });

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setAutoSlug(true);
    setDialogOpen(true);
  }

  function openEdit(article: Article) {
    setEditingId(article.id);
    setForm({
      title: article.title,
      slug: article.slug,
      contentHtml: article.contentHtml || "",
      metaDescription: article.metaDescription || "",
      heroImageUrl: article.heroImageUrl || "",
      heroImageAlt: article.heroImageAlt || "",
      author: article.author || "",
      status: article.status,
      lang: article.lang || "en",
      tags: article.tags?.join(", ") || "",
    });
    setAutoSlug(false);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleTitleChange(title: string) {
    setForm((prev) => ({
      ...prev,
      title,
      slug: autoSlug ? slugify(title) : prev.slug,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.slug) {
      toast({ title: "Title and slug are required", variant: "destructive" });
      return;
    }
    if (!form.contentHtml) {
      toast({ title: "Content is required", variant: "destructive" });
      return;
    }
    saveMutation.mutate(form);
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "publish": return "default";
      case "draft": return "secondary";
      case "pending": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto" data-testid="admin-thought-leadership-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Thought Leadership</h1>
          <p className="text-muted-foreground mt-1">Manage blog articles published on the public site</p>
        </div>
        <Button onClick={openNew} data-testid="button-new-article">
          <Plus className="h-4 w-4 mr-2" />
          New Article
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-5 bg-muted rounded w-1/3 mb-3" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No articles yet. Create your first one to get started.</p>
            <Button onClick={openNew} variant="outline" data-testid="button-new-article-empty">
              <Plus className="h-4 w-4 mr-2" />
              Create Article
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Card key={article.id} data-testid={`card-article-${article.id}`}>
              <CardContent className="p-4 flex items-center gap-4">
                {article.heroImageUrl && (
                  <img
                    src={article.heroImageUrl}
                    alt={article.heroImageAlt || article.title}
                    className="w-20 h-14 object-cover rounded"
                    data-testid={`img-article-hero-${article.id}`}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate" data-testid={`text-article-title-${article.id}`}>
                      {article.title}
                    </h3>
                    <Badge variant={statusColor(article.status)} data-testid={`badge-status-${article.id}`}>
                      {article.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span data-testid={`text-article-slug-${article.id}`}>/{article.slug}</span>
                    {article.author && <span>by {article.author}</span>}
                    {article.readTimeMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {article.readTimeMinutes} min
                      </span>
                    )}
                    {article.publishedAt && (
                      <span>{format(new Date(article.publishedAt), "MMM d, yyyy")}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {article.status === "publish" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      data-testid={`button-view-${article.id}`}
                    >
                      <a href={`/thought-leadership/${article.slug}`} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(article)}
                    data-testid={`button-edit-${article.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setDeletingId(article.id); setDeleteDialogOpen(true); }}
                    data-testid={`button-delete-${article.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingId ? "Edit Article" : "New Article"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-article">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Article title"
                  data-testid="input-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => { setAutoSlug(false); setForm((p) => ({ ...p, slug: e.target.value })); }}
                  placeholder="article-url-slug"
                  data-testid="input-slug"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contentHtml">Content (HTML) *</Label>
              <Textarea
                id="contentHtml"
                value={form.contentHtml}
                onChange={(e) => setForm((p) => ({ ...p, contentHtml: e.target.value }))}
                placeholder="<p>Write your article content here...</p>"
                rows={12}
                className="font-mono text-sm"
                data-testid="input-content"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaDescription">Meta Description</Label>
              <Textarea
                id="metaDescription"
                value={form.metaDescription}
                onChange={(e) => setForm((p) => ({ ...p, metaDescription: e.target.value }))}
                placeholder="Brief summary for SEO..."
                rows={2}
                data-testid="input-meta-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="heroImageUrl">Hero Image URL</Label>
                <Input
                  id="heroImageUrl"
                  value={form.heroImageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, heroImageUrl: e.target.value }))}
                  placeholder="https://..."
                  data-testid="input-hero-image"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heroImageAlt">Hero Image Alt Text</Label>
                <Input
                  id="heroImageAlt"
                  value={form.heroImageAlt}
                  onChange={(e) => setForm((p) => ({ ...p, heroImageAlt: e.target.value }))}
                  placeholder="Image description"
                  data-testid="input-hero-alt"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={form.author}
                  onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
                  placeholder="Author name"
                  data-testid="input-author"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm((p) => ({ ...p, status: value }))}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="publish">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lang">Language</Label>
                <Select
                  value={form.lang}
                  onValueChange={(value) => setForm((p) => ({ ...p, lang: value }))}
                >
                  <SelectTrigger data-testid="select-lang">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                placeholder="events, marketing, strategy"
                data-testid="input-tags"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save">
                {saveMutation.isPending ? "Saving..." : editingId ? "Update Article" : "Create Article"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the article. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}