import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import {
  Users,
  Plus,
  CalendarIcon,
  Target,
  CheckCircle,
  Clock,
  TrendingUp,
  ClipboardCheck,
  Mail,
  UserCog,
  AlertTriangle,
  DoorOpen,
  LayoutGrid,
} from "lucide-react";
import { MeetingPortalManagement } from "@/components/events/MeetingPortalManagement";
import { RoomScheduleGrid } from "@/components/events/RoomScheduleGrid";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type {
  Event,
  Attendee,
  AttendeeMeeting,
  SessionRoom,
} from "@shared/schema";
import {
  MEETING_INTENT_TYPES,
  MEETING_OUTCOME_TYPES,
  OUTCOME_CONFIDENCE_LEVELS,
  DEAL_RANGE_TYPES,
  TIMELINE_TYPES,
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
  exploring_solution: "Exploring Solutions",
  evaluating_fit: "Evaluating Fit",
  existing_customer: "Existing Customer",
  partner_discussion: "Partner Discussion",
  executive_introduction: "Executive Intro",
  networking: "Networking",
};

const OUTCOME_TYPE_LABELS: Record<string, string> = {
  no_fit: "No Fit",
  early_interest: "Early Interest",
  active_opportunity: "Active Opportunity",
  follow_up_scheduled: "Follow-up Scheduled",
  deal_in_progress: "Deal In Progress",
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

const OUTCOME_CONFIDENCE_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "pending":
      return "secondary";
    case "accepted":
      return "default";
    case "declined":
      return "destructive";
    case "completed":
      return "outline";
    default:
      return "secondary";
  }
}

function getStatusClassName(status: string): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "accepted":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "declined":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "completed":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    default:
      return "";
  }
}

function getIntentStrengthClassName(strength: string | null): string {
  switch (strength) {
    case "high":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "medium":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "low":
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  }
}

interface MeetingStats {
  totalMeetings: number;
  pendingResponses: number;
  outcomesCaptured: number;
  highIntent: number;
}

interface MeetingWithDetails extends AttendeeMeeting {
  requester?: Attendee;
  invitee?: Attendee;
}

export default function Meetings() {
  const { toast } = useToast();
  const { organization } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [intentTypeFilter, setIntentTypeFilter] = useState<string>("all");
  const [internalOnly, setInternalOnly] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<string>("meetings");

  const [newMeetingData, setNewMeetingData] = useState({
    inviteeId: "",
    intentType: "",
    startTime: "",
    message: "",
    roomId: "",
  });

  const [outcomeData, setOutcomeData] = useState({
    outcomeType: "",
    outcomeConfidence: "",
    dealRange: "",
    timeline: "",
    outcomeNotes: "",
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: meetings, isLoading: meetingsLoading } = useQuery<MeetingWithDetails[]>({
    queryKey: ["/api/events", selectedEventId, "meetings", { status: statusFilter, intentType: intentTypeFilter, internalOnly }],
    enabled: selectedEventId !== "all",
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (intentTypeFilter !== "all") params.append("intentType", intentTypeFilter);
      if (internalOnly) params.append("internalOnly", "true");
      const url = `/api/events/${selectedEventId}/meetings${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch meetings");
      return res.json();
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery<MeetingStats>({
    queryKey: ["/api/events", selectedEventId, "meetings", "stats"],
    enabled: selectedEventId !== "all",
    queryFn: async () => {
      const res = await fetch(`/api/events/${selectedEventId}/meetings/stats`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch meeting stats");
      return res.json();
    },
  });

  const { data: attendees } = useQuery<Attendee[]>({
    queryKey: ["/api/attendees", { eventId: selectedEventId }],
    enabled: selectedEventId !== "all",
    queryFn: async () => {
      const res = await fetch(`/api/attendees?eventId=${selectedEventId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch attendees");
      return res.json();
    },
  });

  const { data: allRooms } = useQuery<SessionRoom[]>({
    queryKey: ["/api/session-rooms"],
    enabled: selectedEventId !== "all",
  });

  const eventRooms = useMemo(() => {
    return allRooms?.filter(room => room.eventId === selectedEventId) || [];
  }, [allRooms, selectedEventId]);

  const { data: authUser } = useQuery<{ id: string } | null>({
    queryKey: ["/api/auth/user"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: roomAssignments } = useQuery<RoomAssignment[]>({
    queryKey: ["/api/events", selectedEventId, "room-assignments", { adminUserId: authUser?.id }],
    enabled: selectedEventId !== "all" && !!authUser?.id,
    queryFn: async () => {
      // Issue 1 fix: Pass adminUserId to filter assignments for the current user
      const params = new URLSearchParams();
      if (authUser?.id) params.append("adminUserId", authUser.id);
      const res = await fetch(`/api/events/${selectedEventId}/room-assignments?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch room assignments");
      return res.json();
    },
  });

  const myAssignedRoom = useMemo(() => {
    if (!roomAssignments || !organization) return null;
    const assignment = roomAssignments.find(a => a.userId && a.isPrimary);
    if (assignment) {
      return eventRooms.find(r => r.id === assignment.roomId);
    }
    return null;
  }, [roomAssignments, eventRooms, organization]);

  const endTime = useMemo(() => {
    if (!newMeetingData.startTime) return "";
    return new Date(new Date(newMeetingData.startTime).getTime() + 30 * 60 * 1000).toISOString();
  }, [newMeetingData.startTime]);

  const { data: availableRooms } = useQuery<SessionRoom[]>({
    queryKey: ["/api/events", selectedEventId, "rooms", "available", newMeetingData.startTime, endTime],
    enabled: selectedEventId !== "all" && !!newMeetingData.startTime && !myAssignedRoom,
    queryFn: async () => {
      const params = new URLSearchParams({
        startTime: new Date(newMeetingData.startTime).toISOString(),
        endTime: endTime,
      });
      const res = await fetch(`/api/events/${selectedEventId}/rooms/available?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch available rooms");
      return res.json();
    },
  });

  const { data: roomConflicts } = useQuery<RoomConflict[]>({
    queryKey: ["/api/events", selectedEventId, "rooms", newMeetingData.roomId, "conflicts", newMeetingData.startTime, endTime],
    enabled: selectedEventId !== "all" && !!newMeetingData.roomId && !!newMeetingData.startTime,
    queryFn: async () => {
      const params = new URLSearchParams({
        startTime: new Date(newMeetingData.startTime).toISOString(),
        endTime: endTime,
      });
      const res = await fetch(`/api/events/${selectedEventId}/rooms/${newMeetingData.roomId}/conflicts?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to check room conflicts");
      return res.json();
    },
  });

  useEffect(() => {
    if (createDialogOpen && myAssignedRoom && !newMeetingData.roomId) {
      setNewMeetingData(prev => ({ ...prev, roomId: myAssignedRoom.id }));
    }
  }, [createDialogOpen, myAssignedRoom, newMeetingData.roomId]);

  const createMeetingMutation = useMutation({
    mutationFn: async (data: typeof newMeetingData) => {
      const res = await apiRequest("POST", `/api/events/${selectedEventId}/meetings`, {
        ...data,
        roomId: data.roomId || undefined,
        isInternalMeeting: true,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(new Date(data.startTime).getTime() + 30 * 60 * 1000).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "meetings"] });
      setCreateDialogOpen(false);
      setNewMeetingData({ inviteeId: "", intentType: "", startTime: "", message: "", roomId: "" });
      toast({ title: "Meeting created", description: "The internal meeting has been scheduled." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create meeting.", variant: "destructive" });
    },
  });

  const captureOutcomeMutation = useMutation({
    mutationFn: async (data: { meetingId: string; outcome: typeof outcomeData }) => {
      const res = await apiRequest("POST", `/api/events/${selectedEventId}/meetings/${data.meetingId}/outcome`, data.outcome);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "meetings", "stats"] });
      setOutcomeDialogOpen(false);
      setSelectedMeeting(null);
      setOutcomeData({ outcomeType: "", outcomeConfidence: "", dealRange: "", timeline: "", outcomeNotes: "" });
      toast({ title: "Outcome captured", description: "Meeting outcome has been recorded." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to capture outcome.", variant: "destructive" });
    },
  });

  const resendEmailMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const res = await apiRequest("POST", `/api/events/${selectedEventId}/meetings/${meetingId}/resend-email`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email sent", description: "Meeting invitation email has been resent." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to resend email.", variant: "destructive" });
    },
  });

  const handleCreateMeeting = () => {
    if (!newMeetingData.inviteeId || !newMeetingData.intentType || !newMeetingData.startTime) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    createMeetingMutation.mutate(newMeetingData);
  };

  const handleCaptureOutcome = () => {
    if (!selectedMeeting || !outcomeData.outcomeType) {
      toast({ title: "Missing fields", description: "Please select an outcome type.", variant: "destructive" });
      return;
    }
    captureOutcomeMutation.mutate({ meetingId: selectedMeeting.id, outcome: outcomeData });
  };

  const openOutcomeDialog = (meeting: MeetingWithDetails) => {
    setSelectedMeeting(meeting);
    setOutcomeData({
      outcomeType: meeting.outcomeType || "",
      outcomeConfidence: meeting.outcomeConfidence || "",
      dealRange: meeting.dealRange || "",
      timeline: meeting.timeline || "",
      outcomeNotes: meeting.outcomeNotes || "",
    });
    setOutcomeDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Internal Meetings"
        breadcrumbs={[{ label: "Engagement" }, { label: "Internal Meetings" }]}
        actions={
          <div className="flex items-center gap-2 sm:gap-4">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-[120px] sm:w-[180px]" data-testid="select-event-filter">
                <SelectValue placeholder="Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Select Program</SelectItem>
                {events?.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEventId !== "all" && (
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-meeting" className="whitespace-nowrap">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Schedule Meeting</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Schedule Internal Meeting</DialogTitle>
                    <DialogDescription>
                      Create a new internal meeting with an attendee.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Attendee</Label>
                      <Select
                        value={newMeetingData.inviteeId}
                        onValueChange={(v) => setNewMeetingData({ ...newMeetingData, inviteeId: v })}
                      >
                        <SelectTrigger data-testid="select-attendee">
                          <SelectValue placeholder="Select attendee" />
                        </SelectTrigger>
                        <SelectContent>
                          {attendees?.map((attendee) => (
                            <SelectItem key={attendee.id} value={attendee.id}>
                              {attendee.firstName} {attendee.lastName} ({attendee.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Intent Type</Label>
                      <Select
                        value={newMeetingData.intentType}
                        onValueChange={(v) => setNewMeetingData({ ...newMeetingData, intentType: v })}
                      >
                        <SelectTrigger data-testid="select-intent-type">
                          <SelectValue placeholder="Select intent type" />
                        </SelectTrigger>
                        <SelectContent>
                          {MEETING_INTENT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {INTENT_TYPE_LABELS[type] || type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !newMeetingData.startTime && "text-muted-foreground"
                            )}
                            data-testid="button-meeting-date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newMeetingData.startTime ? format(new Date(newMeetingData.startTime), "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={newMeetingData.startTime ? new Date(newMeetingData.startTime) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const existing = newMeetingData.startTime ? new Date(newMeetingData.startTime) : new Date();
                                date.setHours(existing.getHours(), existing.getMinutes());
                                setNewMeetingData({ ...newMeetingData, startTime: date.toISOString() });
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !newMeetingData.startTime && "text-muted-foreground"
                            )}
                            data-testid="button-meeting-time"
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            {newMeetingData.startTime ? format(new Date(newMeetingData.startTime), "h:mm a") : "Select time"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-4" align="start">
                          <div className="flex gap-2">
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Hour</Label>
                              <Select
                                value={newMeetingData.startTime ? format(new Date(newMeetingData.startTime), "HH") : "09"}
                                onValueChange={(hour) => {
                                  const date = newMeetingData.startTime ? new Date(newMeetingData.startTime) : new Date();
                                  date.setHours(parseInt(hour), date.getMinutes());
                                  setNewMeetingData({ ...newMeetingData, startTime: date.toISOString() });
                                }}
                              >
                                <SelectTrigger className="w-[70px]" data-testid="select-hour">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <SelectItem key={i} value={i.toString().padStart(2, "0")}>
                                      {i.toString().padStart(2, "0")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Minute</Label>
                              <Select
                                value={newMeetingData.startTime ? format(new Date(newMeetingData.startTime), "mm") : "00"}
                                onValueChange={(minute) => {
                                  const date = newMeetingData.startTime ? new Date(newMeetingData.startTime) : new Date();
                                  date.setMinutes(parseInt(minute));
                                  setNewMeetingData({ ...newMeetingData, startTime: date.toISOString() });
                                }}
                              >
                                <SelectTrigger className="w-[70px]" data-testid="select-minute">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {["00", "15", "30", "45"].map((min) => (
                                    <SelectItem key={min} value={min}>
                                      {min}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Room (optional)</Label>
                      <Select
                        value={newMeetingData.roomId}
                        onValueChange={(v) => setNewMeetingData({ ...newMeetingData, roomId: v })}
                      >
                        <SelectTrigger data-testid="select-room">
                          <SelectValue placeholder="Select a room" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No room selected</SelectItem>
                          {eventRooms.map((room) => (
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
                      {myAssignedRoom && myAssignedRoom.id === newMeetingData.roomId && (
                        <p className="text-xs text-muted-foreground">Your assigned room</p>
                      )}
                    </div>
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
                    {!myAssignedRoom && newMeetingData.startTime && availableRooms && availableRooms.length > 0 && !newMeetingData.roomId && (
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
                              onClick={() => setNewMeetingData({ ...newMeetingData, roomId: room.id })}
                              data-testid={`button-select-available-room-${room.id}`}
                            >
                              {room.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Message (optional)</Label>
                      <Textarea
                        placeholder="Add a note for this meeting..."
                        value={newMeetingData.message}
                        onChange={(e) => setNewMeetingData({ ...newMeetingData, message: e.target.value })}
                        data-testid="input-meeting-message"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateMeeting}
                      disabled={createMeetingMutation.isPending}
                      data-testid="button-confirm-create"
                    >
                      {createMeetingMutation.isPending ? "Creating..." : "Create Meeting"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <p className="text-muted-foreground text-sm">
          Manage internal team meetings with attendees and track outcomes.
        </p>

        {selectedEventId === "all" ? (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a program to view meetings</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4" data-testid="tabs-meetings-portal">
              <TabsTrigger value="meetings" data-testid="tab-meetings">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Meetings
              </TabsTrigger>
              <TabsTrigger value="schedule" data-testid="tab-schedule">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="portal-team" data-testid="tab-portal-team">
                <UserCog className="h-4 w-4 mr-2" />
                Portal Team
              </TabsTrigger>
            </TabsList>

            <TabsContent value="meetings" className="space-y-6">
            <div className="flex items-center gap-4 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={intentTypeFilter} onValueChange={setIntentTypeFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-intent-filter">
                  <SelectValue placeholder="Intent Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Intent Types</SelectItem>
                  {MEETING_INTENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {INTENT_TYPE_LABELS[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Switch
                  id="internal-only"
                  checked={internalOnly}
                  onCheckedChange={setInternalOnly}
                  data-testid="switch-internal-only"
                />
                <Label htmlFor="internal-only" className="text-sm">Internal Only</Label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold" data-testid="stat-total-meetings">
                      {stats?.totalMeetings ?? 0}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Responses</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold" data-testid="stat-pending-responses">
                      {stats?.pendingResponses ?? 0}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Outcomes Captured</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold" data-testid="stat-outcomes-captured">
                      {stats?.outcomesCaptured ?? 0}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">High Intent</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold" data-testid="stat-high-intent">
                      {stats?.highIntent ?? 0}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                {meetingsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : meetings && meetings.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Attendee</TableHead>
                        <TableHead>Intent Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Scheduled Time</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meetings.map((meeting) => (
                        <TableRow key={meeting.id} data-testid={`row-meeting-${meeting.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {meeting.invitee?.firstName} {meeting.invitee?.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {meeting.invitee?.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {INTENT_TYPE_LABELS[meeting.intentType || ""] || meeting.intentType || "N/A"}
                              </Badge>
                              {meeting.intentStrength && (
                                <Badge className={getIntentStrengthClassName(meeting.intentStrength)}>
                                  {meeting.intentStrength}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusClassName(meeting.status)}>
                              {meeting.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {meeting.startTime
                              ? format(new Date(meeting.startTime), "MMM d, yyyy h:mm a")
                              : "Not scheduled"}
                          </TableCell>
                          <TableCell>
                            {meeting.outcomeType ? (
                              <Badge variant="outline">
                                {OUTCOME_TYPE_LABELS[meeting.outcomeType] || meeting.outcomeType}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not captured</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resendEmailMutation.mutate(meeting.id)}
                                disabled={resendEmailMutation.isPending}
                                data-testid={`button-resend-email-${meeting.id}`}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Resend Email
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openOutcomeDialog(meeting)}
                                data-testid={`button-capture-outcome-${meeting.id}`}
                              >
                                <ClipboardCheck className="h-4 w-4 mr-2" />
                                {meeting.outcomeType ? "Edit" : "Capture"} Outcome
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No meetings found</p>
                    <p className="text-sm mt-1">Schedule your first internal meeting to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            </TabsContent>

            <TabsContent value="schedule">
              {organization && (
                <RoomScheduleGrid
                  eventId={selectedEventId}
                  organizationId={organization.id}
                />
              )}
            </TabsContent>

            <TabsContent value="portal-team">
              {organization && (
                <MeetingPortalManagement
                  eventId={selectedEventId}
                  organizationId={organization.id}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={outcomeDialogOpen} onOpenChange={setOutcomeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Capture Meeting Outcome</DialogTitle>
            <DialogDescription>
              Record the outcome of your meeting with{" "}
              {selectedMeeting?.invitee?.firstName} {selectedMeeting?.invitee?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Outcome Type</Label>
              <Select
                value={outcomeData.outcomeType}
                onValueChange={(v) => setOutcomeData({ ...outcomeData, outcomeType: v })}
              >
                <SelectTrigger data-testid="select-outcome-type">
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_OUTCOME_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {OUTCOME_TYPE_LABELS[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Outcome Confidence</Label>
              <p className="text-sm text-muted-foreground">How strong was the buying signal in this meeting?</p>
              <RadioGroup
                value={outcomeData.outcomeConfidence}
                onValueChange={(v) => setOutcomeData({ ...outcomeData, outcomeConfidence: v })}
                className="flex gap-4"
                data-testid="radio-outcome-confidence"
              >
                {OUTCOME_CONFIDENCE_LEVELS.map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <RadioGroupItem value={level} id={`confidence-${level}`} data-testid={`radio-confidence-${level}`} />
                    <Label htmlFor={`confidence-${level}`} className="cursor-pointer">
                      {OUTCOME_CONFIDENCE_LABELS[level] || level}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Deal Range (optional)</Label>
              <Select
                value={outcomeData.dealRange}
                onValueChange={(v) => setOutcomeData({ ...outcomeData, dealRange: v })}
              >
                <SelectTrigger data-testid="select-deal-range">
                  <SelectValue placeholder="Select deal range" />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_RANGE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DEAL_RANGE_LABELS[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timeline (optional)</Label>
              <Select
                value={outcomeData.timeline}
                onValueChange={(v) => setOutcomeData({ ...outcomeData, timeline: v })}
              >
                <SelectTrigger data-testid="select-timeline">
                  <SelectValue placeholder="Select timeline" />
                </SelectTrigger>
                <SelectContent>
                  {TIMELINE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {TIMELINE_LABELS[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Add any notes about the outcome..."
                value={outcomeData.outcomeNotes}
                onChange={(e) => setOutcomeData({ ...outcomeData, outcomeNotes: e.target.value })}
                data-testid="input-outcome-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutcomeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCaptureOutcome}
              disabled={captureOutcomeMutation.isPending}
              data-testid="button-confirm-outcome"
            >
              {captureOutcomeMutation.isPending ? "Saving..." : "Save Outcome"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
