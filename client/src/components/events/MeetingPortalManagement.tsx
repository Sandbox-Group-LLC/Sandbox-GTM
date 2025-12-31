import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Clock,
  Shield,
  Users,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  MEETING_PORTAL_PERMISSIONS,
  type MeetingPortalMember,
  type MeetingPortalInvitation,
} from "@shared/schema";

const PERMISSION_LABELS: Record<string, string> = {
  [MEETING_PORTAL_PERMISSIONS.REQUEST_MEETINGS]: "Request Meetings",
  [MEETING_PORTAL_PERMISSIONS.VIEW_ATTENDEES]: "View Attendees",
  [MEETING_PORTAL_PERMISSIONS.CAPTURE_OUTCOMES]: "Capture Outcomes",
};

const ALL_PERMISSIONS = Object.values(MEETING_PORTAL_PERMISSIONS);

const inviteSchema = z.object({
  email: z.string().email("Valid email is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  permissions: z.array(z.string()).min(1, "Select at least one permission"),
});

type InviteFormData = z.infer<typeof inviteSchema>;

const editMemberSchema = z.object({
  permissions: z.array(z.string()).min(1, "Select at least one permission"),
  isActive: z.boolean(),
});

type EditMemberFormData = z.infer<typeof editMemberSchema>;

interface MeetingPortalManagementProps {
  eventId: string;
  organizationId: string;
}

export function MeetingPortalManagement({ eventId, organizationId }: MeetingPortalManagementProps) {
  const { toast } = useToast();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MeetingPortalMember | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<MeetingPortalInvitation | null>(null);

  const { data: members, isLoading: membersLoading } = useQuery<MeetingPortalMember[]>({
    queryKey: ["/api/events", eventId, "meeting-portal", "members", { organizationId }],
    queryFn: async () => {
      const res = await fetch(
        `/api/events/${eventId}/meeting-portal/members?organizationId=${organizationId}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery<MeetingPortalInvitation[]>({
    queryKey: ["/api/events", eventId, "meeting-portal", "invitations", { organizationId }],
    queryFn: async () => {
      const res = await fetch(
        `/api/events/${eventId}/meeting-portal/invitations?organizationId=${organizationId}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch invitations");
      return res.json();
    },
  });

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      permissions: [MEETING_PORTAL_PERMISSIONS.VIEW_ATTENDEES, MEETING_PORTAL_PERMISSIONS.REQUEST_MEETINGS],
    },
  });

  const editForm = useForm<EditMemberFormData>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      permissions: [],
      isActive: true,
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/meeting-portal/members/invite`, {
        ...data,
        organizationId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "meeting-portal", "invitations"] });
      setInviteDialogOpen(false);
      inviteForm.reset();
      toast({ title: "Invitation sent", description: "The team member has been invited to join the meeting portal." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send invitation", variant: "destructive" });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async (data: EditMemberFormData & { memberId: string }) => {
      const { memberId, ...updates } = data;
      const res = await apiRequest("PATCH", `/api/events/${eventId}/meeting-portal/members/${memberId}`, {
        ...updates,
        organizationId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "meeting-portal", "members"] });
      setEditDialogOpen(false);
      setSelectedMember(null);
      editForm.reset();
      toast({ title: "Member updated", description: "Member permissions have been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update member", variant: "destructive" });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/events/${eventId}/meeting-portal/members/${memberId}?organizationId=${organizationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "meeting-portal", "members"] });
      setDeleteDialogOpen(false);
      setSelectedMember(null);
      toast({ title: "Member removed", description: "The team member has been removed from the portal." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove member", variant: "destructive" });
    },
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      await apiRequest("DELETE", `/api/events/${eventId}/meeting-portal/invitations/${inviteId}?organizationId=${organizationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "meeting-portal", "invitations"] });
      setRevokeDialogOpen(false);
      setSelectedInvitation(null);
      toast({ title: "Invitation revoked", description: "The invitation has been revoked." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to revoke invitation", variant: "destructive" });
    },
  });

  const handleOpenEditDialog = (member: MeetingPortalMember) => {
    setSelectedMember(member);
    editForm.reset({
      permissions: (member.permissions as string[]) || [],
      isActive: member.isActive ?? true,
    });
    setEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (member: MeetingPortalMember) => {
    setSelectedMember(member);
    setDeleteDialogOpen(true);
  };

  const handleOpenRevokeDialog = (invitation: MeetingPortalInvitation) => {
    setSelectedInvitation(invitation);
    setRevokeDialogOpen(true);
  };

  const onSubmitInvite = (data: InviteFormData) => {
    inviteMutation.mutate(data);
  };

  const onSubmitEdit = (data: EditMemberFormData) => {
    if (selectedMember) {
      updateMemberMutation.mutate({ ...data, memberId: selectedMember.id });
    }
  };

  const getStatusBadgeVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "pending":
        return "secondary";
      case "accepted":
        return "default";
      case "expired":
        return "outline";
      case "revoked":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "Never";
    return format(new Date(date), "MMM d, yyyy");
  };

  const formatDateTime = (date: string | Date | null | undefined) => {
    if (!date) return "Never";
    return format(new Date(date), "MMM d, yyyy h:mm a");
  };

  const pendingInvitations = invitations?.filter((inv) => inv.status === "pending") || [];
  const otherInvitations = invitations?.filter((inv) => inv.status !== "pending") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-medium">Meeting Portal Team</h3>
          <p className="text-sm text-muted-foreground">
            Manage team members who can access the meeting portal for this event.
          </p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-invite-member">
              <Plus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join the meeting portal for this event.
              </DialogDescription>
            </DialogHeader>
            <Form {...inviteForm}>
              <form onSubmit={inviteForm.handleSubmit(onSubmitInvite)} className="space-y-4">
                <FormField
                  control={inviteForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="team@company.com"
                          {...field}
                          data-testid="input-invite-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={inviteForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John"
                            {...field}
                            data-testid="input-invite-firstname"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={inviteForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Doe"
                            {...field}
                            data-testid="input-invite-lastname"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={inviteForm.control}
                  name="permissions"
                  render={() => (
                    <FormItem>
                      <FormLabel>Permissions *</FormLabel>
                      <div className="space-y-2">
                        {ALL_PERMISSIONS.map((permission) => (
                          <FormField
                            key={permission}
                            control={inviteForm.control}
                            name="permissions"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center gap-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(permission)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, permission]);
                                      } else {
                                        field.onChange(current.filter((p) => p !== permission));
                                      }
                                    }}
                                    data-testid={`checkbox-invite-permission-${permission}`}
                                  />
                                </FormControl>
                                <Label className="font-normal">
                                  {PERMISSION_LABELS[permission]}
                                </Label>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormDescription>
                        Select which actions the team member can perform.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInviteDialogOpen(false)}
                    data-testid="button-invite-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    data-testid="button-invite-submit"
                  >
                    {inviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Send Invitation
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList data-testid="tabs-portal-management">
          <TabsTrigger value="members" data-testid="tab-members">
            <Users className="h-4 w-4 mr-2" />
            Members ({members?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="invitations" data-testid="tab-invitations">
            <Mail className="h-4 w-4 mr-2" />
            Pending Invitations ({pendingInvitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Portal Members</CardTitle>
              <CardDescription>
                Active team members with meeting portal access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : members && members.length > 0 ? (
                <Table data-testid="table-members">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                        <TableCell className="font-medium">
                          {member.firstName} {member.lastName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{member.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.jobTitle || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(member.permissions as string[] || []).map((perm) => (
                              <Badge key={perm} variant="secondary" className="text-xs">
                                {PERMISSION_LABELS[perm] || perm}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.isActive ? (
                            <Badge variant="default" className="gap-1">
                              <UserCheck className="h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <UserX className="h-3 w-3" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDateTime(member.lastLoginAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenEditDialog(member)}
                              data-testid={`button-edit-member-${member.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenDeleteDialog(member)}
                              data-testid={`button-delete-member-${member.id}`}
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
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No team members yet.</p>
                  <p className="text-sm">Invite team members to access the meeting portal.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Invitations</CardTitle>
              <CardDescription>
                Invitations awaiting acceptance from team members.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitationsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : pendingInvitations.length > 0 ? (
                <Table data-testid="table-invitations">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Invited Date</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvitations.map((invitation) => (
                      <TableRow key={invitation.id} data-testid={`row-invitation-${invitation.id}`}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(invitation.invitedAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(invitation.expiresAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(invitation.status)}>
                            {invitation.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenRevokeDialog(invitation)}
                            data-testid={`button-revoke-invitation-${invitation.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No pending invitations.</p>
                </div>
              )}

              {otherInvitations.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-3 text-muted-foreground">Invitation History</h4>
                  <Table data-testid="table-invitations-history">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Invited Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {otherInvitations.map((invitation) => (
                        <TableRow key={invitation.id} data-testid={`row-invitation-history-${invitation.id}`}>
                          <TableCell className="text-muted-foreground">{invitation.email}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(invitation.invitedAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(invitation.status)}>
                              {invitation.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update permissions and status for {selectedMember?.firstName} {selectedMember?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        {field.value ? "Member can access the portal" : "Member is deactivated"}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-edit-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="permissions"
                render={() => (
                  <FormItem>
                    <FormLabel>Permissions</FormLabel>
                    <div className="space-y-2">
                      {ALL_PERMISSIONS.map((permission) => (
                        <FormField
                          key={permission}
                          control={editForm.control}
                          name="permissions"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(permission)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, permission]);
                                    } else {
                                      field.onChange(current.filter((p) => p !== permission));
                                    }
                                  }}
                                  data-testid={`checkbox-edit-permission-${permission}`}
                                />
                              </FormControl>
                              <Label className="font-normal">
                                {PERMISSION_LABELS[permission]}
                              </Label>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  data-testid="button-edit-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMemberMutation.isPending}
                  data-testid="button-edit-submit"
                >
                  {updateMemberMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedMember?.firstName} {selectedMember?.lastName} from the meeting portal?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedMember && deleteMemberMutation.mutate(selectedMember.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-delete-confirm"
            >
              {deleteMemberMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the invitation for {selectedInvitation?.email}?
              They will no longer be able to use the invitation link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-revoke-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedInvitation && revokeInvitationMutation.mutate(selectedInvitation.id)}
              data-testid="button-revoke-confirm"
            >
              {revokeInvitationMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Revoke Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
