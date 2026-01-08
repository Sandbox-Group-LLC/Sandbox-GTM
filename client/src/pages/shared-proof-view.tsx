import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, AlertCircle, CheckCircle2 } from "lucide-react";

interface SharedProofData {
  proofRequest: {
    id: string;
    title: string;
    description: string | null;
    dimensions: string | null;
    material: string | null;
    quantity: number | null;
    printVendor: string | null;
    area: string | null;
    category: string | null;
  };
  currentAsset: {
    id: string;
    fileName: string | null;
    fileUrl: string | null;
    mimeType: string | null;
    version: number;
  } | null;
  recipientName: string | null;
  organization: {
    name: string;
  } | null;
  brandKit: {
    primaryColor: string | null;
    secondaryColor: string | null;
    logoUrl: string | null;
  } | null;
}

function isImageFile(fileName: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}

export default function SharedProofView() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery<SharedProofData>({
    queryKey: ["/api/public/shared-proof", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/shared-proof/${token}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to load shared proof" }));
        throw new Error(errorData.message || "Failed to load shared proof");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    const errorMessage = error instanceof Error ? error.message : "This link is invalid or has expired";
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-error-title">
              Unable to Access Proof
            </h2>
            <p className="text-muted-foreground" data-testid="text-error-message">
              {errorMessage}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { proofRequest, currentAsset, recipientName, organization, brandKit } = data;
  const isImage = currentAsset?.fileName ? isImageFile(currentAsset.fileName) : false;

  const customStyles: React.CSSProperties = brandKit?.primaryColor ? {
    borderTopColor: brandKit.primaryColor,
    borderTopWidth: '4px',
  } : {};

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {(organization || brandKit?.logoUrl) && (
          <div className="flex items-center gap-4 mb-8">
            {brandKit?.logoUrl && (
              <img
                src={brandKit.logoUrl}
                alt={organization?.name || "Organization Logo"}
                className="h-12 w-auto object-contain"
                data-testid="img-org-logo"
              />
            )}
            {organization?.name && (
              <span className="text-lg font-medium text-muted-foreground" data-testid="text-org-name">
                {organization.name}
              </span>
            )}
          </div>
        )}

        {recipientName && (
          <div className="text-sm text-muted-foreground" data-testid="text-recipient-greeting">
            Shared with: <span className="font-medium">{recipientName}</span>
          </div>
        )}

        <Card style={customStyles} className="overflow-visible">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Approved
                  </Badge>
                  {proofRequest.category && (
                    <Badge variant="outline" className="text-xs" data-testid="badge-category">
                      {proofRequest.category}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-2xl" data-testid="text-proof-title">
                  {proofRequest.title}
                </CardTitle>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {currentAsset?.fileUrl && (
              <div className="rounded-lg bg-muted overflow-hidden">
                {isImage ? (
                  <img
                    src={currentAsset.fileUrl}
                    alt={currentAsset.fileName || proofRequest.title}
                    className="w-full max-h-[500px] object-contain"
                    data-testid="img-proof-asset"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground" data-testid="text-file-name">
                      {currentAsset.fileName}
                    </p>
                  </div>
                )}
              </div>
            )}

            {proofRequest.description && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-sm" data-testid="text-description">{proofRequest.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              {proofRequest.dimensions && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Dimensions</h4>
                  <p className="text-sm font-medium" data-testid="text-dimensions">{proofRequest.dimensions}</p>
                </div>
              )}
              {proofRequest.material && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Material</h4>
                  <p className="text-sm font-medium" data-testid="text-material">{proofRequest.material}</p>
                </div>
              )}
              {proofRequest.quantity && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Quantity</h4>
                  <p className="text-sm font-medium" data-testid="text-quantity">{proofRequest.quantity}</p>
                </div>
              )}
              {proofRequest.printVendor && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Vendor</h4>
                  <p className="text-sm font-medium" data-testid="text-vendor">{proofRequest.printVendor}</p>
                </div>
              )}
              {proofRequest.area && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Area</h4>
                  <p className="text-sm font-medium" data-testid="text-area">{proofRequest.area}</p>
                </div>
              )}
            </div>

            {currentAsset?.fileUrl && (
              <div className="flex justify-end pt-4 border-t">
                <Button asChild data-testid="button-download">
                  <a
                    href={currentAsset.fileUrl}
                    download={currentAsset.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Asset
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          This is a secure, time-limited view of an approved design proof.
        </p>
      </div>
    </div>
  );
}
