import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BookmarkSessionButtonProps {
  eventId: string;
  sessionId: string;
  initialSaved?: boolean;
  size?: "icon" | "sm" | "default";
  variant?: "ghost" | "outline" | "default";
}

export function BookmarkSessionButton({
  eventId,
  sessionId,
  initialSaved = false,
  size = "icon",
  variant = "ghost",
}: BookmarkSessionButtonProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/portal/${eventId}/sessions/${sessionId}/save`);
    },
    onSuccess: () => {
      setIsSaved(true);
      queryClient.invalidateQueries({ queryKey: ["/api/portal", eventId, "saved-sessions"] });
      toast({
        title: "Session saved",
        description: "Added to your personal schedule",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save session",
        variant: "destructive",
      });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/portal/${eventId}/sessions/${sessionId}/save`);
    },
    onSuccess: () => {
      setIsSaved(false);
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

  const isPending = saveMutation.isPending || unsaveMutation.isPending;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPending) return;
    
    if (isSaved) {
      unsaveMutation.mutate();
    } else {
      saveMutation.mutate();
    }
  };

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleClick}
      disabled={isPending}
      className={`toggle-elevate ${isSaved ? "toggle-elevated" : ""}`}
      data-testid={`button-bookmark-session-${sessionId}`}
      aria-label={isSaved ? "Remove from schedule" : "Add to schedule"}
    >
      <Bookmark
        className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`}
      />
    </Button>
  );
}
