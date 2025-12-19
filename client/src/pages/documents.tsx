import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  FileText,
  Upload,
  FolderPlus,
  MoreVertical,
  Download,
  Share2,
  Eye,
  Trash2,
  Folder,
  ChevronRight,
  File,
  Image,
  FileVideo,
  FileAudio,
  FilePlus,
  Copy,
  Check,
  MessageSquare,
  History,
  Users,
  CheckCircle2,
  Clock,
  X,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";
import type { Document, DocumentFolder, DocumentShare, DocumentActivity, DocumentComment, DocumentApproval, Event } from "@shared/schema";

const folderFormSchema = z.object({
  name: z.string().min(1, "Folder name is required"),
  description: z.string().optional(),
  eventId: z.string().optional(),
});

const shareFormSchema = z.object({
  shareType: z.enum(["user", "role", "link"]),
  shareValue: z.string().min(1, "This field is required"),
  permission: z.enum(["view", "download", "edit"]),
  expiresAt: z.string().optional(),
});

const commentFormSchema = z.object({
  content: z.string().min(1, "Comment is required"),
  parentId: z.string().optional(),
});

const approvalFormSchema = z.object({
  approverType: z.enum(["user", "role"]),
  approverId: z.string().min(1, "Approver is required"),
  approverName: z.string().optional(),
});

type FolderFormData = z.infer<typeof folderFormSchema>;
type ShareFormData = z.infer<typeof shareFormSchema>;
type CommentFormData = z.infer<typeof commentFormSchema>;
type ApprovalFormData = z.infer<typeof approvalFormSchema>;

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.includes("pdf")) return FileText;
  return File;
}

const permissionLabels: Record<string, string> = {
  view: "View",
  download: "Download",
  edit: "Edit",
};

const shareTypeLabels: Record<string, string> = {
  user: "User",
  role: "Role",
  link: "Link",
};

const actionLabels: Record<string, string> = {
  upload: "Uploaded",
  view: "Viewed",
  download: "Downloaded",
  edit: "Edited",
  share: "Shared",
  unshare: "Unshared",
  delete: "Deleted",
};

export default function Documents() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<DocumentFolder[]>([]);
  
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteFolderDialogOpen, setIsDeleteFolderDialogOpen] = useState(false);
  
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<DocumentFolder | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents", { eventId: selectedEventId || undefined, folderId: currentFolderId || undefined }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedEventId) params.set("eventId", selectedEventId);
      if (currentFolderId) params.set("folderId", currentFolderId);
      const res = await fetch(`/api/documents?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
  });

  const { data: folders = [], isLoading: foldersLoading } = useQuery<DocumentFolder[]>({
    queryKey: ["/api/documents/folders", { eventId: selectedEventId || undefined }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedEventId) params.set("eventId", selectedEventId);
      const res = await fetch(`/api/documents/folders?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    },
  });

  const { data: documentActivity = [] } = useQuery<DocumentActivity[]>({
    queryKey: ["/api/documents", selectedDocument?.id, "activity"],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${selectedDocument?.id}/activity`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    },
    enabled: !!selectedDocument && isDetailsDialogOpen,
  });

  const { data: documentShares = [] } = useQuery<DocumentShare[]>({
    queryKey: ["/api/documents", selectedDocument?.id, "shares"],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${selectedDocument?.id}/shares`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch shares");
      return res.json();
    },
    enabled: !!selectedDocument && (isDetailsDialogOpen || isShareDialogOpen),
  });

  const { data: documentComments = [] } = useQuery<DocumentComment[]>({
    queryKey: ["/api/documents", selectedDocument?.id, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${selectedDocument?.id}/comments`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
    enabled: !!selectedDocument && isDetailsDialogOpen,
  });

  const { data: documentApprovals = [] } = useQuery<DocumentApproval[]>({
    queryKey: ["/api/documents", selectedDocument?.id, "approvals"],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${selectedDocument?.id}/approvals`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch approvals");
      return res.json();
    },
    enabled: !!selectedDocument && isDetailsDialogOpen,
  });

  const folderForm = useForm<FolderFormData>({
    resolver: zodResolver(folderFormSchema),
    defaultValues: { name: "", description: "", eventId: "" },
  });

  const shareForm = useForm<ShareFormData>({
    resolver: zodResolver(shareFormSchema),
    defaultValues: { shareType: "user", shareValue: "", permission: "view", expiresAt: "" },
  });

  const commentForm = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { content: "" },
  });

  const approvalForm = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalFormSchema),
    defaultValues: { approverType: "user", approverId: "", approverName: "" },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (data: FolderFormData) => {
      return await apiRequest("POST", "/api/documents/folders", {
        ...data,
        parentId: currentFolderId,
        eventId: data.eventId || selectedEventId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents/folders"] });
      toast({ title: "Folder created successfully" });
      setIsFolderDialogOpen(false);
      folderForm.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      return await apiRequest("DELETE", `/api/documents/folders/${folderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents/folders"] });
      toast({ title: "Folder deleted successfully" });
      setIsDeleteFolderDialogOpen(false);
      setSelectedFolder(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      fileName: string;
      mimeType: string;
      byteSize: number;
      uploadUrl: string;
    }) => {
      return await apiRequest("POST", "/api/documents", {
        ...data,
        eventId: selectedEventId || null,
        folderId: currentFolderId || null,
        accessLevel: "private",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document uploaded successfully" });
      setIsUploading(false);
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIsUploading(false);
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document deleted successfully" });
      setIsDeleteDialogOpen(false);
      setSelectedDocument(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createShareMutation = useMutation({
    mutationFn: async (data: ShareFormData) => {
      const shareValue = data.shareType === "link" 
        ? `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        : data.shareValue;
      return await apiRequest("POST", `/api/documents/${selectedDocument?.id}/shares`, {
        ...data,
        shareValue,
        expiresAt: data.expiresAt || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedDocument?.id, "shares"] });
      toast({ title: "Share created successfully" });
      shareForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteShareMutation = useMutation({
    mutationFn: async (shareId: string) => {
      return await apiRequest("DELETE", `/api/documents/${selectedDocument?.id}/shares/${shareId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedDocument?.id, "shares"] });
      toast({ title: "Share removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data: CommentFormData) => {
      return await apiRequest("POST", `/api/documents/${selectedDocument?.id}/comments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedDocument?.id, "comments"] });
      toast({ title: "Comment added" });
      commentForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resolveCommentMutation = useMutation({
    mutationFn: async ({ commentId, isResolved }: { commentId: string; isResolved: boolean }) => {
      return await apiRequest("PATCH", `/api/documents/${selectedDocument?.id}/comments/${commentId}`, { isResolved });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedDocument?.id, "comments"] });
      toast({ title: "Comment updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createApprovalMutation = useMutation({
    mutationFn: async (data: ApprovalFormData) => {
      return await apiRequest("POST", `/api/documents/${selectedDocument?.id}/approvals`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedDocument?.id, "approvals"] });
      toast({ title: "Approval request sent" });
      approvalForm.reset();
      setIsApprovalDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const respondApprovalMutation = useMutation({
    mutationFn: async ({ approvalId, status, comments }: { approvalId: string; status: string; comments?: string }) => {
      return await apiRequest("PATCH", `/api/documents/${selectedDocument?.id}/approvals/${approvalId}`, { status, comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedDocument?.id, "approvals"] });
      toast({ title: "Approval response recorded" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const response = await apiRequest("POST", "/api/documents/upload");
      const data = await response.json();

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error("Upload failed"));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", data.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      });

      await uploadDocumentMutation.mutateAsync({
        name: file.name,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        byteSize: file.size,
        uploadUrl: data.uploadUrl.split("?")[0],
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
      setIsUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download`, { credentials: "include" });
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "Download started" });
    } catch (error) {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const navigateToFolder = (folder: DocumentFolder | null) => {
    if (folder) {
      setCurrentFolderId(folder.id);
      if (!folderPath.find(f => f.id === folder.id)) {
        setFolderPath([...folderPath, folder]);
      }
    } else {
      setCurrentFolderId(null);
      setFolderPath([]);
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentFolderId(null);
      setFolderPath([]);
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      setCurrentFolderId(newPath[newPath.length - 1]?.id || null);
    }
  };

  const handleCopyLink = async (share: DocumentShare) => {
    const link = `${window.location.origin}/documents/shared/${share.shareValue}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({ title: "Link copied to clipboard" });
  };

  const currentFolders = folders.filter(f => 
    (f.parentId === currentFolderId || (!f.parentId && !currentFolderId)) &&
    (!selectedEventId || f.eventId === selectedEventId || !f.eventId)
  );

  const isLoading = documentsLoading || foldersLoading;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Documents"
        breadcrumbs={[{ label: "Content" }, { label: "Documents" }]}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Select value={selectedEventId || "all"} onValueChange={(val) => setSelectedEventId(val === "all" ? "" : val)}>
            <SelectTrigger className="w-[200px]" data-testid="select-event-filter">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsFolderDialogOpen(true)}
              data-testid="button-new-folder"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid="button-upload-document"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isUploading ? `Uploading ${uploadProgress}%` : "Upload Document"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              data-testid="input-file-upload"
            />
          </div>
        </div>
        {(currentFolderId || folderPath.length > 0) && (
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  className="cursor-pointer"
                  onClick={() => navigateToBreadcrumb(-1)}
                  data-testid="breadcrumb-root"
                >
                  Documents
                </BreadcrumbLink>
              </BreadcrumbItem>
              {folderPath.map((folder, index) => (
                <BreadcrumbItem key={folder.id}>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                  <BreadcrumbLink
                    className="cursor-pointer"
                    onClick={() => navigateToBreadcrumb(index)}
                    data-testid={`breadcrumb-folder-${folder.id}`}
                  >
                    {folder.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : currentFolders.length === 0 && documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Upload your first document or create a folder to organize your files."
            action={{
              label: "Upload Document",
              onClick: () => fileInputRef.current?.click(),
            }}
          />
        ) : (
          <div className="space-y-4">
            {currentFolders.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Folders</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {currentFolders.map((folder) => (
                    <Card
                      key={folder.id}
                      className="hover-elevate cursor-pointer"
                      onClick={() => navigateToFolder(folder)}
                      data-testid={`folder-card-${folder.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <Folder className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{folder.name}</p>
                              {folder.description && (
                                <p className="text-sm text-muted-foreground truncate">{folder.description}</p>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" data-testid={`button-folder-menu-${folder.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFolder(folder);
                                  setIsDeleteFolderDialogOpen(true);
                                }}
                                data-testid={`button-delete-folder-${folder.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {documents.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Files</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {documents.map((doc) => {
                    const FileIcon = getFileIcon(doc.mimeType);
                    return (
                      <Card key={doc.id} className="hover-elevate" data-testid={`document-card-${doc.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 min-w-0">
                              <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium truncate" title={doc.name}>{doc.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatFileSize(doc.byteSize)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.createdAt && format(new Date(doc.createdAt), "MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-document-menu-${doc.id}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleDownload(doc)}
                                  data-testid={`button-download-${doc.id}`}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedDocument(doc);
                                    setIsShareDialogOpen(true);
                                  }}
                                  data-testid={`button-share-${doc.id}`}
                                >
                                  <Share2 className="h-4 w-4 mr-2" />
                                  Share
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedDocument(doc);
                                    setIsDetailsDialogOpen(true);
                                  }}
                                  data-testid={`button-details-${doc.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setSelectedDocument(doc);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  data-testid={`button-delete-${doc.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a folder to organize your documents.
            </DialogDescription>
          </DialogHeader>
          <Form {...folderForm}>
            <form onSubmit={folderForm.handleSubmit((data) => createFolderMutation.mutate(data))} className="space-y-4">
              <FormField
                control={folderForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Folder Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter folder name" data-testid="input-folder-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={folderForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter description" data-testid="input-folder-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFolderDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createFolderMutation.isPending} data-testid="button-create-folder-submit">
                  {createFolderMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Folder
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDocument && (
                <>
                  {(() => {
                    const FileIcon = getFileIcon(selectedDocument.mimeType);
                    return <FileIcon className="h-5 w-5" />;
                  })()}
                  {selectedDocument.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              View document details, activity, shares, comments, and approvals.
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
                <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
                <TabsTrigger value="shares" data-testid="tab-shares">Shares</TabsTrigger>
                <TabsTrigger value="comments" data-testid="tab-comments">Comments</TabsTrigger>
                <TabsTrigger value="approvals" data-testid="tab-approvals">Approvals</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">File Name</p>
                    <p className="font-medium">{selectedDocument.fileName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Size</p>
                    <p className="font-medium">{formatFileSize(selectedDocument.byteSize)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{selectedDocument.mimeType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Access Level</p>
                    <Badge variant="outline">{selectedDocument.accessLevel}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {selectedDocument.createdAt && format(new Date(selectedDocument.createdAt), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Version</p>
                    <p className="font-medium">{selectedDocument.version}</p>
                  </div>
                </div>
                {selectedDocument.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p>{selectedDocument.description}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={() => handleDownload(selectedDocument)} data-testid="button-download-details">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" onClick={() => setIsShareDialogOpen(true)} data-testid="button-share-details">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-4">
                {documentActivity.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No activity recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {documentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                        <History className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{activity.actorEmail || "Unknown"}</span>{" "}
                            {actionLabels[activity.action] || activity.action}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.createdAt && format(new Date(activity.createdAt), "MMM d, yyyy h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="shares" className="mt-4 space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => setIsShareDialogOpen(true)} data-testid="button-add-share">
                    <Share2 className="h-4 w-4 mr-2" />
                    Add Share
                  </Button>
                </div>
                {documentShares.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No shares configured.</p>
                ) : (
                  <div className="space-y-3">
                    {documentShares.map((share) => (
                      <div key={share.id} className="flex items-center justify-between gap-3 p-3 rounded-md border">
                        <div className="flex items-center gap-3">
                          {share.shareType === "link" ? (
                            <LinkIcon className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Users className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {share.shareType === "link" ? "Public Link" : share.shareValue}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {shareTypeLabels[share.shareType]}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {permissionLabels[share.permission || "view"]}
                              </Badge>
                              {share.expiresAt && (
                                <span className="text-xs text-muted-foreground">
                                  Expires {format(new Date(share.expiresAt), "MMM d, yyyy")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {share.shareType === "link" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleCopyLink(share)}
                              data-testid={`button-copy-link-${share.id}`}
                            >
                              {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteShareMutation.mutate(share.id)}
                            data-testid={`button-remove-share-${share.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="comments" className="mt-4 space-y-4">
                <Form {...commentForm}>
                  <form onSubmit={commentForm.handleSubmit((data) => createCommentMutation.mutate(data))} className="space-y-2">
                    <FormField
                      control={commentForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea {...field} placeholder="Add a comment..." className="min-h-[80px]" data-testid="input-comment" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" disabled={createCommentMutation.isPending} data-testid="button-add-comment">
                        {createCommentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Add Comment
                      </Button>
                    </div>
                  </form>
                </Form>
                {documentComments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No comments yet.</p>
                ) : (
                  <div className="space-y-3">
                    {documentComments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`p-3 rounded-md border ${comment.isResolved ? "bg-muted/50 opacity-60" : ""}`}
                        data-testid={`comment-${comment.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {comment.authorName?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{comment.authorName}</p>
                                <span className="text-xs text-muted-foreground">
                                  {comment.createdAt && format(new Date(comment.createdAt), "MMM d, yyyy")}
                                </span>
                                {comment.isResolved && (
                                  <Badge variant="secondary" className="text-xs">Resolved</Badge>
                                )}
                              </div>
                              <p className="text-sm mt-1">{comment.content}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resolveCommentMutation.mutate({
                              commentId: comment.id,
                              isResolved: !comment.isResolved,
                            })}
                            data-testid={`button-resolve-comment-${comment.id}`}
                          >
                            {comment.isResolved ? (
                              <X className="h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="approvals" className="mt-4 space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => setIsApprovalDialogOpen(true)} data-testid="button-request-approval">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Request Approval
                  </Button>
                </div>
                {documentApprovals.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No approval requests.</p>
                ) : (
                  <div className="space-y-3">
                    {documentApprovals.map((approval) => (
                      <div key={approval.id} className="p-3 rounded-md border" data-testid={`approval-${approval.id}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {approval.approverName?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{approval.approverName || approval.approverId}</p>
                              <p className="text-xs text-muted-foreground">
                                {approval.createdAt && format(new Date(approval.createdAt), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {approval.status === "pending" ? (
                              <>
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Pending
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => respondApprovalMutation.mutate({
                                    approvalId: approval.id,
                                    status: "approved",
                                  })}
                                  data-testid={`button-approve-${approval.id}`}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => respondApprovalMutation.mutate({
                                    approvalId: approval.id,
                                    status: "rejected",
                                  })}
                                  data-testid={`button-reject-${approval.id}`}
                                >
                                  Reject
                                </Button>
                              </>
                            ) : approval.status === "approved" ? (
                              <Badge className="bg-green-600">Approved</Badge>
                            ) : (
                              <Badge variant="destructive">Rejected</Badge>
                            )}
                          </div>
                        </div>
                        {approval.comments && (
                          <p className="text-sm text-muted-foreground mt-2 ml-11">{approval.comments}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
            <DialogDescription>
              Share this document with others via email, role, or create a public link.
            </DialogDescription>
          </DialogHeader>
          <Form {...shareForm}>
            <form onSubmit={shareForm.handleSubmit((data) => createShareMutation.mutate(data))} className="space-y-4">
              <FormField
                control={shareForm.control}
                name="shareType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Share Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-share-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User (by email)</SelectItem>
                        <SelectItem value="role">Role</SelectItem>
                        <SelectItem value="link">Public Link</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {shareForm.watch("shareType") !== "link" && (
                <FormField
                  control={shareForm.control}
                  name="shareValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {shareForm.watch("shareType") === "user" ? "Email Address" : "Role Name"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={shareForm.watch("shareType") === "user" ? "user@example.com" : "admin"}
                          data-testid="input-share-value"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={shareForm.control}
                name="permission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permission</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-permission">
                          <SelectValue placeholder="Select permission" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="view">View only</SelectItem>
                        <SelectItem value="download">Download</SelectItem>
                        <SelectItem value="edit">Edit</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={shareForm.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-expiration" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsShareDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createShareMutation.isPending} data-testid="button-create-share">
                  {createShareMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Share
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Approval</DialogTitle>
            <DialogDescription>
              Request approval for this document from a user or role.
            </DialogDescription>
          </DialogHeader>
          <Form {...approvalForm}>
            <form onSubmit={approvalForm.handleSubmit((data) => createApprovalMutation.mutate(data))} className="space-y-4">
              <FormField
                control={approvalForm.control}
                name="approverType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Approver Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-approver-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="role">Role</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={approvalForm.control}
                name="approverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {approvalForm.watch("approverType") === "user" ? "User Email" : "Role"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={approvalForm.watch("approverType") === "user" ? "approver@example.com" : "manager"}
                        data-testid="input-approver-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={approvalForm.control}
                name="approverName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Doe" data-testid="input-approver-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createApprovalMutation.isPending} data-testid="button-submit-approval">
                  {createApprovalMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Request Approval
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDocument?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedDocument && deleteDocumentMutation.mutate(selectedDocument.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteFolderDialogOpen} onOpenChange={setIsDeleteFolderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedFolder?.name}"? This will also delete all documents and subfolders inside.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedFolder && deleteFolderMutation.mutate(selectedFolder.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-folder"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
