import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { QRScanner } from "@/components/qr-scanner";
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
  Loader2,
  Camera
} from "lucide-react";
import type { Attendee, Event, EventSession, EventLead, ProductInteraction, DemoStation } from "@shared/schema";

type CheckInMode = 'program' | 'lead' | 'session';

interface ProgramCheckInStats {
  totalAttendees: number;
  checkedIn: number;
  pending: number;
  checkInRate: number;
}

interface ProductInteractionStats {
  interactionsToday: number;
  totalInteractions: number;
  badgeScans: number;
  manualInteractions: number;
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

type CaptureMethod = 'qr_scan' | 'manual' | 'lookup';

// Interaction type options
const INTERACTION_TYPE_OPTIONS = [
  { value: 'demo', label: 'Demo' },
  { value: 'product_discussion', label: 'Product Discussion' },
  { value: 'pricing_request', label: 'Pricing Request' },
  { value: 'technical_deep_dive', label: 'Technical Deep Dive' },
  { value: 'use_case_exploration', label: 'Use Case Exploration' },
  { value: 'integration_question', label: 'Integration Question' },
  { value: 'support_inquiry', label: 'Support Inquiry' },
  { value: 'partnership', label: 'Partnership Inquiry' },
  { value: 'other', label: 'Other' },
] as const;

// Outcome options
const OUTCOME_OPTIONS = [
  { value: 'requested_follow_up', label: 'Requested Follow-up' },
  { value: 'asked_for_pricing', label: 'Asked for Pricing' },
  { value: 'wants_trial_pilot', label: 'Wants Trial/Pilot' },
  { value: 'intro_to_stakeholder', label: 'Intro to Stakeholder' },
  { value: 'not_a_fit', label: 'Not a Fit' },
  { value: 'too_early', label: 'Too Early' },
  { value: 'other', label: 'Other' },
] as const;

// Opportunity potential options
const OPPORTUNITY_POTENTIAL_OPTIONS = [
  { value: 'under_10k', label: 'Under $10k' },
  { value: '10k_to_50k', label: '$10k - $50k' },
  { value: '50k_to_100k', label: '$50k - $100k' },
  { value: 'over_100k', label: 'Over $100k' },
] as const;

// Next step options (must match schema: send_info, schedule_meeting, schedule_call, send_proposal, demo_scheduled, trial_setup, internal_review, none)
const NEXT_STEP_OPTIONS = [
  { value: 'schedule_call', label: 'Schedule Call' },
  { value: 'schedule_meeting', label: 'Schedule Meeting' },
  { value: 'send_info', label: 'Send Info/Materials' },
  { value: 'send_proposal', label: 'Send Proposal' },
  { value: 'demo_scheduled', label: 'Demo Scheduled' },
  { value: 'trial_setup', label: 'Trial Setup' },
  { value: 'internal_review', label: 'Internal Review' },
  { value: 'none', label: 'None/Complete' },
] as const;

// Tag options
const TAG_OPTIONS = [
  { value: 'competitor_mention', label: 'Competitor Mentioned' },
  { value: 'budget_approved', label: 'Budget Approved' },
  { value: 'decision_maker', label: 'Decision Maker' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'champion', label: 'Champion' },
  { value: 'technical_buyer', label: 'Technical Buyer' },
  { value: 'executive', label: 'Executive' },
] as const;

interface LeadFormData {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  phone?: string;
  jobTitle?: string;
  interactionType: string;
  intentLevel: string;
  outcome: string;
  opportunityPotential?: string;
  nextStep?: string;
  station?: string;
  tags?: string[];
  notes?: string;
}

const leadFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  company: z.string().optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  interactionType: z.string().min(1, "Interaction type is required"),
  intentLevel: z.string().min(1, "Intent level is required"),
  outcome: z.string().min(1, "Outcome is required"),
  opportunityPotential: z.string().optional(),
  nextStep: z.string().optional(),
  station: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export default function CheckIn() {
  const { toast } = useToast();
  const { organization } = useAuth();
  const [mode, setMode] = useState<CheckInMode>('program');
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [checkInCode, setCheckInCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastCheckedIn, setLastCheckedIn] = useState<Attendee | null>(null);
  const [lastSessionCheckIn, setLastSessionCheckIn] = useState<{ attendee: Attendee; session: EventSession } | null>(null);
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [leadFormData, setLeadFormData] = useState<Partial<LeadFormData> | null>(null);
  const [isMatchedAttendee, setIsMatchedAttendee] = useState(false);
  const [matchedAttendeeId, setMatchedAttendeeId] = useState<string | null>(null);
  const [captureMethod, setCaptureMethod] = useState<CaptureMethod>('manual');
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const leadForm = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      phone: "",
      jobTitle: "",
      interactionType: "",
      intentLevel: "",
      outcome: "",
      opportunityPotential: "",
      nextStep: "",
      station: "",
      tags: [],
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
        interactionType: leadFormData.interactionType || "",
        intentLevel: leadFormData.intentLevel || "",
        outcome: leadFormData.outcome || "",
        opportunityPotential: leadFormData.opportunityPotential || "",
        nextStep: leadFormData.nextStep || "",
        station: leadFormData.station || "",
        tags: leadFormData.tags || [],
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

  const { data: leadStats, isLoading: leadStatsLoading } = useQuery<ProductInteractionStats>({
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

  const { data: demoStations = [] } = useQuery<DemoStation[]>({
    queryKey: ["/api/events", selectedEventId, "demo-stations"],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const res = await fetch(`/api/events/${selectedEventId}/demo-stations`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch demo stations");
      return res.json();
    },
    enabled: mode === 'lead' && !!selectedEventId,
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
        setCaptureMethod('qr_scan');
        if (data.attendeeData) {
          setLeadFormData({
            firstName: data.attendeeData.firstName,
            lastName: data.attendeeData.lastName,
            email: data.attendeeData.email,
            company: data.attendeeData.company,
            phone: data.attendeeData.phone,
            jobTitle: data.attendeeData.jobTitle,
          });
          setIsMatchedAttendee(true);
          setMatchedAttendeeId(data.attendee?.id || null);
          setLeadFormOpen(true);
        } else {
          setLeadFormData(null);
          setIsMatchedAttendee(false);
          setMatchedAttendeeId(null);
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
      if (!organization?.id || !selectedEventId) {
        throw new Error("Organization or event not selected");
      }
      
      const payload: Record<string, unknown> = {
        interactionType: data.interactionType,
        intentLevel: data.intentLevel,
        outcome: data.outcome,
        opportunityPotential: data.opportunityPotential || undefined,
        nextStep: data.nextStep || undefined,
        notes: data.notes || undefined,
        tags: data.tags && data.tags.length > 0 ? data.tags : undefined,
        station: data.station || undefined,
        captureMethod,
      };
      
      if (matchedAttendeeId) {
        payload.attendeeId = matchedAttendeeId;
      } else {
        payload.unmatchedFirstName = data.firstName;
        payload.unmatchedLastName = data.lastName;
        payload.unmatchedEmail = data.email;
        payload.unmatchedCompany = data.company || undefined;
        payload.unmatchedJobTitle = data.jobTitle || undefined;
      }
      
      const res = await apiRequest(
        "POST", 
        `/api/organizations/${organization.id}/events/${selectedEventId}/product-interactions`, 
        payload
      );
      return res.json() as Promise<ProductInteraction>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/check-in/stats", selectedEventId, "lead"] });
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${organization?.id}/events/${selectedEventId}/product-interactions`] });
      toast({ title: "Interaction captured", description: "Product interaction has been recorded" });
      setLeadFormOpen(false);
      setLeadFormData(null);
      setMatchedAttendeeId(null);
      setCaptureMethod('manual');
      leadForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to capture interaction", description: error.message, variant: "destructive" });
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
    setIsMatchedAttendee(false);
    setMatchedAttendeeId(null);
    setCaptureMethod('manual');
    leadForm.reset({
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      phone: "",
      jobTitle: "",
      interactionType: "",
      intentLevel: "",
      outcome: "",
      opportunityPotential: "",
      nextStep: "",
      station: "",
      tags: [],
      notes: "",
    });
    setLeadFormOpen(true);
  };

  const handleSelectAttendeeForLead = (attendee: Attendee) => {
    setCaptureMethod('lookup');
    setMatchedAttendeeId(attendee.id);
    setLeadFormData({
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      email: attendee.email,
      company: attendee.company || "",
      phone: attendee.phone || "",
      jobTitle: attendee.jobTitle || "",
    });
    setIsMatchedAttendee(true);
    setLeadFormOpen(true);
  };

  const filteredLeadAttendees = attendees?.filter(a => {
    if (!leadSearchQuery) return true;
    const query = leadSearchQuery.toLowerCase();
    return (
      a.firstName.toLowerCase().includes(query) ||
      a.lastName.toLowerCase().includes(query) ||
      a.email.toLowerCase().includes(query) ||
      a.checkInCode?.toLowerCase().includes(query)
    );
  }) || [];

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
                  <p className="text-sm text-muted-foreground">Interactions Today</p>
                  <p className="text-2xl font-semibold" data-testid="text-interactions-today">{leadStats?.interactionsToday || 0}</p>
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
                  <p className="text-sm text-muted-foreground">Total Interactions</p>
                  <p className="text-2xl font-semibold" data-testid="text-total-interactions">{leadStats?.totalInteractions || 0}</p>
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
                  <p className="text-sm text-muted-foreground">Badge Scans</p>
                  <p className="text-2xl font-semibold" data-testid="text-badge-scans">{leadStats?.badgeScans || 0}</p>
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
                  <p className="text-sm text-muted-foreground">Manual Entries</p>
                  <p className="text-2xl font-semibold" data-testid="text-manual-entries">{leadStats?.manualInteractions || 0}</p>
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
      case 'lead': return 'Product Interaction';
      case 'session': return 'Session Check-In';
    }
  };

  const getScanPlaceholder = () => {
    switch (mode) {
      case 'program': return 'Enter or scan check-in code';
      case 'lead': return 'Scan attendee badge to capture interaction';
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
              <Button size="icon" onClick={handleOpenLeadForm} data-testid="button-add-lead">
                <UserPlus className="w-4 h-4" />
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <Tabs value={mode} onValueChange={(v) => setMode(v as CheckInMode)} className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1 w-full max-w-lg">
              <TabsTrigger value="program" className="flex-1 min-w-fit" data-testid="tab-program">
                <UserCheck className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
                <span className="truncate">Program</span>
              </TabsTrigger>
              <TabsTrigger value="lead" className="flex-1 min-w-fit" data-testid="tab-lead">
                <Target className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
                <span className="hidden sm:inline">Product Interaction</span>
                <span className="sm:hidden">Interaction</span>
              </TabsTrigger>
              <TabsTrigger value="session" className="flex-1 min-w-fit" data-testid="tab-session">
                <CalendarCheck className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
                <span className="truncate">Session</span>
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
              {showScanner ? (
                <QRScanner 
                  onScan={(code) => {
                    setShowScanner(false);
                    setCheckInCode(code.toUpperCase());
                    // Auto-submit after scan
                    if (mode === 'session' && !selectedSessionId) {
                      toast({ title: "Select a session", description: "Please select a session before scanning", variant: "destructive" });
                      return;
                    }
                    scanMutation.mutate(code.toUpperCase());
                  }}
                  onClose={() => setShowScanner(false)}
                />
              ) : (
                <div className="space-y-4">
                  <Button
                    type="button"
                    className="w-full"
                    size="lg"
                    onClick={() => setShowScanner(true)}
                    disabled={mode === 'session' && !selectedSessionId}
                    data-testid="button-open-scanner"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Open Camera to Scan
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or enter code manually</span>
                    </div>
                  </div>
                  
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
                      variant="outline"
                      disabled={
                        !checkInCode.trim() || 
                        scanMutation.isPending || 
                        (mode === 'session' && !selectedSessionId)
                      }
                      data-testid="button-scan-checkin"
                    >
                      {scanMutation.isPending ? "Processing..." : mode === 'lead' ? "Capture Interaction" : "Check In"}
                    </Button>
                  </form>
                </div>
              )}

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
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Find Attendee
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    data-testid="input-search-lead-attendee"
                    placeholder="Search attendee by name, email, or code..."
                    value={leadSearchQuery}
                    onChange={(e) => setLeadSearchQuery(e.target.value)}
                    className="mb-4"
                  />

                  <div className="space-y-2 max-h-[300px] overflow-auto">
                    {attendeesLoading ? (
                      <>
                        <Skeleton className="h-16" />
                        <Skeleton className="h-16" />
                        <Skeleton className="h-16" />
                      </>
                    ) : filteredLeadAttendees.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground">No attendees found</p>
                    ) : (
                      filteredLeadAttendees.slice(0, 15).map((attendee) => (
                        <div
                          key={attendee.id}
                          className="flex items-center justify-between p-3 rounded-md border bg-card"
                          data-testid={`row-lead-attendee-${attendee.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{attendee.firstName} {attendee.lastName}</p>
                            <p className="text-sm text-muted-foreground truncate">{attendee.email}</p>
                            {attendee.company && (
                              <p className="text-xs text-muted-foreground">{attendee.company}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSelectAttendeeForLead(attendee)}
                            data-testid={`button-select-lead-${attendee.id}`}
                          >
                            <Target className="w-3 h-3 mr-1" />
                            Select
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Quick Add Interaction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Can't find the attendee? Manually enter their information for contacts not in the system.
                  </p>
                  <Button onClick={handleOpenLeadForm} variant="outline" className="w-full" data-testid="button-manual-lead">
                    <Edit3 className="w-4 h-4 mr-2" />
                    Enter Interaction Manually
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Dialog open={leadFormOpen} onOpenChange={setLeadFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 flex-wrap">
              <DialogTitle>Capture Interaction</DialogTitle>
              <Badge 
                variant="outline" 
                className={isMatchedAttendee 
                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"}
                data-testid="badge-match-status"
              >
                {isMatchedAttendee ? "Matched" : "Unmatched"}
              </Badge>
            </div>
            <DialogDescription>
              {isMatchedAttendee 
                ? "Review and confirm the interaction information captured from the badge scan or attendee search."
                : "Enter the contact information for this interaction."}
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

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={leadForm.control}
                  name="interactionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interaction Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-interaction-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INTERACTION_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={leadForm.control}
                  name="intentLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intent Level *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-wrap gap-2 pt-2"
                          data-testid="radio-intent-level"
                        >
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="low" id="intent-low" />
                            <Label 
                              htmlFor="intent-low" 
                              className="text-xs sm:text-sm cursor-pointer px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                            >
                              Low
                            </Label>
                          </div>
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="medium" id="intent-medium" />
                            <Label 
                              htmlFor="intent-medium" 
                              className="text-xs sm:text-sm cursor-pointer px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                            >
                              Medium
                            </Label>
                          </div>
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="high" id="intent-high" />
                            <Label 
                              htmlFor="intent-high" 
                              className="text-xs sm:text-sm cursor-pointer px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            >
                              High
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={leadForm.control}
                  name="outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outcome *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-outcome">
                            <SelectValue placeholder="Select outcome" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OUTCOME_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={leadForm.control}
                  name="opportunityPotential"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opportunity Potential</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-opportunity-potential">
                            <SelectValue placeholder="Select potential" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OPPORTUNITY_POTENTIAL_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={leadForm.control}
                  name="nextStep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Step</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-next-step">
                            <SelectValue placeholder="Select next step" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {NEXT_STEP_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={leadForm.control}
                  name="station"
                  render={({ field }) => {
                    const activeStations = demoStations.filter(s => s.isActive);
                    return (
                      <FormItem>
                        <FormLabel>Product Station</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-product-station">
                              <SelectValue placeholder={activeStations.length > 0 ? "Select product station" : "No stations configured"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeStations.length === 0 ? (
                              <SelectItem value="_none" disabled>
                                No demo stations available
                              </SelectItem>
                            ) : (
                              activeStations.map((station) => (
                                <SelectItem key={station.id} value={station.stationLocation}>
                                  {station.stationName} - {station.stationLocation}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <FormField
                control={leadForm.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {TAG_OPTIONS.map((tag) => {
                        const isSelected = field.value?.includes(tag.value);
                        return (
                          <div key={tag.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`tag-${tag.value}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, tag.value]);
                                } else {
                                  field.onChange(current.filter((v: string) => v !== tag.value));
                                }
                              }}
                              data-testid={`checkbox-tag-${tag.value}`}
                            />
                            <Label 
                              htmlFor={`tag-${tag.value}`} 
                              className="text-sm cursor-pointer"
                            >
                              {tag.label}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
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
                        placeholder="Add any notes about this interaction..." 
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
                    "Save Interaction"
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
