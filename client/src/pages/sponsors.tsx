import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  Key,
  ExternalLink,
  Mail,
  Phone,
  Ticket,
  ImageIcon,
  Copy,
  Send,
  Loader2,
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Badge } from "@/components/ui/badge";
import { EventSelectField } from "@/components/event-select-field";
import type { EventSponsor, Event, InviteCode } from "@shared/schema";

const sponsorFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  name: z.string().min(1, "Sponsor name is required"),
  tier: z.string().min(1, "Tier is required"),
  description: z.string().optional(),
  websiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  contactName: z.string().optional(),
  contactEmail: z.string().email("Must be a valid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  registrationSeats: z.coerce.number().min(0).default(0),
  bio: z.string().optional(),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
});

type SponsorFormData = z.infer<typeof sponsorFormSchema>;

const tierColors: Record<string, "default" | "secondary" | "outline"> = {
  platinum: "default",
  gold: "secondary",
  silver: "outline",
  bronze: "outline",
};

const tierLabels: Record<string, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};

export default function Sponsors() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSponsor, setEditingSponsor] = useState<EventSponsor | null>(null);
  const [deletingSponsor, setDeletingSponsor] = useState<EventSponsor | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: sponsors = [], isLoading } = useQuery<EventSponsor[]>({
    queryKey: ["/api/events", selectedEventId, "sponsors"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${selectedEventId}/sponsors`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sponsors");
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const { data: inviteCodes = [] } = useQuery<InviteCode[]>({
    queryKey: ["/api/invite-codes"],
  });

  const form = useForm<SponsorFormData>({
    resolver: zodResolver(sponsorFormSchema),
    defaultValues: {
      eventId: "",
      name: "",
      tier: "bronze",
      description: "",
      websiteUrl: "",
      logoUrl: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      registrationSeats: 0,
      bio: "",
      linkedin: "",
      twitter: "",
      facebook: "",
      instagram: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SponsorFormData) => {
      const payload = {
        ...data,
        socialLinks: {
          linkedin: data.linkedin || undefined,
          twitter: data.twitter || undefined,
          facebook: data.facebook || undefined,
          instagram: data.instagram || undefined,
        },
      };
      return await apiRequest("POST", `/api/events/${data.eventId}/sponsors`, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", variables.eventId, "sponsors"] });
      toast({ title: "Sponsor added successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SponsorFormData }) => {
      const payload = {
        ...data,
        socialLinks: {
          linkedin: data.linkedin || undefined,
          twitter: data.twitter || undefined,
          facebook: data.facebook || undefined,
          instagram: data.instagram || undefined,
        },
      };
      return await apiRequest("PATCH", `/api/events/${data.eventId}/sponsors/${id}`, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", variables.data.eventId, "sponsors"] });
      toast({ title: "Sponsor updated successfully" });
      setIsDialogOpen(false);
      setEditingSponsor(null);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string }) => {
      return await apiRequest("DELETE", `/api/events/${eventId}/sponsors/${id}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", variables.eventId, "sponsors"] });
      toast({ title: "Sponsor deleted successfully" });
      setDeletingSponsor(null);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const generateTokenMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/sponsors/${id}/generate-portal-token`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "sponsors"] });
      toast({ title: "Portal access token generated successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const emailPortalLinkMutation = useMutation({
    mutationFn: async (sponsorId: string) => {
      return await apiRequest("POST", `/api/sponsors/${sponsorId}/send-portal-email`);
    },
    onSuccess: () => {
      toast({ title: "Portal link sent", description: "The sponsor has been emailed their portal access link." });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const copyPortalLink = (sponsor: EventSponsor) => {
    if (!sponsor.portalAccessToken) {
      toast({ title: "No portal token", description: "Generate a portal token first.", variant: "destructive" });
      return;
    }
    const portalUrl = `${window.location.origin}/sponsor-portal?token=${sponsor.portalAccessToken}`;
    navigator.clipboard.writeText(portalUrl);
    toast({ title: "Link copied", description: "Portal link copied to clipboard." });
  };

  const onSubmit = (data: SponsorFormData) => {
    if (editingSponsor) {
      updateMutation.mutate({ id: editingSponsor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (sponsor: EventSponsor) => {
    setEditingSponsor(sponsor);
    const socialLinks = sponsor.socialLinks as { linkedin?: string; twitter?: string; facebook?: string; instagram?: string } | null;
    form.reset({
      eventId: sponsor.eventId,
      name: sponsor.name,
      tier: sponsor.tier || "bronze",
      description: sponsor.description || "",
      websiteUrl: sponsor.websiteUrl || "",
      logoUrl: sponsor.logoUrl || "",
      contactName: sponsor.contactName || "",
      contactEmail: sponsor.contactEmail || "",
      contactPhone: sponsor.contactPhone || "",
      registrationSeats: sponsor.registrationSeats || 0,
      bio: sponsor.bio || "",
      linkedin: socialLinks?.linkedin || "",
      twitter: socialLinks?.twitter || "",
      facebook: socialLinks?.facebook || "",
      instagram: socialLinks?.instagram || "",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingSponsor(null);
    form.reset();
  };

  const getEventName = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    return event?.name || "Unknown Event";
  };

  const getInviteCode = (inviteCodeId: string | null) => {
    if (!inviteCodeId) return null;
    return inviteCodes.find(c => c.id === inviteCodeId);
  };

  const getPortalStatus = (sponsor: EventSponsor) => {
    if (!sponsor.portalAccessToken) {
      return { label: "No Access", variant: "outline" as const };
    }
    if (sponsor.portalTokenExpiresAt && new Date(sponsor.portalTokenExpiresAt) < new Date()) {
      return { label: "Expired", variant: "destructive" as const };
    }
    return { label: "Active", variant: "default" as const };
  };

  const filteredSponsors = sponsors.filter((sponsor) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      sponsor.name.toLowerCase().includes(searchLower) ||
      (sponsor.contactName?.toLowerCase().includes(searchLower) ?? false) ||
      (sponsor.contactEmail?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Sponsors"
        breadcrumbs={[{ label: "Events", href: "/events" }, { label: "Sponsors" }]}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleDialogClose()}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-sponsor">
                <Plus className="h-4 w-4 mr-2" />
                Add Sponsor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSponsor ? "Edit Sponsor" : "Add New Sponsor"}</DialogTitle>
                <DialogDescription>
                  {editingSponsor ? "Update sponsor information" : "Enter the sponsor details below"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <EventSelectField control={form.control} />
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Basic Information</p>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sponsor Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tier</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-tier">
                                  <SelectValue placeholder="Select tier" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="platinum">Platinum</SelectItem>
                                <SelectItem value="gold">Gold</SelectItem>
                                <SelectItem value="silver">Silver</SelectItem>
                                <SelectItem value="bronze">Bronze</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea rows={3} {...field} data-testid="input-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="websiteUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." data-testid="input-website-url" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Logo</FormLabel>
                          <div className="flex items-start gap-4 flex-wrap">
                            {field.value ? (
                              <div className="relative">
                                <img
                                  src={field.value}
                                  alt="Sponsor logo"
                                  className="h-20 w-auto max-w-40 object-contain border rounded-md p-2"
                                  data-testid="img-logo-preview"
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="destructive"
                                  className="absolute -top-2 -right-2 h-6 w-6"
                                  onClick={() => form.setValue("logoUrl", "")}
                                  data-testid="button-remove-logo"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="h-20 w-20 border rounded-md flex items-center justify-center bg-muted">
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex flex-col gap-2">
                              <ObjectUploader
                                onComplete={(result) => form.setValue("logoUrl", result.uploadUrl)}
                                accept="image/*"
                                buttonText="Upload Logo"
                                buttonVariant="outline"
                              />
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="Or paste logo URL..." 
                                  className="max-w-xs"
                                  data-testid="input-logo-url" 
                                />
                              </FormControl>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Contact Information</p>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="contactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-contact-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} data-testid="input-contact-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Phone</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-contact-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Portal Settings</p>
                    <FormField
                      control={form.control}
                      name="registrationSeats"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Seats</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} {...field} data-testid="input-registration-seats" />
                          </FormControl>
                          <FormDescription>
                            Number of complimentary registrations for this sponsor.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {editingSponsor && (
                    <>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Sponsor Bio</p>
                        <FormField
                          control={form.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio (Sponsor-submitted)</FormLabel>
                              <FormControl>
                                <Textarea rows={4} {...field} data-testid="input-bio" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Social Links</p>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="linkedin"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>LinkedIn</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://linkedin.com/..." data-testid="input-linkedin" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="twitter"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Twitter</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://twitter.com/..." data-testid="input-twitter" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="facebook"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Facebook</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://facebook.com/..." data-testid="input-facebook" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="instagram"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Instagram</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://instagram.com/..." data-testid="input-instagram" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit-sponsor"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? "Saving..."
                        : editingSponsor
                        ? "Update"
                        : "Add Sponsor"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-[250px]" data-testid="select-event-filter">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sponsors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
          </div>

          {!selectedEventId ? (
            <EmptyState
              icon={Building2}
              title="Select an event"
              description="Choose an event from the dropdown above to view its sponsors"
            />
          ) : isLoading ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sponsor</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Seats</TableHead>
                      <TableHead>Portal</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-md" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : sponsors.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No sponsors yet"
              description="Add sponsors who are supporting your event"
              action={{
                label: "Add Sponsor",
                onClick: () => setIsDialogOpen(true),
              }}
            />
          ) : filteredSponsors.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No sponsors match your search</p>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sponsor</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Seats</TableHead>
                      <TableHead>Portal</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSponsors.map((sponsor) => {
                      const portalStatus = getPortalStatus(sponsor);
                      const inviteCode = getInviteCode(sponsor.baseInviteCodeId);
                      
                      return (
                        <TableRow key={sponsor.id} data-testid={`row-sponsor-${sponsor.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 rounded-md">
                                <AvatarImage src={sponsor.logoUrl || undefined} alt={sponsor.name} className="object-contain" />
                                <AvatarFallback className="rounded-md text-xs">
                                  {sponsor.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium" data-testid={`text-sponsor-name-${sponsor.id}`}>{sponsor.name}</p>
                                <p className="text-xs text-muted-foreground">{getEventName(sponsor.eventId)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={tierColors[sponsor.tier || "bronze"]}
                              data-testid={`badge-tier-${sponsor.id}`}
                            >
                              {tierLabels[sponsor.tier || "bronze"]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {sponsor.contactName && (
                                <p className="text-sm">{sponsor.contactName}</p>
                              )}
                              {sponsor.contactEmail && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  <span>{sponsor.contactEmail}</span>
                                </div>
                              )}
                              {sponsor.contactPhone && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  <span>{sponsor.contactPhone}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{sponsor.seatsUsed || 0}</span>
                              <span className="text-muted-foreground">/</span>
                              <span>{sponsor.registrationSeats || 0}</span>
                            </div>
                            {inviteCode && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Ticket className="h-3 w-3" />
                                <span>Code: {inviteCode.code}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={portalStatus.variant} data-testid={`badge-portal-${sponsor.id}`}>
                              {portalStatus.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEdit(sponsor)}
                                data-testid={`button-edit-${sponsor.id}`}
                                title="Edit sponsor"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => generateTokenMutation.mutate(sponsor.id)}
                                disabled={generateTokenMutation.isPending}
                                data-testid={`button-generate-token-${sponsor.id}`}
                                title="Generate portal token"
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => copyPortalLink(sponsor)}
                                disabled={!sponsor.portalAccessToken}
                                data-testid={`button-copy-portal-link-${sponsor.id}`}
                                title="Copy portal link"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => emailPortalLinkMutation.mutate(sponsor.id)}
                                disabled={!sponsor.portalAccessToken || !sponsor.contactEmail || emailPortalLinkMutation.isPending}
                                data-testid={`button-email-portal-link-${sponsor.id}`}
                                title="Email portal link to sponsor"
                              >
                                {emailPortalLinkMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </Button>
                              {sponsor.websiteUrl && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  asChild
                                  title="Visit website"
                                >
                                  <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeletingSponsor(sponsor)}
                                data-testid={`button-delete-${sponsor.id}`}
                                title="Delete sponsor"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={!!deletingSponsor} onOpenChange={(open) => !open && setDeletingSponsor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sponsor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSponsor?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSponsor && deleteMutation.mutate({ id: deletingSponsor.id, eventId: deletingSponsor.eventId })}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
