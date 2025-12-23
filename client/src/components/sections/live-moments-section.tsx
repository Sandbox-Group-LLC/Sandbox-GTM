import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Zap,
  CheckCircle2,
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import type { Moment, EventPageTheme } from "@shared/schema";

const ATTENDEE_ID_KEY = "sandbox_attendee_id";
const RESPONDED_MOMENTS_KEY = "sandbox_responded_moments";

// Default theme values - must match Site Builder defaults
const DEFAULT_TEXT_COLOR = "#1f2937";
const DEFAULT_TEXT_SECONDARY_COLOR = "#6b7280";
const DEFAULT_CARD_BACKGROUND = "#f9fafb";
const DEFAULT_HEADING_FONT = "Inter";
const DEFAULT_BUTTON_COLOR = "#3b82f6";
const DEFAULT_BUTTON_TEXT_COLOR = "#ffffff";

function getOrCreateAttendeeId(): string {
  let attendeeId = localStorage.getItem(ATTENDEE_ID_KEY);
  if (!attendeeId) {
    attendeeId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(ATTENDEE_ID_KEY, attendeeId);
  }
  return attendeeId;
}

function getRespondedMoments(): Set<string> {
  const stored = localStorage.getItem(RESPONDED_MOMENTS_KEY);
  if (!stored) return new Set();
  try {
    return new Set(JSON.parse(stored));
  } catch {
    return new Set();
  }
}

function markMomentResponded(momentId: string): void {
  const responded = getRespondedMoments();
  responded.add(momentId);
  localStorage.setItem(RESPONDED_MOMENTS_KEY, JSON.stringify(Array.from(responded)));
}

interface ThemeProps {
  headingFont?: string;
  textColor?: string;
  textSecondaryColor?: string;
  cardBackground?: string;
  borderRadius?: string;
  cardBorderRadius?: string;
  showCardBorder?: boolean;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonBorderRadius?: string;
}

interface LiveMomentsSectionProps {
  eventId: string;
  heading?: string;
  emptyStateMessage?: string;
  isPreview?: boolean;
  theme?: ThemeProps;
}

interface MomentCardProps {
  moment: Moment;
  onRespond: (momentId: string, response: unknown) => void;
  isSubmitting: boolean;
  hasResponded: boolean;
  theme?: ThemeProps;
}

function ThankYouMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-4 text-center">
      <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
      <p className="text-sm text-muted-foreground">Thank you for your response!</p>
    </div>
  );
}

function PollMoment({ moment, onRespond, isSubmitting, hasResponded, theme }: MomentCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const options = (moment.optionsJson as { options?: string[] })?.options || [];
  const isMulti = moment.type === "poll_multi";
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());

  if (hasResponded) {
    return <ThankYouMessage />;
  }

  const handleSubmit = () => {
    if (isMulti) {
      if (selectedOptions.size > 0) {
        onRespond(moment.id, { selectedOptions: Array.from(selectedOptions) });
      }
    } else {
      if (selectedOption) {
        onRespond(moment.id, { selectedOption });
      }
    }
  };

  const toggleOption = (option: string) => {
    if (isMulti) {
      const newSet = new Set(selectedOptions);
      if (newSet.has(option)) {
        newSet.delete(option);
      } else {
        newSet.add(option);
      }
      setSelectedOptions(newSet);
    } else {
      setSelectedOption(option);
    }
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: theme?.buttonColor || DEFAULT_BUTTON_COLOR,
    color: theme?.buttonTextColor || DEFAULT_BUTTON_TEXT_COLOR,
    borderRadius: theme?.buttonBorderRadius || "8px",
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {options.map((option, idx) => {
          const isSelected = isMulti ? selectedOptions.has(option) : selectedOption === option;
          return (
            <Button
              key={idx}
              variant={isSelected ? "default" : "outline"}
              className="w-full justify-start text-left"
              onClick={() => toggleOption(option)}
              disabled={isSubmitting}
              data-testid={`option-${idx}`}
              style={isSelected ? buttonStyle : undefined}
            >
              {option}
            </Button>
          );
        })}
      </div>
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || (isMulti ? selectedOptions.size === 0 : !selectedOption)}
        className="w-full"
        data-testid="button-submit-poll"
        style={buttonStyle}
      >
        {isSubmitting ? "Submitting..." : "Submit Vote"}
      </Button>
    </div>
  );
}

function RatingMoment({ moment, onRespond, isSubmitting, hasResponded, theme }: MomentCardProps) {
  const [rating, setRating] = useState<number | null>(null);
  const config = moment.optionsJson as { minValue?: number; maxValue?: number } || {};
  const minValue = config.minValue ?? 1;
  const maxValue = config.maxValue ?? 5;

  if (hasResponded) {
    return <ThankYouMessage />;
  }

  const handleSubmit = () => {
    if (rating !== null) {
      onRespond(moment.id, { rating });
    }
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: theme?.buttonColor || DEFAULT_BUTTON_COLOR,
    color: theme?.buttonTextColor || DEFAULT_BUTTON_TEXT_COLOR,
    borderRadius: theme?.buttonBorderRadius || "8px",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {Array.from({ length: maxValue - minValue + 1 }, (_, i) => i + minValue).map((value) => (
          <Button
            key={value}
            variant={rating === value ? "default" : "outline"}
            size="icon"
            onClick={() => setRating(value)}
            disabled={isSubmitting}
            data-testid={`rating-${value}`}
            style={rating === value ? buttonStyle : undefined}
          >
            {value}
          </Button>
        ))}
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{minValue} - Low</span>
        <span>{maxValue} - High</span>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || rating === null}
        className="w-full"
        data-testid="button-submit-rating"
        style={buttonStyle}
      >
        {isSubmitting ? "Submitting..." : "Submit Rating"}
      </Button>
    </div>
  );
}

function OpenTextMoment({ moment, onRespond, isSubmitting, hasResponded, theme }: MomentCardProps) {
  const [text, setText] = useState("");

  if (hasResponded) {
    return <ThankYouMessage />;
  }

  const handleSubmit = () => {
    if (text.trim()) {
      onRespond(moment.id, { text: text.trim() });
    }
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: theme?.buttonColor || DEFAULT_BUTTON_COLOR,
    color: theme?.buttonTextColor || DEFAULT_BUTTON_TEXT_COLOR,
    borderRadius: theme?.buttonBorderRadius || "8px",
  };

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Share your thoughts..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-h-[100px]"
        disabled={isSubmitting}
        data-testid="input-open-text"
      />
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !text.trim()}
        className="w-full"
        data-testid="button-submit-text"
        style={buttonStyle}
      >
        {isSubmitting ? "Submitting..." : "Submit Response"}
      </Button>
    </div>
  );
}

function QAMoment({ moment, onRespond, isSubmitting, hasResponded, theme }: MomentCardProps) {
  const [question, setQuestion] = useState("");

  if (hasResponded) {
    return <ThankYouMessage />;
  }

  const handleSubmit = () => {
    if (question.trim()) {
      onRespond(moment.id, { question: question.trim() });
    }
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: theme?.buttonColor || DEFAULT_BUTTON_COLOR,
    color: theme?.buttonTextColor || DEFAULT_BUTTON_TEXT_COLOR,
    borderRadius: theme?.buttonBorderRadius || "8px",
  };

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Ask a question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="min-h-[100px]"
        disabled={isSubmitting}
        data-testid="input-qa"
      />
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !question.trim()}
        className="w-full"
        data-testid="button-submit-question"
        style={buttonStyle}
      >
        {isSubmitting ? "Submitting..." : "Submit Question"}
      </Button>
    </div>
  );
}

function PulseMoment({ moment, onRespond, isSubmitting, hasResponded, theme }: MomentCardProps) {
  if (hasResponded) {
    return <ThankYouMessage />;
  }

  const buttonStyle: React.CSSProperties = {
    backgroundColor: theme?.buttonColor || DEFAULT_BUTTON_COLOR,
    color: theme?.buttonTextColor || DEFAULT_BUTTON_TEXT_COLOR,
    borderRadius: theme?.buttonBorderRadius || "8px",
  };

  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <Button
        size="lg"
        onClick={() => onRespond(moment.id, { pulse: "positive" })}
        disabled={isSubmitting}
        className="flex-1 gap-2"
        data-testid="button-pulse-positive"
        style={buttonStyle}
      >
        <ThumbsUp className="w-5 h-5" />
        Yes
      </Button>
      <Button
        size="lg"
        onClick={() => onRespond(moment.id, { pulse: "negative" })}
        disabled={isSubmitting}
        className="flex-1 gap-2"
        data-testid="button-pulse-negative"
        style={buttonStyle}
      >
        <ThumbsDown className="w-5 h-5" />
        No
      </Button>
    </div>
  );
}

function CTAMoment({ moment, onRespond, isSubmitting, hasResponded, theme }: MomentCardProps) {
  const config = moment.optionsJson as { ctaUrl?: string; ctaLabel?: string } || {};
  const ctaUrl = config.ctaUrl || "#";
  const ctaLabel = config.ctaLabel || "Learn More";

  if (hasResponded) {
    return <ThankYouMessage />;
  }

  const handleClick = () => {
    onRespond(moment.id, { clicked: true });
    if (ctaUrl && ctaUrl !== "#") {
      window.open(ctaUrl, "_blank");
    }
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: theme?.buttonColor || DEFAULT_BUTTON_COLOR,
    color: theme?.buttonTextColor || DEFAULT_BUTTON_TEXT_COLOR,
    borderRadius: theme?.buttonBorderRadius || "8px",
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isSubmitting}
      className="w-full gap-2"
      data-testid="button-cta"
      style={buttonStyle}
    >
      <ExternalLink className="w-4 h-4" />
      {ctaLabel}
    </Button>
  );
}

function ResultsVisualization({ moment }: { moment: Moment & { results?: Record<string, number> } }) {
  const results = moment.results || {};
  const totalResponses = Object.values(results).reduce((a, b) => a + b, 0);

  if (moment.type === "poll_single" || moment.type === "poll_multi") {
    const options = (moment.optionsJson as { options?: string[] })?.options || [];
    return (
      <div className="space-y-3 mt-4">
        <h4 className="text-sm font-medium text-muted-foreground">Live Results</h4>
        {options.map((option, idx) => {
          const count = results[option] || 0;
          const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{option}</span>
                <span className="text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground">{totalResponses} total responses</p>
      </div>
    );
  }

  if (moment.type === "pulse") {
    const positive = results["positive"] || 0;
    const negative = results["negative"] || 0;
    const total = positive + negative;
    const positivePercent = total > 0 ? (positive / total) * 100 : 50;
    
    return (
      <div className="space-y-3 mt-4">
        <h4 className="text-sm font-medium text-muted-foreground">Live Results</h4>
        <div className="flex items-center gap-4">
          <div className="flex-1 text-center">
            <ThumbsUp className="w-6 h-6 mx-auto text-green-500" />
            <p className="text-lg font-semibold">{positive}</p>
          </div>
          <Progress value={positivePercent} className="flex-1" />
          <div className="flex-1 text-center">
            <ThumbsDown className="w-6 h-6 mx-auto text-red-500" />
            <p className="text-lg font-semibold">{negative}</p>
          </div>
        </div>
      </div>
    );
  }

  if (moment.type === "rating") {
    const config = moment.optionsJson as { minValue?: number; maxValue?: number } || {};
    const minValue = config.minValue ?? 1;
    const maxValue = config.maxValue ?? 5;
    let totalSum = 0;
    let totalCount = 0;
    for (let i = minValue; i <= maxValue; i++) {
      const count = results[String(i)] || 0;
      totalSum += i * count;
      totalCount += count;
    }
    const average = totalCount > 0 ? (totalSum / totalCount).toFixed(1) : "0";
    
    return (
      <div className="space-y-3 mt-4">
        <h4 className="text-sm font-medium text-muted-foreground">Live Results</h4>
        <div className="flex items-center justify-center gap-2">
          <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
          <span className="text-2xl font-semibold">{average}</span>
          <span className="text-muted-foreground">/ {maxValue}</span>
        </div>
        <p className="text-xs text-muted-foreground text-center">{totalCount} ratings</p>
      </div>
    );
  }

  return null;
}

function MomentCard({ moment, respondedMoments, onRespond, isSubmitting, theme }: {
  moment: Moment & { results?: Record<string, number> };
  respondedMoments: Set<string>;
  onRespond: (momentId: string, response: unknown) => void;
  isSubmitting: boolean;
  theme?: ThemeProps;
}) {
  const hasResponded = respondedMoments.has(moment.id);
  const showResults = moment.showResults && hasResponded;

  const getBorderRadiusStyle = (radiusValue?: string): string => {
    switch (radiusValue) {
      case "none": return "0";
      case "small": return "4px";
      case "large": return "16px";
      case "pill": return "9999px";
      case "medium":
      default: return "8px";
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme?.cardBackground || DEFAULT_CARD_BACKGROUND,
    borderRadius: getBorderRadiusStyle(theme?.cardBorderRadius),
    border: theme?.showCardBorder === false ? "none" : undefined,
    color: theme?.textColor || DEFAULT_TEXT_COLOR,
  };

  const getMomentIcon = () => {
    switch (moment.type) {
      case "poll_single":
      case "poll_multi":
        return <CheckCircle2 className="w-5 h-5" />;
      case "rating":
        return <Star className="w-5 h-5" />;
      case "open_text":
      case "qa":
        return <MessageSquare className="w-5 h-5" />;
      case "pulse":
        return <Zap className="w-5 h-5" />;
      case "cta":
        return <ExternalLink className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  const getMomentTypeLabel = () => {
    switch (moment.type) {
      case "poll_single":
        return "Poll";
      case "poll_multi":
        return "Multi-Choice Poll";
      case "rating":
        return "Rating";
      case "open_text":
        return "Open Response";
      case "qa":
        return "Q&A";
      case "pulse":
        return "Pulse Check";
      case "cta":
        return "Call to Action";
      default:
        return "Moment";
    }
  };

  const renderMomentContent = () => {
    const props: MomentCardProps = {
      moment,
      onRespond,
      isSubmitting,
      hasResponded,
      theme,
    };

    switch (moment.type) {
      case "poll_single":
      case "poll_multi":
        return <PollMoment {...props} />;
      case "rating":
        return <RatingMoment {...props} />;
      case "open_text":
        return <OpenTextMoment {...props} />;
      case "qa":
        return <QAMoment {...props} />;
      case "pulse":
        return <PulseMoment {...props} />;
      case "cta":
        return <CTAMoment {...props} />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full" style={cardStyle} data-testid={`moment-card-${moment.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {getMomentIcon()}
          <Badge variant="secondary">{getMomentTypeLabel()}</Badge>
        </div>
        <CardTitle className="text-lg" style={{ color: theme?.textColor || DEFAULT_TEXT_COLOR }}>{moment.title}</CardTitle>
        {moment.prompt && (
          <p className="text-sm" style={{ color: theme?.textSecondaryColor || DEFAULT_TEXT_SECONDARY_COLOR }}>{moment.prompt}</p>
        )}
      </CardHeader>
      <CardContent>
        {renderMomentContent()}
        {showResults && <ResultsVisualization moment={moment} />}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-3/4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function LiveMomentsSection({
  eventId,
  heading = "Live Moments",
  emptyStateMessage = "There are no live engagement moments right now. Check back soon!",
  isPreview = false,
  theme,
}: LiveMomentsSectionProps) {
  const { toast } = useToast();
  const [attendeeId] = useState(() => getOrCreateAttendeeId());
  const [respondedMoments, setRespondedMoments] = useState<Set<string>>(() => getRespondedMoments());
  const [submittingMomentId, setSubmittingMomentId] = useState<string | null>(null);

  const { data: moments = [], isLoading, error, refetch } = useQuery<(Moment & { results?: Record<string, number> })[]>({
    queryKey: ["/api/portal", eventId, "moments"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${eventId}/moments`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Event not found");
        }
        throw new Error("Failed to fetch moments");
      }
      return res.json();
    },
    enabled: !!eventId && !isPreview,
    refetchInterval: 3000,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ momentId, response }: { momentId: string; response: unknown }) => {
      return await apiRequest("POST", `/api/portal/${eventId}/moments/${momentId}/respond`, {
        attendeeId,
        response,
      });
    },
    onSuccess: (_, { momentId }) => {
      markMomentResponded(momentId);
      setRespondedMoments(getRespondedMoments());
      toast({
        title: "Response submitted",
        description: "Thank you for participating!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/portal", eventId, "moments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error submitting response",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setSubmittingMomentId(null);
    },
  });

  const handleRespond = useCallback((momentId: string, response: unknown) => {
    if (respondedMoments.has(momentId)) {
      toast({
        title: "Already responded",
        description: "You have already submitted a response for this moment.",
        variant: "destructive",
      });
      return;
    }
    setSubmittingMomentId(momentId);
    respondMutation.mutate({ momentId, response });
  }, [respondedMoments, respondMutation, toast]);

  const headingStyle: React.CSSProperties = {
    fontFamily: theme?.headingFont ? `"${theme.headingFont}", sans-serif` : `"${DEFAULT_HEADING_FONT}", sans-serif`,
    color: theme?.textColor || DEFAULT_TEXT_COLOR,
  };

  if (isPreview) {
    return (
      <div className="space-y-4">
        {heading && (
          <h2
            className="text-2xl font-bold"
            style={headingStyle}
          >
            {heading}
          </h2>
        )}
        <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg">
          <Zap className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            Live Moments will appear here during your event
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {heading && (
          <h2
            className="text-2xl font-bold"
            style={headingStyle}
          >
            {heading}
          </h2>
        )}
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error.message}</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {heading && (
        <h2
          className="text-2xl font-bold"
          style={headingStyle}
        >
          {heading}
        </h2>
      )}
      {isLoading ? (
        <LoadingSkeleton />
      ) : moments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Zap className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{emptyStateMessage}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {moments.map((moment) => (
            <MomentCard
              key={moment.id}
              moment={moment}
              respondedMoments={respondedMoments}
              onRespond={handleRespond}
              isSubmitting={submittingMomentId === moment.id}
              theme={theme}
            />
          ))}
        </div>
      )}
    </div>
  );
}
