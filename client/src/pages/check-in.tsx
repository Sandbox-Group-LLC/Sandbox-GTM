import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  QrCode, 
  UserCheck, 
  Users, 
  Clock, 
  CheckCircle, 
  Search,
  UserPlus,
  CalendarCheck,
  Target,
  ScanLine,
  Edit3,
  AlertCircle,
  Loader2
} from "lucide-react";
import type { Attendee, Event, EventSession, EventLead } from "@shared/schema";

type CheckInMode = 'program' | 'lead' | 'session';

interface ProgramCheckInStats {
  totalAttendees: number;
  checkedIn: number;
  pending: number;
  checkInRate: number;
}

interface LeadCaptureStats {
  leadsToday: number;
  totalLeads: number;
  qrScanned: number;
  manualEntry: number;
}

interface SessionCheckInStats {
  sessionAttendance: number;
  checkInsToday: number;
  uniqueAttendees: number;
  sessionsCovered: number;
}

interface CheckInResponse {
  message: string;
  attendee?: Attendee;
  lead?: EventLead;
  sessionCheckIn?: {
    id: string;
    attendeeId: string;
    sessionId: string;
  };
  attendeeData?: {
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
    phone?: string;
    jobTitle?: string;
  };
}

interface LeadFormData {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  phone?: string;
  jobTitle?: string;
  notes?: string;
}

const leadFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  company: z.string().optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  notes: z.string().optional(),
});

export default function CheckIn() {
  const { toast } = useToast();
  const [mode, setMode] = useState<CheckInMode>('program');
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [checkInCode, setCheckInCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastCheckedIn, setLastCheckedIn] = useState<Attendee | null>(null);
  const [lastSessionCheckIn, setLastSessionCheckIn] = useState<{ attendee: Attendee; session: EventSession } | null>(null);
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [leadFormData, setLeadFormData] = useState<Partial<LeadFormData> | null>(null);

  const leadForm = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      phone: "",
      jobTitle: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (leadFormData) {
      leadForm.reset({
        firstName: leadFormData.firstName || "",
        lastName: leadFormData.lastName || "",
        email: leadFormData.email || "",
        company: leadFormData.company || "",
        phone: leadFormData.phone || "",
        jobTitle: leadFormData.jobTitle || "",
        notes: "",
      });
    }
  }, [leadFormData, leadForm]);

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const { data: programStats, isLoading: programStatsLoading } = useQuery<ProgramCheckInStats>({
    queryKey: ["/api/check-in/stats", selectedEventId, "program"],
    queryFn: async () => {
      const url = selectedEventId 
        ? `/api/check-in/stats?eventId=${selectedEventId}&mode=program`
        : "/api/check-in/stats?mode=program";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: mode === 'program',
  });

  const { data: leadStats, isLoading: leadStatsLoading } = useQuery<LeadCaptureStats>({
    queryKey: ["/api/check-in/stats", selectedEventId, "lead"],
    queryFn: async () => {
      const url = selectedEventId 
        ? `/api/check-in/stats?eventId=${selectedEventId}&mode=lead`
        : "/api/check-in/stats?mode=lead";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: mode === 'lead',
  });

  const { data: sessionStats, isLoading: sessionStatsLoading } = useQuery<SessionCheckInStats>({
    queryKey: ["/api/check-in/stats", selectedEventId, "session"],
    queryFn: async () => {
      const url = selectedEventId 
        ? `/api/check-in/stats?eventId=${selectedEventId}&mode=session`
        : "/api/check-in/stats?mode=session";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: mode === 'session',
  });

  const { data: sessions = [] } = useQuery<EventSession[]>({
    queryKey: ["/api/sessions", selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const res = await fetch(`/api/sessions?eventId=${selectedEventId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    enabled: mode === 'session' && !!selectedEventId,
  });

  const { data: attendees, isLoading: attendeesLoading } = useQuery<Attendee[]>({
    queryKey: ["/api/attendees", selectedEventId],
    queryFn: async () => {
      const url = selectedEventId 
        ? `/api/attendees?eventId=${selectedEventId}`
        : "/api/attendees";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch attendees");
      return res.json();
    },
  });

  const scanMutation = useMutation({
    mutationFn: async (code: string) => {
      const payload: Record<string, unknown> = { code, mode };
      if (mode === 'session' && selectedSessionId) {
        payload.sessionId = selectedSessionId;
      }
      if (selectedEventId) {
        payload.eventId = selectedEventId;
      }
      const res = await apiRequest("POST", "/api/check-in/scan", payload);
      return res.json() as Promise<CheckInResponse>;
    },
    onSuccess: (data) => {
      setCheckInCode("");
      
      if (mode === 'program' && data.attendee) {
        setLastCheckedIn(data.attendee);
        queryClient.invalidateQueries({ queryKey: ["/api/check-in/stats", selectedEventId, "program"] });
        queryClient.invalidateQueries({ queryKey: ["/api/attendees", selectedEventId] });
        toast({ title: "Check-in successful", description: `${data.attendee.firstName} ${data.attendee.lastName} checked in` });
      } else if (mode === 'session' && data.attendee) {
        const session = sessions.find(s => s.id === selectedSessionId);
        if (session) {
          setLastSessionCheckIn({ attendee: data.attendee, session });
        }
        queryClient.invalidateQueries({ queryKey: ["/api/check-in/stats", selectedEventId, "session"] });
        toast({ title: "Session check-in recorded", description: `${data.attendee.firstName} ${data.attendee.lastName} checked into ${session?.title || 'session'}` });
      } else if (mode === 'lead') {
        if (data.attendeeData) {
          setLeadFormData(data.attendeeData);
          setLeadFormOpen(true);
        } else {
          setLeadFormData(null);
          setLeadFormOpen(true);
        }
      }
    },
    onError: (error: Error & { status?: number }) => {
      if (mode === 'session' && error.message?.includes('409')) {
        toast({ title: "Already checked in", description: "This attendee is already checked into this session", variant: "default" });
      } else {
        toast({ title: "Scan failed", description: error.message, variant: "destructive" });
      }
    },
  });

  const manualCheckInMutation = useMutation({
    mutationFn: async (attendeeId: string) => {
      if (mode === 'session' && selectedSessionId) {
        const res = await apiRequest("POST", "/api/session-check-ins", { 
          attendeeId, 
          sessionId: selectedSessionId,
          eventId: selectedEventId,
          checkInMethod: 'manual'
        });
        return res.json();
      } else {
        const res = await apiRequest("PATCH", `/api/attendees/${attendeeId}`, { 
          checkedIn: true, 
          checkInTime: new Date().toISOString() 
        });
        return res.json() as Promise<Attendee>;
      }
    },
    onSuccess: (data) => {
      if (mode === 'session') {
        queryClient.invalidateQueries({ queryKey: ["/api/check-in/stats", selectedEventId, "session"] });
        toast({ title: "Session check-in recorded", description: "Attendee has been checked into the session" });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/check-in/stats", selectedEventId, "program"] });
        queryClient.invalidateQueries({ queryKey: ["/api/attendees", selectedEventId] });
        toast({ title: "Check-in successful", description: `${data.firstName} ${data.lastName} checked in manually` });
      }
    },
    onError: (error: Error) => {
      if (error.message?.includes('409') || error.message?.includes('already')) {
        toast({ title: "Already checked in", description: "This attendee is already checked into this session" });
      } else {
        toast({ title: "Check-in failed", variant: "destructive" });
      }
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: LeadFormData) => {
      const res = await apiRequest("POST", "/api/leads", {
        ...data,
        eventId: selectedEventId,
        captureMethod: leadFormData ? 'qr_scan' : 'manual',
      });
      return res.json() as Promise<EventLead>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/check-in/stats", selectedEventId, "lead"] });
      toast({ title: "Lead captured", description: `${data.firstName} ${data.lastName} has been added` });
      setLeadFormOpen(false);
      setLeadFormData(null);
      leadForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to capture lead", description: error.message, variant: "destructive" });
    },
  });

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'session' && !selectedSessionId) {
      toast({ title: "Select a session", description: "Please select a session before scanning", variant: "destructive" });
      return;
    }
    if (checkInCode.trim()) {
      scanMutation.mutate(checkInCode.trim());
    }
  };

  const handleLeadFormSubmit = (data: LeadFormData) => {
    createLeadMutation.mutate(data);
  };

  const handleOpenLeadForm = () => {
    setLeadFormData(null);
    leadForm.reset({
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      phone: "",
      jobTitle: "",
      notes: "",
    });
    setLeadFormOpen(true);
  };

  const filteredAttendees = attendees?.filter(a => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.firstName.toLowerCase().includes(query) ||
      a.lastName.toLowerCase().includes(query) ||
      a.email.toLowerCase().includes(query) ||
      a.checkInCode?.toLowerCase().includes(query)
    );
  }) || [];

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const renderStats = () => {
    if (mode === 'program') {
      if (programStatsLoading) {
        return (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        );
      }
      return (
        <>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Registered</p>
                  <p className="text-2xl font-semibold" data-testid="text-total-registered">{programStats?.totalAttendees || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Checked In</p>
                  <p className="text-2xl font-semibold" data-testid="text-checked-in">{programStats?.checkedIn || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-semibold" data-testid="text-pending">{programStats?.pending || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                  <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-in Rate</p>
                  <p className="text-2xl font-semibold" data-testid="text-checkin-rate">{programStats?.checkInRate || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      );
    }

    if (mode === 'lead') {
      if (leadStatsLoading) {
        return (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        );
      }
      return (
        <>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900/30">
                  <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Leads Today</p>
                  <p className="text-2xl font-semibold" data-testid="text-leads-today">{leadStats?.leadsToday || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                  <p className="text-2xl font-semibold" data-testid="text-total-leads">{leadStats?.totalLeads || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                  <ScanLine className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">QR Scanned</p>
                  <p className="text-2xl font-semibold" data-testid="text-qr-scanned">{leadStats?.qrScanned || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                  <Edit3 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Manual Entry</p>
                  <p className="text-2xl font-semibold" data-testid="text-manual-entry">{leadStats?.manualEntry || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      );
    }

    if (mode === 'session') {
      if (sessionStatsLoading) {
        return (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        );
      }
      return (
        <>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-indigo-100 dark:bg-indigo-900/30">
                  <CalendarCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Session Attendance</p>
                  <p className="text-2xl font-semibold" data-testid="text-session-attendance">{sessionStats?.sessionAttendance || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-ins Today</p>
                  <p className="text-2xl font-semibold" data-testid="text-session-checkins-today">{sessionStats?.checkInsToday || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unique Attendees</p>
                  <p className="text-2xl font-semibold" data-testid="text-unique-attendees">{sessionStats?.uniqueAttendees || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900/30">
                  <CalendarCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sessions Covered</p>
                  <p className="text-2xl font-semibold" data-testid="text-sessions-covered">{sessionStats?.sessionsCovered || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      );
    }

    return null;
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'program': return 'Program Check-In';
      case 'lead': return 'Lead Capture';
      case 'session': return 'Session Check-In';
    }
  };

  const getScanPlaceholder = () => {
    switch (mode) {
      case 'program': return 'Enter or scan check-in code';
      case 'lead': return 'Scan attendee badge to capture lead';
      case 'session': return 'Scan attendee badge for session';
    }
  };

  const renderLastCheckInResult = () => {
    if (mode === 'program' && lastCheckedIn) {
      return (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-700 dark:text-green-300">Last Check-In</span>
          </div>
          <p className="text-lg font-semibold">{lastCheckedIn.firstName} {lastCheckedIn.lastName}</p>
          <p className="text-sm text-muted-foreground">{lastCheckedIn.email}</p>
          {lastCheckedIn.company && <p className="text-sm text-muted-foreground">{lastCheckedIn.company}</p>}
        </div>
      );
    }

    if (mode === 'session' && lastSessionCheckIn) {
      return (
        <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-md border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-2 mb-2">
            <CalendarCheck className="w-5 h-5 text-indigo-600" />
            <span className="font-medium text-indigo-700 dark:text-indigo-300">Last Session Check-In</span>
          </div>
          <p className="text-lg font-semibold">{lastSessionCheckIn.attendee.firstName} {lastSessionCheckIn.attendee.lastName}</p>
          <p className="text-sm text-muted-foreground">{lastSessionCheckIn.attendee.email}</p>
          <Badge variant="secondary" className="mt-2">{lastSessionCheckIn.session.title}</Badge>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={getModeTitle()}
        breadcrumbs={[{ label: "Check-In" }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedEventId || ""} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-[180px]" data-testid="select-event">
                <SelectValue placeholder="Select Event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mode === 'lead' && (
              <Button onClick={handleOpenLeadForm} data-testid="button-add-lead">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <Tabs value={mode} onValueChange={(v) => setMode(v as CheckInMode)} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="program" data-testid="tab-program">
                <UserCheck className="w-4 h-4 mr-2" />
                Program
              </TabsTrigger>
              <TabsTrigger value="lead" data-testid="tab-lead">
                <Target className="w-4 h-4 mr-2" />
                Lead Capture
              </TabsTrigger>
              <TabsTrigger value="session" data-testid="tab-session">
                <CalendarCheck className="w-4 h-4 mr-2" />
                Session
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {mode === 'session' && (
          <div className="mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Select Session</label>
                    <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                      <SelectTrigger data-testid="select-session">
                        <SelectValue placeholder="Choose a session to track attendance" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessions.map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            {session.title} {session.sessionDate && `- ${session.sessionDate}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedSession && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{selectedSession.sessionType || 'Session'}</Badge>
                      {selectedSession.room && <Badge variant="secondary">{selectedSession.room}</Badge>}
                    </div>
                  )}
                </div>
                {!selectedSessionId && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    Please select a session before scanning attendees
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {renderStats()}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                {mode === 'lead' ? 'Scan Badge' : 'Scan Check-In Code'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleScanSubmit} className="space-y-4">
                <Input
                  data-testid="input-checkin-code"
                  placeholder={getScanPlaceholder()}
                  value={checkInCode}
                  onChange={(e) => setCheckInCode(e.target.value.toUpperCase())}
                  className="text-lg font-mono text-center tracking-wider"
                  disabled={mode === 'session' && !selectedSessionId}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    !checkInCode.trim() || 
                    scanMutation.isPending || 
                    (mode === 'session' && !selectedSessionId)
                  }
                  data-testid="button-scan-checkin"
                >
                  {scanMutation.isPending ? "Processing..." : mode === 'lead' ? "Capture Lead" : "Check In"}
                </Button>
              </form>

              {renderLastCheckInResult()}
            </CardContent>
          </Card>

          {mode !== 'lead' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Manual Check-In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  data-testid="input-search-attendee"
                  placeholder="Search audience member by name, email, or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-4"
                />

                <div className="space-y-2 max-h-[400px] overflow-auto">
                  {attendeesLoading ? (
                    <>
                      <Skeleton className="h-16" />
                      <Skeleton className="h-16" />
                      <Skeleton className="h-16" />
                    </>
                  ) : filteredAttendees.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">No attendees found</p>
                  ) : (
                    filteredAttendees.slice(0, 20).map((attendee) => (
                      <div
                        key={attendee.id}
                        className="flex items-center justify-between p-3 rounded-md border bg-card"
                        data-testid={`row-attendee-${attendee.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{attendee.firstName} {attendee.lastName}</p>
                          <p className="text-sm text-muted-foreground truncate">{attendee.email}</p>
                          {attendee.checkInCode && (
                            <p className="text-xs font-mono text-muted-foreground">{attendee.checkInCode}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {mode === 'program' && attendee.checkedIn ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Checked In
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => manualCheckInMutation.mutate(attendee.id)}
                              disabled={manualCheckInMutation.isPending || (mode === 'session' && !selectedSessionId)}
                              data-testid={`button-checkin-${attendee.id}`}
                            >
                              {mode === 'session' ? 'Session Check-In' : 'Check In'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {mode === 'lead' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Quick Add Lead
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Scan attendee badges to quickly capture leads, or click "Add Lead" to manually enter information.
                </p>
                <Button onClick={handleOpenLeadForm} variant="outline" className="w-full" data-testid="button-manual-lead">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Enter Lead Manually
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={leadFormOpen} onOpenChange={setLeadFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Capture Lead</DialogTitle>
            <DialogDescription>
              {leadFormData 
                ? "Review and confirm the lead information captured from the badge scan."
                : "Enter the lead's contact information."}
            </DialogDescription>
          </DialogHeader>
          <Form {...leadForm}>
            <form onSubmit={leadForm.handleSubmit(handleLeadFormSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={leadForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-lead-firstname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={leadForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-lead-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={leadForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-lead-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={leadForm.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-lead-company" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={leadForm.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-lead-jobtitle" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={leadForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} data-testid="input-lead-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={leadForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any notes about this lead..." 
                        className="resize-none" 
                        rows={3}
                        {...field} 
                        data-testid="input-lead-notes" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setLeadFormOpen(false)} data-testid="button-cancel-lead">
                  Cancel
                </Button>
                <Button type="submit" disabled={createLeadMutation.isPending} data-testid="button-save-lead">
                  {createLeadMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Lead"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
