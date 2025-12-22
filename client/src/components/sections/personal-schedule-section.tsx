import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, Bookmark, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatEventDate, titleCase } from "@/lib/utils";
import type { EventSession } from "@shared/schema";

interface SavedSession {
  id: string;
  attendeeId: string;
  sessionId: string;
  createdAt: string;
  session: EventSession;
}

interface PersonalScheduleSectionProps {
  eventId: string;
  heading?: string;
  emptyStateMessage?: string;
  isPreview?: boolean;
  theme?: {
    headingFont?: string;
    textColor?: string;
    textSecondaryColor?: string;
    cardBackground?: string;
    borderRadius?: string;
  };
}

export function PersonalScheduleSection({
  eventId,
  heading = "My Schedule",
  emptyStateMessage = "You haven't saved any sessions yet. Browse the agenda and bookmark sessions you want to attend.",
  isPreview,
  theme,
}: PersonalScheduleSectionProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: savedSessions = [], isLoading, error } = useQuery<SavedSession[]>({
    queryKey: ["/api/portal", eventId, "saved-sessions"],
    enabled: !isPreview,
  });

  const removeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await apiRequest("DELETE", `/api/portal/${eventId}/sessions/${sessionId}/save`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal", eventId, "saved-sessions"] });
      toast({
        title: "Session removed",
        description: "Removed from your personal schedule",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove session",
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

  // Show preview placeholder in site builder
  if (isPreview) {
    return (
      <div data-testid="section-personal-schedule-preview">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <Card style={cardStyles}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h4 className="font-medium" style={headingStyles}>Sample Session: AI in Practice</h4>
                <div className="flex items-center gap-2 text-sm" style={secondaryTextStyles}>
                  <Clock className="h-4 w-4" />
                  <span>9:00 AM - 10:00 AM</span>
                  <MapPin className="h-4 w-4 ml-2" />
                  <span>Main Hall</span>
                </div>
              </div>
              <Button size="icon" variant="ghost" disabled>
                <Bookmark className="h-4 w-4 fill-current" />
              </Button>
            </div>
            <div className="flex items-start justify-between pt-2 border-t">
              <div className="space-y-1">
                <h4 className="font-medium" style={headingStyles}>Sample Session: Workshop</h4>
                <div className="flex items-center gap-2 text-sm" style={secondaryTextStyles}>
                  <Clock className="h-4 w-4" />
                  <span>11:00 AM - 12:00 PM</span>
                  <MapPin className="h-4 w-4 ml-2" />
                  <span>Room 101</span>
                </div>
              </div>
              <Button size="icon" variant="ghost" disabled>
                <Bookmark className="h-4 w-4 fill-current" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div data-testid="section-personal-schedule-loading">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="section-personal-schedule-error">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <Card style={cardStyles}>
          <CardContent className="p-6 text-center">
            <p style={secondaryTextStyles}>Unable to load your saved sessions. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (savedSessions.length === 0) {
    return (
      <div data-testid="section-personal-schedule-empty">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <Card style={cardStyles}>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2" style={headingStyles}>No Sessions Saved</p>
            <p style={secondaryTextStyles}>{emptyStateMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group sessions by date
  const sessionsByDate = savedSessions.reduce((acc, item) => {
    const date = item.session.sessionDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {} as Record<string, SavedSession[]>);

  // Sort dates
  const sortedDates = Object.keys(sessionsByDate).sort();

  // Sort sessions within each date by start time
  sortedDates.forEach(date => {
    sessionsByDate[date].sort((a, b) => {
      return (a.session.startTime || "").localeCompare(b.session.startTime || "");
    });
  });

  const renderSessionCard = (item: SavedSession) => (
    <Card key={item.id} style={cardStyles} data-testid={`card-saved-session-${item.sessionId}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium" style={headingStyles} data-testid={`text-session-title-${item.sessionId}`}>
              {item.session.title}
            </h4>
            {item.session.description && (
              <p className="text-sm mt-1 line-clamp-2" style={secondaryTextStyles}>
                {item.session.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {item.session.track && (
                <Badge variant="outline" data-testid={`badge-track-${item.sessionId}`}>
                  {titleCase(item.session.track)}
                </Badge>
              )}
              {item.session.sessionType && (
                <Badge variant="secondary" data-testid={`badge-type-${item.sessionId}`}>
                  {titleCase(item.session.sessionType)}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="text-right text-sm whitespace-nowrap" style={secondaryTextStyles}>
              <div className="flex items-center gap-1 justify-end">
                <Clock className="h-3 w-3" />
                <span data-testid={`text-session-time-${item.sessionId}`}>
                  {item.session.startTime} - {item.session.endTime}
                </span>
              </div>
              {item.session.room && (
                <div className="flex items-center gap-1 justify-end mt-1">
                  <MapPin className="h-3 w-3" />
                  <span data-testid={`text-session-room-${item.sessionId}`}>{item.session.room}</span>
                </div>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeMutation.mutate(item.sessionId)}
              disabled={removeMutation.isPending}
              data-testid={`button-remove-session-${item.sessionId}`}
              aria-label="Remove from schedule"
            >
              <Bookmark className="h-4 w-4 fill-current" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // If only one date, render without tabs
  if (sortedDates.length === 1) {
    return (
      <div data-testid="section-personal-schedule">
        {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
        <div className="mb-4">
          <h4 className="text-lg font-medium flex items-center gap-2" style={headingStyles}>
            <Calendar className="h-5 w-5" />
            {formatEventDate(sortedDates[0], 'long')}
          </h4>
        </div>
        <div className="space-y-3">
          {sessionsByDate[sortedDates[0]].map(renderSessionCard)}
        </div>
      </div>
    );
  }

  // Multiple dates - use tabs
  return (
    <div data-testid="section-personal-schedule">
      {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
      <Tabs defaultValue={sortedDates[0]} className="w-full">
        <TabsList className="flex flex-wrap gap-2 h-auto p-1 mb-4" data-testid="tabs-schedule-days">
          {sortedDates.map(date => (
            <TabsTrigger key={date} value={date} className="px-4" data-testid={`tab-schedule-${date}`}>
              {formatEventDate(date, 'tabLabel')}
            </TabsTrigger>
          ))}
        </TabsList>
        {sortedDates.map(date => (
          <TabsContent key={date} value={date} className="space-y-3">
            {sessionsByDate[date].map(renderSessionCard)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
