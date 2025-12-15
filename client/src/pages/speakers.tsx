import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Form,
  FormControl,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Mic2, Search, Mail, Building, Linkedin, Twitter, Globe } from "lucide-react";
import { EventSelectField } from "@/components/event-select-field";
import type { Speaker } from "@shared/schema";

const speakerFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  speakerRole: z.string().optional(),
  bio: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
});

type SpeakerFormData = z.infer<typeof speakerFormSchema>;

export default function Speakers() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);

  const { data: speakers = [], isLoading } = useQuery<Speaker[]>({
    queryKey: ["/api/speakers"],
  });

  const form = useForm<SpeakerFormData>({
    resolver: zodResolver(speakerFormSchema),
    defaultValues: {
      eventId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      jobTitle: "",
      speakerRole: "",
      bio: "",
      photoUrl: "",
      linkedin: "",
      twitter: "",
      website: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SpeakerFormData) => {
      const payload = {
        ...data,
        notes: data.notes || null,
        socialLinks: {
          linkedin: data.linkedin || undefined,
          twitter: data.twitter || undefined,
          website: data.website || undefined,
        },
      };
      return await apiRequest("POST", "/api/speakers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/speakers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Speaker added successfully" });
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
    mutationFn: async ({ id, data }: { id: string; data: SpeakerFormData }) => {
      const payload = {
        ...data,
        notes: data.notes || null,
        socialLinks: {
          linkedin: data.linkedin || undefined,
          twitter: data.twitter || undefined,
          website: data.website || undefined,
        },
      };
      return await apiRequest("PATCH", `/api/speakers/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/speakers"] });
      toast({ title: "Speaker updated successfully" });
      setIsDialogOpen(false);
      setEditingSpeaker(null);
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

  const onSubmit = (data: SpeakerFormData) => {
    if (editingSpeaker) {
      updateMutation.mutate({ id: editingSpeaker.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (speaker: Speaker) => {
    setEditingSpeaker(speaker);
    const socialLinks = speaker.socialLinks as { linkedin?: string; twitter?: string; website?: string } | null;
    form.reset({
      eventId: speaker.eventId,
      firstName: speaker.firstName,
      lastName: speaker.lastName,
      email: speaker.email,
      phone: speaker.phone || "",
      company: speaker.company || "",
      jobTitle: speaker.jobTitle || "",
      speakerRole: speaker.speakerRole || "",
      bio: speaker.bio || "",
      photoUrl: speaker.photoUrl || "",
      linkedin: socialLinks?.linkedin || "",
      twitter: socialLinks?.twitter || "",
      website: socialLinks?.website || "",
      notes: speaker.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingSpeaker(null);
    form.reset();
  };

  const filteredSpeakers = speakers.filter((speaker) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      speaker.firstName.toLowerCase().includes(searchLower) ||
      speaker.lastName.toLowerCase().includes(searchLower) ||
      (speaker.company?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Speakers"
        breadcrumbs={[{ label: "Sessions", href: "/sessions" }, { label: "Speakers" }]}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleDialogClose()}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-speaker">
                <Plus className="h-4 w-4 mr-2" />
                Add Speaker
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSpeaker ? "Edit Speaker" : "Add New Speaker"}</DialogTitle>
                <DialogDescription>
                  {editingSpeaker ? "Update speaker information" : "Enter the speaker details below"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <EventSelectField control={form.control} />
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                      name="speakerRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Speaker Role</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-speaker-role">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="keynote">Keynote Speaker</SelectItem>
                              <SelectItem value="breakout">Breakout Speaker</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Speaker Bio</FormLabel>
                        <FormControl>
                          <Textarea rows={4} {...field} data-testid="input-bio" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea rows={2} {...field} placeholder="Internal notes (not visible to speaker)" data-testid="input-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="photoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Photo URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." data-testid="input-photo-url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Social Links</p>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="linkedin"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="LinkedIn URL" data-testid="input-linkedin" />
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
                            <FormControl>
                              <Input {...field} placeholder="Twitter URL" data-testid="input-twitter" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="Website URL" data-testid="input-website" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit-speaker"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? "Saving..."
                        : editingSpeaker
                        ? "Update"
                        : "Add Speaker"}
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
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search speakers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : speakers.length === 0 ? (
            <EmptyState
              icon={Mic2}
              title="No speakers yet"
              description="Add speakers who will be presenting at your event"
              action={{
                label: "Add Speaker",
                onClick: () => setIsDialogOpen(true),
              }}
            />
          ) : filteredSpeakers.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No speakers match your search</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSpeakers.map((speaker) => {
                const socialLinks = speaker.socialLinks as { linkedin?: string; twitter?: string; website?: string } | null;
                return (
                  <Card
                    key={speaker.id}
                    className="hover-elevate cursor-pointer"
                    onClick={() => handleEdit(speaker)}
                    data-testid={`card-speaker-${speaker.id}`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={speaker.photoUrl || undefined} className="object-cover" />
                          <AvatarFallback className="text-lg">
                            {speaker.firstName[0]}{speaker.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 space-y-1">
                          <h3 className="font-semibold">
                            {speaker.firstName} {speaker.lastName}
                          </h3>
                          {speaker.jobTitle && (
                            <p className="text-sm text-muted-foreground truncate">
                              {speaker.jobTitle}
                            </p>
                          )}
                          {speaker.company && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              <span className="truncate">{speaker.company}</span>
                            </p>
                          )}
                          <div className="flex items-center gap-2 pt-2">
                            <a
                              href={`mailto:${speaker.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Mail className="h-4 w-4" />
                            </a>
                            {socialLinks?.linkedin && (
                              <a
                                href={socialLinks.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Linkedin className="h-4 w-4" />
                              </a>
                            )}
                            {socialLinks?.twitter && (
                              <a
                                href={socialLinks.twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Twitter className="h-4 w-4" />
                              </a>
                            )}
                            {socialLinks?.website && (
                              <a
                                href={socialLinks.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Globe className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      {speaker.bio && (
                        <p className="text-sm text-muted-foreground mt-4 line-clamp-3">
                          {speaker.bio}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
