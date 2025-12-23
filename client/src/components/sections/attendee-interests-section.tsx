import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Check, Settings, X, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { titleCase } from "@/lib/utils";
import { useState } from "react";
import type { AttendeeInterests, EventSession } from "@shared/schema";

const SESSION_TYPES = [
  { value: "keynote", label: "Keynote" },
  { value: "session", label: "Session" },
  { value: "workshop", label: "Workshop" },
  { value: "panel", label: "Panel" },
  { value: "networking", label: "Networking" },
  { value: "breakout", label: "Breakout" },
  { value: "fireside", label: "Fireside Chat" },
];

const interestsFormSchema = z.object({
  preferredTracks: z.array(z.string()).default([]),
  preferredSessionTypes: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
});

type InterestsFormData = z.infer<typeof interestsFormSchema>;

interface AttendeeInterestsSectionProps {
  eventId: string;
  heading?: string;
  isPreview?: boolean;
  theme?: {
    headingFont?: string;
    textColor?: string;
    textSecondaryColor?: string;
    cardBackground?: string;
    borderRadius?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    buttonBorderColor?: string;
  };
}

export function AttendeeInterestsSection({
  eventId,
  heading = "My Interests",
  isPreview,
  theme,
}: AttendeeInterestsSectionProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newInterest, setNewInterest] = useState("");

  const { data: currentInterests, isLoading: loadingInterests } = useQuery<AttendeeInterests | null>({
    queryKey: ["/api/portal", eventId, "interests"],
    enabled: !isPreview,
  });

  const { data: sessions = [], isLoading: loadingSessions } = useQuery<EventSession[]>({
    queryKey: ["/api/portal", eventId, "sessions"],
    enabled: !isPreview,
  });

  const availableTracks = Array.from(new Set(sessions.map(s => s.track).filter(Boolean))) as string[];

  const form = useForm<InterestsFormData>({
    resolver: zodResolver(interestsFormSchema),
    defaultValues: {
      preferredTracks: currentInterests?.preferredTracks || [],
      preferredSessionTypes: currentInterests?.preferredSessionTypes || [],
      interests: currentInterests?.interests || [],
    },
    values: {
      preferredTracks: currentInterests?.preferredTracks || [],
      preferredSessionTypes: currentInterests?.preferredSessionTypes || [],
      interests: currentInterests?.interests || [],
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: InterestsFormData) => {
      await apiRequest("PUT", `/api/portal/${eventId}/interests`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal", eventId, "interests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal", eventId, "recommendations"] });
      toast({
        title: "Interests saved",
        description: "Your preferences have been updated. Recommendations may take a moment to refresh.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your interests. Please try again.",
        variant: "destructive",
      });
    },
  });

  const borderRadiusMap: Record<string, string> = {
    none: "0px", small: "4px", medium: "8px", large: "16px", pill: "9999px",
  };
  const themeRadius = borderRadiusMap[theme?.borderRadius || "medium"];

  const headingStyles: React.CSSProperties = {
    fontFamily: theme?.headingFont ? `"${theme.headingFont}", sans-serif` : undefined,
    color: theme?.textColor || undefined,
  };

  const secondaryTextStyles: React.CSSProperties = {
    color: theme?.textSecondaryColor || undefined,
  };

  const labelStyles: React.CSSProperties = {
    color: theme?.textColor || undefined,
  };

  const inputStyles: React.CSSProperties = {
    backgroundColor: theme?.cardBackground || undefined,
    borderColor: theme?.textSecondaryColor ? `${theme.textSecondaryColor}40` : undefined,
    borderRadius: themeRadius,
    color: theme?.textColor || undefined,
  };

  const cardStyles: React.CSSProperties = {
    backgroundColor: theme?.cardBackground || undefined,
    borderRadius: themeRadius,
  };

  const buttonStyles: React.CSSProperties = {
    backgroundColor: theme?.buttonColor || undefined,
    color: theme?.buttonTextColor || undefined,
    borderRadius: themeRadius,
    borderColor: theme?.buttonBorderColor || theme?.buttonColor || undefined,
  };

  const isLoading = loadingInterests || loadingSessions;

  // Show preview placeholder in site builder
  if (isPreview) {
    return (
      <div data-testid="section-attendee-interests-preview">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <Card style={cardStyles}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2" style={headingStyles}>
              <Settings className="h-5 w-5" />
              Customize Your Experience
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="font-medium text-sm" style={headingStyles}>Preferred Tracks</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Technology</Badge>
                <Badge variant="outline">Business</Badge>
                <Badge variant="outline">Marketing</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-sm" style={headingStyles}>Session Types</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Workshop</Badge>
                <Badge variant="secondary">Keynote</Badge>
                <Badge variant="outline">Panel</Badge>
              </div>
            </div>
            <Button disabled style={buttonStyles}>
              Save Interests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div data-testid="section-attendee-interests-loading">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const onSubmit = (data: InterestsFormData) => {
    saveMutation.mutate(data);
  };

  const addInterest = () => {
    const trimmed = newInterest.trim();
    if (trimmed && !form.getValues("interests").includes(trimmed)) {
      const current = form.getValues("interests");
      form.setValue("interests", [...current, trimmed]);
      setNewInterest("");
    }
  };

  const removeInterest = (interest: string) => {
    const current = form.getValues("interests");
    form.setValue("interests", current.filter((i) => i !== interest));
  };

  return (
    <div data-testid="section-attendee-interests">
      {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
      <Card style={cardStyles}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2" style={headingStyles}>
            <Settings className="h-5 w-5" />
            Customize Your Experience
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {availableTracks.length > 0 && (
                <FormField
                  control={form.control}
                  name="preferredTracks"
                  render={() => (
                    <FormItem>
                      <FormLabel style={labelStyles}>Preferred Tracks</FormLabel>
                      <FormDescription style={secondaryTextStyles}>
                        Select the tracks that interest you most.
                      </FormDescription>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {availableTracks.map((track) => (
                          <FormField
                            key={track}
                            control={form.control}
                            name="preferredTracks"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(track)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        field.onChange([...field.value, track]);
                                      } else {
                                        field.onChange(field.value.filter((v) => v !== track));
                                      }
                                    }}
                                    data-testid={`checkbox-track-${track}`}
                                  />
                                </FormControl>
                                <FormLabel style={labelStyles} className="font-normal cursor-pointer">
                                  {titleCase(track)}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="preferredSessionTypes"
                render={() => (
                  <FormItem>
                    <FormLabel style={labelStyles}>Preferred Session Types</FormLabel>
                    <FormDescription style={secondaryTextStyles}>
                      What types of sessions do you prefer?
                    </FormDescription>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {SESSION_TYPES.map((type) => (
                        <FormField
                          key={type.value}
                          control={form.control}
                          name="preferredSessionTypes"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(type.value)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...field.value, type.value]);
                                    } else {
                                      field.onChange(field.value.filter((v) => v !== type.value));
                                    }
                                  }}
                                  data-testid={`checkbox-type-${type.value}`}
                                />
                              </FormControl>
                              <FormLabel style={labelStyles} className="font-normal cursor-pointer">
                                {type.label}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={labelStyles}>Topics of Interest</FormLabel>
                    <FormDescription style={secondaryTextStyles}>
                      Add keywords or topics you'd like to learn about.
                    </FormDescription>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {field.value.map((interest) => (
                        <Badge
                          key={interest}
                          variant="secondary"
                          className="flex items-center gap-1"
                          data-testid={`badge-interest-${interest}`}
                        >
                          {interest}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-4 w-4 p-0 no-default-hover-elevate"
                            onClick={() => removeInterest(interest)}
                            data-testid={`button-remove-interest-${interest}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="Add a topic (e.g., AI, sustainability, leadership)"
                          value={newInterest}
                          onChange={(e) => setNewInterest(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addInterest();
                            }
                          }}
                          style={inputStyles}
                          data-testid="input-new-interest"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={addInterest}
                        data-testid="button-add-interest"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={saveMutation.isPending}
                style={buttonStyles}
                data-testid="button-save-interests"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {saveMutation.isPending ? "Saving..." : "Save Preferences"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
