import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ArrowLeft,
  Loader2,
  FileImage,
  Calendar,
  Clock,
  Upload,
  Download,
  ExternalLink,
  MessageSquare,
  Send,
  User,
  Building2,
  AlertCircle,
  FileText,
  History,
} from "lucide-react";
import type { ProofRequest, ProofAsset, ProofComment, Event } from "@shared/schema";

interface ProofRequestWithDetails extends ProofRequest {
  event?: Event | null;
}

function getSessionToken(): string | null {
  return localStorage.getItem("designerSessionToken");
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
        <Badge className="bg-blue-600" data-testid="badge-status">
          <FileImage className="w-3 h-3 mr-1" />
          Pending Review
        </Badge>
      );
    case "approved":
      return (
        <Badge className="bg-green-600" data-testid="badge-status">
          Approved
        </Badge>
      );
    case "revision_requested":
      return (
        <Badge className="bg-orange-500" data-testid="badge-status">
          Revision Requested
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" data-testid="badge-status">
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
      return <Badge className="bg-orange-500">High</Badge>;
    case "normal":
      return <Badge variant="secondary">Normal</Badge>;
    case "low":
      return <Badge variant="outline">Low</Badge>;
    default:
      return null;
  }
}

const uploadFormSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().min(1, "File URL is required"),
  notes: z.string().optional(),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

const commentFormSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
});

type CommentFormValues = z.infer<typeof commentFormSchema>;

function UploadForm({
  proofRequestId,
  token,
  nextVersion,
}: {
  proofRequestId: string;
  token: string;
  nextVersion: number;
}) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      fileName: "",
      fileUrl: "",
      notes: "",
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadFormValues) => {
      const response = await fetch(`/api/designer/proof-requests/${proofRequestId}/assets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          version: nextVersion,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to upload proof");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Proof Uploaded", description: "Your proof has been submitted for review." });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/designer/proof-requests", proofRequestId] });
      queryClient.invalidateQueries({ queryKey: ["/api/designer/proof-requests", proofRequestId, "assets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload proof. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      form.setValue("fileName", file.name);
      form.setValue("fileUrl", `placeholder://${file.name}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("fileName", file.name);
      form.setValue("fileUrl", `placeholder://${file.name}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Proof - Version {nextVersion}
        </CardTitle>
        <CardDescription>
          Upload your proof file for review. Supported formats: PDF, PNG, JPG, AI, PSD
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => uploadMutation.mutate(data))} className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-md p-8 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileImage className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your file here, or click to browse
              </p>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.png,.jpg,.jpeg,.ai,.psd"
                data-testid="input-file-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("file-upload")?.click()}
                data-testid="button-browse-files"
              >
                Browse Files
              </Button>
              {form.watch("fileName") && (
                <p className="mt-4 text-sm font-medium" data-testid="text-selected-file">
                  Selected: {form.watch("fileName")}
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about this version..."
                      {...field}
                      data-testid="input-upload-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={uploadMutation.isPending || !form.watch("fileName")}
              className="w-full"
              data-testid="button-submit-proof"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit Proof for Review
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function VersionHistory({ assets }: { assets: ProofAsset[] }) {
  if (!assets || assets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No versions uploaded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedAssets = [...assets].sort((a, b) => b.version - a.version);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Version History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedAssets.map((asset) => (
          <div
            key={asset.id}
            className={`p-4 rounded-md border ${
              asset.isCurrentVersion ? "border-primary bg-primary/5" : ""
            }`}
            data-testid={`version-item-${asset.version}`}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Version {asset.version}</span>
                  {asset.isCurrentVersion && (
                    <Badge variant="outline" className="text-xs">Current</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {asset.fileName}
                </p>
                {asset.createdAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Uploaded {format(new Date(asset.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
                {asset.notes && (
                  <p className="text-sm mt-2 text-muted-foreground italic">
                    "{asset.notes}"
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  data-testid={`button-view-${asset.version}`}
                >
                  <a href={asset.fileUrl} target="_blank" rel="noopener noreferrer" title="View in new tab">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  data-testid={`button-download-${asset.version}`}
                >
                  <a href={asset.fileUrl} download={asset.fileName}>
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CommentsSection({
  proofRequestId,
  token,
}: {
  proofRequestId: string;
  token: string;
}) {
  const { toast } = useToast();

  const { data: comments, isLoading } = useQuery<ProofComment[]>({
    queryKey: ["/api/designer/proof-requests", proofRequestId, "comments"],
    queryFn: async () => {
      const response = await fetch(
        `/api/designer/proof-requests/${proofRequestId}/comments`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("Failed to load comments");
      return response.json();
    },
  });

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { content: "" },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (data: CommentFormValues) => {
      const response = await fetch(
        `/api/designer/proof-requests/${proofRequestId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to add comment");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Comment added" });
      form.reset();
      queryClient.invalidateQueries({
        queryKey: ["/api/designer/proof-requests", proofRequestId, "comments"],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments & Feedback
        </CardTitle>
        <CardDescription>
          View feedback from the internal team and add your own comments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-4 rounded-md ${
                  comment.authorType === "designer"
                    ? "bg-secondary/50"
                    : "bg-muted"
                }`}
                data-testid={`comment-${comment.id}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">
                    {comment.authorName || "Team Member"}
                  </span>
                  {comment.authorType === "internal" && (
                    <Badge variant="outline" className="text-xs">
                      Internal Team
                    </Badge>
                  )}
                  {comment.createdAt && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No comments yet.
          </p>
        )}

        <Separator />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => addCommentMutation.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Add a Comment</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Type your comment..."
                      {...field}
                      data-testid="input-comment"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={addCommentMutation.isPending}
              data-testid="button-submit-comment"
            >
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
  );
}

export default function DesignerProofDetail() {
  const [, params] = useRoute("/designer/proof/:id");
  const [, setLocation] = useLocation();
  const proofRequestId = params?.id;

  const token = getSessionToken();

  useEffect(() => {
    if (!token) {
      setLocation("/designer");
    }
  }, [token, setLocation]);

  const { data: proofRequest, isLoading: requestLoading, error: requestError } = useQuery<ProofRequestWithDetails>({
    queryKey: ["/api/designer/proof-requests", proofRequestId],
    queryFn: async () => {
      const response = await fetch(`/api/designer/proof-requests/${proofRequestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("designerSessionToken");
          setLocation("/designer");
          throw new Error("Session expired");
        }
        throw new Error("Failed to load proof request");
      }
      return response.json();
    },
    enabled: !!proofRequestId && !!token,
  });

  const { data: assets, isLoading: assetsLoading } = useQuery<ProofAsset[]>({
    queryKey: ["/api/designer/proof-requests", proofRequestId, "assets"],
    queryFn: async () => {
      const response = await fetch(
        `/api/designer/proof-requests/${proofRequestId}/assets`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("Failed to load assets");
      return response.json();
    },
    enabled: !!proofRequestId && !!token,
  });

  if (!token) {
    return null;
  }

  if (requestLoading || assetsLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (requestError || !proofRequest) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => setLocation("/designer")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Portal
          </Button>
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>Failed to load proof request. It may not exist or you may not have access.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Designers can always upload new versions to their submissions
  const canUpload = true;

  const nextVersion = assets && assets.length > 0
    ? Math.max(...assets.map((a) => a.version)) + 1
    : 1;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/designer")}
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-xl" data-testid="text-title">
                  {proofRequest.title}
                </CardTitle>
                {proofRequest.event?.name && (
                  <CardDescription className="mt-1">
                    {proofRequest.event.name}
                  </CardDescription>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={proofRequest.status || "pending_upload"} />
                {proofRequest.priority && (
                  <PriorityBadge priority={proofRequest.priority} />
                )}
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

            <div className="flex flex-wrap gap-6 text-sm">
              {proofRequest.category && (
                <div>
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <p className="font-medium" data-testid="text-category">{proofRequest.category}</p>
                </div>
              )}
              {proofRequest.printVendor && (
                <div>
                  <Label className="text-xs text-muted-foreground">Print Vendor</Label>
                  <p className="font-medium" data-testid="text-vendor">{proofRequest.printVendor}</p>
                </div>
              )}
              {proofRequest.area && (
                <div>
                  <Label className="text-xs text-muted-foreground">Area</Label>
                  <p className="font-medium" data-testid="text-area">{proofRequest.area}</p>
                </div>
              )}
              {proofRequest.dimensions && (
                <div>
                  <Label className="text-xs text-muted-foreground">Dimensions</Label>
                  <p className="font-medium" data-testid="text-dimensions">{proofRequest.dimensions}</p>
                </div>
              )}
              {proofRequest.printSide && (
                <div>
                  <Label className="text-xs text-muted-foreground">Print Side</Label>
                  <p className="font-medium" data-testid="text-print-side">
                    {proofRequest.printSide === "single" ? "Single-sided" : "Double-sided"}
                  </p>
                </div>
              )}
              {proofRequest.material && (
                <div>
                  <Label className="text-xs text-muted-foreground">Material</Label>
                  <p className="font-medium" data-testid="text-material">{proofRequest.material}</p>
                </div>
              )}
              {proofRequest.quantity && (
                <div>
                  <Label className="text-xs text-muted-foreground">Quantity</Label>
                  <p className="font-medium" data-testid="text-quantity">{proofRequest.quantity}</p>
                </div>
              )}
              {proofRequest.dueDate && (
                <div>
                  <Label className="text-xs text-muted-foreground">Due Date</Label>
                  <p className="font-medium flex items-center gap-1" data-testid="text-due-date">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(proofRequest.dueDate), "MMMM d, yyyy")}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {canUpload && (
          <UploadForm
            proofRequestId={proofRequestId!}
            token={token}
            nextVersion={nextVersion}
          />
        )}

        <VersionHistory assets={assets || []} />

        <CommentsSection proofRequestId={proofRequestId!} token={token} />
      </div>
    </div>
  );
}
