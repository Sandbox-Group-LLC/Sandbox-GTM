import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  UserPlus,
  MoreHorizontal,
  Copy,
  Eye,
  UserX,
  UserCheck,
  Loader2,
  Mail,
  Building2,
  Phone,
  Check,
  Link2,
  FileImage,
} from "lucide-react";
import type { Designer } from "@shared/schema";

interface DesignerWithCounts extends Designer {
  requestCount?: number;
}

const inviteDesignerSchema = z.object({
  email: z.string().email("Valid email is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
});

type InviteDesignerFormValues = z.infer<typeof inviteDesignerSchema>;

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-green-600 dark:bg-green-700" data-testid="badge-status-active">
          Active
        </Badge>
      );
    case "suspended":
      return (
        <Badge variant="destructive" data-testid="badge-status-suspended">
          Suspended
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" data-testid={`badge-status-${status}`}>
          {status}
        </Badge>
      );
  }
}

export default function Designers() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [createdDesigner, setCreatedDesigner] = useState<Designer | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: designers, isLoading } = useQuery<DesignerWithCounts[]>({
    queryKey: ["/api/designers"],
  });

  const form = useForm<InviteDesignerFormValues>({
    resolver: zodResolver(inviteDesignerSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      company: "",
      phone: "",
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteDesignerFormValues) => {
      const res = await apiRequest("POST", "/api/designers", data);
      return res.json();
    },
    onSuccess: (data: Designer) => {
      toast({ title: "Designer invited successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/designers"] });
      setInviteDialogOpen(false);
      form.reset();
      setCreatedDesigner(data);
      setSuccessDialogOpen(true);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/designers/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Designer status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/designers"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getInviteLink = (inviteCode: string) => {
    return `${window.location.origin}/designer?code=${encodeURIComponent(inviteCode)}`;
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <PageHeader
        title="Designers"
        description="Manage external designers and their access to proof requests"
      />

      <div className="flex justify-end">
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-invite-designer">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Designer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Designer</DialogTitle>
              <DialogDescription>
                Send an invitation to an external designer. They will receive a unique access code.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => inviteMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="designer@example.com" className="pl-9" {...field} data-testid="input-email" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Design Studio Inc." className="pl-9" {...field} data-testid="input-company" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="+1 (555) 000-0000" className="pl-9" {...field} data-testid="input-phone" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={inviteMutation.isPending} data-testid="button-send-invite">
                    {inviteMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Invitation"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !designers || designers.length === 0 ? (
            <div className="p-12 text-center">
              <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No designers yet.</p>
              <Button className="mt-4" onClick={() => setInviteDialogOpen(true)} data-testid="button-invite-first">
                <Plus className="h-4 w-4 mr-2" />
                Invite First Designer
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {designers.map((designer) => (
                  <TableRow key={designer.id} data-testid={`row-designer-${designer.id}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${designer.id}`}>
                      {`${designer.firstName || ""} ${designer.lastName || ""}`.trim() || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-email-${designer.id}`}>
                      {designer.email}
                    </TableCell>
                    <TableCell data-testid={`text-company-${designer.id}`}>
                      {designer.company || "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={designer.status || "active"} />
                    </TableCell>
                    <TableCell data-testid={`text-last-login-${designer.id}`}>
                      {designer.lastLoginAt
                        ? format(new Date(designer.lastLoginAt), "MMM d, yyyy")
                        : "Never"}
                    </TableCell>
                    <TableCell data-testid={`text-request-count-${designer.id}`}>
                      {designer.requestCount ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-${designer.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setLocation(`/proof-management?designer=${designer.id}`)}
                            data-testid={`menu-view-requests-${designer.id}`}
                          >
                            <FileImage className="h-4 w-4 mr-2" />
                            View Requests
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => copyToClipboard(getInviteLink(designer.inviteCode), designer.id)}
                            data-testid={`menu-copy-link-${designer.id}`}
                          >
                            {copiedId === designer.id ? (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Link2 className="h-4 w-4 mr-2" />
                                Copy Invite Link
                              </>
                            )}
                          </DropdownMenuItem>
                          {designer.status === "active" ? (
                            <DropdownMenuItem
                              onClick={() => updateStatusMutation.mutate({ id: designer.id, status: "suspended" })}
                              className="text-destructive"
                              data-testid={`menu-suspend-${designer.id}`}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Suspend
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => updateStatusMutation.mutate({ id: designer.id, status: "active" })}
                              data-testid={`menu-activate-${designer.id}`}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Designer Invited Successfully
            </DialogTitle>
            <DialogDescription>
              Share this magic link with the designer to grant them access to their proof requests.
            </DialogDescription>
          </DialogHeader>
          {createdDesigner && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Designer Details:</p>
                <p className="font-medium">{createdDesigner.email}</p>
                {(createdDesigner.firstName || createdDesigner.lastName) && (
                  <p className="text-sm text-muted-foreground">
                    {`${createdDesigner.firstName || ""} ${createdDesigner.lastName || ""}`.trim()}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Magic Link:</p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={getInviteLink(createdDesigner.inviteCode)}
                    className="font-mono text-sm"
                    data-testid="input-invite-link"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(getInviteLink(createdDesigner.inviteCode), "success")}
                    data-testid="button-copy-invite-link"
                  >
                    {copiedId === "success" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSuccessDialogOpen(false)} data-testid="button-close-success">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
