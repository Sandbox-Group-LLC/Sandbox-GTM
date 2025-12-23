import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ObjectUploaderProps {
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

export function ObjectUploader({
  onComplete,
  accept = "image/*",
  buttonText = "Upload Image",
  buttonVariant = "default",
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      // Get presigned upload URL
      const response = await apiRequest("POST", "/api/content/assets/upload");
      const data = await response.json();

      // Upload file directly to object storage
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

      // Create asset record and make the file publicly accessible
      const assetResponse = await apiRequest("POST", "/api/content/assets", {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        byteSize: file.size,
        uploadUrl: data.uploadUrl,
      });
      const assetData = await assetResponse.json();

      // Call onComplete with file info and the public URL
      onComplete({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        byteSize: file.size,
        uploadUrl: assetData.publicUrl || assetData.objectPath,
      });

      // Reset file input
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
        data-testid="input-file-upload"
      />
      <Button
        type="button"
        variant={buttonVariant}
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        data-testid="button-upload-image"
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
