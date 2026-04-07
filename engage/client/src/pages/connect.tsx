import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { queryClient, apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { ArrowLeft, Plus, RefreshCw, Trash2, Plug, Zap } from "lucide-react";

const connectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  adapter: z.enum(["rainfocus", "cvent", "eventbrite"]),
  apiUrl: z.string().optional().or(z.literal("")),
  apiKey: z.string().min(1, "API token is required"),
  profileId: z.string().min(1, "Org ID is required"),
});
type ConnectionForm = z.infer<typeof connectionSchema>;

const ADAPTER_INFO: Record<string, { label: string; defaultUrl: string; apiKeyLabel: string; profileLabel: string; profileDesc: string }> = {
  rainfocus: {
    label: "Rainfocus",
    defaultUrl: "https://events.rainfocus.com",
    apiKeyLabel: "API Profile Token",
    profileLabel: "Org ID",
    profileDesc: "The org-id used in the Rainfocus API URL path — e.g. if your API URL is /api/acme/v3/... then your Org ID is 'acme'. Find it in Integration Suite > Active Profiles > API Profiles.",
  },
  cvent: {
    label: "Cvent",
    defaultUrl: "https://api.cvent.com",
    apiKeyLabel: "API Key",
    profileLabel: "Event ID",
    profileDesc: "Your Cvent event identifier.",
  },
  eventbrite: {
    label: "Eventbrite",
    defaultUrl: "https://www.eventbriteapi.com/v3",
    apiKeyLabel: "Private Token",
    profileLabel: "Organization ID",
    profileDesc: "Your Eventbrite organization ID.",
  },
};

export default function Connect() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [incrementalSyncingId, setIncrementalSyncingId] = useState<string | null>(null);

  const { data: connections = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/connections"],
    queryFn: () => fetch("/api/connections", { credentials: "include" }).then(r => r.json()),
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
    queryFn: () => fetch("/api/events", { credentials: "include" }).then(r => r.json()),
  });

  const form = useForm<ConnectionForm>({
    resolver: zodResolver(connectionSchema),
    defaultValues: { name: "", adapter: "rainfocus", apiUrl: "", apiKey: "", profileId: "" },
  });
  const adapter = form.watch("adapter");
  const info = ADAPTER_INFO[adapter];

  const createMutation = useMutation({
    mutationFn: async (data: ConnectionForm) => {
      const res = await apiRequest("POST", "/api/connections", {
        ...data,
        apiUrl: data.apiUrl || info.defaultUrl,
      });
      return res.json();
    },
    onSuccess: async (conn) => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({ title: "Connection saved", description: "Syncing events from platform..." });
      setCreateOpen(false);
      form.reset();
      // Auto-sync events immediately after creation
      try {
        await apiRequest("POST", `/api/events/sync/${conn.id}`);
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        toast({ title: "Events synced" });
      } catch {
        toast({ title: "Connection saved, but event sync failed", description: "Try syncing manually.", variant: "destructive" });
      }
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/connections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({ title: "Connection removed" });
      setDeletingId(null);
    },
  });

  const handleFullSync = async (connectionId: string, eventId?: string) => {
    setSyncingId(connectionId);
    try {
      // Sync events first
      const evRes = await apiRequest("POST", `/api/events/sync/${connectionId}`);
      const { synced: evSynced } = await evRes.json();
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });

      // Then sync attendees if we have an event
      if (eventId) {
        const attRes = await apiRequest("POST", `/api/events/${eventId}/attendees/sync`, {});
        const { synced: attSynced } = await attRes.json();
        toast({ title: "Full sync complete", description: `${evSynced} event(s) · ${attSynced} attendees pulled.` });
      } else {
        toast({ title: "Events synced", description: `${evSynced} event(s) pulled.` });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/attendees"] });
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncingId(null);
    }
  };

  const handleIncrementalSync = async (connectionId: string, eventId: string) => {
    setIncrementalSyncingId(connectionId);
    try {
      const res = await apiRequest("POST", `/api/events/${eventId}/attendees/sync`, { incremental: true });
      const { synced } = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/attendees"] });
      toast({ title: "Incremental sync complete", description: `${synced} updated attendee record(s) pulled.` });
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setIncrementalSyncingId(null);
    }
  };

  const getEventForConnection = (connectionId: string) =>
    events.find((e: any) => e.connectionId === connectionId);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b px-6 py-4 flex items-center gap-4">
        <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Platform Connection</h1>
          <p className="text-xs text-muted-foreground">Connect Engage to your event registration platform</p>
        </div>
        {!createOpen && (
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Connection</Button>
        )}
      </header>

      <main className="flex-1 p-6 max-w-3xl mx-auto w-full space-y-6">

        {/* Rainfocus quick reference */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Rainfocus — how to find your credentials</p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5 list-disc list-inside">
              <li><strong>Org ID</strong>: the path segment in your API URL — <code>/api/<strong>acme</strong>/v3/...</code></li>
              <li><strong>API Profile Token</strong>: Integration Suite → Active Profiles → API Profiles → copy the token</li>
              <li><strong>Base URL</strong>: <code>https://events.rainfocus.com</code> (staging: <code>https://events-stg.rainfocus.com</code>)</li>
            </ul>
          </CardContent>
        </Card>

        {/* Create form */}
        {createOpen && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New Connection</CardTitle>
              <CardDescription>Configure your platform API credentials. Events and attendees will sync automatically.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Connection Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Cisco Live 2025 — Rainfocus" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="adapter" render={({ field }) => (
                    <FormItem><FormLabel>Platform</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="rainfocus">Rainfocus</SelectItem>
                          <SelectItem value="cvent">Cvent</SelectItem>
                          <SelectItem value="eventbrite">Eventbrite</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="apiUrl" render={({ field }) => (
                    <FormItem><FormLabel>API Base URL</FormLabel>
                      <FormControl><Input placeholder={info.defaultUrl} {...field} /></FormControl>
                      <FormDescription>Leave blank to use the default. Use the <code>-stg</code> host for staging.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="profileId" render={({ field }) => (
                    <FormItem><FormLabel>{info.profileLabel}</FormLabel>
                      <FormControl><Input placeholder={adapter === "rainfocus" ? "e.g. acme" : info.profileLabel} {...field} /></FormControl>
                      <FormDescription>{info.profileDesc}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="apiKey" render={({ field }) => (
                    <FormItem><FormLabel>{info.apiKeyLabel}</FormLabel>
                      <FormControl><Input type="password" placeholder="Paste your token" {...field} /></FormControl>
                      <FormDescription>
                        {adapter === "rainfocus" && "Passed as the apiProfile header on every API call. Never sent to the browser."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); form.reset(); }}>Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Saving & syncing..." : "Save Connection"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Existing connections */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : connections.length === 0 && !createOpen ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16">
              <Plug className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-4">No platform connected yet</p>
              <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Connection</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {connections.map((conn: any) => {
              const linkedEvent = getEventForConnection(conn.id);
              const isSyncing = syncingId === conn.id;
              const isIncrSyncing = incrementalSyncingId === conn.id;
              return (
                <Card key={conn.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-xs capitalize">{conn.adapter}</Badge>
                          {conn.isActive && <Badge className="text-xs bg-green-100 text-green-800 border-green-200">Active</Badge>}
                          {linkedEvent && <Badge variant="secondary" className="text-xs">{linkedEvent.name}</Badge>}
                        </div>
                        <p className="font-medium text-sm">{conn.name}</p>
                        <p className="text-xs text-muted-foreground">Org ID: <code>{conn.profileId}</code></p>
                        <p className="text-xs text-muted-foreground">{conn.apiUrl}</p>
                        {conn.lastSyncedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last synced: {new Date(conn.lastSyncedAt).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} PT
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleFullSync(conn.id, linkedEvent?.id)} disabled={isSyncing || isIncrSyncing}>
                          <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
                          Full Sync
                        </Button>
                        {linkedEvent && (
                          <Button size="sm" variant="outline" onClick={() => handleIncrementalSync(conn.id, linkedEvent.id)} disabled={isSyncing || isIncrSyncing}>
                            <Zap className={`h-3 w-3 mr-1 ${isIncrSyncing ? "animate-pulse" : ""}`} />
                            Delta Sync
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeletingId(conn.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <AlertDialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Connection</AlertDialogTitle>
            <AlertDialogDescription>Removes the platform connection. Locally synced attendee and event data is kept.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && deleteMutation.mutate(deletingId)} className="bg-destructive text-destructive-foreground">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
