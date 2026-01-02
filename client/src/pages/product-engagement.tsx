import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Monitor,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  MapPin,
  User,
  Tag,
  X,
} from "lucide-react";
import type { Event, DemoStation } from "@shared/schema";

const demoStationFormSchema = z.object({
  stationName: z.string().min(1, "Station name is required").max(100),
  productFocus: z.array(z.string()).default([]),
  stationPresenter: z.string().max(255).optional().nullable(),
  stationLocation: z.string().min(1, "Station location is required").max(100),
  activeProgramId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

type DemoStationFormValues = z.infer<typeof demoStationFormSchema>;

export default function ProductEngagement() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<DemoStation | null>(null);
  const [deletingStation, setDeletingStation] = useState<DemoStation | null>(null);
  const [tagInput, setTagInput] = useState("");

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: stations = [], isLoading: stationsLoading } = useQuery<DemoStation[]>({
    queryKey: ["/api/events", selectedEventId, "demo-stations"],
    enabled: !!selectedEventId,
  });

  const form = useForm<DemoStationFormValues>({
    resolver: zodResolver(demoStationFormSchema),
    defaultValues: {
      stationName: "",
      productFocus: [],
      stationPresenter: "",
      stationLocation: "",
      activeProgramId: "",
      isActive: true,
    },
  });

  const productFocus = form.watch("productFocus");

  useEffect(() => {
    if (editingStation) {
      form.reset({
        stationName: editingStation.stationName,
        productFocus: editingStation.productFocus || [],
        stationPresenter: editingStation.stationPresenter || "",
        stationLocation: editingStation.stationLocation,
        activeProgramId: editingStation.activeProgramId || "",
        isActive: editingStation.isActive ?? true,
      });
    } else {
      form.reset({
        stationName: "",
        productFocus: [],
        stationPresenter: "",
        stationLocation: "",
        activeProgramId: "",
        isActive: true,
      });
    }
    setTagInput("");
  }, [editingStation]);

  const createMutation = useMutation({
    mutationFn: async (data: DemoStationFormValues) => {
      return await apiRequest("POST", `/api/events/${selectedEventId}/demo-stations`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "demo-stations"] });
      toast({ title: "Demo station created successfully" });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error creating demo station", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DemoStationFormValues> }) => {
      return await apiRequest("PATCH", `/api/demo-stations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "demo-stations"] });
      toast({ title: "Demo station updated successfully" });
      setEditingStation(null);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error updating demo station", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/demo-stations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "demo-stations"] });
      toast({ title: "Demo station deleted successfully" });
      setDeletingStation(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting demo station", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: DemoStationFormValues) => {
    if (editingStation) {
      updateMutation.mutate({ id: editingStation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !productFocus.includes(trimmed)) {
      form.setValue("productFocus", [...productFocus, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    form.setValue("productFocus", productFocus.filter(t => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const dialogOpen = createDialogOpen || !!editingStation;
  const setDialogOpen = (open: boolean) => {
    if (!open) {
      setCreateDialogOpen(false);
      setEditingStation(null);
      form.reset();
      setTagInput("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Product Engagement"
        breadcrumbs={[{ label: "Programs" }, { label: "Product Engagement" }]}
        actions={
          <div className="flex items-center gap-2">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-[120px] sm:w-[180px]" data-testid="select-event">
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id} data-testid={`select-event-option-${event.id}`}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEventId && (
              <Button
                size="icon"
                className="sm:w-auto sm:px-3"
                onClick={() => setCreateDialogOpen(true)}
                data-testid="button-create-station"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New Station</span>
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-3 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          <p className="text-muted-foreground text-xs sm:text-sm">
            Manage demo stations for your event. Track presenter assignments, product focus areas, and station locations.
          </p>

          {eventsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !selectedEventId ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Monitor className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Select a program to manage demo stations</p>
              </CardContent>
            </Card>
          ) : stationsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : stations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Monitor className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground mb-4">No demo stations yet</p>
                <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first-station">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Station
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stations.map((station) => (
                <Card key={station.id} data-testid={`card-station-${station.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge 
                            variant={station.isActive ? "default" : "secondary"}
                            className="text-xs"
                            data-testid={`badge-station-status-${station.id}`}
                          >
                            {station.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-sm sm:text-base truncate" data-testid={`text-station-name-${station.id}`}>
                          {station.stationName}
                        </h3>
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{station.stationLocation}</span>
                        </div>
                        {station.stationPresenter && (
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground mt-0.5">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{station.stationPresenter}</span>
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="flex-shrink-0" data-testid={`button-station-menu-${station.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditingStation(station)}
                            data-testid={`menu-edit-${station.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingStation(station)}
                            data-testid={`menu-delete-${station.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {station.productFocus && station.productFocus.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {station.productFocus.map((focus, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {focus}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStation ? "Edit Demo Station" : "Create Demo Station"}</DialogTitle>
            <DialogDescription>
              {editingStation ? "Update the demo station details." : "Add a new demo station to your event."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="stationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Station Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Product Demo A" data-testid="input-station-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stationLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Booth A, Demo Table 3" data-testid="input-station-location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stationPresenter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Presenter Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., John Smith" 
                        data-testid="input-station-presenter" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="productFocus"
                render={() => (
                  <FormItem>
                    <FormLabel>Product Focus Areas</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a focus area"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagKeyDown}
                          data-testid="input-product-focus"
                        />
                        <Button type="button" variant="outline" onClick={addTag} data-testid="button-add-focus">
                          Add
                        </Button>
                      </div>
                      {productFocus.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {productFocus.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="gap-1">
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1 hover:text-destructive"
                                data-testid={`button-remove-focus-${idx}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <FormDescription>
                      Press Enter or click Add to add focus areas
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="activeProgramId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program Reference</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Optional program ID" 
                        data-testid="input-active-program" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>Optional reference to a specific program</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Enable this station for the event</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingStation ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingStation} onOpenChange={(open) => !open && setDeletingStation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Demo Station</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingStation?.stationName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingStation && deleteMutation.mutate(deletingStation.id)}
              className="bg-destructive text-destructive-foreground"
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
