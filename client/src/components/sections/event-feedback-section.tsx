import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Check, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  wouldRecommend: z.boolean().nullable().optional(),
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
      wouldRecommend: null,
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

  const cardStyles: React.CSSProperties = {
    backgroundColor: theme?.cardBackground || undefined,
    borderRadius: themeRadius,
  };

  const buttonStyles: React.CSSProperties = {
    backgroundColor: theme?.buttonColor || undefined,
    color: theme?.buttonTextColor || undefined,
    borderRadius: themeRadius,
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
              <p className="font-medium text-sm" style={headingStyles}>Would you recommend this event?</p>
              <div className="flex gap-2">
                <Button variant="outline" disabled className="flex-1 gap-2">
                  <ThumbsUp className="h-4 w-4" />
                  Yes
                </Button>
                <Button variant="outline" disabled className="flex-1 gap-2">
                  <ThumbsDown className="h-4 w-4" />
                  No
                </Button>
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

  const wouldRecommendValue = form.watch("wouldRecommend");

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
                    <FormLabel className="text-base">Overall Experience *</FormLabel>
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
                      <FormLabel>Venue & Facilities</FormLabel>
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
                      <FormLabel>Content & Sessions</FormLabel>
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
                      <FormLabel>Networking Opportunities</FormLabel>
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
                      <FormLabel>Organization & Logistics</FormLabel>
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
                name="wouldRecommend"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Would you recommend this event to a colleague?</FormLabel>
                    <FormControl>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant={field.value === true ? "default" : "outline"}
                          className={cn(
                            "flex-1",
                            field.value === true && "bg-green-600 hover:bg-green-700"
                          )}
                          onClick={() => field.onChange(true)}
                          data-testid="button-recommend-yes"
                        >
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          Yes
                        </Button>
                        <Button
                          type="button"
                          variant={field.value === false ? "default" : "outline"}
                          className={cn(
                            "flex-1",
                            field.value === false && "bg-red-600 hover:bg-red-700"
                          )}
                          onClick={() => field.onChange(false)}
                          data-testid="button-recommend-no"
                        >
                          <ThumbsDown className="h-4 w-4 mr-2" />
                          No
                        </Button>
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
                    <FormLabel>What did you enjoy most?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share the highlights of your experience..."
                        className="resize-none"
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
                    <FormLabel>What could be improved?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share your suggestions for improvement..."
                        className="resize-none"
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
                    <FormLabel>Additional Comments</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any other thoughts you'd like to share..."
                        className="resize-none"
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
                    <FormLabel className="font-normal cursor-pointer">
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
