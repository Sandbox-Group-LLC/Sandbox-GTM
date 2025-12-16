import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { titleCase } from "@/lib/utils";
import { 
  FileText, 
  ClipboardList,
  Eye,
  Star,
  User,
  Building2,
  Mail,
  Users,
  Tag,
  MessageSquare,
  Loader2,
} from "lucide-react";
import type { CfpSubmission, CfpReviewer, CfpReview, Event, CfpTopic } from "@shared/schema";

interface ReviewerAssignment {
  review: CfpReview;
  submission: CfpSubmission;
  reviewer: CfpReviewer;
  event?: Event;
  topic?: CfpTopic;
  otherReviews?: Array<{
    score: number | null;
    recommendation: string | null;
    comments: string | null;
    submittedAt: string | null;
  }>;
}

const reviewFormSchema = z.object({
  score: z.coerce.number().min(1, "Score is required").max(5, "Score must be between 1-5"),
  recommendation: z.string().min(1, "Recommendation is required"),
  comments: z.string().optional(),
  feedbackToAuthor: z.string().optional(),
});

type ReviewFormData = z.infer<typeof reviewFormSchema>;

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  assigned: "secondary",
  in_progress: "outline",
  completed: "default",
};

export default function ReviewerPortal() {
  const { toast } = useToast();
  const [selectedAssignment, setSelectedAssignment] = useState<ReviewerAssignment | null>(null);

  const { data: assignments = [], isLoading, error } = useQuery<ReviewerAssignment[]>({
    queryKey: ["/api/reviewer/assignments"],
  });

  const { data: submissionDetails, isLoading: detailsLoading } = useQuery<ReviewerAssignment>({
    queryKey: ["/api/reviewer/assignments", selectedAssignment?.submission.id],
    enabled: !!selectedAssignment?.submission.id,
  });

  const reviewForm = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      score: undefined,
      recommendation: "",
      comments: "",
      feedbackToAuthor: "",
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      if (!selectedAssignment) throw new Error("No assignment selected");
      return apiRequest("PATCH", `/api/reviewer/reviews/${selectedAssignment.review.id}`, {
        ...data,
        status: "completed",
      });
    },
    onSuccess: () => {
      toast({
        title: "Review submitted",
        description: "Your review has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reviewer/assignments"] });
      setSelectedAssignment(null);
      reviewForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review",
        variant: "destructive",
      });
    },
  });

  const saveProgressMutation = useMutation({
    mutationFn: async (data: Partial<ReviewFormData>) => {
      if (!selectedAssignment) throw new Error("No assignment selected");
      return apiRequest("PATCH", `/api/reviewer/reviews/${selectedAssignment.review.id}`, {
        ...data,
        status: "in_progress",
      });
    },
    onSuccess: () => {
      toast({
        title: "Progress saved",
        description: "Your review progress has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reviewer/assignments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save progress",
        variant: "destructive",
      });
    },
  });

  const handleOpenAssignment = (assignment: ReviewerAssignment) => {
    setSelectedAssignment(assignment);
    reviewForm.reset({
      score: assignment.review.score || undefined,
      recommendation: assignment.review.recommendation || "",
      comments: assignment.review.comments || "",
      feedbackToAuthor: assignment.review.feedbackToAuthor || "",
    });
  };

  const onSubmitReview = (data: ReviewFormData) => {
    submitReviewMutation.mutate(data);
  };

  const onSaveProgress = () => {
    const data = reviewForm.getValues();
    saveProgressMutation.mutate(data);
  };

  const getReviewerName = () => {
    if (assignments.length > 0 && assignments[0].reviewer) {
      return assignments[0].reviewer.name;
    }
    return "Reviewer";
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (error || assignments.length === 0) {
    return (
      <div className="p-6">
        <PageHeader title="Reviewer Portal" />
        <EmptyState
          icon={ClipboardList}
          title="No Review Assignments"
          description="You don't have any submissions assigned for review. When an event organizer assigns you as a reviewer for a Call for Papers submission, it will appear here."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Reviewer Portal" />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Welcome, {getReviewerName()}
          </CardTitle>
          <CardDescription>
            Review and provide feedback on your assigned submissions. 
            You have {assignments.filter(a => a.review.status !== "completed").length} pending reviews.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Submissions</CardTitle>
          <CardDescription>
            Click on a submission to view details and submit your review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Submission Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow 
                  key={`${assignment.review.id}`}
                  data-testid={`row-assignment-${assignment.review.id}`}
                >
                  <TableCell className="font-medium" data-testid={`text-event-${assignment.review.id}`}>
                    {assignment.event?.name || "Unknown Event"}
                  </TableCell>
                  <TableCell data-testid={`text-title-${assignment.review.id}`}>
                    {assignment.submission.title}
                  </TableCell>
                  <TableCell data-testid={`text-type-${assignment.review.id}`}>
                    <Badge variant="outline">
                      {titleCase(assignment.submission.submissionType)}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-topic-${assignment.review.id}`}>
                    {assignment.topic?.name || "-"}
                  </TableCell>
                  <TableCell data-testid={`status-review-${assignment.review.id}`}>
                    <Badge variant={statusColors[assignment.review.status || "assigned"]}>
                      {titleCase(assignment.review.status || "assigned")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenAssignment(assignment)}
                      data-testid={`button-view-${assignment.review.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {assignment.review.status === "completed" ? "View" : "Review"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selectedAssignment} onOpenChange={(open) => !open && setSelectedAssignment(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Submission Review
            </SheetTitle>
            <SheetDescription>
              Review the submission and provide your feedback.
            </SheetDescription>
          </SheetHeader>

          {selectedAssignment && (
            <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
              <div className="space-y-6 py-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold" data-testid="text-submission-title">
                    {selectedAssignment.submission.title}
                  </h3>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {titleCase(selectedAssignment.submission.submissionType)}
                    </Badge>
                    {selectedAssignment.topic && (
                      <Badge variant="secondary">
                        {selectedAssignment.topic.name}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium" data-testid="text-author-name">
                          {selectedAssignment.submission.authorName}
                        </p>
                        {selectedAssignment.submission.authorAffiliation && (
                          <p className="text-sm text-muted-foreground">
                            {selectedAssignment.submission.authorAffiliation}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm" data-testid="text-author-email">
                        {selectedAssignment.submission.authorEmail}
                      </p>
                    </div>

                    {selectedAssignment.submission.coAuthors && (
                      <div className="flex items-start gap-2">
                        <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Co-Authors</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedAssignment.submission.coAuthors}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedAssignment.submission.keywords && (
                      <div className="flex items-start gap-2">
                        <Tag className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Keywords</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedAssignment.submission.keywords}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Abstract</h4>
                  <div 
                    className="text-sm text-muted-foreground whitespace-pre-wrap p-4 bg-muted/50 rounded-md"
                    data-testid="text-abstract"
                  >
                    {selectedAssignment.submission.abstract}
                  </div>
                </div>

                {submissionDetails?.otherReviews && submissionDetails.otherReviews.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Other Reviews ({submissionDetails.otherReviews.length})
                      </h4>
                      <div className="space-y-3">
                        {submissionDetails.otherReviews.map((review, index) => (
                          <Card key={index} className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Reviewer {index + 1}</span>
                                {review.score && (
                                  <Badge variant="outline">
                                    <Star className="h-3 w-3 mr-1" />
                                    {review.score}/5
                                  </Badge>
                                )}
                                {review.recommendation && (
                                  <Badge 
                                    variant={
                                      review.recommendation === "accept" ? "default" :
                                      review.recommendation === "reject" ? "destructive" : "secondary"
                                    }
                                  >
                                    {titleCase(review.recommendation)}
                                  </Badge>
                                )}
                              </div>
                              {review.comments && (
                                <p className="text-sm text-muted-foreground">
                                  {review.comments}
                                </p>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <Form {...reviewForm}>
                  <form onSubmit={reviewForm.handleSubmit(onSubmitReview)} className="space-y-4">
                    <h4 className="font-medium">Your Review</h4>

                    <FormField
                      control={reviewForm.control}
                      name="score"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Score (1-5)</FormLabel>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <Button
                                key={value}
                                type="button"
                                variant={field.value === value ? "default" : "outline"}
                                size="icon"
                                onClick={() => field.onChange(value)}
                                data-testid={`button-score-${value}`}
                              >
                                <Star className={`h-4 w-4 ${field.value >= value ? "fill-current" : ""}`} />
                              </Button>
                            ))}
                          </div>
                          <FormDescription>
                            Rate the submission from 1 (poor) to 5 (excellent)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={reviewForm.control}
                      name="recommendation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recommendation</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-recommendation">
                                <SelectValue placeholder="Select your recommendation" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="accept" data-testid="select-item-accept">Accept</SelectItem>
                              <SelectItem value="revise" data-testid="select-item-revise">Revise and Resubmit</SelectItem>
                              <SelectItem value="reject" data-testid="select-item-reject">Reject</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={reviewForm.control}
                      name="comments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Committee Notes (Private)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Internal notes for the program committee..."
                              className="min-h-[100px]"
                              data-testid="textarea-comments"
                            />
                          </FormControl>
                          <FormDescription>
                            These notes are only visible to the program committee.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={reviewForm.control}
                      name="feedbackToAuthor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Feedback to Author</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Constructive feedback to share with the author..."
                              className="min-h-[100px]"
                              data-testid="textarea-feedback"
                            />
                          </FormControl>
                          <FormDescription>
                            This feedback will be shared with the author.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onSaveProgress}
                        disabled={saveProgressMutation.isPending}
                        data-testid="button-save-progress"
                      >
                        {saveProgressMutation.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Save Progress
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitReviewMutation.isPending || selectedAssignment.review.status === "completed"}
                        data-testid="button-submit-review"
                      >
                        {submitReviewMutation.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {selectedAssignment.review.status === "completed" ? "Review Submitted" : "Submit Review"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
