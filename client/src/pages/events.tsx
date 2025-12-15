import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Plus, X, Globe, Calendar, Pencil, Trash2, ArrowLeft, Users, Presentation, Package } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { titleCase } from "@/lib/utils";
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
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EventFormFields, eventFormSchema, type EventFormValues } from "@/components/event-form-fields";
import type { Event, Attendee, EventSession } from "@shared/schema";

export default function Events() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // Fetch attendees for selected event
  const { data: eventAttendees, isLoading: attendeesLoading } = useQuery<Attendee[]>({
    queryKey: ["/api/attendees", selectedEvent?.id],
    queryFn: async () => {
      const res = await fetch(`/api/attendees?eventId=${selectedEvent?.id}`);
      if (!res.ok) throw new Error("Failed to fetch attendees");
      return res.json();
    },
    enabled: !!selectedEvent,
  });

  // Fetch sessions for selected event
  const { data: eventSessionsData, isLoading: sessionsLoading } = useQuery<EventSession[]>({
    queryKey: ["/api/sessions", { eventId: selectedEvent?.id }],
    enabled: !!selectedEvent,
  });

  // Fetch packages for selected event
  const { data: eventPackages, isLoading: packagesLoading } = useQuery<any[]>({
    queryKey: ["/api/events", selectedEvent?.id, "packages"],
    enabled: !!selectedEvent,
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
      isPublic: false,
      registrationOpen: false,
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
        isPublic: selectedEvent.isPublic || false,
        registrationOpen: selectedEvent.registrationOpen || false,
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
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
                <DialogDescription>
                  Add a new event to your management system.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto flex-1 pr-2">
                  <EventFormFields form={form} />
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
                        {titleCase(event.status || "draft")}
                      </Badge>
                      {event.isPublic && (
                        <Badge variant="outline">
                          <Globe className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      )}
                      {event.registrationOpen && (
                        <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
                          Registration Open
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
              <h2 className="font-semibold truncate flex-1">{isEditing ? "Edit Event" : selectedEvent.name}</h2>
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

            <div className="flex-1 overflow-auto">
              {isEditing ? (
                <div className="p-4">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <EventFormFields form={form} testIdPrefix="edit" />
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
                </div>
              ) : (
                <Tabs defaultValue="details" className="flex flex-col h-full">
                  <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0" data-testid="tabs-event-detail">
                    <TabsTrigger 
                      value="details" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                      data-testid="tab-details"
                    >
                      Details
                    </TabsTrigger>
                    <TabsTrigger 
                      value="attendees" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                      data-testid="tab-attendees"
                    >
                      Attendees
                    </TabsTrigger>
                    <TabsTrigger 
                      value="sessions" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                      data-testid="tab-sessions"
                    >
                      Sessions
                    </TabsTrigger>
                    <TabsTrigger 
                      value="packages" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                      data-testid="tab-packages"
                    >
                      Packages
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details" className="flex-1 overflow-auto p-4 mt-0" data-testid="content-details">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold" data-testid="text-selected-event-name">{selectedEvent.name}</h3>
                        {selectedEvent.location && (
                          <p className="text-sm text-muted-foreground mt-1">{selectedEvent.location}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant={getStatusBadgeVariant(selectedEvent.status || "draft")}>
                          {titleCase(selectedEvent.status || "draft")}
                        </Badge>
                        {selectedEvent.isPublic && (
                          <Badge variant="outline">
                            <Globe className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        )}
                        {selectedEvent.registrationOpen && (
                          <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
                            Registration Open
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
                  </TabsContent>

                  <TabsContent value="attendees" className="flex-1 overflow-auto p-4 mt-0" data-testid="content-attendees">
                    {attendeesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-muted-foreground">Loading attendees...</p>
                      </div>
                    ) : eventAttendees && eventAttendees.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground mb-4">{eventAttendees.length} attendee{eventAttendees.length !== 1 ? 's' : ''}</p>
                        {eventAttendees.map((attendee) => (
                          <div key={attendee.id} className="flex items-center gap-3 p-3 border rounded-md" data-testid={`attendee-row-${attendee.id}`}>
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                              {attendee.firstName?.[0]}{attendee.lastName?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{attendee.firstName} {attendee.lastName}</p>
                              <p className="text-sm text-muted-foreground truncate">{attendee.email}</p>
                            </div>
                            <Badge variant={attendee.registrationStatus === 'registered' ? 'default' : 'secondary'}>
                              {titleCase(attendee.registrationStatus || 'pending')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No attendees yet</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          Attendees will appear here once they register for this event.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="sessions" className="flex-1 overflow-auto p-4 mt-0" data-testid="content-sessions">
                    {sessionsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-muted-foreground">Loading sessions...</p>
                      </div>
                    ) : eventSessionsData && eventSessionsData.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground mb-4">{eventSessionsData.length} session{eventSessionsData.length !== 1 ? 's' : ''}</p>
                        {eventSessionsData.map((session) => (
                          <div key={session.id} className="p-3 border rounded-md" data-testid={`session-row-${session.id}`}>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="font-medium">{session.title}</p>
                              {session.sessionType && <Badge variant="secondary">{titleCase(session.sessionType)}</Badge>}
                            </div>
                            {session.sessionDate && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {format(new Date(session.sessionDate), "MMM d, yyyy")}
                                {session.startTime && ` ${session.startTime}`}
                                {session.endTime && ` - ${session.endTime}`}
                              </p>
                            )}
                            {session.room && (
                              <p className="text-sm text-muted-foreground">{session.room}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Presentation className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No sessions yet</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          Sessions for this event will be displayed here.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="packages" className="flex-1 overflow-auto p-4 mt-0" data-testid="content-packages">
                    {packagesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-muted-foreground">Loading packages...</p>
                      </div>
                    ) : eventPackages && eventPackages.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground mb-4">{eventPackages.length} package{eventPackages.length !== 1 ? 's' : ''}</p>
                        {eventPackages.map((pkg: any) => (
                          <div key={pkg.id} className="p-3 border rounded-md" data-testid={`package-row-${pkg.id}`}>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="font-medium">{pkg.name}</p>
                              <Badge variant={pkg.isEnabled !== false ? 'default' : 'secondary'}>
                                ${pkg.effectivePrice ?? pkg.price}
                              </Badge>
                            </div>
                            {pkg.description && (
                              <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Package className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No packages yet</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          Registration packages for this event will be shown here.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
