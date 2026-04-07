import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { AppHeader } from "./dashboard";
import { useActiveEvent } from "../hooks/use-active-event";
import { queryClient, apiRequest, fetchJSON } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Checkbox } from "../components/ui/checkbox";
import { Separator } from "../components/ui/separator";
import { ArrowLeft, QrCode, UserCheck, Users, Clock, CheckCircle, Search, UserPlus, Target, ScanLine, Edit3, AlertCircle, Loader2, CalendarCheck } from "lucide-react";

type Mode = "program" | "session" | "lead";

const leadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  interactionType: z.string().min(1),
  intentLevel: z.string().min(1),
  outcome: z.string().min(1),
  opportunityPotential: z.string().optional(),
  nextStep: z.string().optional(),
  station: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});
type LeadForm = z.infer<typeof leadSchema>;

const INTERACTION_TYPES = [
  { value: "demo", label: "Demo" },
  { value: "product_discussion", label: "Product Discussion" },
  { value: "pricing_request", label: "Pricing Request" },
  { value: "technical_deep_dive", label: "Technical Deep Dive" },
  { value: "use_case_exploration", label: "Use Case Exploration" },
  { value: "integration_question", label: "Integration Question" },
  { value: "support_inquiry", label: "Support Inquiry" },
  { value: "partnership", label: "Partnership Inquiry" },
  { value: "other", label: "Other" },
];
const OUTCOMES = [
  { value: "requested_follow_up", label: "Requested Follow-up" },
  { value: "asked_for_pricing", label: "Asked for Pricing" },
  { value: "wants_trial_pilot", label: "Wants Trial/Pilot" },
  { value: "intro_to_stakeholder", label: "Intro to Stakeholder" },
  { value: "not_a_fit", label: "Not a Fit" },
  { value: "too_early", label: "Too Early" },
  { value: "other", label: "Other" },
];
const NEXT_STEPS = [
  { value: "schedule_call", label: "Schedule Call" },
  { value: "schedule_meeting", label: "Schedule Meeting" },
  { value: "send_info", label: "Send Info/Materials" },
  { value: "send_proposal", label: "Send Proposal" },
  { value: "demo_scheduled", label: "Demo Scheduled" },
  { value: "trial_setup", label: "Trial Setup" },
  { value: "none", label: "None/Complete" },
];
const OPP_POTENTIALS = [
  { value: "under_10k", label: "Under $10k" },
  { value: "10k_to_50k", label: "$10k - $50k" },
  { value: "50k_to_100k", label: "$50k - $100k" },
  { value: "over_100k", label: "Over $100k" },
];
const TAGS = [
  { value: "competitor_mention", label: "Competitor Mentioned" },
  { value: "budget_approved", label: "Budget Approved" },
  { value: "decision_maker", label: "Decision Maker" },
  { value: "influencer", label: "Influencer" },
  { value: "champion", label: "Champion" },
  { value: "technical_buyer", label: "Technical Buyer" },
  { value: "executive", label: "Executive" },
];

export default function CheckIn() {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("program");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [code, setCode] = useState("");
  const [search, setSearch] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const [lastCheckedIn, setLastCheckedIn] = useState<any>(null);
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [matchedAttendeeId, setMatchedAttendeeId] = useState<string | null>(null);
  const [captureMethod, setCaptureMethod] = useState("manual");

  const leadForm = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: { firstName: "", lastName: "", email: "", company: "", jobTitle: "", phone: "", interactionType: "", intentLevel: "", outcome: "", opportunityPotential: "", nextStep: "", station: "", tags: [], notes: "" },
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
    queryFn: () => fetchJSON("/api/events"),
  });


  const { data: checkinStats } = useQuery<any>({
    queryKey: ["/api/checkin-stats", selectedEventId, "program"],
    queryFn: () => fetchJSON(`/api/events/${selectedEventId}/checkin/stats?mode=program`),
    enabled: mode === "program" && !!selectedEventId,
  });
  const { data: sessionStats } = useQuery<any>({
    queryKey: ["/api/checkin-stats", selectedEventId, "session"],
    queryFn: () => fetchJSON(`/api/events/${selectedEventId}/checkin/stats?mode=session`),
    enabled: mode === "session" && !!selectedEventId,
  });
  const { data: leadStats } = useQuery<any>({
    queryKey: ["/api/interaction-stats", selectedEventId],
    queryFn: () => fetchJSON(`/api/events/${selectedEventId}/interactions/stats`),
    enabled: mode === "lead" && !!selectedEventId,
  });
  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ["/api/sessions", selectedEventId],
    queryFn: () => fetchJSON(`/api/events/${selectedEventId}/sessions`),
    enabled: mode === "session" && !!selectedEventId,
  });
  const { data: attendees = [], isLoading: attendeesLoading } = useQuery<any[]>({
    queryKey: ["/api/attendees", selectedEventId],
    queryFn: () => fetchJSON(`/api/events/${selectedEventId}/attendees`),
    enabled: !!selectedEventId,
  });
  const { data: stations = [] } = useQuery<any[]>({
    queryKey: ["/api/stations", selectedEventId],
    queryFn: () => fetchJSON(`/api/events/${selectedEventId}/stations`),
    enabled: mode === "lead" && !!selectedEventId,
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${selectedEventId}/checkin/scan`, {
        code: code.trim().toUpperCase(),
        mode,
        sessionId: selectedSessionId || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCode("");
      if (mode === "program") {
        setLastCheckedIn(data.attendee);
        queryClient.invalidateQueries({ queryKey: ["/api/checkin-stats", selectedEventId, "program"] });
        toast({ title: "Checked in", description: `${data.attendee.firstName} ${data.attendee.lastName}` });
      } else if (mode === "session") {
        queryClient.invalidateQueries({ queryKey: ["/api/checkin-stats", selectedEventId, "session"] });
        toast({ title: "Session check-in recorded" });
      } else if (mode === "lead" && data.attendeeData) {
        setCaptureMethod("qr_scan");
        setIsMatched(true);
        setMatchedAttendeeId(data.attendee?.id || null);
        leadForm.reset({ ...data.attendeeData, interactionType: "", intentLevel: "", outcome: "", opportunityPotential: "", nextStep: "", station: "", tags: [], notes: "" });
        setLeadFormOpen(true);
      }
    },
    onError: (err: any) => toast({ title: "Scan failed", description: err.message, variant: "destructive" }),
  });

  const manualCheckInMutation = useMutation({
    mutationFn: async (attendeeId: string) => {
      const res = await apiRequest("POST", `/api/events/${selectedEventId}/checkin/manual`, {
        attendeeId,
        sessionId: selectedSessionId || undefined,
        mode,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkin-stats", selectedEventId, "program"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkin-stats", selectedEventId, "session"] });
      if (mode === "program") toast({ title: "Checked in", description: `${data.firstName} ${data.lastName}` });
      else toast({ title: "Session check-in recorded" });
    },
    onError: (err: any) => toast({ title: "Check-in failed", description: err.message, variant: "destructive" }),
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: LeadForm) => {
      const payload: any = {
        interactionType: data.interactionType,
        intentLevel: data.intentLevel,
        outcome: data.outcome,
        opportunityPotential: data.opportunityPotential || undefined,
        nextStep: data.nextStep || undefined,
        station: data.station || undefined,
        tags: data.tags?.length ? data.tags : undefined,
        notes: data.notes || undefined,
        captureMethod,
      };
      if (matchedAttendeeId) {
        payload.attendeeId = matchedAttendeeId;
      } else {
        payload.unmatchedFirstName = data.firstName;
        payload.unmatchedLastName = data.lastName;
        payload.unmatchedEmail = data.email;
        payload.unmatchedCompany = data.company;
        payload.unmatchedJobTitle = data.jobTitle;
      }
      const res = await apiRequest("POST", `/api/events/${selectedEventId}/interactions`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interaction-stats", selectedEventId] });
      toast({ title: "Interaction captured" });
      setLeadFormOpen(false);
      leadForm.reset();
      setMatchedAttendeeId(null);
      setCaptureMethod("manual");
      setIsMatched(false);
    },
    onError: (err: any) => toast({ title: "Failed to capture", description: err.message, variant: "destructive" }),
  });

  const openManualLead = () => {
    setIsMatched(false); setMatchedAttendeeId(null); setCaptureMethod("manual");
    leadForm.reset({ firstName: "", lastName: "", email: "", company: "", jobTitle: "", phone: "", interactionType: "", intentLevel: "", outcome: "" });
    setLeadFormOpen(true);
  };
  const selectAttendeeForLead = (a: any) => {
    setIsMatched(true); setMatchedAttendeeId(a.id); setCaptureMethod("lookup");
    leadForm.reset({ firstName: a.firstName, lastName: a.lastName, email: a.email, company: a.company || "", jobTitle: a.jobTitle || "", phone: a.phone || "", interactionType: "", intentLevel: "", outcome: "" });
    setLeadFormOpen(true);
  };

  const filtered = attendees.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.firstName.toLowerCase().includes(q) || a.lastName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.badgeCode?.toLowerCase().includes(q);
  });
  const filteredLead = attendees.filter(a => {
    if (!leadSearch) return true;
    const q = leadSearch.toLowerCase();
    return a.firstName.toLowerCase().includes(q) || a.lastName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
        <Tabs value={mode} onValueChange={v => setMode(v as Mode)}>
          <TabsList>
            <TabsTrigger value="program"><UserCheck className="h-4 w-4 mr-2" />Program</TabsTrigger>
            <TabsTrigger value="session"><CalendarCheck className="h-4 w-4 mr-2" />Session</TabsTrigger>
            <TabsTrigger value="lead"><Target className="h-4 w-4 mr-2" />Product Interaction</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Session selector */}
        {mode === "session" && (
          <Card><CardContent className="pt-4">
            <Label className="text-sm font-medium mb-2 block">Select Session</Label>
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger><SelectValue placeholder="Choose a session" /></SelectTrigger>
              <SelectContent>{sessions.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
            </Select>
            {!selectedSessionId && <p className="text-xs text-amber-600 flex items-center gap-1 mt-2"><AlertCircle className="h-3 w-3" />Select a session before scanning</p>}
          </CardContent></Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mode === "program" && (<>
            <StatCard label="Total Registered" value={checkinStats?.totalAttendees ?? 0} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
            <StatCard label="Checked In" value={checkinStats?.checkedIn ?? 0} icon={<CheckCircle className="h-4 w-4 text-green-500" />} />
            <StatCard label="Pending" value={checkinStats?.pending ?? 0} icon={<Clock className="h-4 w-4 text-amber-500" />} />
            <StatCard label="Check-In Rate" value={`${checkinStats?.checkInRate ?? 0}%`} icon={<UserCheck className="h-4 w-4 text-blue-500" />} />
          </>)}
          {mode === "session" && (<>
            <StatCard label="Session Attendance" value={sessionStats?.sessionAttendance ?? 0} icon={<CalendarCheck className="h-4 w-4 text-indigo-500" />} />
            <StatCard label="Today" value={sessionStats?.checkInsToday ?? 0} icon={<CheckCircle className="h-4 w-4 text-green-500" />} />
            <StatCard label="Unique Attendees" value={sessionStats?.uniqueAttendees ?? 0} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
            <StatCard label="Sessions Covered" value={sessionStats?.sessionsCovered ?? 0} icon={<CalendarCheck className="h-4 w-4 text-amber-500" />} />
          </>)}
          {mode === "lead" && (<>
            <StatCard label="Today" value={leadStats?.interactionsToday ?? 0} icon={<Target className="h-4 w-4 text-purple-500" />} />
            <StatCard label="Total" value={leadStats?.totalInteractions ?? 0} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
            <StatCard label="Badge Scans" value={leadStats?.badgeScans ?? 0} icon={<ScanLine className="h-4 w-4 text-blue-500" />} />
            <StatCard label="Manual" value={leadStats?.manualInteractions ?? 0} icon={<Edit3 className="h-4 w-4 text-green-500" />} />
          </>)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scan card */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><QrCode className="h-4 w-4" />{mode === "lead" ? "Scan Badge" : "Scan Badge / Code"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder={mode === "lead" ? "Scan attendee badge code" : "Enter or scan check-in code"}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === "Enter" && code.trim()) { if (mode === "session" && !selectedSessionId) { toast({ title: "Select a session first", variant: "destructive" }); return; } scanMutation.mutate(); } }}
                className="font-mono text-center tracking-wider"
                disabled={mode === "session" && !selectedSessionId}
              />
              <Button className="w-full" variant="outline" disabled={!code.trim() || scanMutation.isPending || (mode === "session" && !selectedSessionId)} onClick={() => scanMutation.mutate()}>
                {scanMutation.isPending ? "Processing..." : mode === "lead" ? "Capture Interaction" : "Check In"}
              </Button>
              {lastCheckedIn && mode === "program" && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1"><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-sm font-medium text-green-700 dark:text-green-300">Last Check-In</span></div>
                  <p className="font-medium text-sm">{lastCheckedIn.firstName} {lastCheckedIn.lastName}</p>
                  <p className="text-xs text-muted-foreground">{lastCheckedIn.email}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendee search / lead lookup */}
          {mode !== "lead" ? (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Search className="h-4 w-4" />Manual Check-In</CardTitle></CardHeader>
              <CardContent>
                <Input placeholder="Search by name, email, or badge code..." value={search} onChange={e => setSearch(e.target.value)} className="mb-3" />
                <div className="space-y-2 max-h-80 overflow-auto">
                  {attendeesLoading ? <><Skeleton className="h-14" /><Skeleton className="h-14" /></> :
                    filtered.slice(0, 20).map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-md border">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{a.firstName} {a.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                        </div>
                        {mode === "program" && a.checkedIn
                          ? <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 text-xs"><CheckCircle className="h-3 w-3 mr-1" />In</Badge>
                          : <Button size="sm" onClick={() => manualCheckInMutation.mutate(a.id)} disabled={mode === "session" && !selectedSessionId}>
                              {mode === "session" ? "Session" : "Check In"}
                            </Button>
                        }
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Search className="h-4 w-4" />Find Attendee</CardTitle></CardHeader>
              <CardContent>
                <Input placeholder="Search attendee by name or email..." value={leadSearch} onChange={e => setLeadSearch(e.target.value)} className="mb-3" />
                <div className="space-y-2 max-h-60 overflow-auto">
                  {filteredLead.slice(0, 15).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-md border">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{a.firstName} {a.lastName}</p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                      </div>
                      <Button size="sm" onClick={() => selectAttendeeForLead(a)}><Target className="h-3 w-3 mr-1" />Select</Button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" className="w-full" onClick={openManualLead}><Edit3 className="h-4 w-4 mr-2" />Enter Manually</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Lead capture dialog */}
      <Dialog open={leadFormOpen} onOpenChange={setLeadFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2"><DialogTitle>Capture Interaction</DialogTitle>
              <Badge variant="outline" className={isMatched ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                {isMatched ? "Matched" : "Unmatched"}
              </Badge>
            </div>
            <DialogDescription>{isMatched ? "Review contact info and complete the interaction details." : "Enter contact info for this interaction."}</DialogDescription>
          </DialogHeader>
          <Form {...leadForm}>
            <form onSubmit={leadForm.handleSubmit(d => createLeadMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={leadForm.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={leadForm.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Last Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={leadForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={leadForm.control} name="company" render={({ field }) => (<FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>)} />
                <FormField control={leadForm.control} name="jobTitle" render={({ field }) => (<FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>)} />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={leadForm.control} name="interactionType" render={({ field }) => (
                  <FormItem><FormLabel>Interaction Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                      <SelectContent>{INTERACTION_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={leadForm.control} name="intentLevel" render={({ field }) => (
                  <FormItem><FormLabel>Intent Level *</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-2 pt-2">
                        {["low", "medium", "high"].map(v => (
                          <div key={v} className="flex items-center gap-1">
                            <RadioGroupItem value={v} id={`intent-${v}`} />
                            <Label htmlFor={`intent-${v}`} className="text-xs capitalize cursor-pointer">{v}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl><FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={leadForm.control} name="outcome" render={({ field }) => (
                  <FormItem><FormLabel>Outcome *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger></FormControl>
                      <SelectContent>{OUTCOMES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={leadForm.control} name="opportunityPotential" render={({ field }) => (
                  <FormItem><FormLabel>Opportunity $</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger></FormControl>
                      <SelectContent>{OPP_POTENTIALS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={leadForm.control} name="nextStep" render={({ field }) => (
                  <FormItem><FormLabel>Next Step</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Next step" /></SelectTrigger></FormControl>
                      <SelectContent>{NEXT_STEPS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={leadForm.control} name="station" render={({ field }) => (
                  <FormItem><FormLabel>Station</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select station" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {stations.filter((s: any) => s.isActive).map((s: any) => (
                          <SelectItem key={s.id} value={s.stationLocation}>{s.stationName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <FormField control={leadForm.control} name="tags" render={({ field }) => (
                <FormItem><FormLabel>Tags</FormLabel>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {TAGS.map(tag => (
                      <div key={tag.value} className="flex items-center gap-1">
                        <Checkbox id={`tag-${tag.value}`}
                          checked={(field.value || []).includes(tag.value)}
                          onCheckedChange={checked => {
                            const cur = field.value || [];
                            field.onChange(checked ? [...cur, tag.value] : cur.filter(v => v !== tag.value));
                          }}
                        />
                        <Label htmlFor={`tag-${tag.value}`} className="text-xs cursor-pointer">{tag.label}</Label>
                      </div>
                    ))}
                  </div>
                </FormItem>
              )} />
              <FormField control={leadForm.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Add notes about this interaction..." rows={3} {...field} value={field.value || ""} /></FormControl></FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setLeadFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createLeadMutation.isPending}>
                  {createLeadMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Interaction"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: any; icon: React.ReactNode }) {
  return (
    <Card><CardContent className="pt-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-muted flex-shrink-0">{icon}</div>
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p></div>
      </div>
    </CardContent></Card>
  );
}
