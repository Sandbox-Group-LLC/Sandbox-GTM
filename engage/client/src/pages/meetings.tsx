import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Skeleton } from "../components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { ArrowLeft, Users, Plus, CalendarIcon, Clock, CheckCircle, TrendingUp, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";

const INTENT_TYPES = [
  { value: "exploring_solution", label: "Exploring Solutions" },
  { value: "evaluating_fit", label: "Evaluating Fit" },
  { value: "existing_customer", label: "Existing Customer" },
  { value: "partner_discussion", label: "Partner Discussion" },
  { value: "executive_introduction", label: "Executive Intro" },
  { value: "networking", label: "Networking" },
];
const OUTCOME_TYPES = [
  { value: "no_fit", label: "No Fit" },
  { value: "early_interest", label: "Early Interest" },
  { value: "active_opportunity", label: "Active Opportunity" },
  { value: "follow_up_scheduled", label: "Follow-up Scheduled" },
  { value: "deal_in_progress", label: "Deal In Progress" },
];
const DEAL_RANGES = [
  { value: "under_25k", label: "Under $25K" },
  { value: "25k_to_100k", label: "$25K - $100K" },
  { value: "over_100k", label: "Over $100K" },
];
const TIMELINES = [
  { value: "now", label: "Now" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "later", label: "Later" },
];

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
};
const OUTCOME_LABELS: Record<string, string> = Object.fromEntries(OUTCOME_TYPES.map(o => [o.value, o.label]));
const INTENT_LABELS: Record<string, string> = Object.fromEntries(INTENT_TYPES.map(o => [o.value, o.label]));

export default function Meetings() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);

  const [newMeeting, setNewMeeting] = useState({ attendeeId: "", intentType: "", startTime: "", message: "", hostName: "", hostEmail: "" });
  const [outcomeData, setOutcomeData] = useState({ outcomeType: "", outcomeConfidence: "", dealRange: "", timeline: "", outcomeNotes: "" });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
    queryFn: () => fetch("/api/events", { credentials: "include" }).then(r => r.json()),
  });

  const { data: meetings = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/meetings", selectedEventId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const r = await fetch(`/api/events/${selectedEventId}/meetings?${params}`, { credentials: "include" });
      return r.json();
    },
    enabled: !!selectedEventId,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/meeting-stats", selectedEventId],
    queryFn: () => fetch(`/api/events/${selectedEventId}/meetings/stats`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedEventId,
  });

  const { data: attendees = [] } = useQuery<any[]>({
    queryKey: ["/api/attendees", selectedEventId],
    queryFn: () => fetch(`/api/events/${selectedEventId}/attendees`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedEventId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${selectedEventId}/meetings`, {
        ...newMeeting,
        startTime: new Date(newMeeting.startTime).toISOString(),
        endTime: new Date(new Date(newMeeting.startTime).getTime() + 30 * 60000).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-stats", selectedEventId] });
      toast({ title: "Meeting scheduled" });
      setCreateOpen(false);
      setNewMeeting({ attendeeId: "", intentType: "", startTime: "", message: "", hostName: "", hostEmail: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const outcomeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/meetings/${selectedMeeting.id}/outcome`, outcomeData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-stats", selectedEventId] });
      toast({ title: "Outcome captured" });
      setOutcomeOpen(false);
      setSelectedMeeting(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openOutcome = (m: any) => {
    setSelectedMeeting(m);
    setOutcomeData({ outcomeType: m.outcomeType || "", outcomeConfidence: m.outcomeConfidence || "", dealRange: m.dealRange || "", timeline: m.timeline || "", outcomeNotes: m.outcomeNotes || "" });
    setOutcomeOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b px-6 py-4 flex items-center gap-4">
        <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Meetings</h1>
          <p className="text-xs text-muted-foreground">Schedule meetings and capture outcomes</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select event" /></SelectTrigger>
            <SelectContent>{events.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
          </Select>
          {selectedEventId && (
            <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />Schedule</Button>
          )}
        </div>
      </header>

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
        {!selectedEventId ? (
          <Card><CardContent className="flex flex-col items-center py-16"><Users className="h-10 w-10 text-muted-foreground/30 mb-3" /><p className="text-muted-foreground">Select an event to view meetings</p></CardContent></Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total" value={stats?.totalMeetings ?? 0} icon={<CalendarIcon className="h-4 w-4 text-muted-foreground" />} />
              <StatCard label="Pending" value={stats?.pendingResponses ?? 0} icon={<Clock className="h-4 w-4 text-amber-500" />} />
              <StatCard label="Outcomes Captured" value={stats?.outcomesCaptured ?? 0} icon={<CheckCircle className="h-4 w-4 text-green-500" />} />
              <StatCard label="High Intent" value={stats?.highIntent ?? 0} icon={<TrendingUp className="h-4 w-4 text-blue-500" />} />
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="pt-4">
                {isLoading ? (
                  <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
                ) : meetings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No meetings found</p></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Attendee</TableHead>
                        <TableHead>Intent</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meetings.map((m: any) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{m.attendee?.firstName} {m.attendee?.lastName}</p>
                            <p className="text-xs text-muted-foreground">{m.attendee?.email}</p>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{INTENT_LABELS[m.intentType] || m.intentType || "—"}</Badge></TableCell>
                          <TableCell><Badge className={`text-xs ${STATUS_CLASS[m.status] || ""}`}>{m.status}</Badge></TableCell>
                          <TableCell className="text-sm">{m.startTime ? format(new Date(m.startTime), "MMM d, h:mm a") : "—"}</TableCell>
                          <TableCell>{m.outcomeType ? <Badge variant="outline" className="text-xs">{OUTCOME_LABELS[m.outcomeType] || m.outcomeType}</Badge> : <span className="text-xs text-muted-foreground">Not captured</span>}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openOutcome(m)}>
                              <ClipboardCheck className="h-4 w-4 mr-1" />{m.outcomeType ? "Edit" : "Capture"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Create meeting dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Meeting</DialogTitle><DialogDescription>Create a new meeting with an attendee.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Attendee</Label>
              <Select value={newMeeting.attendeeId} onValueChange={v => setNewMeeting({ ...newMeeting, attendeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select attendee" /></SelectTrigger>
                <SelectContent>{attendees.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.firstName} {a.lastName} · {a.email}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Intent Type</Label>
              <Select value={newMeeting.intentType} onValueChange={v => setNewMeeting({ ...newMeeting, intentType: v })}>
                <SelectTrigger><SelectValue placeholder="Select intent" /></SelectTrigger>
                <SelectContent>{INTENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Host Name</Label><Input placeholder="Your name" value={newMeeting.hostName} onChange={e => setNewMeeting({ ...newMeeting, hostName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Host Email</Label><Input type="email" placeholder="your@email.com" value={newMeeting.hostEmail} onChange={e => setNewMeeting({ ...newMeeting, hostEmail: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="datetime-local" value={newMeeting.startTime} onChange={e => setNewMeeting({ ...newMeeting, startTime: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Message (optional)</Label><Textarea placeholder="Add a note..." value={newMeeting.message} onChange={e => setNewMeeting({ ...newMeeting, message: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!newMeeting.attendeeId || !newMeeting.intentType || !newMeeting.startTime || createMutation.isPending}>
              {createMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outcome dialog */}
      <Dialog open={outcomeOpen} onOpenChange={setOutcomeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Capture Outcome</DialogTitle>
            <DialogDescription>Record the outcome for your meeting with {selectedMeeting?.attendee?.firstName} {selectedMeeting?.attendee?.lastName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Outcome Type</Label>
              <Select value={outcomeData.outcomeType} onValueChange={v => setOutcomeData({ ...outcomeData, outcomeType: v })}>
                <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                <SelectContent>{OUTCOME_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Outcome Confidence</Label>
              <RadioGroup value={outcomeData.outcomeConfidence} onValueChange={v => setOutcomeData({ ...outcomeData, outcomeConfidence: v })} className="flex gap-4">
                {["low", "medium", "high"].map(l => (
                  <div key={l} className="flex items-center gap-2"><RadioGroupItem value={l} id={`conf-${l}`} /><Label htmlFor={`conf-${l}`} className="capitalize cursor-pointer">{l}</Label></div>
                ))}
              </RadioGroup>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Deal Range</Label>
                <Select value={outcomeData.dealRange} onValueChange={v => setOutcomeData({ ...outcomeData, dealRange: v })}>
                  <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                  <SelectContent>{DEAL_RANGES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Timeline</Label>
                <Select value={outcomeData.timeline} onValueChange={v => setOutcomeData({ ...outcomeData, timeline: v })}>
                  <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                  <SelectContent>{TIMELINES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Notes about the outcome..." value={outcomeData.outcomeNotes} onChange={e => setOutcomeData({ ...outcomeData, outcomeNotes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutcomeOpen(false)}>Cancel</Button>
            <Button onClick={() => outcomeMutation.mutate()} disabled={!outcomeData.outcomeType || outcomeMutation.isPending}>
              {outcomeMutation.isPending ? "Saving..." : "Save Outcome"}
            </Button>
          </DialogFooter>
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
