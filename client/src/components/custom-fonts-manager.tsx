import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Type, Plus, Trash2, Loader2, Upload, FileType } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface CustomFontVariant {
  id: string;
  customFontId: string;
  fileUrl: string;
  format: string;
  weight: number;
  style: string;
  createdAt: string | null;
}

interface CustomFont {
  id: string;
  organizationId: string;
  name: string;
  displayName: string;
  createdAt: string | null;
  updatedAt: string | null;
  variants: CustomFontVariant[];
}

const FONT_WEIGHTS = [
  { value: 100, label: "Thin (100)" },
  { value: 200, label: "Extra Light (200)" },
  { value: 300, label: "Light (300)" },
  { value: 400, label: "Regular (400)" },
  { value: 500, label: "Medium (500)" },
  { value: 600, label: "Semi Bold (600)" },
  { value: 700, label: "Bold (700)" },
  { value: 800, label: "Extra Bold (800)" },
  { value: 900, label: "Black (900)" },
];

const FONT_FORMATS = [
  { value: "woff2", label: "WOFF2 (recommended)" },
  { value: "woff", label: "WOFF" },
  { value: "truetype", label: "TTF (TrueType)" },
  { value: "opentype", label: "OTF (OpenType)" },
];

export function CustomFontsManager() {
  const { toast } = useToast();
  const [isAddFontOpen, setIsAddFontOpen] = useState(false);
  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false);
  const [selectedFontId, setSelectedFontId] = useState<string | null>(null);
  const [newFontName, setNewFontName] = useState("");
  const [newFontDisplayName, setNewFontDisplayName] = useState("");
  const [newVariantUrl, setNewVariantUrl] = useState("");
  const [newVariantFormat, setNewVariantFormat] = useState("woff2");
  const [newVariantWeight, setNewVariantWeight] = useState(400);
  const [newVariantStyle, setNewVariantStyle] = useState("normal");

  const { data: fonts = [], isLoading } = useQuery<CustomFont[]>({
    queryKey: ["/api/custom-fonts"],
  });

  const createFontMutation = useMutation({
    mutationFn: async (data: { name: string; displayName: string }) => {
      return await apiRequest("POST", "/api/custom-fonts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fonts"] });
      toast({
        title: "Font Created",
        description: "Your custom font has been created successfully.",
      });
      setIsAddFontOpen(false);
      setNewFontName("");
      setNewFontDisplayName("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create font",
        variant: "destructive",
      });
    },
  });

  const deleteFontMutation = useMutation({
    mutationFn: async (fontId: string) => {
      return await apiRequest("DELETE", `/api/custom-fonts/${fontId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fonts"] });
      toast({
        title: "Font Deleted",
        description: "The font and all its variants have been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete font",
        variant: "destructive",
      });
    },
  });

  const createVariantMutation = useMutation({
    mutationFn: async (data: { fontId: string; fileUrl: string; format: string; weight: number; style: string }) => {
      return await apiRequest("POST", `/api/custom-fonts/${data.fontId}/variants`, {
        fileUrl: data.fileUrl,
        format: data.format,
        weight: data.weight,
        style: data.style,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fonts"] });
      toast({
        title: "Variant Added",
        description: "Font variant has been added successfully.",
      });
      setIsAddVariantOpen(false);
      setNewVariantUrl("");
      setNewVariantFormat("woff2");
      setNewVariantWeight(400);
      setNewVariantStyle("normal");
      setSelectedFontId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add variant",
        variant: "destructive",
      });
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async ({ fontId, variantId }: { fontId: string; variantId: string }) => {
      return await apiRequest("DELETE", `/api/custom-fonts/${fontId}/variants/${variantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fonts"] });
      toast({
        title: "Variant Deleted",
        description: "Font variant has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete variant",
        variant: "destructive",
      });
    },
  });

  const handleCreateFont = () => {
    if (!newFontName.trim()) {
      toast({
        title: "Error",
        description: "Font name is required",
        variant: "destructive",
      });
      return;
    }
    createFontMutation.mutate({
      name: newFontName.trim(),
      displayName: newFontDisplayName.trim() || newFontName.trim(),
    });
  };

  const handleAddVariant = () => {
    if (!selectedFontId || !newVariantUrl.trim()) {
      toast({
        title: "Error",
        description: "Font file URL is required",
        variant: "destructive",
      });
      return;
    }
    createVariantMutation.mutate({
      fontId: selectedFontId,
      fileUrl: newVariantUrl.trim(),
      format: newVariantFormat,
      weight: newVariantWeight,
      style: newVariantStyle,
    });
  };

  const openAddVariantDialog = (fontId: string) => {
    setSelectedFontId(fontId);
    setIsAddVariantOpen(true);
  };

  const getWeightLabel = (weight: number) => {
    const found = FONT_WEIGHTS.find(w => w.value === weight);
    return found ? found.label : `Weight ${weight}`;
  };

  const getFormatLabel = (format: string) => {
    const found = FONT_FORMATS.find(f => f.value === format);
    return found ? found.label : format.toUpperCase();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Custom Fonts
          </CardTitle>
          <CardDescription>Upload and manage custom fonts for your event pages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Type className="h-5 w-5" />
          Custom Fonts
        </CardTitle>
        <CardDescription>Upload and manage custom fonts for your event pages</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Custom fonts can be used in your event landing pages, registration forms, and attendee portals. 
          Upload font files to your Media Library first, then add them here with their URL.
        </p>

        {fonts.length === 0 ? (
          <div className="border border-dashed rounded-md p-6 text-center text-muted-foreground">
            <FileType className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No custom fonts configured yet</p>
            <p className="text-xs mt-1">Add your first font to get started</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {fonts.map((font) => (
              <AccordionItem key={font.id} value={font.id} data-testid={`accordion-font-${font.id}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <Type className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{font.displayName || font.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {font.variants.length} variant{font.variants.length !== 1 ? "s" : ""}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono ml-auto mr-4">
                      {font.name}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-7 space-y-3">
                    {font.variants.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No variants added yet. Add at least one font file to use this font.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {font.variants.map((variant) => (
                          <div
                            key={variant.id}
                            className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                            data-testid={`variant-${variant.id}`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Badge variant="outline" className="text-xs shrink-0">
                                {getFormatLabel(variant.format)}
                              </Badge>
                              <span className="text-sm">{getWeightLabel(variant.weight)}</span>
                              {variant.style === "italic" && (
                                <Badge variant="secondary" className="text-xs">Italic</Badge>
                              )}
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {variant.fileUrl}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteVariantMutation.mutate({ fontId: font.id, variantId: variant.id })}
                              disabled={deleteVariantMutation.isPending}
                              data-testid={`button-delete-variant-${variant.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddVariantDialog(font.id)}
                        data-testid={`button-add-variant-${font.id}`}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Variant
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFontMutation.mutate(font.id)}
                        disabled={deleteFontMutation.isPending}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-font-${font.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete Font
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        <Dialog open={isAddFontOpen} onOpenChange={setIsAddFontOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="button-add-font">
              <Plus className="h-4 w-4 mr-2" />
              Add Font Family
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Font Family</DialogTitle>
              <DialogDescription>
                Create a new font family. You can add font file variants after creating the family.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fontName">Font Name (CSS-safe)</Label>
                <Input
                  id="fontName"
                  value={newFontName}
                  onChange={(e) => setNewFontName(e.target.value)}
                  placeholder="e.g., my-custom-font"
                  data-testid="input-font-name"
                />
                <p className="text-xs text-muted-foreground">
                  This will be used in CSS font-family declarations. Use lowercase with hyphens.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={newFontDisplayName}
                  onChange={(e) => setNewFontDisplayName(e.target.value)}
                  placeholder="e.g., My Custom Font"
                  data-testid="input-font-display-name"
                />
                <p className="text-xs text-muted-foreground">
                  Friendly name shown in the font picker.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddFontOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateFont}
                disabled={createFontMutation.isPending}
                data-testid="button-create-font"
              >
                {createFontMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create Font"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddVariantOpen} onOpenChange={setIsAddVariantOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Font Variant</DialogTitle>
              <DialogDescription>
                Add a font file for a specific weight and style. Upload the file to Media Library first.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="variantUrl">Font File URL</Label>
                <Input
                  id="variantUrl"
                  value={newVariantUrl}
                  onChange={(e) => setNewVariantUrl(e.target.value)}
                  placeholder="https://storage.googleapis.com/.../font.woff2"
                  data-testid="input-variant-url"
                />
                <p className="text-xs text-muted-foreground">
                  Paste the public URL from your Media Library upload.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={newVariantFormat} onValueChange={setNewVariantFormat}>
                    <SelectTrigger data-testid="select-variant-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_FORMATS.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Weight</Label>
                  <Select value={String(newVariantWeight)} onValueChange={(v) => setNewVariantWeight(Number(v))}>
                    <SelectTrigger data-testid="select-variant-weight">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_WEIGHTS.map((weight) => (
                        <SelectItem key={weight.value} value={String(weight.value)}>
                          {weight.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Style</Label>
                <Select value={newVariantStyle} onValueChange={setNewVariantStyle}>
                  <SelectTrigger data-testid="select-variant-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="italic">Italic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddVariantOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddVariant}
                disabled={createVariantMutation.isPending}
                data-testid="button-create-variant"
              >
                {createVariantMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Add Variant"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
