import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, fetchJSON, apiRequest } from "../lib/queryClient";
import { useAuth } from "../hooks/use-auth";
import { useActiveEvent } from "../hooks/use-active-event";
import { useToast } from "../hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Checkbox } from "../components/ui/checkbox";
import { Separator } from "../components/ui/separator";
import {
  Monitor, MapPin, Users, QrCode, Search, Target,
  CheckCircle, LogOut, Zap, Building2,
  ScanLine, UserPlus, Loader2, Package, Footprints,
} from "lucide-react";

const leadSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Valid email required"),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  interactionType: z.string().min(1, "Required"),
  intentLevel: z.string().min(1, "Required"),
  outcome: z.string().min(1, "Required"),
  opportunityPotential: z.string().optional(),
  nextStep: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});
type LeadForm = z.infer<typeof leadSchema>;

const INTERACTION_TYPES = [
  { value: "product_demo",          label: "Product Demo" },
  { value: "technical_deep_dive",   label: "Technical Deep Dive" },
  { value: "pricing_packaging",     label: "Pricing & Packaging" },
  { value: "executive_conversation",label: "Executive Conversation" },
  { value: "product_discussion",    label: "Product Discussion" },
  { value: "use_case_exploration",  label: "Use Case Exploration" },
  { value: "support_inquiry",       label: "Support Inquiry" },
  { value: "other",                 label: "Other" },
];
const OUTCOMES = [
  { value: "requested_follow_up",   label: "Requested Follow-Up" },
  { value: "asked_for_pricing",     label: "Asked for Pricing" },
  { value: "wants_trial_pilot",     label: "Wants Trial/Pilot" },
  { value: "intro_to_stakeholder",  label: "Intro to Stakeholder" },
  { value: "not_a_fit",            label: "Not a Fit" },
  { value: "too_early",            label: "Too Early" },
  { value: "other",                label: "Other" },
];
const NEXT_STEPS = [
  { value: "schedule_call",    label: "Schedule Call" },
  { value: "schedule_meeting", label: "Schedule Meeting" },
  { value: "send_info",        label: "Send Info" },
  { value: "send_proposal",    label: "Send Proposal" },
  { value: "demo_scheduled",   label: "Demo Scheduled" },
  { value: "trial_setup",      label: "Trial Setup" },
  { value: "none",             label: "None" },
];
const OPP_POTENTIALS = [
  { value: "under_10k",    label: "Under $10k" },
  { value: "10k_to_50k",  label: "$10k–$50k" },
  { value: "50k_to_100k", label: "$50k–$100k" },
  { value: "over_100k",   label: "Over $100k" },
];
const TAGS = [
  { value: "budget_confirmed",     label: "Budget Confirmed" },
  { value: "buying_committee",     label: "Buying Committee" },
  { value: "urgent_timeline",      label: "Urgent Timeline" },
  { value: "decision_maker",       label: "Decision Maker" },
  { value: "executive",            label: "Executive" },
  { value: "champion",             label: "Champion" },
  { value: "competitor_mentioned", label: "Competitor Mentioned" },
  { value: "icp_fit",              label: "ICP Fit" },
];

type Mode = "scan" | "leads";

export default function StaffPortal() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { eventId, eventName } = useActiveEvent();
  const [mode, setMode] = useState<Mode>("scan");
  const [code, setCode] = useState("");
  const [search, setSearch] = useState("");
  const [leadOpen, setLeadOpen] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [matchedId, setMatchedId] = useState<string | null>(null);
  const [isHallway, setIsHallway] = useState(false);
  const [lastCheckedIn, setLastCheckedIn] = useState<any>(null);

  const isStationless = !user?.stationId;

  const leadForm = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: { firstName: "", lastName: "", email: "", company: "",
      jobTitle: "", interactionType: "", intentLevel: "", outcome: "",
      opportunityPotential: "", nextStep: "", tags: [], notes: "" },
  });

  const { data: station } = useQuery<any>({
    queryKey: ["/api/staff/station", user?.stationId],
    queryFn: () => fetchJSON(`/api/events/${eventId}/stations/${user!.stationId}`),
    enabled: !!user?.stationId && !!eventId,
  });

  const { data: attendees = [] } = useQuery<any[]>({
    queryKey: ["/api/attendees", eventId],
    queryFn: () => fetchJSON(`/api/events/${eventId}/attendees`),
    enabled: !!eventId,
  });

  const { data: myCaptures = [] } = useQuery<any[]>({
    queryKey: ["/api/staff/captures", eventId],
    queryFn: () => fetchJSON(`/api/events/${eventId}/interactions`),
    enabled: !!eventId,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/checkin-stats", eventId],
    queryFn: () => fetchJSON(`/api/events/${eventId}/checkin/stats`),
    enabled: !!eventId,
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${eventId}/checkin/scan`, {
        code: code.trim().toUpperCase(), mode: "program",
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCode("");
      setLastCheckedIn(data.attendee);
      queryClient.invalidateQueries({ queryKey: ["/api/checkin-stats", eventId] });
      toast({ title: "✓ Checked in", description: `${data.attendee?.firstName} ${data.attendee?.lastName}` });
    },
    onError: (err: any) => toast({ title: "Scan failed", description: err.message, variant: "destructive" }),
  });

  const manualMutation = useMutation({
    mutationFn: async (attendeeId: string) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/checkin/manual`, {
        eventAttendeeId: attendeeId, mode: "program",
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/attendees", eventId], (old: any[]) =>
        (old || []).map(a => a.id === data.attendee?.id ? { ...a, checkedIn: true } : a)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/checkin-stats", eventId] });
      toast({ title: "✓ Checked in", description: `${data.attendee?.firstName} ${data.attendee?.lastName}` });
    },
    onError: (err: any) => toast({ title: "Check-in failed", description: err.message, variant: "destructive" }),
  });

  const leadMutation = useMutation({
    mutationFn: async (data: LeadForm) => {
      const captureMethod = isHallway ? "hallway" : isMatched ? "lookup" : "manual";
      const payload: any = {
        interactionType: data.interactionType,
        intentLevel: data.intentLevel,
        outcome: data.outcome,
        opportunityPotential: data.opportunityPotential || undefined,
        nextStep: data.nextStep || undefined,
        tags: data.tags?.length ? data.tags : undefined,
        notes: data.notes || undefined,
        station: isHallway ? null : (station?.stationLocation || undefined),
        captureMethod,
      };
      if (matchedId) payload.eventAttendeeId = matchedId;
      else {
        payload.unmatchedFirstName = data.firstName;
        payload.unmatchedLastName = data.lastName;
        payload.unmatchedEmail = data.email;
        payload.unmatchedCompany = data.company;
        payload.unmatchedJobTitle = data.jobTitle;
      }
      const res = await apiRequest("POST", `/api/events/${eventId}/interactions`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff/captures", eventId] });
      const msg = isHallway ? "Hallway capture saved 🚶" : "Interaction captured";
      toast({ title: `✓ ${msg}` });
      setLeadOpen(false);
      leadForm.reset();
      setMatchedId(null);
      setIsMatched(false);
      setIsHallway(false);
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const openHallwayCapture = () => {
    setIsHallway(true); setIsMatched(false); setMatchedId(null);
    leadForm.reset({ firstName: "", lastName: "", email: "", company: "",
      jobTitle: "", interactionType: "", intentLevel: "", outcome: "" });
    setLeadOpen(true);
  };

  const openMatchedLead = (a: any, hallway = false) => {
    setIsHallway(hallway || isStationless);
    setIsMatched(true); setMatchedId(a.id);
    leadForm.reset({ firstName: a.firstName, lastName: a.lastName,
      email: a.email, company: a.company || "", jobTitle: a.jobTitle || "",
      interactionType: "", intentLevel: "", outcome: "" });
    setLeadOpen(true);
  };

  const openStationLead = () => {
    setIsHallway(false); setIsMatched(false); setMatchedId(null);
    leadForm.reset({ firstName: "", lastName: "", email: "", company: "",
      jobTitle: "", interactionType: "", intentLevel: "", outcome: "" });
    setLeadOpen(true);
  };

  const filtered = attendees.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${a.firstName} ${a.lastName}`.toLowerCase().includes(q)
      || a.email?.toLowerCase().includes(q)
      || a.badgeCode?.toLowerCase().includes(q);
  });

  const hallwayCaptures = myCaptures.filter((c: any) => c.captureMethod === "hallway");
  const stationCaptures = myCaptures.filter((c: any) => c.captureMethod !== "hallway");

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold leading-none">Engage</p>
            <p className="text-xs text-muted-foreground">{eventName || "Loading..."}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">{user?.name || user?.email}</span>
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">

        {/* Station card — or hallway turd state */}
        {!isStationless ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Monitor className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{station?.stationName || "Loading..."}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3" />
                    <span>{station?.stationLocation}</span>
                  </div>
                  {station?.productFocus?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {station.productFocus.map((p: string) => (
                        <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{p}</span>
                      ))}
                    </div>
                  )}
                </div>
                <Button size="sm" onClick={openStationLead} className="flex-shrink-0">
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />Capture
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Hallway turd card
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Footprints className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-900 dark:text-amber-100">Hallway Mode</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    Met someone interesting? Capture it before the moment's gone.
                  </p>
                </div>
                <Button size="sm" onClick={openHallwayCapture}
                  className="flex-shrink-0 bg-amber-600 hover:bg-amber-700 text-white border-0">
                  <Footprints className="h-3.5 w-3.5 mr-1.5" />Capture
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Registered",  value: stats?.totalAttendees ?? "—", icon: <Users className="h-4 w-4 text-muted-foreground" /> },
            { label: "Checked In",  value: stats?.checkedIn ?? "—",       icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
            { label: "Station",     value: stationCaptures.length,         icon: <Target className="h-4 w-4 text-purple-500" /> },
            { label: "Hallway",     value: hallwayCaptures.length,         icon: <Footprints className="h-4 w-4 text-amber-500" /> },
          ].map(({ label, value, icon }) => (
            <Card key={label}>
              <CardContent className="p-3 flex flex-col items-center text-center gap-1">
                {icon}
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mode tabs */}
        <Tabs value={mode} onValueChange={v => setMode(v as Mode)}>
          <TabsList className="w-full">
            <TabsTrigger value="scan" className="flex-1">
              <ScanLine className="h-4 w-4 mr-1.5" />Check-In
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex-1">
              <Target className="h-4 w-4 mr-1.5" />My Captures
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Check-In tab */}
        {mode === "scan" && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <QrCode className="h-4 w-4" />Scan Badge
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Scan or type badge code..."
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === "Enter" && code.trim()) scanMutation.mutate(); }}
                  className="font-mono text-center tracking-widest text-lg h-12"
                  autoFocus
                />
                <Button className="w-full" onClick={() => scanMutation.mutate()}
                  disabled={!code.trim() || scanMutation.isPending}>
                  {scanMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : "Check In"}
                </Button>
                {lastCheckedIn && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        {lastCheckedIn.firstName} {lastCheckedIn.lastName}
                      </p>
                      <p className="text-xs text-green-600">{lastCheckedIn.company}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search className="h-4 w-4" />Find Attendee
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Search name, email or badge..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="mb-3"
                />
                <div className="space-y-2 max-h-72 overflow-auto">
                  {filtered.slice(0, 15).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{a.firstName} {a.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.company}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {a.checkedIn
                          ? <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />In
                            </Badge>
                          : <Button size="sm" onClick={() => manualMutation.mutate(a.id)}>Check In</Button>
                        }
                        <Button size="sm" variant="outline" onClick={() => openMatchedLead(a)}
                          title={isStationless ? "Hallway capture" : "Capture interaction"}>
                          {isStationless ? <Footprints className="h-3 w-3 text-amber-600" /> : <Target className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {search && filtered.length === 0 && (
                    <p className="text-sm text-center text-muted-foreground py-4">No attendees found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* My Captures tab */}
        {mode === "leads" && (
          <div className="space-y-4">
            {/* Hallway captures section */}
            {hallwayCaptures.length > 0 && (
              <Card className="border-amber-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                    <Footprints className="h-4 w-4" />Hallway Captures
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {hallwayCaptures.map((c: any) => <CaptureRow key={c.id} c={c} />)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Station captures section */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {isStationless ? "All Captures" : "Station Captures"}
                </CardTitle>
                <Button size="sm" onClick={isStationless ? openHallwayCapture : openStationLead}>
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />New
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {stationCaptures.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-muted-foreground">
                    <Package className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm">No captures yet</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {stationCaptures.map((c: any) => <CaptureRow key={c.id} c={c} />)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Lead Capture Dialog */}
      <Dialog open={leadOpen} onOpenChange={setLeadOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>
                {isHallway ? "Hallway Capture" : "Capture Interaction"}
              </DialogTitle>
              <Badge variant="outline" className={
                isHallway ? "bg-amber-50 text-amber-700 border-amber-200" :
                isMatched ? "bg-green-50 text-green-700 border-green-200" :
                "bg-muted text-muted-foreground"
              }>
                {isHallway ? "🚶 Hallway" : isMatched ? "Matched" : "Walk-Up"}
              </Badge>
            </div>
            <DialogDescription>
              {isHallway
                ? "Capture before the moment's gone — the elevator doesn't wait."
                : station
                  ? `Station: ${station.stationName} · ${station.stationLocation}`
                  : "Manual capture"}
            </DialogDescription>
          </DialogHeader>

          <Form {...leadForm}>
            <form onSubmit={leadForm.handleSubmit(d => leadMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={leadForm.control} name="firstName" render={({ field }) => (
                  <FormItem><FormLabel>First Name *</FormLabel>
                    <FormControl><Input {...field} disabled={isMatched} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={leadForm.control} name="lastName" render={({ field }) => (
                  <FormItem><FormLabel>Last Name *</FormLabel>
                    <FormControl><Input {...field} disabled={isMatched} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={leadForm.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email *</FormLabel>
                  <FormControl><Input type="email" {...field} disabled={isMatched} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {!isMatched && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={leadForm.control} name="company" render={({ field }) => (
                    <FormItem><FormLabel>Company</FormLabel>
                      <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={leadForm.control} name="jobTitle" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel>
                      <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={leadForm.control} name="interactionType" render={({ field }) => (
                  <FormItem><FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>{INTERACTION_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={leadForm.control} name="intentLevel" render={({ field }) => (
                  <FormItem><FormLabel>Intent *</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-3 pt-2">
                        {["low","medium","high"].map(v => (
                          <div key={v} className="flex items-center gap-1">
                            <RadioGroupItem value={v} id={`il-${v}`} />
                            <Label htmlFor={`il-${v}`} className="text-xs capitalize cursor-pointer">{v}</Label>
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
                      <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>{OUTCOMES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={leadForm.control} name="opportunityPotential" render={({ field }) => (
                  <FormItem><FormLabel>Opportunity $</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Range" /></SelectTrigger></FormControl>
                      <SelectContent>{OPP_POTENTIALS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              <FormField control={leadForm.control} name="nextStep" render={({ field }) => (
                <FormItem><FormLabel>Next Step</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select next step" /></SelectTrigger></FormControl>
                    <SelectContent>{NEXT_STEPS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={leadForm.control} name="tags" render={({ field }) => (
                <FormItem><FormLabel>Qualifying Tags</FormLabel>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                    {TAGS.map(tag => (
                      <div key={tag.value} className="flex items-center gap-1.5">
                        <Checkbox id={`t-${tag.value}`}
                          checked={(field.value || []).includes(tag.value)}
                          onCheckedChange={checked => {
                            const cur = field.value || [];
                            field.onChange(checked ? [...cur, tag.value] : cur.filter(v => v !== tag.value));
                          }} />
                        <Label htmlFor={`t-${tag.value}`} className="text-xs cursor-pointer">{tag.label}</Label>
                      </div>
                    ))}
                  </div>
                </FormItem>
              )} />

              <FormField control={leadForm.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder={isHallway ? "What happened in the elevator..." : "Anything worth noting..."}
                      rows={3} {...field} value={field.value || ""} />
                  </FormControl>
                </FormItem>
              )} />

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setLeadOpen(false)}>Cancel</Button>
                <Button type="submit" className={`flex-1 ${isHallway ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                  disabled={leadMutation.isPending}>
                  {leadMutation.isPending
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                    : isHallway ? "🚶 Save Hallway Capture" : "Save Interaction"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CaptureRow({ c }: { c: any }) {
  const isHallway = c.captureMethod === "hallway";
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {isHallway && <Footprints className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {c.firstName && c.lastName ? `${c.firstName} ${c.lastName}`
                : c.unmatchedFirstName ? `${c.unmatchedFirstName} ${c.unmatchedLastName}`
                : "Anonymous"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{c.company || c.unmatchedCompany || "—"}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            c.intentLevel === "high"   ? "bg-red-100 text-red-700" :
            c.intentLevel === "medium" ? "bg-amber-100 text-amber-700" :
            "bg-muted text-muted-foreground"}`}>
            {c.intentLevel}
          </span>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(c.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1 capitalize">
        {c.interactionType?.replace(/_/g, " ")} · {c.outcome?.replace(/_/g, " ")}
      </p>
    </div>
  );
}
