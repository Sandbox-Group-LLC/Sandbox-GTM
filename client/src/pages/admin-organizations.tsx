import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/page-header";
import { StatsCard } from "@/components/stats-card";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Building2, Users, Calendar as CalendarIcon, UserCheck, Plus, Copy, Trash2, Ticket } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Organization, SignupInviteCode } from "@shared/schema";
import { insertSignupInviteCodeSchema } from "@shared/schema";
import { z } from "zod";

interface OrganizationWithStats extends Organization {
  memberCount: number;
  eventCount: number;
  attendeeCount: number;
}

const formSchema = insertSignupInviteCodeSchema.extend({
  code: z.string().min(1, "Code is required").transform(val => val.toUpperCase()),
  discountPercent: z.union([z.number().min(0).max(100), z.string()]).optional().transform(val => {
    if (val === "" || val === undefined) return undefined;
    return typeof val === "string" ? parseInt(val, 10) || undefined : val;
  }),
  maxUses: z.union([z.number().min(1), z.string()]).optional().transform(val => {
    if (val === "" || val === undefined) return undefined;
    return typeof val === "string" ? parseInt(val, 10) || undefined : val;
  }),
});

type FormValues = z.infer<typeof formSchema>;

function generateRandomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getInviteCodeStatus(code: SignupInviteCode): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (!code.isActive) {
    return { label: "Inactive", variant: "secondary" };
  }
  if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
    return { label: "Expired", variant: "destructive" };
  }
  if (code.maxUses && code.usesCount !== null && code.usesCount >= code.maxUses) {
    return { label: "Maxed", variant: "destructive" };
  }
  return { label: "Active", variant: "default" };
}

export default function AdminOrganizations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const isSuperAdmin = user?.email?.toLowerCase().endsWith("@makemysandbox.com") ?? false;
  
  const { data: organizations, isLoading } = useQuery<OrganizationWithStats[]>({
    queryKey: ["/api/admin/organizations"],
    enabled: isSuperAdmin,
  });

  const { data: inviteCodes, isLoading: isLoadingInviteCodes } = useQuery<SignupInviteCode[]>({
    queryKey: ["/api/admin/signup-invite-codes"],
    enabled: isSuperAdmin,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: generateRandomCode(),
      description: "",
      discountPercent: undefined,
      maxUses: undefined,
      expiresAt: undefined,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/admin/signup-invite-codes", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/signup-invite-codes"] });
      toast({ title: "Invite code created successfully" });
      setDialogOpen(false);
      form.reset({
        code: generateRandomCode(),
        description: "",
        discountPercent: undefined,
        maxUses: undefined,
        expiresAt: undefined,
        isActive: true,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create invite code", description: error.message, variant: "destructive" });
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

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader 
          title="Organizations" 
          breadcrumbs={[{ label: "Admin" }, { label: "Organizations" }]}
        />
        <div className="flex-1 overflow-auto p-6">
          <EmptyState
            icon={Building2}
            title="Access Denied"
            description="You don't have permission to view this page. Admin privileges are required."
          />
        </div>
      </div>
    );
  }

  const totalOrgs = organizations?.length || 0;
  const totalMembers = organizations?.reduce((sum, org) => sum + org.memberCount, 0) || 0;
  const totalEvents = organizations?.reduce((sum, org) => sum + org.eventCount, 0) || 0;
  const totalAttendees = organizations?.reduce((sum, org) => sum + org.attendeeCount, 0) || 0;

  const orgColumns = [
    { 
      key: "name", 
      header: "Name",
      cell: (org: OrganizationWithStats) => org.name,
    },
    { 
      key: "slug", 
      header: "Slug",
      cell: (org: OrganizationWithStats) => org.slug,
    },
    { 
      key: "memberCount", 
      header: "Members",
      cell: (org: OrganizationWithStats) => (
        <Badge variant="secondary" className="font-mono" data-testid={`badge-members-${org.id}`}>
          {org.memberCount}
        </Badge>
      ),
    },
    { 
      key: "eventCount", 
      header: "Events",
      cell: (org: OrganizationWithStats) => (
        <Badge variant="secondary" className="font-mono" data-testid={`badge-events-${org.id}`}>
          {org.eventCount}
        </Badge>
      ),
    },
    { 
      key: "attendeeCount", 
      header: "Attendees",
      cell: (org: OrganizationWithStats) => (
        <Badge variant="secondary" className="font-mono" data-testid={`badge-attendees-${org.id}`}>
          {org.attendeeCount}
        </Badge>
      ),
    },
    { 
      key: "createdAt", 
      header: "Created",
      cell: (org: OrganizationWithStats) => org.createdAt ? format(new Date(org.createdAt), "MMM d, yyyy") : "-",
    },
  ];

  const inviteCodeColumns = [
    {
      key: "code",
      header: "Code",
      cell: (code: SignupInviteCode) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium" data-testid={`text-code-${code.id}`}>{code.code}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(code.code);
            }}
            data-testid={`button-copy-code-${code.id}`}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (code: SignupInviteCode) => (
        <span className="text-muted-foreground" data-testid={`text-description-${code.id}`}>
          {code.description || "-"}
        </span>
      ),
    },
    {
      key: "discount",
      header: "Discount",
      cell: (code: SignupInviteCode) => code.discountPercent ? (
        <Badge variant="secondary" data-testid={`badge-discount-${code.id}`}>
          {code.discountPercent}%
        </Badge>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
    },
    {
      key: "uses",
      header: "Uses",
      cell: (code: SignupInviteCode) => (
        <span className="font-mono" data-testid={`text-uses-${code.id}`}>
          {code.usesCount ?? 0}{code.maxUses ? ` / ${code.maxUses}` : ""}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (code: SignupInviteCode) => {
        const status = getInviteCodeStatus(code);
        return (
          <Badge variant={status.variant} data-testid={`badge-status-${code.id}`}>
            {status.label}
          </Badge>
        );
      },
    },
    {
      key: "expiresAt",
      header: "Expires",
      cell: (code: SignupInviteCode) => (
        <span data-testid={`text-expires-${code.id}`}>
          {code.expiresAt ? format(new Date(code.expiresAt), "MMM d, yyyy") : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (code: SignupInviteCode) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            deleteMutation.mutate(code.id);
          }}
          disabled={deleteMutation.isPending}
          data-testid={`button-delete-code-${code.id}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Organizations" 
        breadcrumbs={[{ label: "Admin" }, { label: "Organizations" }]}
      />
      
      <div className="flex-1 overflow-auto p-6 space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : (
            <>
              <StatsCard
                title="Total Organizations"
                value={totalOrgs}
                icon={Building2}
                data-testid="stat-total-orgs"
              />
              <StatsCard
                title="Total Members"
                value={totalMembers}
                icon={Users}
                data-testid="stat-total-members"
              />
              <StatsCard
                title="Total Events"
                value={totalEvents}
                icon={CalendarIcon}
                data-testid="stat-total-events"
              />
              <StatsCard
                title="Total Attendees"
                value={totalAttendees}
                icon={UserCheck}
                data-testid="stat-total-attendees"
              />
            </>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-64" />
        ) : !organizations?.length ? (
          <EmptyState
            icon={Building2}
            title="No Organizations Yet"
            description="Organizations will appear here when users sign up."
          />
        ) : (
          <DataTable
            columns={orgColumns}
            data={organizations}
            getRowKey={(org) => org.id}
          />
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-xl font-semibold">Invite Codes</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-invite-code">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invite Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Invite Code</DialogTitle>
                  <DialogDescription>
                    Create a new signup invite code for users to redeem.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                placeholder="INVITE123"
                                data-testid="input-code"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => form.setValue("code", generateRandomCode())}
                                data-testid="button-generate-code"
                              >
                                Generate
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Optional description"
                              data-testid="input-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="discountPercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount Percent</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value)}
                                placeholder="0-100"
                                data-testid="input-discount-percent"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxUses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Uses</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value)}
                                placeholder="Unlimited"
                                data-testid="input-max-uses"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="expiresAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expires At</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-expires-at"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(new Date(field.value), "PPP") : "Never"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date?.toISOString())}
                                disabled={(date) => date < new Date()}
                                initialFocus
                                data-testid="calendar-expires-at"
                              />
                              {field.value && (
                                <div className="p-2 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => field.onChange(undefined)}
                                    data-testid="button-clear-expires-at"
                                  >
                                    Clear
                                  </Button>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Allow this code to be used for signups
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value ?? true}
                              onCheckedChange={field.onChange}
                              data-testid="switch-is-active"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                        data-testid="button-cancel-create"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending}
                        data-testid="button-submit-create"
                      >
                        {createMutation.isPending ? "Creating..." : "Create"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoadingInviteCodes ? (
            <Skeleton className="h-64" />
          ) : !inviteCodes?.length ? (
            <EmptyState
              icon={Ticket}
              title="No Invite Codes Yet"
              description="Create invite codes to allow users to sign up with special discounts."
            />
          ) : (
            <DataTable
              columns={inviteCodeColumns}
              data={inviteCodes}
              getRowKey={(code) => code.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
