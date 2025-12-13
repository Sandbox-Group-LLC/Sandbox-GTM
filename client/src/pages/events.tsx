import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, X, Globe, Calendar, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event } from "@shared/schema";

const eventFormSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  location: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  publicSlug: z.string().optional(),
  status: z.enum(["draft", "published", "cancelled", "completed"]),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

export default function Events() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      location: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      phone: "",
      website: "",
      publicSlug: "",
      status: "draft",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const res = await apiRequest("POST", "/api/events", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EventFormValues }) => {
      const res = await apiRequest("PATCH", `/api/events/${id}`, data);
      return res.json();
    },
    onSuccess: (updatedEvent) => {
      toast({ title: "Event updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setSelectedEvent(updatedEvent);
      setIsEditing(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Event deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setSelectedEvent(null);
      setShowDeleteConfirm(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: EventFormValues) => {
    if (selectedEvent && isEditing) {
      updateMutation.mutate({ id: selectedEvent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsEditing(false);
    setShowDeleteConfirm(false);
  };

  const handleStartEdit = () => {
    if (selectedEvent) {
      form.reset({
        name: selectedEvent.name,
        description: selectedEvent.description || "",
        startDate: selectedEvent.startDate || "",
        endDate: selectedEvent.endDate || "",
        location: selectedEvent.location || "",
        address: selectedEvent.address || "",
        city: selectedEvent.city || "",
        state: selectedEvent.state || "",
        country: selectedEvent.country || "",
        postalCode: selectedEvent.postalCode || "",
        phone: selectedEvent.phone || "",
        website: selectedEvent.website || "",
        publicSlug: selectedEvent.publicSlug || "",
        status: selectedEvent.status as EventFormValues["status"],
      });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    form.reset();
  };

  const handleClosePanel = () => {
    setSelectedEvent(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "published":
        return "default";
      case "draft":
        return "secondary";
      case "cancelled":
        return "destructive";
      case "completed":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Events"
        breadcrumbs={[{ label: "Events" }]}
        actions={
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-new-event">
                <Plus className="h-4 w-4 mr-2" />
                New Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
                <DialogDescription>
                  Add a new event to your management system.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Annual Conference 2025" {...field} data-testid="input-event-name" />
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
                          <Textarea
                            placeholder="Describe your event..."
                            {...field}
                            value={field.value || ""}
                            data-testid="input-event-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-event-start-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-event-end-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venue Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Convention Center"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-event-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123 Main Street"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-event-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="New York"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-event-city"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State/Province</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="NY"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-event-state"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="United States"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-event-country"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="10001"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-event-postal-code"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+1 (555) 123-4567"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-event-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://example.com"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-event-website"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="publicSlug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Public URL Slug</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="my-conference-2025"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-event-public-slug"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-event-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-submit-event"
                    >
                      {createMutation.isPending ? "Creating..." : "Create Event"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 overflow-hidden flex">
        <div className={`flex-1 overflow-auto p-6 ${selectedEvent ? 'hidden md:block md:w-1/2 lg:w-2/3' : ''}`}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-muted-foreground">Loading events...</div>
            </div>
          ) : !events || events.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No events yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Create your first event to get started
                </p>
                <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first-event">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {events.map((event) => (
                <Card 
                  key={event.id} 
                  className={`cursor-pointer hover-elevate ${selectedEvent?.id === event.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => handleSelectEvent(event)}
                  data-testid={`card-event-${event.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate" data-testid={`text-event-name-${event.id}`}>
                          {event.name}
                        </CardTitle>
                        {event.location && (
                          <CardDescription className="truncate">{event.location}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(event.status || "draft")}>
                        {event.status || "draft"}
                      </Badge>
                      {event.isPublic && (
                        <Badge variant="outline">
                          <Globe className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      )}
                    </div>
                    {(event.startDate || event.endDate) && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        {event.startDate && format(new Date(event.startDate), "MMM d, yyyy")}
                        {event.startDate && event.endDate && " - "}
                        {event.endDate && format(new Date(event.endDate), "MMM d, yyyy")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {selectedEvent && (
          <div className="w-full md:w-1/2 lg:w-1/3 border-l bg-background flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-2 p-4 border-b">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleClosePanel}
                className="md:hidden"
                data-testid="button-back-to-list"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="font-semibold truncate flex-1">{isEditing ? "Edit Event" : "Event Details"}</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleClosePanel}
                className="hidden md:flex"
                data-testid="button-close-panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {isEditing ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Annual Conference 2025" {...field} data-testid="input-edit-event-name" />
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
                            <Textarea
                              placeholder="Describe your event..."
                              {...field}
                              value={field.value || ""}
                              data-testid="input-edit-event-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-edit-event-start-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-edit-event-end-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Venue Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Convention Center"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-edit-event-location"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="123 Main Street"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-edit-event-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="New York"
                                {...field}
                                value={field.value || ""}
                                data-testid="input-edit-event-city"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State/Province</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="NY"
                                {...field}
                                value={field.value || ""}
                                data-testid="input-edit-event-state"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="United States"
                                {...field}
                                value={field.value || ""}
                                data-testid="input-edit-event-country"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="10001"
                                {...field}
                                value={field.value || ""}
                                data-testid="input-edit-event-postal-code"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="+1 (555) 123-4567"
                                {...field}
                                value={field.value || ""}
                                data-testid="input-edit-event-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://example.com"
                                {...field}
                                value={field.value || ""}
                                data-testid="input-edit-event-website"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="publicSlug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Public URL Slug</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="my-conference-2025"
                                {...field}
                                value={field.value || ""}
                                data-testid="input-edit-event-public-slug"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-event-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={handleCancelEdit} className="flex-1">
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="flex-1"
                        data-testid="button-update-event"
                      >
                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold" data-testid="text-selected-event-name">{selectedEvent.name}</h3>
                    {selectedEvent.location && (
                      <p className="text-sm text-muted-foreground mt-1">{selectedEvent.location}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getStatusBadgeVariant(selectedEvent.status || "draft")}>
                      {selectedEvent.status || "draft"}
                    </Badge>
                    {selectedEvent.isPublic && (
                      <Badge variant="outline">
                        <Globe className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    )}
                  </div>

                  {(selectedEvent.startDate || selectedEvent.endDate) && (
                    <div>
                      <p className="text-sm font-medium mb-1">Dates</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEvent.startDate && format(new Date(selectedEvent.startDate), "MMMM d, yyyy")}
                        {selectedEvent.startDate && selectedEvent.endDate && " - "}
                        {selectedEvent.endDate && format(new Date(selectedEvent.endDate), "MMMM d, yyyy")}
                      </p>
                    </div>
                  )}

                  {(selectedEvent.address || selectedEvent.city || selectedEvent.state || selectedEvent.country || selectedEvent.postalCode) && (
                    <div>
                      <p className="text-sm font-medium mb-1">Address</p>
                      <div className="text-sm text-muted-foreground">
                        {selectedEvent.address && <p>{selectedEvent.address}</p>}
                        {(selectedEvent.city || selectedEvent.state || selectedEvent.postalCode) && (
                          <p>
                            {selectedEvent.city}{selectedEvent.city && selectedEvent.state && ", "}
                            {selectedEvent.state}{selectedEvent.state && selectedEvent.postalCode && " "}
                            {selectedEvent.postalCode}
                          </p>
                        )}
                        {selectedEvent.country && <p>{selectedEvent.country}</p>}
                      </div>
                    </div>
                  )}

                  {(selectedEvent.phone || selectedEvent.website) && (
                    <div>
                      <p className="text-sm font-medium mb-1">Contact</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {selectedEvent.phone && <p>{selectedEvent.phone}</p>}
                        {selectedEvent.website && (
                          <a 
                            href={selectedEvent.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {selectedEvent.website}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedEvent.description && (
                    <div>
                      <p className="text-sm font-medium mb-1">Description</p>
                      <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      onClick={handleStartEdit}
                      data-testid="button-edit-event"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Event
                    </Button>
                    
                    {showDeleteConfirm ? (
                      <div className="p-3 border rounded-md space-y-3">
                        <p className="text-sm">Are you sure you want to delete this event? This action cannot be undone.</p>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteMutation.mutate(selectedEvent.id)}
                            disabled={deleteMutation.isPending}
                            className="flex-1"
                            data-testid="button-confirm-delete"
                          >
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-destructive hover:text-destructive" 
                        onClick={() => setShowDeleteConfirm(true)}
                        data-testid="button-delete-event"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Event
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
