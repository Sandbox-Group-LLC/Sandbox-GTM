import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";

interface PortalObjectUploaderProps {
  token: string;
  onComplete: (result: {
    fileName: string;
    mimeType: string;
    byteSize: number;
    uploadUrl: string;
  }) => void;
  accept?: string;
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost";
}

export function PortalObjectUploader({
  token,
  onComplete,
  accept = "image/*",
  buttonText = "Upload Image",
  buttonVariant = "default",
}: PortalObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sponsor-portal/assets/upload?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }
      
      const data = await response.json();

      const uploadResponse = await fetch(data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      const assetResponse = await fetch(`/api/sponsor-portal/assets?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          byteSize: file.size,
          uploadUrl: data.uploadUrl,
        }),
      });
      
      if (!assetResponse.ok) {
        throw new Error("Failed to create asset record");
      }
      
      const assetData = await assetResponse.json();

      onComplete({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        byteSize: file.size,
        uploadUrl: assetData.publicUrl || assetData.objectPath,
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="inline-block">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-portal-file-upload"
      />
      <Button
        type="button"
        variant={buttonVariant}
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        data-testid="button-portal-upload-image"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Upload className="h-4 w-4 mr-2" />
        )}
        {isUploading ? "Uploading..." : buttonText}
      </Button>
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}
