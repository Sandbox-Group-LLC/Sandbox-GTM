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
import { ArrowLeft, Plus, RefreshCw, Trash2, Plug } from "lucide-react";

const connectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  adapter: z.enum(["rainfocus", "cvent", "eventbrite"]),
  apiUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  apiKey: z.string().min(1, "API key is required"),
  profileId: z.string().optional(),
});
type ConnectionForm = z.infer<typeof connectionSchema>;

const ADAPTER_LABELS: Record<string, string> = {
  rainfocus: "Rainfocus",
  cvent: "Cvent",
  eventbrite: "Eventbrite",
};

const ADAPTER_DEFAULTS: Record<string, string> = {
  rainfocus: "https://api.rainfocus.com",
  cvent: "https://api.cvent.com",
  eventbrite: "https://www.eventbriteapi.com/v3",
};

export default function Connect() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { data: connections = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/connections"],
    queryFn: () => fetch("/api/connections", { credentials: "include" }).then(r => r.json()),
  });

  const form = useForm<ConnectionForm>({
    resolver: zodResolver(connectionSchema),
    defaultValues: { name: "", adapter: "rainfocus", apiUrl: "", apiKey: "", profileId: "" },
  });

  const adapter = form.watch("adapter");

  const createMutation = useMutation({
    mutationFn: async (data: ConnectionForm) => {
      const res = await apiRequest("POST", "/api/connections", {
        ...data,
        apiUrl: data.apiUrl || ADAPTER_DEFAULTS[data.adapter],
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({ title: "Connection created" });
      setCreateOpen(false);
      form.reset();
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
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSync = async (connectionId: string) => {
    setSyncingId(connectionId);
    try {
      const res = await apiRequest("POST", `/api/events/sync/${connectionId}`);
      const { synced } = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Sync complete", description: `${synced} event${synced !== 1 ? "s" : ""} pulled from platform.` });
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b px-6 py-4 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Platform Connection</h1>
          <p className="text-xs text-muted-foreground">Connect Engage to your event registration platform</p>
        </div>
        {!createOpen && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Add Connection
          </Button>
        )}
      </header>

      <main className="flex-1 p-6 max-w-3xl mx-auto w-full space-y-6">
        {/* Create form */}
        {createOpen && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New Connection</CardTitle>
              <CardDescription>Configure your event registration platform API credentials.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Connection Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Cisco Live 2025 - Rainfocus" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="adapter" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform</FormLabel>
                      <Select onValueChange={v => { field.onChange(v); form.setValue("apiUrl", ADAPTER_DEFAULTS[v] || ""); }} value={field.value}>
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
                    <FormItem>
                      <FormLabel>API Base URL</FormLabel>
                      <FormControl><Input placeholder={ADAPTER_DEFAULTS[adapter]} {...field} /></FormControl>
                      <FormDescription>Leave blank to use the default for {ADAPTER_LABELS[adapter]}.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="apiKey" render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl><Input type="password" placeholder="Paste your API key" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="profileId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile / Show ID {adapter !== "rainfocus" && "(optional)"}</FormLabel>
                      <FormControl><Input placeholder={adapter === "rainfocus" ? "Rainfocus profile/show ID" : "Optional event identifier"} {...field} /></FormControl>
                      <FormDescription>
                        {adapter === "rainfocus" && "The show or profile ID from your Rainfocus admin."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); form.reset(); }}>Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Saving..." : "Save Connection"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Existing connections */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading connections...</p>
        ) : connections.length === 0 && !createOpen ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Plug className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-4">No platform connected yet</p>
              <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Connection</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {connections.map((conn: any) => (
              <Card key={conn.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs capitalize">{conn.adapter}</Badge>
                      {conn.isActive && <Badge className="text-xs bg-green-100 text-green-800 border-green-200">Active</Badge>}
                    </div>
                    <p className="font-medium text-sm">{conn.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{conn.apiUrl}</p>
                    {conn.lastSyncedAt && (
                      <p className="text-xs text-muted-foreground">
                        Last synced: {new Date(conn.lastSyncedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleSync(conn.id)} disabled={syncingId === conn.id}>
                      <RefreshCw className={`h-3 w-3 mr-1 ${syncingId === conn.id ? "animate-spin" : ""}`} />
                      Sync Events
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeletingId(conn.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Connection</AlertDialogTitle>
            <AlertDialogDescription>This will remove the platform connection. Synced attendee and event data will remain.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && deleteMutation.mutate(deletingId)} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
