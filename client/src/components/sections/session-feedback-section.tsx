import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Check, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { formatEventDate } from "@/lib/utils";
import type { EventSession, SessionFeedback, EventPageTheme } from "@shared/schema";

const sessionFeedbackSchema = z.object({
  overallRating: z.number().min(1, "Please provide an overall rating").max(5),
  contentRating: z.number().min(0).max(5).optional(),
  speakerRating: z.number().min(0).max(5).optional(),
  relevanceRating: z.number().min(0).max(5).optional(),
  comment: z.string().optional(),
  isAnonymous: z.boolean().default(false),
});

type SessionFeedbackFormData = z.infer<typeof sessionFeedbackSchema>;

interface SessionFeedbackSectionProps {
  eventId: string;
  sessionId?: string;
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

interface SavedSession {
  id: string;
  sessionId: string;
  session: EventSession;
}

function SessionFeedbackForm({
  eventId,
  session,
  existingFeedback,
  theme,
}: {
  eventId: string;
  session: EventSession;
  existingFeedback: SessionFeedback | null;
  theme?: SessionFeedbackSectionProps['theme'];
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<SessionFeedbackFormData>({
    resolver: zodResolver(sessionFeedbackSchema),
    defaultValues: {
      overallRating: existingFeedback?.overallRating || 0,
      contentRating: existingFeedback?.contentRating || 0,
      speakerRating: existingFeedback?.speakerRating || 0,
      relevanceRating: existingFeedback?.relevanceRating || 0,
      comment: existingFeedback?.comment || "",
      isAnonymous: existingFeedback?.isAnonymous || false,
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: SessionFeedbackFormData) => {
      await apiRequest("POST", `/api/portal/${eventId}/sessions/${session.id}/feedback`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal", eventId, "sessions", session.id, "feedback"] });
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

  const cardStyles: React.CSSProperties = {
    backgroundColor: theme?.cardBackground || undefined,
    borderRadius: themeRadius,
  };

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

  const buttonStyles: React.CSSProperties = {
    backgroundColor: theme?.buttonColor || undefined,
    color: theme?.buttonTextColor || undefined,
    borderRadius: themeRadius,
    borderColor: theme?.buttonBorderColor || theme?.buttonColor || undefined,
  };

  if (existingFeedback) {
    return (
      <Card style={cardStyles} data-testid={`card-session-feedback-submitted-${session.id}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 className="font-medium" style={headingStyles}>{session.title}</h4>
              <p className="text-sm" style={secondaryTextStyles}>
                Thank you for your feedback! You rated this session {existingFeedback.overallRating}/5 stars.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = (data: SessionFeedbackFormData) => {
    submitMutation.mutate(data);
  };

  return (
    <Card style={cardStyles} data-testid={`card-session-feedback-form-${session.id}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg" style={headingStyles}>{session.title}</CardTitle>
        {session.sessionDate && (
          <p className="text-sm" style={secondaryTextStyles}>
            {formatEventDate(session.sessionDate, 'full')} {session.startTime && `at ${session.startTime}`}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="overallRating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel style={labelStyles}>Overall Rating *</FormLabel>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="contentRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={labelStyles}>Content Quality</FormLabel>
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
                name="speakerRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={labelStyles}>Speaker</FormLabel>
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
                name="relevanceRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={labelStyles}>Relevance</FormLabel>
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
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel style={labelStyles}>Comments (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share your thoughts about this session..."
                      className="resize-none"
                      style={inputStyles}
                      rows={3}
                      {...field}
                      data-testid={`textarea-comment-${session.id}`}
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
                      data-testid={`checkbox-anonymous-${session.id}`}
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
              style={buttonStyles}
              data-testid={`button-submit-feedback-${session.id}`}
            >
              {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Feedback
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function SessionWithFeedbackLoader({
  eventId,
  session,
  theme,
}: {
  eventId: string;
  session: EventSession;
  theme?: SessionFeedbackSectionProps['theme'];
}) {
  const { data: existingFeedback, isLoading } = useQuery<SessionFeedback | null>({
    queryKey: ["/api/portal", eventId, "sessions", session.id, "feedback"],
  });

  if (isLoading) {
    return (
      <Card data-testid={`card-session-feedback-loading-${session.id}`}>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <SessionFeedbackForm
      eventId={eventId}
      session={session}
      existingFeedback={existingFeedback || null}
      theme={theme}
    />
  );
}

export function SessionFeedbackSection({
  eventId,
  sessionId,
  heading = "Session Feedback",
  isPreview,
  theme,
}: SessionFeedbackSectionProps) {
  const { data: savedSessions = [], isLoading: loadingSaved } = useQuery<SavedSession[]>({
    queryKey: ["/api/portal", eventId, "saved-sessions"],
    enabled: !sessionId && !isPreview,
  });

  const { data: allSessions = [], isLoading: loadingAll } = useQuery<EventSession[]>({
    queryKey: ["/api/portal", eventId, "sessions"],
    enabled: !sessionId && savedSessions.length === 0 && !isPreview,
  });

  const { data: singleSession, isLoading: loadingSingle } = useQuery<EventSession>({
    queryKey: ["/api/portal", eventId, "sessions", sessionId],
    enabled: !!sessionId && !isPreview,
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

  const isLoading = loadingSaved || loadingAll || loadingSingle;

  // Show preview placeholder in site builder
  if (isPreview) {
    return (
      <div data-testid="section-session-feedback-preview">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <Card style={cardStyles}>
          <CardHeader>
            <CardTitle className="text-lg" style={headingStyles}>Sample Session Title</CardTitle>
            <p className="text-sm" style={secondaryTextStyles}>Day 1 - 9:00 AM - 10:00 AM</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="font-medium text-sm" style={headingStyles}>Overall Rating</p>
              <StarRating value={4} onChange={() => {}} size="lg" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-sm" style={headingStyles}>Comments</p>
              <Textarea placeholder="Share your thoughts..." disabled className="resize-none" />
            </div>
            <Button disabled style={{
              backgroundColor: theme?.buttonColor || undefined,
              color: theme?.buttonTextColor || undefined,
              borderRadius: themeRadius,
              borderColor: theme?.buttonBorderColor || theme?.buttonColor || undefined,
            }}>
              Submit Feedback
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div data-testid="section-session-feedback-loading">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (sessionId && singleSession) {
    return (
      <div data-testid="section-session-feedback">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <SessionWithFeedbackLoader eventId={eventId} session={singleSession} theme={theme} />
      </div>
    );
  }

  const sessionsToShow = savedSessions.length > 0 
    ? savedSessions.map(s => s.session) 
    : allSessions;

  if (sessionsToShow.length === 0) {
    return (
      <div data-testid="section-session-feedback-empty">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <Card style={cardStyles}>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2" style={headingStyles}>No Sessions Available</p>
            <p style={secondaryTextStyles}>
              There are no sessions available for feedback at this time.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sessionsByDate = sessionsToShow.reduce((acc, session) => {
    const date = session.sessionDate || "Unknown";
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {} as Record<string, EventSession[]>);

  const sortedDates = Object.keys(sessionsByDate).sort();

  sortedDates.forEach(date => {
    sessionsByDate[date].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  });

  if (sortedDates.length === 1) {
    return (
      <div data-testid="section-session-feedback">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <div className="space-y-4">
          {sessionsByDate[sortedDates[0]].map(session => (
            <SessionWithFeedbackLoader key={session.id} eventId={eventId} session={session} theme={theme} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="section-session-feedback">
      {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
      <Tabs defaultValue={sortedDates[0]} className="w-full">
        <TabsList className="flex flex-wrap gap-2 h-auto p-1 mb-4" data-testid="tabs-feedback-days">
          {sortedDates.map(date => (
            <TabsTrigger key={date} value={date} className="px-4" data-testid={`tab-feedback-${date}`}>
              {formatEventDate(date, 'tabLabel')}
            </TabsTrigger>
          ))}
        </TabsList>
        {sortedDates.map(date => (
          <TabsContent key={date} value={date} className="space-y-4">
            {sessionsByDate[date].map(session => (
              <SessionWithFeedbackLoader key={session.id} eventId={eventId} session={session} theme={theme} />
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
