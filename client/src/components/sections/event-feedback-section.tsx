import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Check, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { StarRating } from "@/components/star-rating";
import { cn } from "@/lib/utils";
import type { EventFeedback, EventPageTheme } from "@shared/schema";

const eventFeedbackSchema = z.object({
  overallRating: z.number().min(1, "Please provide an overall rating").max(5),
  venueRating: z.number().min(0).max(5).optional(),
  contentRating: z.number().min(0).max(5).optional(),
  networkingRating: z.number().min(0).max(5).optional(),
  organizationRating: z.number().min(0).max(5).optional(),
  recommendationScore: z.number().min(0, "Please provide a recommendation score").max(10),
  highlights: z.string().optional(),
  improvements: z.string().optional(),
  additionalComments: z.string().optional(),
  isAnonymous: z.boolean().default(false),
});

type EventFeedbackFormData = z.infer<typeof eventFeedbackSchema>;

interface EventFeedbackSectionProps {
  eventId: string;
  heading?: string;
  successMessage?: string;
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

export function EventFeedbackSection({
  eventId,
  heading = "Event Feedback",
  successMessage = "Thank you for sharing your feedback! Your input helps us improve future events.",
  isPreview,
  theme,
}: EventFeedbackSectionProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: existingFeedback, isLoading } = useQuery<EventFeedback | null>({
    queryKey: ["/api/portal", eventId, "feedback"],
    enabled: !isPreview,
  });

  const form = useForm<EventFeedbackFormData>({
    resolver: zodResolver(eventFeedbackSchema),
    defaultValues: {
      overallRating: 0,
      venueRating: 0,
      contentRating: 0,
      networkingRating: 0,
      organizationRating: 0,
      recommendationScore: 5,
      highlights: "",
      improvements: "",
      additionalComments: "",
      isAnonymous: false,
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: EventFeedbackFormData) => {
      await apiRequest("POST", `/api/portal/${eventId}/feedback`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal", eventId, "feedback"] });
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
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

  // Show preview placeholder in site builder
  if (isPreview) {
    return (
      <div data-testid="section-event-feedback-preview">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <Card style={cardStyles}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2" style={headingStyles}>
              <MessageSquare className="h-5 w-5" />
              Share Your Experience
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="font-medium text-sm" style={headingStyles}>Overall Experience</p>
              <StarRating value={4} onChange={() => {}} size="lg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="font-medium text-sm" style={headingStyles}>Venue</p>
                <StarRating value={5} onChange={() => {}} size="md" />
              </div>
              <div className="space-y-2">
                <p className="font-medium text-sm" style={headingStyles}>Content</p>
                <StarRating value={4} onChange={() => {}} size="md" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-sm" style={headingStyles}>How likely are you to recommend? (0-10)</p>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Not at all</span>
                <span>Extremely likely</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <div
                    key={n}
                    className={cn(
                      "w-7 h-7 rounded-md text-xs font-medium flex items-center justify-center",
                      n === 8 ? "bg-yellow-500 text-white" : "bg-muted"
                    )}
                  >
                    {n}
                  </div>
                ))}
              </div>
            </div>
            <Button disabled style={buttonStyles}>
              Submit Feedback
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div data-testid="section-event-feedback-loading">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (existingFeedback) {
    return (
      <div data-testid="section-event-feedback-submitted">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <Card style={cardStyles}>
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h4 className="text-xl font-semibold mb-2" style={headingStyles}>Feedback Received</h4>
            <p style={secondaryTextStyles}>{successMessage}</p>
            <div className="mt-4 flex items-center justify-center gap-1">
              <span className="text-sm" style={secondaryTextStyles}>Your rating:</span>
              <StarRating value={existingFeedback.overallRating} readOnly size="md" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSubmit = (data: EventFeedbackFormData) => {
    submitMutation.mutate(data);
  };

  const recommendationScoreValue = form.watch("recommendationScore");

  const getNpsLabel = (score: number | null | undefined) => {
    if (score === null || score === undefined) return "Select a score";
    if (score >= 9) return "Promoter";
    if (score >= 7) return "Passive";
    return "Detractor";
  };

  const getNpsColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return "text-muted-foreground";
    if (score >= 9) return "text-green-600 dark:text-green-400";
    if (score >= 7) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div data-testid="section-event-feedback">
      {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
      <Card style={cardStyles}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2" style={headingStyles}>
            <MessageSquare className="h-5 w-5" />
            Share Your Experience
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="overallRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={labelStyles} className="text-base">Overall Experience *</FormLabel>
                    <FormControl>
                      <StarRating
                        value={field.value}
                        onChange={field.onChange}
                        size="lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="venueRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={labelStyles}>Venue & Facilities</FormLabel>
                      <FormControl>
                        <StarRating
                          value={field.value || 0}
                          onChange={field.onChange}
                          size="md"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contentRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={labelStyles}>Content & Sessions</FormLabel>
                      <FormControl>
                        <StarRating
                          value={field.value || 0}
                          onChange={field.onChange}
                          size="md"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="networkingRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={labelStyles}>Networking Opportunities</FormLabel>
                      <FormControl>
                        <StarRating
                          value={field.value || 0}
                          onChange={field.onChange}
                          size="md"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="organizationRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={labelStyles}>Organization & Logistics</FormLabel>
                      <FormControl>
                        <StarRating
                          value={field.value || 0}
                          onChange={field.onChange}
                          size="md"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="recommendationScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={labelStyles}>How likely are you to recommend this event? (0-10)</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Not at all likely</span>
                          <span>Extremely likely</span>
                        </div>
                        <Slider
                          min={0}
                          max={10}
                          step={1}
                          value={[field.value ?? 5]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          className="cursor-pointer"
                          data-testid="slider-recommendation-score"
                        />
                        <div className="flex justify-between items-center">
                          <div className="flex gap-1">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => field.onChange(n)}
                                className={cn(
                                  "w-7 h-7 rounded-md text-xs font-medium transition-colors",
                                  field.value === n
                                    ? n >= 9
                                      ? "bg-green-600 text-white"
                                      : n >= 7
                                        ? "bg-yellow-500 text-white"
                                        : "bg-red-500 text-white"
                                    : "bg-muted hover:bg-muted/80"
                                )}
                                data-testid={`button-nps-${n}`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                          <span className={cn("text-sm font-medium ml-3", getNpsColor(field.value))}>
                            {field.value !== null && field.value !== undefined ? `${field.value} - ${getNpsLabel(field.value)}` : ""}
                          </span>
                        </div>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="highlights"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={labelStyles}>What did you enjoy most?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share the highlights of your experience..."
                        className="resize-none"
                        style={inputStyles}
                        rows={3}
                        {...field}
                        data-testid="textarea-highlights"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="improvements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={labelStyles}>What could be improved?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share your suggestions for improvement..."
                        className="resize-none"
                        style={inputStyles}
                        rows={3}
                        {...field}
                        data-testid="textarea-improvements"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additionalComments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={labelStyles}>Additional Comments</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any other thoughts you'd like to share..."
                        className="resize-none"
                        style={inputStyles}
                        rows={3}
                        {...field}
                        data-testid="textarea-additional-comments"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isAnonymous"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-anonymous"
                      />
                    </FormControl>
                    <FormLabel style={labelStyles} className="font-normal cursor-pointer">
                      Submit anonymously
                    </FormLabel>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full sm:w-auto"
                style={buttonStyles}
                data-testid="button-submit-event-feedback"
              >
                {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Feedback
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
