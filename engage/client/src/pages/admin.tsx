import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, fetchJSON, apiRequest } from "../lib/queryClient";
import { useAuth } from "../hooks/use-auth";
import { useActiveEvent } from "../hooks/use-active-event";
import { useToast } from "../hooks/use-toast";
import { AppHeader } from "./dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Separator } from "../components/ui/separator";
import {
  Users, Monitor, Building2, RefreshCw, Plus, Pencil,
  CheckCircle, XCircle, Wifi, WifiOff, Clock, Loader2,
  Shield, Zap, AlertCircle,
} from "lucide-react";

// ── User Management ───────────────────────────────────────────────────────────

function UserRow({ u, stations, onEdit }: { u: any; stations: any[]; onEdit: (u: any) => void }) {
  const station = stations.find(s => s.id === u.stationId);
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{u.name || u.email}</p>
          <RoleBadge role={u.role} />
          {!u.isActive && <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Inactive</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
        {station && <p className="text-xs text-muted-foreground">📍 {station.stationName}</p>}
        {u.role === "staff" && !u.stationId && <p className="text-xs text-amber-600">💩 No station — meeting only</p>}
        {u.lastLoginAt && (
          <p className="text-xs text-muted-foreground">
            Last login: {new Date(u.lastLoginAt).toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} PT
          </p>
        )}
      </div>
      <Button size="sm" variant="outline" onClick={() => onEdit(u)}>
        <Pencil className="h-3 w-3 mr-1.5" />Edit
      </Button>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, string> = {
    sandbox_admin: "bg-purple-100 text-purple-700 border-purple-200",
    admin:         "bg-blue-100 text-blue-700 border-blue-200",
    staff:         "bg-green-100 text-green-700 border-green-200",
    sponsor_admin: "bg-orange-100 text-orange-700 border-orange-200",
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${config[role] || "bg-muted text-muted-foreground"}`}>
      {role?.replace("_", " ")}
    </span>
  );
}

function UsersTab({ stations, eventId }: { stations: any[]; eventId: string }) {
  const { toast } = useToast();
  const [editUser, setEditUser] = useState<any>(null);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", role: "staff", stationId: "", password: "", isActive: true });

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/auth/users"],
    queryFn: () => fetchJSON("/api/auth/users"),
  });

  const provisionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/provision", {
        email: form.email, name: form.name, role: form.role,
        stationId: form.stationId || null, eventId, password: form.password || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
      toast({ title: "User created", description: `${data.email} · temp password: ${data.tempPassword}` });
      setNewUserOpen(false);
      setForm({ email: "", name: "", role: "staff", stationId: "", password: "", isActive: true });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/auth/users/${editUser.id}`, {
        name: editUser.name, role: editUser.role,
        stationId: editUser.stationId || null,
        isActive: editUser.isActive,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
      toast({ title: "User updated" });
      setEditUser(null);
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const setPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await apiRequest("POST", `/api/auth/users/${id}/set-password`, { password });
      return res.json();
    },
    onSuccess: () => toast({ title: "Password updated" }),
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const [newPassword, setNewPassword] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users.length} user{users.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => setNewUserOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />New User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="divide-y">
              {users.map((u: any) => (
                <UserRow key={u.id} u={u} stations={stations} onEdit={setEditUser} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New User Dialog */}
      <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New User</DialogTitle>
            <DialogDescription>Create a staff or sponsor admin account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="sponsor_admin">Sponsor Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.role === "staff" && (
                <div className="space-y-1.5">
                  <Label>Station</Label>
                  <Select value={form.stationId} onValueChange={v => setForm(f => ({ ...f, stationId: v }))}>
                    <SelectTrigger><SelectValue placeholder="None (meeting only)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None — meeting only 💩</SelectItem>
                      {stations.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.stationName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Password <span className="text-muted-foreground text-xs">(leave blank to auto-generate)</span></Label>
              <Input type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min 8 characters" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setNewUserOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => provisionMutation.mutate()} disabled={!form.email || provisionMutation.isPending}>
                {provisionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={v => !v && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>{editUser?.email}</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={editUser.name || ""} onChange={e => setEditUser((u: any) => ({ ...u, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={editUser.role} onValueChange={v => setEditUser((u: any) => ({ ...u, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="sponsor_admin">Sponsor Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editUser.role === "staff" && (
                <div className="space-y-1.5">
                  <Label>Station Assignment</Label>
                  <Select value={editUser.stationId || ""} onValueChange={v => setEditUser((u: any) => ({ ...u, stationId: v || null }))}>
                    <SelectTrigger><SelectValue placeholder="None — meeting only 💩" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None — meeting only 💩</SelectItem>
                      {stations.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.stationName} · {s.stationLocation}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditUser((u: any) => ({ ...u, isActive: !u.isActive }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${editUser.isActive ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${editUser.isActive ? "translate-x-4" : "translate-x-1"}`} />
                </button>
                <Label className="cursor-pointer" onClick={() => setEditUser((u: any) => ({ ...u, isActive: !u.isActive }))}>
                  {editUser.isActive ? "Active" : "Inactive"}
                </Label>
              </div>
              <Separator />
              <div className="space-y-1.5">
                <Label>Reset Password</Label>
                <div className="flex gap-2">
                  <Input type="password" placeholder="New password" value={newPassword}
                    onChange={e => setNewPassword(e.target.value)} />
                  <Button variant="outline" size="sm"
                    onClick={() => { setPasswordMutation.mutate({ id: editUser.id, password: newPassword }); setNewPassword(""); }}
                    disabled={newPassword.length < 8 || setPasswordMutation.isPending}>
                    Set
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditUser(null)}>Cancel</Button>
                <Button className="flex-1" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Station Management ────────────────────────────────────────────────────────

function StationsTab({ eventId }: { eventId: string }) {
  const { toast } = useToast();
  const [newOpen, setNewOpen] = useState(false);
  const [editStation, setEditStation] = useState<any>(null);
  const [form, setForm] = useState({ stationName: "", stationLocation: "", stationPresenter: "", productFocus: "" });

  const { data: stations = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/stations", eventId],
    queryFn: () => fetchJSON(`/api/events/${eventId}/stations`),
    enabled: !!eventId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${eventId}/stations`, {
        stationName: form.stationName,
        stationLocation: form.stationLocation,
        stationPresenter: form.stationPresenter || undefined,
        productFocus: form.productFocus ? form.productFocus.split(",").map(s => s.trim()).filter(Boolean) : [],
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stations", eventId] });
      toast({ title: "Station created" });
      setNewOpen(false);
      setForm({ stationName: "", stationLocation: "", stationPresenter: "", productFocus: "" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{stations.length} station{stations.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />New Station
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {isLoading ? (
          <div className="col-span-2 text-center text-muted-foreground py-8">Loading...</div>
        ) : stations.map((s: any) => (
          <Card key={s.id} className={s.isActive ? "" : "opacity-60"}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <div className="p-1.5 rounded bg-primary/10 flex-shrink-0 mt-0.5">
                    <Monitor className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{s.stationName}</p>
                    <p className="text-xs text-muted-foreground">{s.stationLocation}</p>
                    {s.stationPresenter && <p className="text-xs text-muted-foreground">👤 {s.stationPresenter}</p>}
                    {s.productFocus?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {s.productFocus.map((p: string) => (
                          <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-muted">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditStation(s)}>
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* New Station Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Station</DialogTitle>
            <DialogDescription>Add a demo station or booth to this event.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Station Name *</Label>
                <Input value={form.stationName} onChange={e => setForm(f => ({ ...f, stationName: e.target.value }))} placeholder="e.g. Security Cloud" />
              </div>
              <div className="space-y-1.5">
                <Label>Location *</Label>
                <Input value={form.stationLocation} onChange={e => setForm(f => ({ ...f, stationLocation: e.target.value }))} placeholder="e.g. Booth A2" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Presenter</Label>
              <Input value={form.stationPresenter} onChange={e => setForm(f => ({ ...f, stationPresenter: e.target.value }))} placeholder="Name of demo presenter" />
            </div>
            <div className="space-y-1.5">
              <Label>Products <span className="text-muted-foreground text-xs">(comma separated)</span></Label>
              <Input value={form.productFocus} onChange={e => setForm(f => ({ ...f, productFocus: e.target.value }))} placeholder="e.g. SecureX, Umbrella, Duo" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => createMutation.mutate()}
                disabled={!form.stationName || !form.stationLocation || createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Station"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Platform Health ───────────────────────────────────────────────────────────

function PlatformTab({ eventId, eventName }: { eventId: string; eventName: string }) {
  const { toast } = useToast();

  const { data: connections = [] } = useQuery<any[]>({
    queryKey: ["/api/connections"],
    queryFn: () => fetchJSON("/api/connections"),
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/checkin-stats", eventId],
    queryFn: () => fetchJSON(`/api/events/${eventId}/checkin/stats`),
    enabled: !!eventId,
  });

  const { data: intentSummary } = useQuery<any>({
    queryKey: ["/api/intent/summary", eventId],
    queryFn: () => fetchJSON(`/api/events/${eventId}/intent/summary`),
    enabled: !!eventId,
  });

  const syncMutation = useMutation({
    mutationFn: async (connId: string) => {
      await apiRequest("POST", `/api/connections/${connId}/connect`);
      const res = await apiRequest("POST", `/api/events/${eventId}/sync`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/checkin-stats", eventId] });
      toast({ title: "Sync complete", description: `${data.synced} attendees synced` });
    },
    onError: (err: any) => toast({ title: "Sync failed", description: err.message, variant: "destructive" }),
  });

  const conn = connections[0];

  return (
    <div className="space-y-4">
      {/* Event info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{eventName}</p>
              <p className="text-xs text-muted-foreground">Active event</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform connection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" />Platform Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {conn ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {conn.isActive
                    ? <Wifi className="h-4 w-4 text-green-500" />
                    : <WifiOff className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium">{conn.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{conn.adapter} · {conn.syncStatus}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline"
                  onClick={() => syncMutation.mutate(conn.id)}
                  disabled={syncMutation.isPending}>
                  <RefreshCw className={`h-3 w-3 mr-1.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                  {syncMutation.isPending ? "Syncing..." : "Sync Now"}
                </Button>
              </div>
              {conn.lastFullSyncAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last sync: {new Date(conn.lastFullSyncAt).toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} PT
                  {conn.lastSyncCount && ` · ${conn.lastSyncCount} attendees`}
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">No platform connected. Go to Connect to set up.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Registered",        value: stats?.totalAttendees ?? "—",        icon: <Users className="h-4 w-4 text-muted-foreground" /> },
          { label: "Checked In",        value: stats?.checkedIn ?? "—",             icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
          { label: "Follow-Up Ready",   value: intentSummary?.followUpReadiness ?? "—", icon: <Zap className="h-4 w-4 text-primary" /> },
          { label: "Hot Leads",         value: intentSummary?.hotLeads ?? "—",      icon: <Shield className="h-4 w-4 text-red-500" /> },
        ].map(({ label, value, icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-1.5">
              {icon}
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────

export default function Admin() {
  const { user } = useAuth();
  const { eventId, eventName, hasEvent } = useActiveEvent();

  const { data: stations = [] } = useQuery<any[]>({
    queryKey: ["/api/stations", eventId],
    queryFn: () => fetchJSON(`/api/events/${eventId}/stations`),
    enabled: !!eventId,
  });

  if (user?.role !== "admin" && user?.role !== "sandbox_admin") {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Admin access required</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Admin</h2>
          <p className="text-sm text-muted-foreground">Manage users, stations, and platform configuration</p>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="users" className="flex-1 sm:flex-none">
              <Users className="h-4 w-4 mr-1.5" />Users
            </TabsTrigger>
            <TabsTrigger value="stations" className="flex-1 sm:flex-none">
              <Monitor className="h-4 w-4 mr-1.5" />Stations
            </TabsTrigger>
            <TabsTrigger value="platform" className="flex-1 sm:flex-none">
              <Building2 className="h-4 w-4 mr-1.5" />Platform
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <UsersTab stations={stations} eventId={eventId} />
          </TabsContent>
          <TabsContent value="stations" className="mt-4">
            <StationsTab eventId={eventId} />
          </TabsContent>
          <TabsContent value="platform" className="mt-4">
            <PlatformTab eventId={eventId} eventName={eventName} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
