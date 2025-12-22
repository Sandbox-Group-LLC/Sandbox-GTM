import { useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles, Clock, MapPin, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookmarkSessionButton } from "@/components/bookmark-session-button";
import { formatEventDate, titleCase } from "@/lib/utils";
import type { EventSession } from "@shared/schema";

interface RecommendedSession extends EventSession {
  score: number;
  matchReasons: string[];
}

interface RecommendationsSectionProps {
  eventId: string;
  heading?: string;
  maxRecommendations?: number;
  emptyStateMessage?: string;
  theme?: {
    headingFont?: string;
    textColor?: string;
    textSecondaryColor?: string;
    cardBackground?: string;
    borderRadius?: string;
  };
}

export function RecommendationsSection({
  eventId,
  heading = "Recommended For You",
  maxRecommendations = 6,
  emptyStateMessage = "Set your interests to get personalized session recommendations.",
  theme,
}: RecommendationsSectionProps) {
  const { data: recommendations = [], isLoading, error } = useQuery<RecommendedSession[]>({
    queryKey: ["/api/portal", eventId, "recommendations"],
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

  if (isLoading) {
    return (
      <div data-testid="section-recommendations-loading">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="section-recommendations-error">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <Card style={cardStyles}>
          <CardContent className="p-6 text-center">
            <p style={secondaryTextStyles}>Unable to load recommendations. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sessionsToShow = recommendations.slice(0, maxRecommendations);

  if (sessionsToShow.length === 0) {
    return (
      <div data-testid="section-recommendations-empty">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <Card style={cardStyles}>
          <CardContent className="p-8 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2" style={headingStyles}>No Recommendations Yet</p>
            <p style={secondaryTextStyles}>{emptyStateMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div data-testid="section-recommendations">
      {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sessionsToShow.map((session) => (
          <Card key={session.id} style={cardStyles} data-testid={`card-recommendation-${session.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium mb-1" style={headingStyles} data-testid={`text-recommendation-title-${session.id}`}>
                    {session.title}
                  </h4>
                  {session.description && (
                    <p className="text-sm line-clamp-2 mb-2" style={secondaryTextStyles}>
                      {session.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {session.track && (
                      <Badge variant="outline" data-testid={`badge-recommendation-track-${session.id}`}>
                        {titleCase(session.track)}
                      </Badge>
                    )}
                    {session.sessionType && (
                      <Badge variant="secondary" data-testid={`badge-recommendation-type-${session.id}`}>
                        {titleCase(session.sessionType)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs" style={secondaryTextStyles}>
                    {session.sessionDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span data-testid={`text-recommendation-date-${session.id}`}>
                          {formatEventDate(session.sessionDate, 'short')}
                        </span>
                      </div>
                    )}
                    {session.startTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span data-testid={`text-recommendation-time-${session.id}`}>
                          {session.startTime} - {session.endTime}
                        </span>
                      </div>
                    )}
                    {session.room && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span data-testid={`text-recommendation-room-${session.id}`}>{session.room}</span>
                      </div>
                    )}
                  </div>
                  {session.matchReasons && session.matchReasons.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs" style={secondaryTextStyles}>
                      <Sparkles className="h-3 w-3" />
                      <span data-testid={`text-recommendation-reason-${session.id}`}>
                        {session.matchReasons.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <BookmarkSessionButton
                    eventId={eventId}
                    sessionId={session.id}
                    size="icon"
                    variant="ghost"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
