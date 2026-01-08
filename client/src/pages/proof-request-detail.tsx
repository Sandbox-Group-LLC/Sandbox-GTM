import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  FileImage,
  Calendar,
  Clock,
  Download,
  MessageSquare,
  Send,
  User,
  Building2,
  MapPin,
  Tag,
  History,
  Pencil,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
} from "lucide-react";
import type { ProofRequest, ProofAsset, ProofComment, ProofStatusHistory, Event, Designer, User as UserType } from "@shared/schema";

interface ProofRequestWithDetails extends ProofRequest {
  designer?: { firstName: string | null; lastName: string | null; email: string } | null;
  submittedByDesigner?: { firstName: string | null; lastName: string | null; email: string } | null;
  event?: { name: string } | null;
  createdByUser?: UserType | null;
  assignedReviewerUser?: UserType | null;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending_upload":
      return (
        <Badge variant="secondary" data-testid="badge-status">
          <Clock className="w-3 h-3 mr-1" />
          Pending Upload
        </Badge>
      );
    case "pending_review":
      return (
        <Badge className="bg-blue-600 dark:bg-blue-700" data-testid="badge-status">
          <FileImage className="w-3 h-3 mr-1" />
          Pending Review
        </Badge>
      );
    case "approved":
      return (
        <Badge className="bg-green-600 dark:bg-green-700" data-testid="badge-status">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    case "revision_requested":
      return (
        <Badge className="bg-orange-500 dark:bg-orange-600" data-testid="badge-status">
          <RotateCcw className="w-3 h-3 mr-1" />
          Revision Requested
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" data-testid="badge-status">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" data-testid="badge-status">
          {status}
        </Badge>
      );
  }
}

function PriorityBadge({ priority }: { priority: string }) {
  switch (priority) {
    case "urgent":
      return <Badge variant="destructive">Urgent</Badge>;
    case "high":
      return <Badge className="bg-orange-500 dark:bg-orange-600">High</Badge>;
    case "normal":
      return <Badge variant="secondary">Normal</Badge>;
    case "low":
      return <Badge variant="outline">Low</Badge>;
    default:
      return null;
  }
}

const STATUS_OPTIONS = [
  { value: "pending_upload", label: "Pending Upload" },
  { value: "pending_review", label: "Pending Review" },
  { value: "revision_requested", label: "Revision Requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const statusChangeSchema = z.object({
  status: z.string().min(1, "Status is required"),
  reason: z.string().optional(),
});

type StatusChangeFormValues = z.infer<typeof statusChangeSchema>;

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
  isInternal: z.boolean().default(false),
});

type CommentFormValues = z.infer<typeof commentSchema>;

function isImageFile(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith("image/");
}

export default function ProofRequestDetail() {
  const [, params] = useRoute("/proof-requests/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const proofRequestId = params?.id;

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const { data: proofRequest, isLoading: requestLoading } = useQuery<ProofRequestWithDetails>({
    queryKey: ["/api/proof-requests", proofRequestId],
    enabled: !!proofRequestId,
  });

  const { data: assets = [], isLoading: assetsLoading } = useQuery<ProofAsset[]>({
    queryKey: ["/api/proof-requests", proofRequestId, "assets"],
    enabled: !!proofRequestId,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery<ProofComment[]>({
    queryKey: ["/api/proof-requests", proofRequestId, "comments"],
    enabled: !!proofRequestId,
  });

  const { data: statusHistory = [], isLoading: historyLoading } = useQuery<ProofStatusHistory[]>({
    queryKey: ["/api/proof-requests", proofRequestId, "history"],
    enabled: !!proofRequestId,
  });

  const statusForm = useForm<StatusChangeFormValues>({
    resolver: zodResolver(statusChangeSchema),
    defaultValues: {
      status: proofRequest?.status || "",
      reason: "",
    },
  });

  const commentForm = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: "",
      isInternal: false,
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: StatusChangeFormValues) => {
      const res = await apiRequest("PATCH", `/api/proof-requests/${proofRequestId}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/proof-requests", proofRequestId] });
      queryClient.invalidateQueries({ queryKey: ["/api/proof-requests", proofRequestId, "history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/proof-requests"] });
      setStatusDialogOpen(false);
      statusForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (data: CommentFormValues) => {
      const res = await apiRequest("POST", `/api/proof-requests/${proofRequestId}/comments`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Comment added" });
      queryClient.invalidateQueries({ queryKey: ["/api/proof-requests", proofRequestId, "comments"] });
      commentForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (requestLoading) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!proofRequest) {
    return (
      <div className="flex-1 p-6">
        <Button variant="ghost" onClick={() => setLocation("/proof-management")} className="mb-4" data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Proof Management
        </Button>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p>Proof request not found.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedAssets = [...assets].sort((a, b) => b.version - a.version);
  const sortedHistory = [...statusHistory].sort((a, b) => 
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => setLocation("/proof-management")} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-xl" data-testid="text-title">{proofRequest.title}</CardTitle>
                  {proofRequest.event?.name && (
                    <CardDescription className="mt-1">{proofRequest.event.name}</CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={proofRequest.status || "pending_upload"} />
                  {proofRequest.priority && <PriorityBadge priority={proofRequest.priority} />}
                  <Button variant="outline" size="sm" onClick={() => {
                    statusForm.setValue("status", proofRequest.status || "pending_upload");
                    setStatusDialogOpen(true);
                  }} data-testid="button-edit-status">
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit Status
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {proofRequest.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground mt-1" data-testid="text-description">
                    {proofRequest.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {proofRequest.category && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {proofRequest.category}
                    </p>
                  </div>
                )}
                {proofRequest.printVendor && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Print Vendor</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {proofRequest.printVendor}
                    </p>
                  </div>
                )}
                {proofRequest.area && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Area</Label>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {proofRequest.area}
                    </p>
                  </div>
                )}
                {proofRequest.dueDate && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Due Date</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(proofRequest.dueDate), "MMM d, yyyy")}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Submitted By</Label>
                  <p className="font-medium flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {proofRequest.submittedByDesigner
                      ? `${proofRequest.submittedByDesigner.firstName || ""} ${proofRequest.submittedByDesigner.lastName || ""}`.trim() || proofRequest.submittedByDesigner.email
                      : proofRequest.designer
                        ? `${proofRequest.designer.firstName || ""} ${proofRequest.designer.lastName || ""}`.trim() || proofRequest.designer.email
                        : "-"}
                  </p>
                </div>
                {proofRequest.designer && proofRequest.submittedByDesignerId !== proofRequest.designerId && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Assigned Designer</Label>
                    <p className="font-medium">
                      {`${proofRequest.designer.firstName || ""} ${proofRequest.designer.lastName || ""}`.trim() || proofRequest.designer.email}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Asset Gallery
              </CardTitle>
              <CardDescription>
                All uploaded proof versions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assetsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : sortedAssets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No assets uploaded yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {sortedAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className={`p-4 rounded-md border ${
                        asset.isCurrentVersion ? "border-primary bg-primary/5" : ""
                      }`}
                      data-testid={`asset-version-${asset.version}`}
                    >
                      <div className="flex items-start gap-4 flex-wrap">
                        {isImageFile(asset.mimeType) && (
                          <div className="w-24 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={asset.fileUrl}
                              alt={asset.fileName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">Version {asset.version}</span>
                            {asset.isCurrentVersion && (
                              <Badge variant="outline" className="text-xs">Current</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{asset.fileName}</p>
                          {asset.createdAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Uploaded {format(new Date(asset.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          )}
                          {asset.notes && (
                            <p className="text-sm mt-2 text-muted-foreground italic">"{asset.notes}"</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {isImageFile(asset.mimeType) && (
                            <Button variant="ghost" size="icon" asChild data-testid={`button-preview-${asset.version}`}>
                              <a href={asset.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button variant="outline" size="sm" asChild data-testid={`button-download-${asset.version}`}>
                            <a href={asset.fileUrl} download={asset.fileName}>
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments
              </CardTitle>
              <CardDescription>
                All comments including internal notes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {commentsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No comments yet.</p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-md ${
                        comment.isInternal
                          ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                          : comment.authorType === "designer"
                          ? "bg-secondary/50"
                          : "bg-muted"
                      }`}
                      data-testid={`comment-${comment.id}`}
                    >
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{comment.authorName || "Unknown"}</span>
                        {comment.authorType === "internal" && (
                          <Badge variant="outline" className="text-xs">Internal Team</Badge>
                        )}
                        {comment.authorType === "designer" && (
                          <Badge variant="secondary" className="text-xs">Designer</Badge>
                        )}
                        {comment.isInternal && (
                          <Badge className="bg-amber-500 dark:bg-amber-600 text-xs">Internal Only</Badge>
                        )}
                        {comment.createdAt && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {format(new Date(comment.createdAt), "MMM d 'at' h:mm a")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <Form {...commentForm}>
                <form onSubmit={commentForm.handleSubmit((data) => addCommentMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={commentForm.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Add Comment</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Type your comment..." {...field} data-testid="input-comment" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={commentForm.control}
                    name="isInternal"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-internal"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Internal only</FormLabel>
                          <FormDescription>
                            Only visible to internal team members
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={addCommentMutation.isPending} data-testid="button-submit-comment">
                    {addCommentMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Comment
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Status History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : sortedHistory.length === 0 ? (
                <p className="text-muted-foreground text-center py-4 text-sm">No status changes yet.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
                  <div className="space-y-6">
                    {sortedHistory.map((entry, index) => (
                      <div key={entry.id} className="relative pl-6" data-testid={`history-${entry.id}`}>
                        <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-background border-2 border-primary" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={entry.newStatus} />
                          </div>
                          {entry.previousStatus && (
                            <p className="text-xs text-muted-foreground mt-1">
                              from {entry.previousStatus}
                            </p>
                          )}
                          {entry.reason && (
                            <p className="text-sm mt-2 text-muted-foreground italic">"{entry.reason}"</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            by {entry.changedByName || "Unknown"} •{" "}
                            {entry.createdAt && format(new Date(entry.createdAt), "MMM d 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>
              Change the status of this proof request.
            </DialogDescription>
          </DialogHeader>
          <Form {...statusForm}>
            <form onSubmit={statusForm.handleSubmit((data) => updateStatusMutation.mutate(data))} className="space-y-4">
              <FormField
                control={statusForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-new-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={statusForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add a reason for the status change..."
                        {...field}
                        data-testid="input-status-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setStatusDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateStatusMutation.isPending} data-testid="button-save-status">
                  {updateStatusMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Status"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
