import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, User, Shield, Bell, Palette, FileText, Plug, Key, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SignupInviteCode } from "@shared/schema";

type InviteCodeFormData = {
  code: string;
  description: string;
  maxUses: number | null;
  expiresAt: string;
  isActive: boolean;
};

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<SignupInviteCode | null>(null);
  const [formData, setFormData] = useState<InviteCodeFormData>({
    code: "",
    description: "",
    maxUses: null,
    expiresAt: "",
    isActive: true,
  });

  const isSuperAdmin = user?.email?.endsWith("@makemysandbox.com") ?? false;

  const { data: inviteCodes, isLoading: codesLoading } = useQuery<SignupInviteCode[]>({
    queryKey: ["/api/admin/signup-invite-codes"],
    enabled: isSuperAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: InviteCodeFormData) => {
      const payload = {
        code: data.code,
        description: data.description || null,
        maxUses: data.maxUses,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        isActive: data.isActive,
      };
      await apiRequest("POST", "/api/admin/signup-invite-codes", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/signup-invite-codes"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Invite code created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create invite code", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InviteCodeFormData }) => {
      const payload = {
        code: data.code,
        description: data.description || null,
        maxUses: data.maxUses,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        isActive: data.isActive,
      };
      await apiRequest("PATCH", `/api/admin/signup-invite-codes/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/signup-invite-codes"] });
      setIsDialogOpen(false);
      setEditingCode(null);
      resetForm();
      toast({ title: "Invite code updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update invite code", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/signup-invite-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/signup-invite-codes"] });
      toast({ title: "Invite code deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete invite code", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      maxUses: null,
      expiresAt: "",
      isActive: true,
    });
  };

  const openCreateDialog = () => {
    setEditingCode(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (code: SignupInviteCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      description: code.description || "",
      maxUses: code.maxUses,
      expiresAt: code.expiresAt ? new Date(code.expiresAt).toISOString().slice(0, 16) : "",
      isActive: code.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCode) {
      updateMutation.mutate({ id: editingCode.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this invite code?")) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString();
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Settings" breadcrumbs={[{ label: "Settings" }]} />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={user?.profileImageUrl || undefined}
                    alt={user?.firstName || "User"}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-xl">{getInitials()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-user-name">
                    {user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : "User"}
                  </h3>
                  <p className="text-muted-foreground" data-testid="text-user-email">{user?.email}</p>
                  <Badge variant="secondary" className="mt-2">Admin</Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user?.email || "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Account Created</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Integrations
              </CardTitle>
              <CardDescription>Manage connected services and APIs</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure payment processing, email services, social media, and other integrations.
              </p>
              <Button variant="outline" asChild>
                <Link href="/integrations" data-testid="link-integrations">
                  Manage Integrations
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Authentication</p>
                  <p className="text-sm text-muted-foreground">Signed in via secure authentication</p>
                </div>
                <Badge variant="outline">Active</Badge>
              </div>
              <Separator />
              <Button variant="destructive" className="w-full" asChild>
                <a href="/api/logout" data-testid="button-logout">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Configure notification preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Notification settings will be available in a future update.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Customize the look and feel</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use the theme toggle in the header to switch between light and dark modes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Legal
              </CardTitle>
              <CardDescription>Privacy and legal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Link href="/privacy-policy" className="text-sm text-primary hover:underline" data-testid="link-privacy-policy">
                  Privacy Policy
                </Link>
              </div>
              <div>
                <a href="/security-whitepaper.md" className="text-sm text-primary hover:underline" data-testid="link-security-whitepaper">
                  Security Whitepaper
                </a>
              </div>
            </CardContent>
          </Card>

          {isSuperAdmin && (
            <Card data-testid="card-invite-codes-admin">
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Signup Invite Codes
                  </CardTitle>
                  <CardDescription>Manage invite codes for new user signups</CardDescription>
                </div>
                <Button onClick={openCreateDialog} data-testid="button-create-invite-code">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Code
                </Button>
              </CardHeader>
              <CardContent>
                {codesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : inviteCodes && inviteCodes.length > 0 ? (
                  <Table data-testid="table-invite-codes">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inviteCodes.map((code) => (
                        <TableRow key={code.id}>
                          <TableCell className="font-mono font-medium">{code.code}</TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">
                            {code.description || "-"}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {code.usesCount || 0} / {code.maxUses ?? "Unlimited"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(code.expiresAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={code.isActive ? "default" : "secondary"}>
                              {code.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(code)}
                                data-testid={`button-edit-invite-code-${code.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(code.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-invite-code-${code.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No invite codes yet</p>
                    <p className="text-sm">Create your first invite code to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-invite-code-form">
          <DialogHeader>
            <DialogTitle>{editingCode ? "Edit Invite Code" : "Create Invite Code"}</DialogTitle>
            <DialogDescription>
              {editingCode
                ? "Update the invite code details below."
                : "Create a new invite code for user signups."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., WELCOME2024"
                  required
                  data-testid="input-invite-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  data-testid="input-invite-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses">Max Uses</Label>
                <Input
                  id="maxUses"
                  type="number"
                  value={formData.maxUses ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxUses: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Leave empty for unlimited"
                  min={1}
                  data-testid="input-invite-max-uses"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires At</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  data-testid="input-invite-expires-at"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  data-testid="switch-invite-is-active"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-invite-code">
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingCode ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
