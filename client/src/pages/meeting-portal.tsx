import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Users,
  Calendar,
  Send,
  Loader2,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  LogOut,
  MessageSquare,
  User,
  Building2,
  Briefcase,
  AlertTriangle,
  DoorOpen,
} from "lucide-react";
import {
  MEETING_INTENT_TYPES,
  MEETING_OUTCOME_TYPES,
  DEAL_RANGE_TYPES,
  TIMELINE_TYPES,
  MEETING_PORTAL_PERMISSIONS,
  type MeetingPortalMember,
  type AttendeeMeeting,
  type SessionRoom,
} from "@shared/schema";

interface RoomAssignment {
  id: string;
  roomId: string;
  userId?: string | null;
  meetingPortalMemberId?: string | null;
  isPrimary: boolean;
}

interface RoomConflict {
  id: string;
  startTime: string;
  endTime: string;
  title?: string;
}

const INTENT_TYPE_LABELS: Record<string, string> = {
  exploring_solution: "Exploring Solution",
  evaluating_fit: "Evaluating Fit",
  existing_customer: "Existing Customer",
  partnership: "Partnership",
  networking: "Networking",
};

const OUTCOME_TYPE_LABELS: Record<string, string> = {
  no_fit: "No Fit",
  early_interest: "Early Interest",
  active_opportunity: "Active Opportunity",
  strong_opportunity: "Strong Opportunity",
  deal_in_progress: "Deal in Progress",
};

const DEAL_RANGE_LABELS: Record<string, string> = {
  under_25k: "Under $25K",
  "25k_to_100k": "$25K - $100K",
  over_100k: "Over $100K",
};

const TIMELINE_LABELS: Record<string, string> = {
  now: "Now",
  this_quarter: "This Quarter",
  later: "Later",
};

interface PortalMemberInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  phone?: string;
  permissions: string[];
  eventId: string;
  eventName: string;
  organizationName: string;
}

interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  jobTitle?: string;
}

interface MeetingWithDetails extends AttendeeMeeting {
  invitee?: Attendee;
}

function getToken(): string | null {
  return localStorage.getItem("meetingPortalToken");
}

function MeetingStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "confirmed":
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Confirmed
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    case "declined":
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Declined
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="default" className="bg-blue-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline">
          <XCircle className="w-3 h-3 mr-1" />
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          {status}
        </Badge>
      );
  }
}

const requestMeetingSchema = z.object({
  inviteeId: z.string().min(1, "Please select an attendee"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().optional(),
  virtualLink: z.string().url("Invalid URL").optional().or(z.literal("")),
  message: z.string().optional(),
  intentType: z.enum(MEETING_INTENT_TYPES as unknown as [string, ...string[]], {
    required_error: "Please select an intent type",
  }),
  roomId: z.string().optional(),
});

type RequestMeetingFormData = z.infer<typeof requestMeetingSchema>;

const outcomeSchema = z.object({
  outcomeType: z.enum(MEETING_OUTCOME_TYPES as unknown as [string, ...string[]], {
    required_error: "Please select an outcome type",
  }),
  dealRange: z.enum(DEAL_RANGE_TYPES as unknown as [string, ...string[]]).optional(),
  timeline: z.enum(TIMELINE_TYPES as unknown as [string, ...string[]]).optional(),
  outcomeNotes: z.string().optional(),
});

type OutcomeFormData = z.infer<typeof outcomeSchema>;

function AttendeesTab({ eventId, token }: { eventId: string; token: string }) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: attendees, isLoading, error } = useQuery<Attendee[]>({
    queryKey: ["/api/meeting-portal", eventId, "attendees"],
    queryFn: async () => {
      const response = await fetch(`/api/meeting-portal/${eventId}/attendees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load attendees");
      return response.json();
    },
  });

  const filteredAttendees = attendees?.filter((attendee) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      attendee.firstName?.toLowerCase().includes(searchLower) ||
      attendee.lastName?.toLowerCase().includes(searchLower) ||
      attendee.email?.toLowerCase().includes(searchLower) ||
      attendee.company?.toLowerCase().includes(searchLower) ||
      attendee.jobTitle?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <span>Failed to load attendees. Please try again.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search attendees by name, email, or company..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-attendees"
        />
      </div>

      {filteredAttendees && filteredAttendees.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Job Title</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendees.map((attendee) => (
                <TableRow key={attendee.id} data-testid={`row-attendee-${attendee.id}`}>
                  <TableCell className="font-medium">
                    {attendee.firstName} {attendee.lastName}
                  </TableCell>
                  <TableCell>{attendee.email}</TableCell>
                  <TableCell>{attendee.company || "-"}</TableCell>
                  <TableCell>{attendee.jobTitle || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {searchTerm ? "No attendees found matching your search." : "No attendees available."}
        </div>
      )}
    </div>
  );
}

function MyMeetingsTab({ 
  eventId, 
  token,
  canCaptureOutcome,
}: { 
  eventId: string; 
  token: string;
  canCaptureOutcome: boolean;
}) {
  const { toast } = useToast();
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingWithDetails | null>(null);

  const { data: meetings, isLoading, error } = useQuery<MeetingWithDetails[]>({
    queryKey: ["/api/meeting-portal", eventId, "meetings"],
    queryFn: async () => {
      const response = await fetch(`/api/meeting-portal/${eventId}/meetings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load meetings");
      return response.json();
    },
  });

  const outcomeForm = useForm<OutcomeFormData>({
    resolver: zodResolver(outcomeSchema),
    defaultValues: {
      outcomeType: undefined,
      dealRange: undefined,
      timeline: undefined,
      outcomeNotes: "",
    },
  });

  const outcomeMutation = useMutation({
    mutationFn: async (data: OutcomeFormData) => {
      if (!selectedMeeting) throw new Error("No meeting selected");
      const response = await fetch(
        `/api/meeting-portal/${eventId}/meetings/${selectedMeeting.id}/outcome`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to capture outcome");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Outcome Captured", description: "Meeting outcome has been saved." });
      setOutcomeDialogOpen(false);
      setSelectedMeeting(null);
      outcomeForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-portal", eventId, "meetings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to capture outcome",
        variant: "destructive",
      });
    },
  });

  const handleCaptureOutcome = (meeting: MeetingWithDetails) => {
    setSelectedMeeting(meeting);
    outcomeForm.reset({
      outcomeType: meeting.outcomeType as OutcomeFormData["outcomeType"] || undefined,
      dealRange: meeting.dealRange as OutcomeFormData["dealRange"] || undefined,
      timeline: meeting.timeline as OutcomeFormData["timeline"] || undefined,
      outcomeNotes: meeting.outcomeNotes || "",
    });
    setOutcomeDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <span>Failed to load meetings. Please try again.</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {meetings && meetings.length > 0 ? (
          meetings.map((meeting) => (
            <Card key={meeting.id} data-testid={`card-meeting-${meeting.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-lg">
                      Meeting with {meeting.invitee?.firstName} {meeting.invitee?.lastName}
                    </CardTitle>
                    <CardDescription>
                      {meeting.invitee?.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {meeting.invitee.company}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <MeetingStatusBadge status={meeting.status || "pending"} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {meeting.startTime ? format(new Date(meeting.startTime), "PPp") : "Not scheduled"}
                  </div>
                  <div>
                    <Badge variant="outline">
                      {INTENT_TYPE_LABELS[meeting.intentType || ""] || meeting.intentType}
                    </Badge>
                  </div>
                </div>

                {meeting.message && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4 mt-0.5" />
                    <span>{meeting.message}</span>
                  </div>
                )}

                {meeting.outcomeType && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium mb-2">Outcome</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{OUTCOME_TYPE_LABELS[meeting.outcomeType] || meeting.outcomeType}</Badge>
                      {meeting.dealRange && (
                        <Badge variant="secondary">{DEAL_RANGE_LABELS[meeting.dealRange]}</Badge>
                      )}
                      {meeting.timeline && (
                        <Badge variant="secondary">{TIMELINE_LABELS[meeting.timeline]}</Badge>
                      )}
                    </div>
                    {meeting.outcomeNotes && (
                      <p className="text-sm text-muted-foreground mt-2">{meeting.outcomeNotes}</p>
                    )}
                  </div>
                )}

                {canCaptureOutcome && (meeting.status === "pending" || meeting.status === "confirmed" || meeting.status === "completed") && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCaptureOutcome(meeting)}
                      data-testid={`button-capture-outcome-${meeting.id}`}
                    >
                      {meeting.outcomeType ? "Edit Outcome" : "Capture Outcome"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No meetings requested yet.</p>
            <p className="text-sm">Switch to the "Request Meeting" tab to schedule a meeting.</p>
          </div>
        )}
      </div>

      <Dialog open={outcomeDialogOpen} onOpenChange={setOutcomeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Capture Meeting Outcome</DialogTitle>
            <DialogDescription>
              Record the outcome of your meeting with {selectedMeeting?.invitee?.firstName}{" "}
              {selectedMeeting?.invitee?.lastName}
            </DialogDescription>
          </DialogHeader>
          <Form {...outcomeForm}>
            <form onSubmit={outcomeForm.handleSubmit((data) => outcomeMutation.mutate(data))} className="space-y-4">
              <FormField
                control={outcomeForm.control}
                name="outcomeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outcome Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-outcome-type">
                          <SelectValue placeholder="Select outcome type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MEETING_OUTCOME_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {OUTCOME_TYPE_LABELS[type] || type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={outcomeForm.control}
                name="dealRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Range</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-deal-range">
                          <SelectValue placeholder="Select deal range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEAL_RANGE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {DEAL_RANGE_LABELS[type] || type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={outcomeForm.control}
                name="timeline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timeline</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-timeline">
                          <SelectValue placeholder="Select timeline" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIMELINE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {TIMELINE_LABELS[type] || type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={outcomeForm.control}
                name="outcomeNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes about the meeting..."
                        {...field}
                        data-testid="input-outcome-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOutcomeDialogOpen(false)}
                  data-testid="button-cancel-outcome"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={outcomeMutation.isPending} data-testid="button-save-outcome">
                  {outcomeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Outcome"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RequestMeetingTab({ eventId, token, memberId }: { eventId: string; token: string; memberId: string }) {
  const { toast } = useToast();

  const { data: attendees, isLoading: attendeesLoading } = useQuery<Attendee[]>({
    queryKey: ["/api/meeting-portal", eventId, "attendees"],
    queryFn: async () => {
      const response = await fetch(`/api/meeting-portal/${eventId}/attendees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load attendees");
      return response.json();
    },
  });

  const { data: allRooms } = useQuery<SessionRoom[]>({
    queryKey: ["/api/meeting-portal", eventId, "rooms"],
    queryFn: async () => {
      const response = await fetch(`/api/meeting-portal/${eventId}/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load rooms");
      return response.json();
    },
  });

  const { data: roomAssignments } = useQuery<RoomAssignment[]>({
    queryKey: ["/api/meeting-portal", eventId, "room-assignments", { meetingPortalMemberId: memberId }],
    queryFn: async () => {
      // Issue 1 fix: Pass meetingPortalMemberId to filter assignments for the current member
      const params = new URLSearchParams();
      params.append("meetingPortalMemberId", memberId);
      const response = await fetch(`/api/meeting-portal/${eventId}/room-assignments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load room assignments");
      return response.json();
    },
  });

  const myAssignedRoom = useMemo(() => {
    if (!roomAssignments || !memberId) return null;
    const assignment = roomAssignments.find(a => a.meetingPortalMemberId === memberId && a.isPrimary);
    if (assignment && allRooms) {
      return allRooms.find(r => r.id === assignment.roomId);
    }
    return null;
  }, [roomAssignments, allRooms, memberId]);

  const form = useForm<RequestMeetingFormData>({
    resolver: zodResolver(requestMeetingSchema),
    defaultValues: {
      inviteeId: "",
      startTime: "",
      endTime: "",
      location: "",
      virtualLink: "",
      message: "",
      intentType: undefined,
      roomId: "",
    },
  });

  const watchedStartTime = useWatch({ control: form.control, name: "startTime" });
  const watchedEndTime = useWatch({ control: form.control, name: "endTime" });
  const watchedRoomId = useWatch({ control: form.control, name: "roomId" });

  const { data: availableRooms } = useQuery<SessionRoom[]>({
    queryKey: ["/api/meeting-portal", eventId, "rooms", "available", watchedStartTime, watchedEndTime],
    enabled: !!watchedStartTime && !!watchedEndTime && !myAssignedRoom,
    queryFn: async () => {
      const params = new URLSearchParams({
        startTime: new Date(watchedStartTime).toISOString(),
        endTime: new Date(watchedEndTime).toISOString(),
      });
      const response = await fetch(`/api/meeting-portal/${eventId}/rooms/available?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch available rooms");
      return response.json();
    },
  });

  const { data: roomConflicts } = useQuery<RoomConflict[]>({
    queryKey: ["/api/meeting-portal", eventId, "rooms", watchedRoomId, "conflicts", watchedStartTime, watchedEndTime],
    enabled: !!watchedRoomId && !!watchedStartTime && !!watchedEndTime,
    queryFn: async () => {
      const params = new URLSearchParams({
        startTime: new Date(watchedStartTime).toISOString(),
        endTime: new Date(watchedEndTime).toISOString(),
      });
      const response = await fetch(`/api/meeting-portal/${eventId}/rooms/${watchedRoomId}/conflicts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to check room conflicts");
      return response.json();
    },
  });

  useEffect(() => {
    if (myAssignedRoom && !form.getValues("roomId")) {
      form.setValue("roomId", myAssignedRoom.id);
    }
  }, [myAssignedRoom, form]);

  const requestMutation = useMutation({
    mutationFn: async (data: RequestMeetingFormData) => {
      const response = await fetch(`/api/meeting-portal/${eventId}/meetings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          startTime: new Date(data.startTime).toISOString(),
          endTime: new Date(data.endTime).toISOString(),
          location: data.location || undefined,
          virtualLink: data.virtualLink || undefined,
          message: data.message || undefined,
          roomId: data.roomId || undefined,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to request meeting");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Meeting Requested", description: "Your meeting request has been sent." });
      form.reset({
        inviteeId: "",
        startTime: "",
        endTime: "",
        location: "",
        virtualLink: "",
        message: "",
        intentType: undefined,
        roomId: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-portal", eventId, "meetings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to request meeting",
        variant: "destructive",
      });
    },
  });

  if (attendeesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request a Meeting</CardTitle>
        <CardDescription>
          Select an attendee and propose a meeting time. They will receive a notification to accept or decline.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => requestMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="inviteeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Attendee *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-attendee">
                        <SelectValue placeholder="Select an attendee to meet with" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {attendees?.map((attendee) => (
                        <SelectItem key={attendee.id} value={attendee.id}>
                          {attendee.firstName} {attendee.lastName}
                          {attendee.company ? ` - ${attendee.company}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time *</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} data-testid="input-start-time" />
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
                    <FormLabel>End Time *</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} data-testid="input-end-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="intentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Intent *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-intent-type">
                        <SelectValue placeholder="Select the purpose of this meeting" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MEETING_INTENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {INTENT_TYPE_LABELS[type] || type}
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
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                    value={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-room">
                        <SelectValue placeholder="Select a room" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No room selected</SelectItem>
                      {allRooms?.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          <div className="flex items-center gap-2">
                            <DoorOpen className="h-4 w-4" />
                            {room.name}
                            {room.capacity && <span className="text-muted-foreground">({room.capacity})</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {myAssignedRoom && myAssignedRoom.id === field.value && (
                    <p className="text-xs text-muted-foreground">Your assigned room</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {roomConflicts && roomConflicts.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">Room Conflict Warning</p>
                  <p className="text-xs mt-1">
                    This room has {roomConflicts.length} conflicting booking(s) at the selected time.
                  </p>
                </div>
              </div>
            )}

            {!myAssignedRoom && watchedStartTime && watchedEndTime && availableRooms && availableRooms.length > 0 && !watchedRoomId && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <DoorOpen className="h-4 w-4" />
                  Available Rooms
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableRooms.slice(0, 3).map((room) => (
                    <Button
                      key={room.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => form.setValue("roomId", room.id)}
                      data-testid={`button-select-available-room-${room.id}`}
                    >
                      {room.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Booth #123, Conference Room A" {...field} data-testid="input-location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="virtualLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Virtual Meeting Link</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., https://zoom.us/j/..." {...field} data-testid="input-virtual-link" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a personal message to include with your meeting request..."
                      {...field}
                      data-testid="input-message"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={requestMutation.isPending} className="w-full" data-testid="button-request-meeting">
              {requestMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Request...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Request Meeting
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function MeetingPortal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("attendees");

  const token = getToken();

  const { data: memberInfo, isLoading, error } = useQuery<PortalMemberInfo>({
    queryKey: ["/api/meeting-portal/me"],
    queryFn: async () => {
      if (!token) throw new Error("No token");
      const response = await fetch("/api/meeting-portal/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("meetingPortalToken");
          throw new Error("Session expired. Please log in again.");
        }
        throw new Error("Failed to load profile");
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  const handleLogout = () => {
    localStorage.removeItem("meetingPortalToken");
    toast({ title: "Logged Out", description: "You have been logged out of the meeting portal." });
    setLocation("/meeting-portal/login");
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Meeting Portal</CardTitle>
            <CardDescription>Please log in to access the meeting portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/meeting-portal/login")} className="w-full" data-testid="button-go-to-login">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Error</CardTitle>
            </div>
            <CardDescription>{(error as Error).message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/meeting-portal/login")} className="w-full" data-testid="button-login-again">
              Log In Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!memberInfo) {
    return null;
  }

  const canRequestMeetings = memberInfo.permissions?.includes(MEETING_PORTAL_PERMISSIONS.REQUEST_MEETINGS);
  const canViewAttendees = memberInfo.permissions?.includes(MEETING_PORTAL_PERMISSIONS.VIEW_ATTENDEES);
  const canCaptureOutcome = memberInfo.permissions?.includes(MEETING_PORTAL_PERMISSIONS.CAPTURE_OUTCOMES);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold truncate" data-testid="text-event-name">{memberInfo.eventName}</h1>
              <p className="text-sm text-muted-foreground truncate">{memberInfo.organizationName}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium" data-testid="text-member-name">
                  {memberInfo.firstName} {memberInfo.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{memberInfo.email}</p>
              </div>
              <Button variant="outline" size="icon" onClick={handleLogout} data-testid="button-logout" title="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 w-full sm:w-auto flex-wrap sm:flex-nowrap h-auto gap-1" data-testid="tabs-navigation">
            {canViewAttendees && (
              <TabsTrigger value="attendees" className="flex-1 sm:flex-none text-xs sm:text-sm" data-testid="tab-attendees">
                <Users className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Attendees</span>
                <span className="xs:hidden">List</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="meetings" className="flex-1 sm:flex-none text-xs sm:text-sm" data-testid="tab-meetings">
              <Calendar className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">My Meetings</span>
              <span className="sm:hidden">Meetings</span>
            </TabsTrigger>
            {canRequestMeetings && (
              <TabsTrigger value="request" className="flex-1 sm:flex-none text-xs sm:text-sm" data-testid="tab-request">
                <Send className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Request Meeting</span>
                <span className="sm:hidden">Request</span>
              </TabsTrigger>
            )}
          </TabsList>

          {canViewAttendees && (
            <TabsContent value="attendees">
              <AttendeesTab eventId={memberInfo.eventId} token={token} />
            </TabsContent>
          )}

          <TabsContent value="meetings">
            <MyMeetingsTab eventId={memberInfo.eventId} token={token} canCaptureOutcome={canCaptureOutcome} />
          </TabsContent>

          {canRequestMeetings && (
            <TabsContent value="request">
              <RequestMeetingTab eventId={memberInfo.eventId} token={token} memberId={memberInfo.id} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
