import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { AppHeader } from "./dashboard";
import { useActiveEvent } from "../hooks/use-active-event";
import { QRCodeSVG } from "qrcode.react";
import { queryClient, apiRequest, fetchJSON } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Skeleton } from "../components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { ArrowLeft, Zap, Plus, MoreVertical, Play, Pause, Lock, StopCircle, Eye, EyeOff, Pencil, Trash2, MessageSquare, Star, CheckSquare, Send, Copy, QrCode, Download } from "lucide-react";

const MOMENT_TYPES = [
  { value: "poll_single", label: "Single Choice Poll", icon: CheckSquare, description: "One answer from multiple options" },
  { value: "poll_multi", label: "Multi-Choice Poll", icon: CheckSquare, description: "Multiple answers allowed" },
  { value: "rating", label: "Rating Scale", icon: Star, description: "1-5 or 1-10 scale rating" },
  { value: "open_text", label: "Open Text", icon: MessageSquare, description: "Free-form text response" },
  { value: "qa", label: "Q&A", icon: MessageSquare, description: "Questions from audience" },
  { value: "pulse", label: "Pulse Check", icon: Zap, description: "Quick sentiment check" },
  { value: "cta", label: "Call to Action", icon: Send, description: "Direct action prompt" },
] as const;

const STATUS_COLORS: Record<string, any> = { draft: "secondary", live: "default", locked: "outline", ended: "destructive" };

const momentFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  type: z.enum(["poll_single", "poll_multi", "rating", "open_text", "qa", "pulse", "cta"]),
  sessionId: z.string().nullable(),
  optionsJson: z.object({
    options: z.array(z.string()).optional(),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
    ctaLabel: z.string().optional(),
    ctaUrl: z.string().optional(),
  }).optional(),
  showResults: z.boolean().default(false),
});
type MomentFormValues = z.infer<typeof momentFormSchema>;

export default function MomentsAdmin() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingMoment, setEditingMoment] = useState<any>(null);
  const [deletingMoment, setDeletingMoment] = useState<any>(null);
  const [qrMoment, setQrMoment] = useState<any>(null);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const qrRef = useRef<HTMLDivElement>(null);

  const { eventId: selectedEventId, eventName, hasEvent } = useActiveEvent();

  const { data: moments = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/moments", selectedEventId],
    queryFn: () => fetchJSON(`/api/events/${selectedEventId}/moments`),
    enabled: !!selectedEventId,
  });

  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ["/api/sessions", selectedEventId],
    queryFn: () => fetchJSON(`/api/events/${selectedEventId}/sessions`),
    enabled: !!selectedEventId,
  });

  const form = useForm<MomentFormValues>({
    resolver: zodResolver(momentFormSchema),
    defaultValues: { title: "", type: "poll_single", sessionId: null, optionsJson: {}, showResults: false },
  });
  const momentType = form.watch("type");

  useEffect(() => {
    if (editingMoment) {
      form.reset({
        title: editingMoment.title,
        type: editingMoment.type,
        sessionId: editingMoment.sessionId,
        optionsJson: editingMoment.optionsJson || {},
        showResults: editingMoment.showResults ?? false,
      });
      if (editingMoment.type === "poll_single" || editingMoment.type === "poll_multi") {
        setPollOptions((editingMoment.optionsJson as any)?.options || ["", ""]);
      }
    }
  }, [editingMoment]);

  const createMutation = useMutation({
    mutationFn: async (data: MomentFormValues) => {
      const res = await apiRequest("POST", `/api/events/${selectedEventId}/moments`, {
        ...data,
        optionsJson: data.type === "poll_single" || data.type === "poll_multi"
          ? { options: pollOptions.filter(o => o.trim()) }
          : data.optionsJson,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moments", selectedEventId] });
      toast({ title: "Moment created" });
      setCreateOpen(false);
      form.reset();
      setPollOptions(["", ""]);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/moments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moments", selectedEventId] });
      toast({ title: "Moment updated" });
      setEditingMoment(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/moments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moments", selectedEventId] });
      toast({ title: "Moment deleted" });
      setDeletingMoment(null);
    },
  });

  const onSubmit = (data: MomentFormValues) => {
    const payload = {
      ...data,
      optionsJson: data.type === "poll_single" || data.type === "poll_multi"
        ? { options: pollOptions.filter(o => o.trim()) }
        : data.optionsJson,
    };
    if (editingMoment) updateMutation.mutate({ id: editingMoment.id, data: payload });
    else createMutation.mutate(data);
  };

  const getMomentUrl = (moment: any) => `${window.location.origin}/moment/${moment.id}`;

  const copyUrl = (moment: any) => {
    navigator.clipboard.writeText(getMomentUrl(moment));
    toast({ title: "Link copied" });
  };

  const downloadQr = () => {
    if (!qrRef.current || !qrMoment) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `moment-${qrMoment.title.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const dialogOpen = createOpen || !!editingMoment;
  const closeDialog = () => { setCreateOpen(false); setEditingMoment(null); form.reset(); setPollOptions(["", ""]); };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {!selectedEventId ? (
          <Card><CardContent className="flex flex-col items-center py-16"><Zap className="h-10 w-10 text-muted-foreground/30 mb-3" /><p className="text-muted-foreground">Select an event to manage moments</p></CardContent></Card>
        ) : isLoading ? (
          <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
        ) : moments.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center py-16"><Zap className="h-10 w-10 text-muted-foreground/30 mb-3" /><p className="text-muted-foreground mb-4">No moments yet</p><Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Create First Moment</Button></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {moments.map((moment: any) => {
              const typeInfo = MOMENT_TYPES.find(t => t.value === moment.type);
              const TypeIcon = typeInfo?.icon || Zap;
              return (
                <Card key={moment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="p-2 rounded-md bg-muted flex-shrink-0"><TypeIcon className="h-4 w-4 text-muted-foreground" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant={STATUS_COLORS[moment.status]} className="text-xs">{moment.status}</Badge>
                            {moment.showResults && <Badge variant="outline" className="text-xs gap-1"><Eye className="h-3 w-3" />Results Visible</Badge>}
                          </div>
                          <p className="font-medium text-sm">{moment.title}</p>
                          <p className="text-xs text-muted-foreground">{typeInfo?.label}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingMoment(moment)} disabled={moment.status !== "draft"}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyUrl(moment)}><Copy className="h-4 w-4 mr-2" />Copy Link</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setQrMoment(moment)}><QrCode className="h-4 w-4 mr-2" />QR Code</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeletingMoment(moment)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
                      {moment.status === "draft" && (
                        <Button size="sm" onClick={() => updateMutation.mutate({ id: moment.id, data: { status: "live" } })}><Play className="h-3 w-3 mr-1" />Launch</Button>
                      )}
                      {moment.status === "live" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: moment.id, data: { showResults: !moment.showResults } })}>
                            {moment.showResults ? <><EyeOff className="h-3 w-3 mr-1" />Hide Results</> : <><Eye className="h-3 w-3 mr-1" />Show Results</>}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: moment.id, data: { status: "locked" } })}><Lock className="h-3 w-3 mr-1" />Lock</Button>
                        </>
                      )}
                      {(moment.status === "live" || moment.status === "locked") && (
                        <Button size="sm" variant="destructive" onClick={() => updateMutation.mutate({ id: moment.id, data: { status: "ended" } })}><StopCircle className="h-3 w-3 mr-1" />End</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMoment ? "Edit Moment" : "Create Moment"}</DialogTitle>
            <DialogDescription>Configure an interactive engagement moment for your audience.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="How are you feeling about this topic?" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{MOMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormDescription>{MOMENT_TYPES.find(t => t.value === field.value)?.description}</FormDescription>
                </FormItem>
              )} />
              <FormField control={form.control} name="sessionId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Session (optional)</FormLabel>
                  <Select onValueChange={v => field.onChange(v === "__general__" ? null : v)} value={field.value || "__general__"}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="__general__">General (event-wide)</SelectItem>
                      {sessions.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              {(momentType === "poll_single" || momentType === "poll_multi") && (
                <div className="space-y-2">
                  <Label>Poll Options</Label>
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={opt} onChange={e => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n); }} placeholder={`Option ${i + 1}`} />
                      {pollOptions.length > 2 && <Button type="button" size="icon" variant="ghost" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setPollOptions([...pollOptions, ""])}><Plus className="h-3 w-3 mr-1" />Add Option</Button>
                </div>
              )}
              {momentType === "rating" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="optionsJson.minValue" render={({ field }) => (
                    <FormItem><FormLabel>Min</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 1} onChange={e => field.onChange(parseInt(e.target.value) || 1)} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="optionsJson.maxValue" render={({ field }) => (
                    <FormItem><FormLabel>Max</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 5} onChange={e => field.onChange(parseInt(e.target.value) || 5)} /></FormControl></FormItem>
                  )} />
                </div>
              )}
              {momentType === "cta" && (
                <>
                  <FormField control={form.control} name="optionsJson.ctaLabel" render={({ field }) => (
                    <FormItem><FormLabel>Button Label</FormLabel><FormControl><Input {...field} value={field.value || ""} placeholder="Learn More" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="optionsJson.ctaUrl" render={({ field }) => (
                    <FormItem><FormLabel>Button URL</FormLabel><FormControl><Input {...field} value={field.value || ""} placeholder="https://example.com" /></FormControl></FormItem>
                  )} />
                </>
              )}
              <FormField control={form.control} name="showResults" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div><FormLabel>Show Results to Audience</FormLabel><FormDescription>Display live results after they respond</FormDescription></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingMoment ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deletingMoment} onOpenChange={open => !open && setDeletingMoment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Moment</AlertDialogTitle><AlertDialogDescription>Delete "{deletingMoment?.title}"? All responses will be removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingMoment && deleteMutation.mutate(deletingMoment.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR code dialog */}
      <Dialog open={!!qrMoment} onOpenChange={open => !open && setQrMoment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>QR Code</DialogTitle><DialogDescription>Scan to participate in "{qrMoment?.title}"</DialogDescription></DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div ref={qrRef} className="bg-white p-4 rounded-lg">
              {qrMoment && <QRCodeSVG value={getMomentUrl(qrMoment)} size={200} level="H" includeMargin />}
            </div>
            <div className="w-full space-y-2">
              <Label className="text-xs text-muted-foreground">Direct Link</Label>
              <div className="flex gap-2">
                <Input readOnly value={qrMoment ? getMomentUrl(qrMoment) : ""} className="text-xs" />
                <Button size="icon" variant="outline" onClick={() => copyUrl(qrMoment)}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrMoment(null)}>Close</Button>
            <Button onClick={downloadQr}><Download className="h-4 w-4 mr-2" />Download PNG</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
