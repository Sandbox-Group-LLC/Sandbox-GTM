import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar, MapPin, Clock, Users, Mic, CheckCircle, AlertCircle } from "lucide-react";
import type { Event, EventSession, Speaker, Attendee } from "@shared/schema";

interface PublicEventData {
  event: Event;
  sessions: EventSession[];
  speakers: Speaker[];
}

const registrationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export default function PublicEvent() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredAttendee, setRegisteredAttendee] = useState<Attendee | null>(null);

  const { data, isLoading, error } = useQuery<PublicEventData>({
    queryKey: ["/api/public/event", slug],
    enabled: !!slug,
  });

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      jobTitle: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (formData: RegistrationFormData) => {
      const res = await apiRequest("POST", `/api/public/register/${slug}`, formData);
      return res.json();
    },
    onSuccess: (data) => {
      setRegistrationComplete(true);
      setRegisteredAttendee(data.attendee);
      toast({ title: "Registration successful!", description: "You have been registered for the event." });
    },
    onError: () => {
      toast({ title: "Registration failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const onSubmit = (formData: RegistrationFormData) => {
    registerMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
            <p className="text-muted-foreground">This event doesn't exist or is not available for public viewing.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { event, sessions, speakers } = data;

  if (registrationComplete && registeredAttendee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Registration Complete!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for registering for {event.name}
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-2">Your Check-In Code</p>
              <p className="text-3xl font-mono font-bold tracking-wider" data-testid="text-checkin-code">
                {registeredAttendee.checkInCode}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Save this code for check-in on event day</p>
            </div>

            <div className="text-left space-y-2 text-sm">
              <p><strong>Name:</strong> {registeredAttendee.firstName} {registeredAttendee.lastName}</p>
              <p><strong>Email:</strong> {registeredAttendee.email}</p>
              {registeredAttendee.company && <p><strong>Company:</strong> {registeredAttendee.company}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-b from-primary/10 to-background py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4">Public Event</Badge>
          <h1 className="text-4xl font-bold mb-4" data-testid="text-event-name">{event.name}</h1>
          
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
            )}
          </div>

          {event.description && (
            <p className="mt-6 text-lg text-muted-foreground">{event.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {sessions.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Schedule
                </h2>
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <Card key={session.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-medium">{session.title}</h3>
                            {session.description && (
                              <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {session.track && <Badge variant="outline">{session.track}</Badge>}
                              {session.sessionType && <Badge variant="secondary">{session.sessionType}</Badge>}
                            </div>
                          </div>
                          <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                            <p>{session.startTime} - {session.endTime}</p>
                            {session.room && <p className="text-xs">{session.room}</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {speakers.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Speakers
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {speakers.map((speaker) => (
                    <Card key={speaker.id}>
                      <CardContent className="p-4 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          {speaker.photoUrl ? (
                            <img src={speaker.photoUrl} alt={`${speaker.firstName} ${speaker.lastName}`} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-lg font-semibold text-muted-foreground">
                              {speaker.firstName[0]}{speaker.lastName[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{speaker.firstName} {speaker.lastName}</p>
                          {speaker.jobTitle && <p className="text-sm text-muted-foreground">{speaker.jobTitle}</p>}
                          {speaker.company && <p className="text-sm text-muted-foreground">{speaker.company}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Register Now</CardTitle>
                <CardDescription>
                  {event.registrationOpen
                    ? "Complete the form below to register for this event"
                    : "Registration is currently closed"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {event.registrationOpen ? (
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
                                <Input data-testid="input-first-name" {...field} />
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
                                <Input data-testid="input-last-name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" data-testid="input-email" {...field} />
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
                            <FormLabel>Phone (optional)</FormLabel>
                            <FormControl>
                              <Input data-testid="input-phone" {...field} />
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
                            <FormLabel>Company (optional)</FormLabel>
                            <FormControl>
                              <Input data-testid="input-company" {...field} />
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
                            <FormLabel>Job Title (optional)</FormLabel>
                            <FormControl>
                              <Input data-testid="input-job-title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                        data-testid="button-register"
                      >
                        {registerMutation.isPending ? "Registering..." : "Register"}
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Registration is not available at this time.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
