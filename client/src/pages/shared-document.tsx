import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Calendar, FileIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import sandboxIcon from "@assets/Orange_bug_-_no_background_1768254114237.png";
import sandboxLogo from "@assets/Sandbox-GTM_1768253990902.png";

interface SharedDocumentData {
  document: {
    id: string;
    name: string;
    description: string | null;
    mimeType: string;
    fileSize: number;
    fileUrl: string;
    createdAt: string;
  };
  permission: string;
  expiresAt: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return <FileIcon className="h-12 w-12 text-blue-500" />;
  }
  if (mimeType === "application/pdf") {
    return <FileText className="h-12 w-12 text-red-500" />;
  }
  return <FileText className="h-12 w-12 text-muted-foreground" />;
}

export default function SharedDocument() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery<SharedDocumentData>({
    queryKey: ["/api/public/documents/shared", token],
    queryFn: async () => {
      const response = await fetch(`/api/public/documents/shared/${token}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to load document");
      }
      return response.json();
    },
    enabled: !!token,
  });

  const canDownload = data?.permission === "download" || data?.permission === "edit";

  const handleView = () => {
    if (data?.document.fileUrl) {
      window.open(data.document.fileUrl, "_blank");
    }
  };

  const handleDownload = () => {
    if (data?.document.fileUrl) {
      const link = document.createElement("a");
      link.href = data.document.fileUrl;
      link.download = data.document.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center gap-2">
          <img src={sandboxIcon} alt="sandbox" className="h-6 w-6" />
          <img src={sandboxLogo} alt="Sandbox GTM" className="h-5 dark:invert" />
          <span className="text-muted-foreground">Shared Document</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading document...</span>
          </div>
        )}

        {error && (
          <Card className="w-full max-w-md" data-testid="card-shared-document-error">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Document Not Found</CardTitle>
              <CardDescription>
                {(error as Error).message || "This shared link may have expired or been removed."}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {data && (
          <Card className="w-full max-w-lg" data-testid="card-shared-document">
            <CardHeader>
              <div className="flex items-start gap-4">
                {getFileIcon(data.document.mimeType)}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl truncate" data-testid="text-document-name">
                    {data.document.name}
                  </CardTitle>
                  {data.document.description && (
                    <CardDescription className="mt-1">
                      {data.document.description}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{formatFileSize(data.document.fileSize)}</Badge>
                <Badge variant="outline">{data.document.mimeType}</Badge>
                {data.expiresAt && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Expires {format(new Date(data.expiresAt), "MMM d, yyyy")}
                  </Badge>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleView} className="flex-1" data-testid="button-view-document">
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                {canDownload && (
                  <Button variant="outline" onClick={handleDownload} className="flex-1" data-testid="button-download-document">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center pt-2">
                Shared on {format(new Date(data.document.createdAt), "MMMM d, yyyy")}
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="border-t border-border py-6 px-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          Sandbox - Event Management Made Simple
        </div>
      </footer>
    </div>
  );
}
