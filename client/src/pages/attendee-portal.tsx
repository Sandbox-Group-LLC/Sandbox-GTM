import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Ticket, 
  Package, 
  QrCode, 
  LogOut, 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  Edit,
  Check,
  X,
  Hotel,
  ExternalLink
} from "lucide-react";
import type { Attendee, Event } from "@shared/schema";

interface AttendeePortalData {
  attendee: Omit<Attendee, 'passwordHash'>;
  event: { id: string; name: string; publicSlug: string } | null;
  package: { id: string; name: string; features: string[] | null } | null;
}

interface HousingInfo {
  housingEnabled: boolean;
  bookingUrl?: string;
  passkeyEventName?: string;
}

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function QRCodeDisplay({ code }: { code: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}`;
  
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white p-4 rounded-lg">
        <img 
          src={qrUrl} 
          alt={`QR Code for ${code}`} 
          className="w-40 h-40"
          data-testid="img-qr-code"
        />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Check-in Code</p>
        <p className="text-xl font-mono font-bold tracking-wider" data-testid="text-checkin-code">{code}</p>
      </div>
    </div>
  );
}

export default function AttendeePortal() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<AttendeePortalData>({
    queryKey: ["/api/public/attendee/me"],
    queryFn: async () => {
      const res = await fetch("/api/public/attendee/me");
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Not authenticated");
        }
        throw new Error("Failed to fetch portal data");
      }
      return res.json();
    },
    retry: false,
  });

  const { data: housingInfo } = useQuery<HousingInfo>({
    queryKey: ["/api/public/event", slug, "housing", data?.attendee?.id, data?.attendee?.checkInCode],
    queryFn: async () => {
      if (!data?.attendee?.id || !data?.attendee?.checkInCode) {
        return { housingEnabled: false };
      }
      const res = await fetch(`/api/public/event/${slug}/housing/${data.attendee.id}?code=${encodeURIComponent(data.attendee.checkInCode || '')}`);
      if (!res.ok) return { housingEnabled: false };
      return res.json();
    },
    enabled: !!data?.attendee?.id && !!data?.attendee?.checkInCode && !!slug,
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      company: "",
      jobTitle: "",
    },
  });

  useEffect(() => {
    if (data?.attendee) {
      form.reset({
        firstName: data.attendee.firstName || "",
        lastName: data.attendee.lastName || "",
        phone: data.attendee.phone || "",
        company: data.attendee.company || "",
        jobTitle: data.attendee.jobTitle || "",
      });
    }
  }, [data, form]);

  useEffect(() => {
    if (error && (error as any).message === "Not authenticated") {
      setLocation(`/event/${slug}/login`);
    }
  }, [error, slug, setLocation]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/public/attendee/logout", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/attendee/me"] });
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      setLocation(`/event/${slug}/login`);
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (formData: ProfileFormData) => {
      const res = await apiRequest("PATCH", "/api/public/attendee/profile", formData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (formData: ProfileFormData) => {
    updateProfileMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">Please log in to access your portal.</p>
            <Button asChild>
              <Link href={`/event/${slug}/login`} data-testid="link-login">
                Log In
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { attendee, event, package: packageInfo } = data;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/event/${slug}`} data-testid="link-back-to-event">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Event
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-lg font-semibold" data-testid="text-event-name">{event?.name || "Event Portal"}</h1>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            {logoutMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4 mr-2" />
            )}
            Log Out
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2" data-testid="text-welcome">
            Welcome, {attendee.firstName}!
          </h2>
          <p className="text-muted-foreground">
            Manage your registration and view your check-in code below.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Your Profile
                </CardTitle>
                <CardDescription>Your registration information</CardDescription>
              </div>
              {!isEditing && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                  data-testid="button-edit-profile"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-first-name" />
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
                              <Input {...field} data-testid="input-last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-company" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-job-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Save
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsEditing(false);
                          form.reset();
                        }}
                        data-testid="button-cancel-edit"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium" data-testid="text-attendee-name">
                        {attendee.firstName} {attendee.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium" data-testid="text-attendee-email">{attendee.email}</p>
                    </div>
                  </div>
                  {attendee.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium" data-testid="text-attendee-phone">{attendee.phone}</p>
                      </div>
                    </div>
                  )}
                  {attendee.company && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Company</p>
                        <p className="font-medium" data-testid="text-attendee-company">{attendee.company}</p>
                      </div>
                    </div>
                  )}
                  {attendee.jobTitle && (
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Job Title</p>
                        <p className="font-medium" data-testid="text-attendee-job-title">{attendee.jobTitle}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Check-In Code
              </CardTitle>
              <CardDescription>Show this code at the event check-in</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              {attendee.checkInCode ? (
                <QRCodeDisplay code={attendee.checkInCode} />
              ) : (
                <p className="text-muted-foreground">No check-in code available</p>
              )}
            </CardContent>
            {attendee.checkedIn && (
              <CardFooter className="justify-center">
                <Badge variant="secondary" className="gap-1" data-testid="badge-checked-in">
                  <Check className="w-3 h-3" />
                  Checked In
                </Badge>
              </CardFooter>
            )}
          </Card>

          {housingInfo?.housingEnabled && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hotel className="w-5 h-5" />
                  Hotel Accommodations
                </CardTitle>
                <CardDescription>
                  Book your hotel room through our official room block for special event rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {housingInfo.bookingUrl ? (
                  <Button asChild data-testid="button-book-hotel">
                    <a href={housingInfo.bookingUrl} target="_blank" rel="noopener noreferrer">
                      <Hotel className="w-4 h-4 mr-2" />
                      Book Your Hotel Room
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </Button>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Hotel booking will be available soon. Please check back later.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {(attendee.ticketType || packageInfo) && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  Registration Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {attendee.ticketType && (
                    <div className="flex items-start gap-3">
                      <Ticket className="w-4 h-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Ticket Type</p>
                        <p className="font-medium" data-testid="text-ticket-type">{attendee.ticketType}</p>
                      </div>
                    </div>
                  )}
                  {packageInfo && (
                    <div className="flex items-start gap-3">
                      <Package className="w-4 h-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Package</p>
                        <p className="font-medium" data-testid="text-package-name">{packageInfo.name}</p>
                        {packageInfo.features && packageInfo.features.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {packageInfo.features.map((feature, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                                <Check className="w-3 h-3 text-green-500" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                  {attendee.attendeeType && (
                    <div className="flex items-start gap-3">
                      <User className="w-4 h-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Attendee Type</p>
                        <Badge variant="outline" data-testid="badge-attendee-type">{attendee.attendeeType}</Badge>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Badge 
                      variant={attendee.registrationStatus === "confirmed" ? "default" : "secondary"}
                      data-testid="badge-registration-status"
                    >
                      {attendee.registrationStatus || "pending"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
