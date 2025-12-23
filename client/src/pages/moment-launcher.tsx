import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Zap,
  Play,
  Lock,
  StopCircle,
  Eye,
  EyeOff,
  Users,
  MessageSquare,
  Star,
  CheckSquare,
  Send,
  Radio,
} from "lucide-react";
import type { Event, Moment } from "@shared/schema";

const STATUS_GROUPS = [
  { key: "live", label: "Live", color: "bg-green-500" },
  { key: "draft", label: "Draft", color: "bg-muted-foreground" },
  { key: "locked", label: "Locked", color: "bg-amber-500" },
  { key: "ended", label: "Ended", color: "bg-destructive" },
] as const;

const MOMENT_TYPE_ICONS: Record<string, typeof CheckSquare> = {
  poll_single: CheckSquare,
  poll_multi: CheckSquare,
  rating: Star,
  open_text: MessageSquare,
  qa: MessageSquare,
  pulse: Zap,
  cta: Send,
};

const MOMENT_TYPE_LABELS: Record<string, string> = {
  poll_single: "Single Poll",
  poll_multi: "Multi Poll",
  rating: "Rating",
  open_text: "Open Text",
  qa: "Q&A",
  pulse: "Pulse",
  cta: "CTA",
};

export default function MomentLauncher() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [confirmingGoLive, setConfirmingGoLive] = useState<Moment | null>(null);

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: moments = [], isLoading: momentsLoading } = useQuery<Moment[]>({
    queryKey: ["/api/events", selectedEventId, "moments"],
    enabled: !!selectedEventId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      const activeEvent = events.find(e => e.status === "published" || e.status === "draft");
      if (activeEvent) {
        setSelectedEventId(activeEvent.id);
      }
    }
  }, [events, selectedEventId]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { status?: string; showResults?: boolean } }) => {
      return await apiRequest("PATCH", `/api/moments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "moments"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error updating moment", description: error.message, variant: "destructive" });
    },
  });

  const handleGoLive = (moment: Moment) => {
    setConfirmingGoLive(moment);
  };

  const confirmGoLive = () => {
    if (confirmingGoLive) {
      updateMutation.mutate(
        { id: confirmingGoLive.id, data: { status: "live" } },
        {
          onSuccess: () => {
            toast({ title: "Moment is now LIVE", description: confirmingGoLive.title });
            setConfirmingGoLive(null);
          },
        }
      );
    }
  };

  const handleLock = (moment: Moment) => {
    updateMutation.mutate(
      { id: moment.id, data: { status: "locked" } },
      {
        onSuccess: () => {
          toast({ title: "Moment locked", description: "Responses are frozen." });
        },
      }
    );
  };

  const handleEnd = (moment: Moment) => {
    updateMutation.mutate(
      { id: moment.id, data: { status: "ended" } },
      {
        onSuccess: () => {
          toast({ title: "Moment ended", description: moment.title });
        },
      }
    );
  };

  const handleToggleResults = (moment: Moment, show: boolean) => {
    updateMutation.mutate(
      { id: moment.id, data: { showResults: show } },
      {
        onSuccess: () => {
          toast({ 
            title: show ? "Results visible" : "Results hidden",
            description: show ? "Audience can see results" : "Results hidden from audience"
          });
        },
      }
    );
  };

  const groupedMoments = STATUS_GROUPS.map(group => ({
    ...group,
    moments: moments.filter(m => m.status === group.key),
  }));

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Moment Launcher"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <Label className="text-sm font-medium mb-2 block">Select Event</Label>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full max-w-md" data-testid="select-event">
              <SelectValue placeholder="Choose an event..." />
            </SelectTrigger>
            <SelectContent>
              {eventsLoading ? (
                <div className="p-2"><Skeleton className="h-6 w-full" /></div>
              ) : (
                events.map(event => (
                  <SelectItem key={event.id} value={event.id} data-testid={`select-event-${event.id}`}>
                    {event.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {!selectedEventId ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Select an event to manage moments
          </div>
        ) : momentsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : moments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
            <Zap className="w-12 h-12 opacity-50" />
            <p>No moments created for this event</p>
            <p className="text-sm">Create moments in the Engagement Moments page</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {groupedMoments.map(group => (
              <Card key={group.key} data-testid={`group-${group.key}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${group.color}`} />
                    <CardTitle className="text-lg">{group.label}</CardTitle>
                    <Badge variant="secondary" className="ml-auto">
                      {group.moments.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.moments.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No {group.label.toLowerCase()} moments
                    </p>
                  ) : (
                    group.moments.map(moment => (
                      <MomentCard
                        key={moment.id}
                        moment={moment}
                        onGoLive={handleGoLive}
                        onLock={handleLock}
                        onEnd={handleEnd}
                        onToggleResults={handleToggleResults}
                        isUpdating={updateMutation.isPending}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmingGoLive} onOpenChange={() => setConfirmingGoLive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Go Live?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make "{confirmingGoLive?.title}" visible to all attendees and start collecting responses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-go-live">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmGoLive}
              data-testid="button-confirm-go-live"
            >
              Go Live
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface MomentCardProps {
  moment: Moment;
  onGoLive: (moment: Moment) => void;
  onLock: (moment: Moment) => void;
  onEnd: (moment: Moment) => void;
  onToggleResults: (moment: Moment, show: boolean) => void;
  isUpdating: boolean;
}

function MomentCard({ moment, onGoLive, onLock, onEnd, onToggleResults, isUpdating }: MomentCardProps) {
  const Icon = MOMENT_TYPE_ICONS[moment.type] || Zap;
  const responseCount = (moment as any).responseCount ?? 0;

  return (
    <div 
      className="border rounded-md p-4 space-y-3"
      data-testid={`moment-card-${moment.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-muted">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate" data-testid={`text-moment-title-${moment.id}`}>
            {moment.title}
          </h4>
          <p className="text-xs text-muted-foreground">
            {MOMENT_TYPE_LABELS[moment.type] || moment.type}
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span data-testid={`text-response-count-${moment.id}`}>{responseCount}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Switch
            id={`show-results-${moment.id}`}
            checked={moment.showResults ?? false}
            onCheckedChange={(checked) => onToggleResults(moment, checked)}
            disabled={isUpdating}
            data-testid={`switch-show-results-${moment.id}`}
          />
          <Label 
            htmlFor={`show-results-${moment.id}`} 
            className="text-sm flex items-center gap-1 cursor-pointer"
          >
            {moment.showResults ? (
              <>
                <Eye className="w-3 h-3" />
                Results Visible
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3" />
                Results Hidden
              </>
            )}
          </Label>
        </div>

        <div className="flex items-center gap-2">
          {moment.status === "draft" && (
            <Button
              size="lg"
              onClick={() => onGoLive(moment)}
              disabled={isUpdating}
              data-testid={`button-go-live-${moment.id}`}
            >
              <Play className="w-4 h-4 mr-2" />
              Go Live
            </Button>
          )}
          {moment.status === "live" && (
            <Button
              size="lg"
              variant="secondary"
              onClick={() => onLock(moment)}
              disabled={isUpdating}
              data-testid={`button-lock-${moment.id}`}
            >
              <Lock className="w-4 h-4 mr-2" />
              Lock
            </Button>
          )}
          {moment.status === "locked" && (
            <Button
              size="lg"
              variant="destructive"
              onClick={() => onEnd(moment)}
              disabled={isUpdating}
              data-testid={`button-end-${moment.id}`}
            >
              <StopCircle className="w-4 h-4 mr-2" />
              End
            </Button>
          )}
          {moment.status === "ended" && (
            <Badge variant="outline" className="text-muted-foreground">
              Completed
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
