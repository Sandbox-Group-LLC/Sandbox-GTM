import { useState, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  Send,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import type { Moment } from "@shared/schema";

const ATTENDEE_ID_KEY = "sandbox_attendee_id";
const RESPONDED_MOMENTS_KEY = "sandbox_responded_moments";

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

interface MomentCardProps {
  moment: Moment;
  onRespond: (momentId: string, response: unknown) => void;
  isSubmitting: boolean;
  hasResponded: boolean;
}

function PollMoment({ moment, onRespond, isSubmitting, hasResponded }: MomentCardProps) {
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

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="space-y-2">
        {options.map((option, idx) => {
          const isSelected = isMulti ? selectedOptions.has(option) : selectedOption === option;
          return (
            <Button
              key={idx}
              variant={isSelected ? "default" : "outline"}
              className="w-full justify-start text-left min-h-11 text-sm sm:text-base"
              onClick={() => toggleOption(option)}
              disabled={isSubmitting}
              data-testid={`option-${idx}`}
            >
              {option}
            </Button>
          );
        })}
      </div>
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || (isMulti ? selectedOptions.size === 0 : !selectedOption)}
        className="w-full min-h-11 sm:min-h-10"
        data-testid="button-submit-poll"
      >
        {isSubmitting ? "Submitting..." : "Submit Vote"}
      </Button>
    </div>
  );
}

function RatingMoment({ moment, onRespond, isSubmitting, hasResponded }: MomentCardProps) {
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

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
        {Array.from({ length: maxValue - minValue + 1 }, (_, i) => i + minValue).map((value) => (
          <Button
            key={value}
            variant={rating === value ? "default" : "outline"}
            size="icon"
            className="w-9 h-9 sm:w-10 sm:h-10 text-sm"
            onClick={() => setRating(value)}
            disabled={isSubmitting}
            data-testid={`rating-${value}`}
          >
            {value}
          </Button>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground px-1">
        <span>{minValue} - Low</span>
        <span>{maxValue} - High</span>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || rating === null}
        className="w-full min-h-11 sm:min-h-10"
        data-testid="button-submit-rating"
      >
        {isSubmitting ? "Submitting..." : "Submit Rating"}
      </Button>
    </div>
  );
}

function OpenTextMoment({ moment, onRespond, isSubmitting, hasResponded }: MomentCardProps) {
  const [text, setText] = useState("");

  if (hasResponded) {
    return <ThankYouMessage />;
  }

  const handleSubmit = () => {
    if (text.trim()) {
      onRespond(moment.id, { text: text.trim() });
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <Textarea
        placeholder="Share your thoughts..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-h-[100px] text-base"
        disabled={isSubmitting}
        data-testid="input-open-text"
      />
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !text.trim()}
        className="w-full min-h-11 sm:min-h-10"
        data-testid="button-submit-text"
      >
        {isSubmitting ? "Submitting..." : "Submit Response"}
      </Button>
    </div>
  );
}

function QAMoment({ moment, onRespond, isSubmitting, hasResponded }: MomentCardProps) {
  const [question, setQuestion] = useState("");

  if (hasResponded) {
    return <ThankYouMessage />;
  }

  const handleSubmit = () => {
    if (question.trim()) {
      onRespond(moment.id, { question: question.trim() });
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <Input
        placeholder="Ask a question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        disabled={isSubmitting}
        className="min-h-11 text-base"
        data-testid="input-qa-question"
      />
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !question.trim()}
        className="w-full min-h-11 sm:min-h-10"
        data-testid="button-submit-question"
      >
        <Send className="w-4 h-4 mr-2" />
        {isSubmitting ? "Submitting..." : "Submit Question"}
      </Button>
    </div>
  );
}

function PulseMoment({ moment, onRespond, isSubmitting, hasResponded }: MomentCardProps) {
  if (hasResponded) {
    return <ThankYouMessage />;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
        <Button
          variant="outline"
          size="lg"
          className="flex-1 sm:max-w-[150px] min-h-12 sm:min-h-11"
          onClick={() => onRespond(moment.id, { pulse: "agree" })}
          disabled={isSubmitting}
          data-testid="button-pulse-agree"
        >
          <ThumbsUp className="w-5 h-5 mr-2" />
          Agree
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="flex-1 sm:max-w-[150px] min-h-12 sm:min-h-11"
          onClick={() => onRespond(moment.id, { pulse: "disagree" })}
          disabled={isSubmitting}
          data-testid="button-pulse-disagree"
        >
          <ThumbsDown className="w-5 h-5 mr-2" />
          Disagree
        </Button>
      </div>
    </div>
  );
}

function CTAMoment({ moment, onRespond, isSubmitting, hasResponded }: MomentCardProps) {
  const config = moment.optionsJson as { ctaLabel?: string; ctaUrl?: string } || {};
  const ctaLabel = config.ctaLabel || "Learn More";
  const ctaUrl = config.ctaUrl || "#";

  if (hasResponded) {
    return <ThankYouMessage />;
  }

  const handleClick = () => {
    onRespond(moment.id, { clicked: true, ctaUrl });
    if (ctaUrl && ctaUrl !== "#") {
      window.open(ctaUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleClick}
        disabled={isSubmitting}
        className="w-full"
        data-testid="button-cta"
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        {ctaLabel}
      </Button>
    </div>
  );
}

function ThankYouMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
      <p className="text-lg font-medium">Thanks for participating!</p>
      <p className="text-sm text-muted-foreground">Your response has been recorded.</p>
    </div>
  );
}

function ResultsVisualization({ moment }: { moment: Moment & { results?: Record<string, number> } }) {
  const results = moment.results || {};
  const total = Object.values(results).reduce((a, b) => a + b, 0);
  
  if (moment.type === "poll_single" || moment.type === "poll_multi") {
    const options = (moment.optionsJson as { options?: string[] })?.options || [];
    return (
      <div className="space-y-3 mt-4">
        <h4 className="text-sm font-medium text-muted-foreground">Live Results</h4>
        {options.map((option, idx) => {
          const count = results[option] || 0;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{option}</span>
                <span className="text-muted-foreground">{percentage}%</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground text-right">{total} responses</p>
      </div>
    );
  }

  if (moment.type === "pulse") {
    const agreeCount = results["agree"] || 0;
    const disagreeCount = results["disagree"] || 0;
    const pulseTotal = agreeCount + disagreeCount;
    const agreePercent = pulseTotal > 0 ? Math.round((agreeCount / pulseTotal) * 100) : 0;
    const disagreePercent = pulseTotal > 0 ? Math.round((disagreeCount / pulseTotal) * 100) : 0;
    
    return (
      <div className="space-y-3 mt-4">
        <h4 className="text-sm font-medium text-muted-foreground">Live Results</h4>
        <div className="flex gap-4">
          <div className="flex-1 text-center p-3 rounded-md bg-green-500/10">
            <ThumbsUp className="w-5 h-5 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-semibold">{agreePercent}%</p>
            <p className="text-xs text-muted-foreground">Agree</p>
          </div>
          <div className="flex-1 text-center p-3 rounded-md bg-red-500/10">
            <ThumbsDown className="w-5 h-5 mx-auto text-red-500 mb-1" />
            <p className="text-lg font-semibold">{disagreePercent}%</p>
            <p className="text-xs text-muted-foreground">Disagree</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">{pulseTotal} responses</p>
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

function MomentCard({ moment, respondedMoments, onRespond, isSubmitting }: {
  moment: Moment & { results?: Record<string, number> };
  respondedMoments: Set<string>;
  onRespond: (momentId: string, response: unknown) => void;
  isSubmitting: boolean;
}) {
  const hasResponded = respondedMoments.has(moment.id);
  const showResults = moment.showResults && hasResponded;

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
    <Card className="w-full" data-testid={`moment-card-${moment.id}`}>
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center gap-2 flex-wrap">
          {getMomentIcon()}
          <Badge variant="secondary" className="text-xs">{getMomentTypeLabel()}</Badge>
        </div>
        <CardTitle className="text-base sm:text-lg leading-tight">{moment.title}</CardTitle>
        {moment.prompt && (
          <p className="text-xs sm:text-sm text-muted-foreground">{moment.prompt}</p>
        )}
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Zap className="w-12 h-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">No Active Moments</h2>
      <p className="text-muted-foreground max-w-sm">
        There are no live engagement moments right now. Check back soon!
      </p>
    </div>
  );
}

export default function PortalLiveMoments() {
  const { eventId } = useParams<{ eventId: string }>();
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
    enabled: !!eventId,
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

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b safe-area-inset-top">
        <div className="container max-w-lg mx-auto px-3 sm:px-4 py-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary flex-shrink-0" />
          <h1 className="text-base sm:text-lg font-semibold truncate">Live Moments</h1>
        </div>
      </header>
      
      <main className="container max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-safe">
        {isLoading ? (
          <LoadingSkeleton />
        ) : moments.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {moments.map((moment) => (
              <MomentCard
                key={moment.id}
                moment={moment}
                respondedMoments={respondedMoments}
                onRespond={handleRespond}
                isSubmitting={submittingMomentId === moment.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
