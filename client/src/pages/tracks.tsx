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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Tag, Trash2, Pencil, Search } from "lucide-react";
import { ColorPicker } from "@/components/color-picker";
import { EventSelectField } from "@/components/event-select-field";
import type { SessionTrack } from "@shared/schema";

const trackFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().optional(),
});

type TrackFormData = z.infer<typeof trackFormSchema>;

export default function Tracks() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<SessionTrack | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: tracks = [], isLoading } = useQuery<SessionTrack[]>({
    queryKey: ["/api/session-tracks"],
  });

  const form = useForm<TrackFormData>({
    resolver: zodResolver(trackFormSchema),
    defaultValues: {
      eventId: "",
      name: "",
      description: "",
      color: "#3B82F6",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TrackFormData) => {
      return await apiRequest("POST", "/api/session-tracks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/session-tracks"] });
      toast({ title: "Content pillar created successfully" });
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
    mutationFn: async ({ id, data }: { id: string; data: TrackFormData }) => {
      return await apiRequest("PATCH", `/api/session-tracks/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/session-tracks"] });
      toast({ title: "Content pillar updated successfully" });
      setIsDialogOpen(false);
      setEditingTrack(null);
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
      return await apiRequest("DELETE", `/api/session-tracks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/session-tracks"] });
      toast({ title: "Content pillar deleted successfully" });
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

  const onSubmit = (data: TrackFormData) => {
    if (editingTrack) {
      updateMutation.mutate({ id: editingTrack.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (track: SessionTrack) => {
    setEditingTrack(track);
    form.reset({
      eventId: track.eventId,
      name: track.name,
      description: track.description || "",
      color: track.color || "#3B82F6",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this content pillar?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTrack(null);
    form.reset();
  };

  const openAddDialog = () => {
    setEditingTrack(null);
    form.reset({
      eventId: "",
      name: "",
      description: "",
      color: "#3B82F6",
    });
    setIsDialogOpen(true);
  };

  const filteredTracks = tracks.filter((track) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      track.name.toLowerCase().includes(searchLower) ||
      (track.description?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading content pillars...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Content Pillars"
        breadcrumbs={[{ label: "Content Experiences", href: "/sessions" }, { label: "Content Pillars" }]}
        actions={
          <Button size="sm" onClick={openAddDialog} data-testid="button-add-track">
            <Plus className="h-4 w-4 mr-2" />
            Content Pillar
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content pillars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>

          {tracks.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No content pillars yet"
              description="Create your first content pillar to organize your experiences by topic or theme"
              action={{
                label: "Create Content Pillar",
                onClick: openAddDialog
              }}
            />
          ) : filteredTracks.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No content pillars match your search</p>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All Content Pillars</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Color</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTracks.map((track) => (
                      <TableRow key={track.id} data-testid={`row-track-${track.id}`}>
                        <TableCell>
                          <div
                            className="w-6 h-6 rounded-md"
                            style={{ backgroundColor: track.color || "#3B82F6" }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{track.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {track.description || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(track)}
                              data-testid={`button-edit-track-${track.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(track.id)}
                              data-testid={`button-delete-track-${track.id}`}
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

      <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleDialogClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTrack ? "Edit Content Pillar" : "Add Content Pillar"}</DialogTitle>
            <DialogDescription>
              {editingTrack ? "Update the content pillar details below" : "Create a new content pillar for organizing your experiences"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <EventSelectField control={form.control} />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Technical, Business, Workshop" {...field} data-testid="input-track-name" />
                    </FormControl>
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
                      <Textarea placeholder="Brief description of this track" {...field} data-testid="input-track-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <ColorPicker
                          value={field.value || "#3B82F6"}
                          onChange={field.onChange}
                        />
                        <span className="text-sm text-muted-foreground">
                          Click to choose a color
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleDialogClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingTrack ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
