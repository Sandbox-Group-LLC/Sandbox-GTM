import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { FEATURE_PERMISSIONS, type FeaturePermission } from "@shared/schema";
import { Users, UserPlus, Mail, Trash2, Edit, Shield, Loader2, Send } from "lucide-react";

interface Member {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  permissions: string[] | null;
  invitedBy: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
}

interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  permissions: string[] | null;
  inviteCode: string;
  invitedBy: string;
  status: string;
  expiresAt: string | null;
  invitedAt: string;
  inviter?: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
}

const PERMISSION_LABELS: Record<FeaturePermission, { name: string; description: string }> = {
  programs: { name: "Programs", description: "Event Setup, Content" },
  performance: { name: "Performance", description: "Analytics, Reports" },
  goToMarket: { name: "Go-To-Market", description: "Audience, Campaigns" },
  engagement: { name: "Engagement", description: "Registration, Experience" },
  execution: { name: "Execution", description: "Logistics, Vendors" },
  revenueRoi: { name: "Revenue & ROI", description: "Pipeline, Sales" },
};

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  permissions: z.array(z.string()).min(1, "Select at least one permission"),
});

type InviteFormData = z.infer<typeof inviteSchema>;

function MemberSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-6 w-16" />
    </div>
  );
}

function PermissionCheckboxList({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      {FEATURE_PERMISSIONS.map((permission) => {
        const { name, description } = PERMISSION_LABELS[permission];
        const isChecked = value.includes(permission);

        return (
          <div key={permission} className="flex items-start gap-3">
            <Checkbox
              id={`permission-${permission}`}
              checked={isChecked}
              disabled={disabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  onChange([...value, permission]);
                } else {
                  onChange(value.filter((p) => p !== permission));
                }
              }}
              data-testid={`checkbox-permission-${permission}`}
            />
            <div className="flex flex-col">
              <label
                htmlFor={`permission-${permission}`}
                className="text-sm font-medium cursor-pointer"
              >
                {name}
              </label>
              <span className="text-xs text-muted-foreground">{description}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EditPermissionsDialog({
  member,
  onSuccess,
}: {
  member: Member;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [permissions, setPermissions] = useState<string[]>(member.permissions || []);
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (newPermissions: string[]) => {
      return await apiRequest("PATCH", `/api/organization/members/${member.userId}`, {
        permissions: newPermissions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/members"] });
      toast({ title: "Permissions updated", description: "Member permissions have been updated." });
      setOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid={`button-edit-permissions-${member.userId}`}
        >
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Permissions</DialogTitle>
          <DialogDescription>
            Update permissions for {member.user.firstName || member.user.email}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <PermissionCheckboxList
            value={permissions}
            onChange={setPermissions}
            disabled={updateMutation.isPending}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            data-testid="button-cancel-edit-permissions"
          >
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate(permissions)}
            disabled={updateMutation.isPending}
            data-testid="button-save-permissions"
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({
  member,
  isCurrentUser,
  isOwner,
}: {
  member: Member;
  isCurrentUser: boolean;
  isOwner: boolean;
}) {
  const { toast } = useToast();

  const removeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/organization/members/${member.userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/members"] });
      toast({ title: "Member removed", description: "Team member has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getInitials = () => {
    if (member.user.firstName && member.user.lastName) {
      return `${member.user.firstName[0]}${member.user.lastName[0]}`.toUpperCase();
    }
    if (member.user.email) {
      return member.user.email[0].toUpperCase();
    }
    return "U";
  };

  const displayName = member.user.firstName && member.user.lastName
    ? `${member.user.firstName} ${member.user.lastName}`
    : member.user.email || "Unknown";

  const isMemberOwner = member.role === "owner";

  return (
    <div
      className="flex items-center gap-4 py-4"
      data-testid={`row-member-${member.userId}`}
    >
      <Avatar>
        <AvatarImage src={member.user.profileImageUrl || undefined} alt={displayName} />
        <AvatarFallback>{getInitials()}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate" data-testid={`text-member-name-${member.userId}`}>
            {displayName}
          </span>
          <Badge variant={isMemberOwner ? "default" : "secondary"} className="text-xs">
            {isMemberOwner ? "Owner" : "Member"}
          </Badge>
          {isCurrentUser && (
            <Badge variant="outline" className="text-xs">
              You
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate" data-testid={`text-member-email-${member.userId}`}>
          {member.user.email}
        </p>
        {!isMemberOwner && member.permissions && member.permissions.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {member.permissions.map((perm) => (
              <Badge key={perm} variant="outline" className="text-xs">
                {PERMISSION_LABELS[perm as FeaturePermission]?.name || perm}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {isOwner && !isMemberOwner && !isCurrentUser && (
        <div className="flex items-center gap-1">
          <EditPermissionsDialog member={member} onSuccess={() => {}} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`button-remove-member-${member.userId}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove team member?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove {displayName} from your organization. They will lose access to all organization resources.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-remove-member">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => removeMutation.mutate()}
                  className="bg-destructive text-destructive-foreground"
                  data-testid="button-confirm-remove-member"
                >
                  {removeMutation.isPending ? "Removing..." : "Remove"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

function InviteMemberDialog({ isOwner }: { isOwner: boolean }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      permissions: [],
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      return await apiRequest("POST", "/api/organization/invitations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/invitations"] });
      toast({ title: "Invitation sent", description: "Team invitation has been created." });
      form.reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (!isOwner) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-invite-member">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => inviteMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="colleague@example.com"
                      {...field}
                      data-testid="input-invite-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permissions</FormLabel>
                  <FormControl>
                    <PermissionCheckboxList
                      value={field.value}
                      onChange={field.onChange}
                      disabled={inviteMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-invite"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
                data-testid="button-send-invite"
              >
                {inviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditInvitationDialog({
  invitation,
  onSuccess,
}: {
  invitation: Invitation;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [permissions, setPermissions] = useState<string[]>(invitation.permissions || []);
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (newPermissions: string[]) => {
      return await apiRequest("PATCH", `/api/organization/invitations/${invitation.id}`, {
        permissions: newPermissions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/invitations"] });
      toast({ title: "Invitation updated", description: "Invitation permissions have been updated." });
      setOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid={`button-edit-invitation-${invitation.id}`}
        >
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Invitation Permissions</DialogTitle>
          <DialogDescription>
            Update permissions for the invitation to {invitation.email}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <PermissionCheckboxList
            value={permissions}
            onChange={setPermissions}
            disabled={updateMutation.isPending}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            data-testid="button-cancel-edit-invitation"
          >
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate(permissions)}
            disabled={updateMutation.isPending || permissions.length === 0}
            data-testid="button-save-invitation"
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvitationRow({ invitation, isOwner }: { invitation: Invitation; isOwner: boolean }) {
  const { toast } = useToast();

  const revokeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/organization/invitations/${invitation.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/invitations"] });
      toast({ title: "Invitation revoked", description: "The invitation has been revoked." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/organization/invitations/${invitation.id}/resend`);
    },
    onSuccess: () => {
      toast({ title: "Email sent", description: "The invitation email has been resent." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div
      className="flex items-center gap-4 py-4"
      data-testid={`row-invitation-${invitation.id}`}
    >
      <div className="p-2 rounded-full bg-muted">
        <Mail className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate" data-testid={`text-invitation-email-${invitation.id}`}>
            {invitation.email}
          </span>
          <Badge variant="outline" className="text-xs">
            Pending
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          Invited {formatDate(invitation.invitedAt)}
          {invitation.expiresAt && (
            <span> · Expires {formatDate(invitation.expiresAt)}</span>
          )}
        </div>
        {invitation.permissions && invitation.permissions.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {invitation.permissions.map((perm) => (
              <Badge key={perm} variant="outline" className="text-xs">
                {PERMISSION_LABELS[perm as FeaturePermission]?.name || perm}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {isOwner && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
            data-testid={`button-resend-invitation-${invitation.id}`}
            title="Resend invitation email"
          >
            {resendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          <EditInvitationDialog invitation={invitation} onSuccess={() => {}} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`button-revoke-invitation-${invitation.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will revoke the invitation for {invitation.email}. They will no longer be able to join using this invitation.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-revoke">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => revokeMutation.mutate()}
                  className="bg-destructive text-destructive-foreground"
                  data-testid="button-confirm-revoke"
                >
                  {revokeMutation.isPending ? "Revoking..." : "Revoke"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

export default function TeamMembers() {
  const { user } = useAuth();

  const { data: members, isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ["/api/organization/members"],
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery<Invitation[]>({
    queryKey: ["/api/organization/invitations"],
  });

  const currentUserMember = members?.find((m) => m.userId === user?.id);
  const isOwner = currentUserMember?.role === "owner";

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Team Members"
        breadcrumbs={[
          { label: "My Organization", href: "/my-organization" },
          { label: "Team Members" },
        ]}
        actions={<InviteMemberDialog isOwner={isOwner} />}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Current Members
              </CardTitle>
              <CardDescription>People who have access to your organization</CardDescription>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="space-y-2">
                  <MemberSkeleton />
                  <Separator />
                  <MemberSkeleton />
                </div>
              ) : members && members.length > 0 ? (
                <div>
                  {members.map((member, index) => (
                    <div key={member.id}>
                      {index > 0 && <Separator />}
                      <MemberRow
                        member={member}
                        isCurrentUser={member.userId === user?.id}
                        isOwner={isOwner}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No team members found</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Pending Invitations
              </CardTitle>
              <CardDescription>Invitations that have been sent but not yet accepted</CardDescription>
            </CardHeader>
            <CardContent>
              {invitationsLoading ? (
                <div className="space-y-2">
                  <MemberSkeleton />
                </div>
              ) : invitations && invitations.length > 0 ? (
                <div>
                  {invitations.map((invitation, index) => (
                    <div key={invitation.id}>
                      {index > 0 && <Separator />}
                      <InvitationRow invitation={invitation} isOwner={isOwner} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No pending invitations</p>
                  {isOwner && (
                    <p className="text-sm mt-1">Click "Invite Member" to add team members</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
