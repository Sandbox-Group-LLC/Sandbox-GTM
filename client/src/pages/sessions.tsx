import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { titleCase } from "@/lib/utils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Calendar, Clock, MapPin, Users, Search, FileText, ExternalLink } from "lucide-react";
import { EventSelectField } from "@/components/event-select-field";
import { Link } from "wouter";
import type { EventSession, SessionRoom, SessionTrack, Speaker, SessionSpeaker, ContentItem } from "@shared/schema";

const sessionFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  sessionDate: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  room: z.string().optional(),
  capacity: z.string().optional(),
  track: z.string().optional(),
  sessionType: z.string().optional(),
  speakerIds: z.array(z.string()).optional(),
});

type SessionFormData = z.infer<typeof sessionFormSchema>;

const sessionTypeColors: Record<string, "default" | "secondary" | "outline"> = {
  keynote: "default",
  workshop: "secondary",
  panel: "outline",
  breakout: "secondary",
  networking: "secondary",
  reception: "outline",
  breakfast: "outline",
  lunch: "outline",
  dinner: "outline",
  registration: "default",
};

export default function Sessions() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSession, setEditingSession] = useState<EventSession | null>(null);
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState<string[]>([]);

  const { data: sessions = [], isLoading } = useQuery<EventSession[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: rooms = [] } = useQuery<SessionRoom[]>({
    queryKey: ["/api/session-rooms"],
  });

  const { data: tracks = [] } = useQuery<SessionTrack[]>({
    queryKey: ["/api/session-tracks"],
  });

  const { data: allSpeakers = [] } = useQuery<Speaker[]>({
    queryKey: ["/api/speakers"],
  });

  const { data: associatedContent = [] } = useQuery<ContentItem[]>({
    queryKey: ["/api/content", "session", editingSession?.id],
    queryFn: async () => {
      const res = await fetch(`/api/content?sessionId=${editingSession?.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch content");
      return res.json();
    },
    enabled: !!editingSession?.id,
  });

  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      eventId: "",
      title: "",
      description: "",
      sessionDate: "",
      startTime: "",
      endTime: "",
      room: "",
      capacity: "",
      track: "",
      sessionType: "",
      speakerIds: [],
    },
  });

  const watchedEventId = form.watch("eventId");
  const filteredSpeakers = allSpeakers.filter(s => s.eventId === watchedEventId);

  useEffect(() => {
    if (!watchedEventId) {
      setSelectedSpeakerIds([]);
    }
  }, [watchedEventId]);

  const createMutation = useMutation({
    mutationFn: async (data: SessionFormData) => {
      const payload = {
        ...data,
        capacity: data.capacity ? parseInt(data.capacity) : null,
      };
      const response = await apiRequest("POST", "/api/sessions", payload);
      const session = await response.json();
      if (selectedSpeakerIds.length > 0 && session.id) {
        await apiRequest("PUT", `/api/sessions/${session.id}/speakers`, { speakerIds: selectedSpeakerIds });
      }
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Content experience created successfully" });
      setIsDialogOpen(false);
      form.reset();
      setSelectedSpeakerIds([]);
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
    mutationFn: async ({ id, data }: { id: string; data: SessionFormData }) => {
      const payload = {
        ...data,
        capacity: data.capacity ? parseInt(data.capacity) : null,
      };
      const session = await apiRequest("PATCH", `/api/sessions/${id}`, payload);
      await apiRequest("PUT", `/api/sessions/${id}/speakers`, { speakerIds: selectedSpeakerIds });
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Content experience updated successfully" });
      setIsDialogOpen(false);
      setEditingSession(null);
      form.reset();
      setSelectedSpeakerIds([]);
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

  const onSubmit = (data: SessionFormData) => {
    if (editingSession) {
      updateMutation.mutate({ id: editingSession.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = async (session: EventSession) => {
    setEditingSession(session);
    form.reset({
      eventId: session.eventId,
      title: session.title,
      description: session.description || "",
      sessionDate: session.sessionDate,
      startTime: session.startTime,
      endTime: session.endTime,
      room: session.room || "",
      capacity: session.capacity?.toString() || "",
      track: session.track || "",
      sessionType: session.sessionType || "",
      speakerIds: [],
    });
    try {
      const response = await fetch(`/api/sessions/${session.id}/speakers`, { credentials: 'include' });
      if (response.ok) {
        const sessionSpeakers: SessionSpeaker[] = await response.json();
        setSelectedSpeakerIds(sessionSpeakers.map(ss => ss.speakerId));
      }
    } catch (error) {
      console.error("Failed to load session speakers:", error);
    }
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingSession(null);
    form.reset();
    setSelectedSpeakerIds([]);
  };

  const toggleSpeaker = (speakerId: string) => {
    setSelectedSpeakerIds(prev =>
      prev.includes(speakerId)
        ? prev.filter(id => id !== speakerId)
        : [...prev, speakerId]
    );
  };

  const filteredSessions = sessions.filter((session) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      session.title.toLowerCase().includes(searchLower) ||
      (session.room?.toLowerCase().includes(searchLower) ?? false) ||
      (session.track?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const groupedSessions = filteredSessions.reduce((acc, session) => {
    const date = session.sessionDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(session);
    return acc;
  }, {} as Record<string, EventSession[]>);

  const sortedDates = Object.keys(groupedSessions).sort();

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Content Experiences"
        breadcrumbs={[{ label: "Content Experiences" }]}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleDialogClose()}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-session">
                <Plus className="h-4 w-4 mr-2" />
                Add Content Experience
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSession ? "Edit Content Experience" : "Create New Content Experience"}</DialogTitle>
                <DialogDescription>
                  {editingSession ? "Update content experience details" : "Enter the content experience details below"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <EventSelectField control={form.control} />
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
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="sessionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-start-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-end-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="room"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              const selectedRoom = rooms.find(r => r.name === value);
                              if (selectedRoom?.capacity) {
                                form.setValue("capacity", selectedRoom.capacity.toString());
                              }
                            }} 
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-room">
                                <SelectValue placeholder="Select room" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {rooms.map((room) => (
                                <SelectItem key={room.id} value={room.name}>
                                  {room.name}{room.capacity ? ` (${room.capacity})` : ""}
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
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capacity</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-capacity" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="track"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Track</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-track">
                                <SelectValue placeholder="Select track" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tracks.map((track) => (
                                <SelectItem key={track.id} value={track.name}>
                                  <div className="flex items-center gap-2">
                                    {track.color && (
                                      <div
                                        className="w-3 h-3 rounded-sm shrink-0"
                                        style={{ backgroundColor: track.color }}
                                      />
                                    )}
                                    {track.name}
                                  </div>
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
                      name="sessionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Session Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-session-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="keynote">Keynote</SelectItem>
                              <SelectItem value="workshop">Workshop</SelectItem>
                              <SelectItem value="panel">Panel Discussion</SelectItem>
                              <SelectItem value="breakout">Breakout Session</SelectItem>
                              <SelectItem value="networking">Networking</SelectItem>
                              <SelectItem value="reception">Reception</SelectItem>
                              <SelectItem value="breakfast">Breakfast</SelectItem>
                              <SelectItem value="lunch">Lunch</SelectItem>
                              <SelectItem value="dinner">Dinner</SelectItem>
                              <SelectItem value="registration">Registration</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormItem>
                    <FormLabel>Speakers</FormLabel>
                    {!watchedEventId ? (
                      <p className="text-sm text-muted-foreground">Select an event first to assign speakers</p>
                    ) : filteredSpeakers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No speakers available for this event</p>
                    ) : (
                      <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto" data-testid="speakers-list">
                        {filteredSpeakers.map((speaker) => (
                          <div key={speaker.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`speaker-${speaker.id}`}
                              checked={selectedSpeakerIds.includes(speaker.id)}
                              onCheckedChange={() => toggleSpeaker(speaker.id)}
                              data-testid={`checkbox-speaker-${speaker.id}`}
                            />
                            <label
                              htmlFor={`speaker-${speaker.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {speaker.firstName} {speaker.lastName}
                              {speaker.company && <span className="text-muted-foreground ml-1">({speaker.company})</span>}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </FormItem>

                  {editingSession && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Associated Content
                        </h4>
                        <Link href="/content">
                          <Button variant="ghost" size="sm" type="button" className="gap-1">
                            <ExternalLink className="h-3 w-3" />
                            Manage Content
                          </Button>
                        </Link>
                      </div>
                      {associatedContent.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No content linked to this session. Go to Content to associate items.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {associatedContent.map((content) => (
                            <div
                              key={content.id}
                              className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md text-sm"
                              data-testid={`content-item-${content.id}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="truncate">{content.title}</span>
                              </div>
                              <Badge variant="outline" className="shrink-0 text-xs">
                                {titleCase(content.type)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit-session"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? "Saving..."
                        : editingSession
                        ? "Update"
                        : "Create Content Experience"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content experiences..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>

          {isLoading ? (
            <div className="space-y-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, j) => (
                      <Skeleton key={j} className="h-40" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No content experiences yet"
              description="Start building your agenda by adding content experiences"
              action={{
                label: "Add Content Experience",
                onClick: () => setIsDialogOpen(true),
              }}
            />
          ) : filteredSessions.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No content experiences match your search</p>
          ) : (
            <div className="space-y-8">
              {sortedDates.map((date) => (
                <div key={date}>
                  <h3 className="text-lg font-semibold mb-4">{new Date(date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {groupedSessions[date]
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map((session) => (
                        <Card
                          key={session.id}
                          className="hover-elevate cursor-pointer"
                          onClick={() => handleEdit(session)}
                          data-testid={`card-session-${session.id}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-base line-clamp-2">{session.title}</CardTitle>
                              {session.sessionType && (
                                <Badge variant={sessionTypeColors[session.sessionType] || "secondary"} className="shrink-0">
                                  {titleCase(session.sessionType)}
                                </Badge>
                              )}
                            </div>
                            {session.description && (
                              <CardDescription className="line-clamp-2">{session.description}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {session.startTime} - {session.endTime}
                              </span>
                              {session.room && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {session.room}
                                </span>
                              )}
                              {session.capacity && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" />
                                  {session.capacity}
                                </span>
                              )}
                            </div>
                            {session.track && (
                              <Badge variant="outline" className="text-xs">{titleCase(session.track)}</Badge>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
