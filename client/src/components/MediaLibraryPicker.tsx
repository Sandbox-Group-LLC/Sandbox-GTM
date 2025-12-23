import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, Search, Check, FolderOpen } from "lucide-react";
import type { ContentAsset } from "@shared/schema";

interface MediaLibraryPickerProps {
  onSelect: (asset: ContentAsset) => void;
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "secondary";
  multiple?: boolean;
  onSelectMultiple?: (assets: ContentAsset[]) => void;
}

export function MediaLibraryPicker({
  onSelect,
  buttonText = "Browse Media Library",
  buttonVariant = "outline",
  multiple = false,
  onSelectMultiple,
}: MediaLibraryPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<ContentAsset[]>([]);

  const { data: assets = [], isLoading } = useQuery<ContentAsset[]>({
    queryKey: ["/api/content/assets"],
    enabled: open,
  });

  const imageAssets = assets.filter(
    (asset) => asset.mimeType.startsWith("image/")
  );

  const filteredAssets = imageAssets.filter((asset) =>
    asset.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (asset: ContentAsset) => {
    if (multiple) {
      const isSelected = selectedAssets.some((a) => a.id === asset.id);
      if (isSelected) {
        setSelectedAssets(selectedAssets.filter((a) => a.id !== asset.id));
      } else {
        setSelectedAssets([...selectedAssets, asset]);
      }
    } else {
      onSelect(asset);
      setOpen(false);
    }
  };

  const handleConfirmMultiple = () => {
    if (onSelectMultiple) {
      onSelectMultiple(selectedAssets);
    }
    setSelectedAssets([]);
    setOpen(false);
  };

  const isSelected = (asset: ContentAsset) =>
    selectedAssets.some((a) => a.id === asset.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} data-testid="button-browse-media">
          <FolderOpen className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
          <DialogDescription>
            {multiple
              ? "Select images to add to the gallery"
              : "Select an image from your media library"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-media"
            />
          </div>

          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="grid grid-cols-4 gap-4 p-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-md" />
                ))}
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mb-4" />
                <p className="text-sm">
                  {searchTerm
                    ? "No images match your search"
                    : "No images in media library"}
                </p>
                <p className="text-xs mt-1">
                  Upload images in the Content section
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4 p-1">
                {filteredAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => handleSelect(asset)}
                    className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all hover-elevate ${
                      isSelected(asset)
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                    data-testid={`button-select-asset-${asset.id}`}
                  >
                    <img
                      src={asset.publicUrl}
                      alt={asset.fileName}
                      className="w-full h-full object-cover"
                    />
                    {isSelected(asset) && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-xs text-white truncate">
                        {asset.fileName}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {multiple && selectedAssets.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                {selectedAssets.length} image{selectedAssets.length !== 1 ? "s" : ""} selected
              </p>
              <Button onClick={handleConfirmMultiple} data-testid="button-confirm-selection">
                Add Selected Images
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
