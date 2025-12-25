import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ColorPicker } from "@/components/color-picker";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Globe, Palette, Type, Image, Trash2, Edit2, Check, Star, ExternalLink, Plus } from "lucide-react";
import type { BrandKit } from "@shared/schema";

interface ExtractedBrand {
  colors: Array<{ hex: string; frequency: number }>;
  fonts: string[];
  logoUrls: string[];
  suggestedPalette?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
  };
}

interface BrandPalette {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonBorderColor: string;
}

type ColorRole = keyof BrandPalette;

const colorRoles: { key: ColorRole; label: string }[] = [
  { key: "primaryColor", label: "Primary" },
  { key: "secondaryColor", label: "Secondary" },
  { key: "accentColor", label: "Accent" },
  { key: "textColor", label: "Text" },
  { key: "backgroundColor", label: "Background" },
  { key: "buttonColor", label: "Button" },
  { key: "buttonTextColor", label: "Button Text" },
  { key: "buttonBorderColor", label: "Button Border" },
];

function ColorSwatch({ 
  color, 
  label, 
  onChange, 
  onClick 
}: { 
  color: string; 
  label: string; 
  onChange?: (color: string) => void;
  onClick?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        {onChange ? (
          <ColorPicker value={color || "#ffffff"} onChange={onChange} />
        ) : (
          <button
            type="button"
            onClick={onClick}
            className="w-10 h-10 rounded-md border-2 border-border transition-all hover:scale-105 hover-elevate"
            style={{ backgroundColor: color }}
            data-testid={`button-color-${label.toLowerCase()}`}
          />
        )}
        <Input
          value={color || ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="#000000"
          className="font-mono text-sm w-24"
          data-testid={`input-color-${label.toLowerCase()}`}
        />
      </div>
    </div>
  );
}

export default function BrandKitPage() {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedBrand | null>(null);
  const [palette, setPalette] = useState<BrandPalette>({
    primaryColor: "#1a73e8",
    secondaryColor: "#5f6368",
    accentColor: "#ea4335",
    textColor: "#202124",
    backgroundColor: "#ffffff",
    buttonColor: "#1a73e8",
    buttonTextColor: "#ffffff",
    buttonBorderColor: "#1a73e8",
  });
  const [selectedFonts, setSelectedFonts] = useState<string[]>([]);
  const [selectedLogo, setSelectedLogo] = useState<string>("");
  const [kitName, setKitName] = useState("New Brand Kit");
  const [isDefault, setIsDefault] = useState(false);
  const [assigningColor, setAssigningColor] = useState<{ hex: string } | null>(null);
  const [editingKit, setEditingKit] = useState<BrandKit | null>(null);
  const [deletingKit, setDeletingKit] = useState<BrandKit | null>(null);

  const { data: brandKits, isLoading: isLoadingKits } = useQuery<BrandKit[]>({
    queryKey: ["/api/brand-kits"],
  });

  const extractMutation = useMutation({
    mutationFn: async (websiteUrl: string) => {
      const response = await apiRequest("POST", "/api/brand-kits/extract", { url: websiteUrl });
      return response.json() as Promise<ExtractedBrand>;
    },
    onSuccess: (data) => {
      setExtractedData(data);
      if (data.suggestedPalette) {
        setPalette({
          primaryColor: data.suggestedPalette.primaryColor || "#1a73e8",
          secondaryColor: data.suggestedPalette.secondaryColor || "#5f6368",
          accentColor: data.suggestedPalette.accentColor || "#ea4335",
          textColor: data.suggestedPalette.textColor || "#202124",
          backgroundColor: data.suggestedPalette.backgroundColor || "#ffffff",
          buttonColor: data.suggestedPalette.primaryColor || "#1a73e8",
          buttonTextColor: "#ffffff",
          buttonBorderColor: data.suggestedPalette.primaryColor || "#1a73e8",
        });
      }
      if (data.fonts.length > 0) {
        setSelectedFonts([data.fonts[0]]);
      }
      if (data.logoUrls.length > 0) {
        setSelectedLogo(data.logoUrls[0]);
      }
      toast({
        title: "Brand Extracted",
        description: `Found ${data.colors.length} colors, ${data.fonts.length} fonts, and ${data.logoUrls.length} logos.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract brand from URL",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
      textColor?: string;
      backgroundColor?: string;
      buttonColor?: string;
      buttonTextColor?: string;
      buttonBorderColor?: string;
      fontFamily?: string;
      logoUrl?: string;
      isDefault?: boolean;
      sourceUrl?: string;
    }) => {
      const response = await apiRequest("POST", "/api/brand-kits", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-kits"] });
      toast({
        title: "Brand Kit Saved",
        description: "Your brand kit has been saved successfully.",
      });
      setExtractedData(null);
      setUrl("");
      setKitName("New Brand Kit");
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save brand kit",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BrandKit> }) => {
      const response = await apiRequest("PATCH", `/api/brand-kits/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-kits"] });
      toast({
        title: "Brand Kit Updated",
        description: "Your brand kit has been updated successfully.",
      });
      setEditingKit(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update brand kit",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/brand-kits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-kits"] });
      toast({
        title: "Brand Kit Deleted",
        description: "The brand kit has been deleted.",
      });
      setDeletingKit(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete brand kit",
        variant: "destructive",
      });
    },
  });

  const handleExtract = () => {
    if (!url) {
      toast({
        title: "URL Required",
        description: "Please enter a website URL to extract brand colors from.",
        variant: "destructive",
      });
      return;
    }
    extractMutation.mutate(url);
  };

  const handleSave = () => {
    saveMutation.mutate({
      name: kitName,
      primaryColor: palette.primaryColor,
      secondaryColor: palette.secondaryColor,
      accentColor: palette.accentColor,
      textColor: palette.textColor,
      backgroundColor: palette.backgroundColor,
      buttonColor: palette.buttonColor,
      buttonTextColor: palette.buttonTextColor,
      buttonBorderColor: palette.buttonBorderColor,
      fontFamily: selectedFonts[0] || undefined,
      logoUrl: selectedLogo || undefined,
      isDefault,
      sourceUrl: url || undefined,
    });
  };

  const handleAssignColor = (role: ColorRole) => {
    if (assigningColor) {
      setPalette((prev) => ({ ...prev, [role]: assigningColor.hex }));
      setAssigningColor(null);
    }
  };

  const handleEditKit = (kit: BrandKit) => {
    setEditingKit(kit);
    setPalette({
      primaryColor: kit.primaryColor || "#1a73e8",
      secondaryColor: kit.secondaryColor || "#5f6368",
      accentColor: kit.accentColor || "#ea4335",
      textColor: kit.textColor || "#202124",
      backgroundColor: kit.backgroundColor || "#ffffff",
      buttonColor: kit.buttonColor || "#1a73e8",
      buttonTextColor: kit.buttonTextColor || "#ffffff",
      buttonBorderColor: kit.buttonBorderColor || "#1a73e8",
    });
    setKitName(kit.name);
    setIsDefault(kit.isDefault || false);
    setSelectedFonts(kit.fontFamily ? [kit.fontFamily] : []);
    setSelectedLogo(kit.logoUrl || "");
  };

  const handleUpdateKit = () => {
    if (!editingKit) return;
    updateMutation.mutate({
      id: editingKit.id,
      data: {
        name: kitName,
        primaryColor: palette.primaryColor,
        secondaryColor: palette.secondaryColor,
        accentColor: palette.accentColor,
        textColor: palette.textColor,
        backgroundColor: palette.backgroundColor,
        buttonColor: palette.buttonColor,
        buttonTextColor: palette.buttonTextColor,
        buttonBorderColor: palette.buttonBorderColor,
        fontFamily: selectedFonts[0] || null,
        logoUrl: selectedLogo || null,
        isDefault,
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Brand Kit"
        breadcrumbs={[{ label: "Brand Kit" }]}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Extract Brand from Website
              </CardTitle>
              <CardDescription>
                Enter a company website URL to automatically extract brand colors, fonts, and logos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-64">
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    data-testid="input-website-url"
                  />
                </div>
                <Button
                  onClick={handleExtract}
                  disabled={extractMutation.isPending}
                  data-testid="button-extract-brand"
                >
                  {extractMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Palette className="h-4 w-4" />
                      Extract Brand
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {extractMutation.isPending && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing website and extracting brand assets...
                </div>
                <div className="grid grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-md" />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {extractedData && !extractMutation.isPending && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Brand Palette
                  </CardTitle>
                  <CardDescription>
                    Review and customize the extracted brand colors
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="kit-name">Brand Kit Name</Label>
                    <Input
                      id="kit-name"
                      value={kitName}
                      onChange={(e) => setKitName(e.target.value)}
                      placeholder="My Brand Kit"
                      className="mt-2 max-w-xs"
                      data-testid="input-kit-name"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {colorRoles.map((role) => (
                      <ColorSwatch
                        key={role.key}
                        color={palette[role.key]}
                        label={role.label}
                        onChange={(color) =>
                          setPalette((prev) => ({ ...prev, [role.key]: color }))
                        }
                      />
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <Label>All Extracted Colors</Label>
                      {assigningColor && (
                        <Badge variant="secondary">
                          Click a role above to assign {assigningColor.hex}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                      {extractedData.colors.map((color, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAssigningColor(color)}
                          className={`w-10 h-10 rounded-md border-2 transition-all hover:scale-105 hover-elevate ${
                            assigningColor?.hex === color.hex
                              ? "border-foreground ring-2 ring-ring"
                              : "border-border"
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={`${color.hex} (used ${color.frequency}x)`}
                          data-testid={`button-extracted-color-${idx}`}
                        />
                      ))}
                    </div>
                    {assigningColor && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">
                          Assign {assigningColor.hex} to:
                        </span>
                        {colorRoles.map((role) => (
                          <Button
                            key={role.key}
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignColor(role.key)}
                            data-testid={`button-assign-${role.key}`}
                          >
                            {role.label}
                          </Button>
                        ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setAssigningColor(null)}
                          data-testid="button-cancel-assign"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {extractedData.fonts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Type className="h-5 w-5" />
                      Typography
                    </CardTitle>
                    <CardDescription>
                      Fonts extracted from the website
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {extractedData.fonts.map((font, idx) => (
                        <Button
                          key={idx}
                          variant={selectedFonts.includes(font) ? "default" : "outline"}
                          onClick={() => {
                            setSelectedFonts((prev) =>
                              prev.includes(font)
                                ? prev.filter((f) => f !== font)
                                : [font]
                            );
                          }}
                          style={{ fontFamily: font }}
                          data-testid={`button-font-${idx}`}
                        >
                          {selectedFonts.includes(font) && (
                            <Check className="h-4 w-4" />
                          )}
                          {font}
                        </Button>
                      ))}
                    </div>
                    {selectedFonts.length > 0 && (
                      <div
                        className="mt-4 p-4 rounded-md bg-muted"
                        style={{ fontFamily: selectedFonts[0] }}
                      >
                        <p className="text-2xl font-bold" data-testid="text-font-preview-heading">
                          The quick brown fox jumps over the lazy dog
                        </p>
                        <p className="mt-2" data-testid="text-font-preview-body">
                          ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz
                          0123456789
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {extractedData.logoUrls.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      Logos
                    </CardTitle>
                    <CardDescription>
                      Logo images found on the website
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {extractedData.logoUrls.map((logoUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedLogo(logoUrl)}
                          className={`relative p-4 rounded-md border-2 bg-muted transition-all hover-elevate ${
                            selectedLogo === logoUrl
                              ? "border-foreground ring-2 ring-ring"
                              : "border-border"
                          }`}
                          data-testid={`button-logo-${idx}`}
                        >
                          <img
                            src={logoUrl}
                            alt={`Logo ${idx + 1}`}
                            className="w-full h-16 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                          {selectedLogo === logoUrl && (
                            <div className="absolute top-1 right-1">
                              <Check className="h-4 w-4 text-foreground" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="default-switch"
                          checked={isDefault}
                          onCheckedChange={setIsDefault}
                          data-testid="switch-set-default"
                        />
                        <Label htmlFor="default-switch" className="flex items-center gap-1">
                          <Star className="h-4 w-4" />
                          Set as Default
                        </Label>
                      </div>
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={saveMutation.isPending}
                      data-testid="button-save-brand-kit"
                    >
                      {saveMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Brand Kit"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
                <span className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Saved Brand Kits
                </span>
                {!extractedData && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setExtractedData({
                        colors: [],
                        fonts: [],
                        logoUrls: [],
                      });
                      setPalette({
                        primaryColor: "#1a73e8",
                        secondaryColor: "#5f6368",
                        accentColor: "#ea4335",
                        textColor: "#202124",
                        backgroundColor: "#ffffff",
                        buttonColor: "#1a73e8",
                        buttonTextColor: "#ffffff",
                        buttonBorderColor: "#1a73e8",
                      });
                    }}
                    data-testid="button-create-new-kit"
                  >
                    <Plus className="h-4 w-4" />
                    Create New
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Your organization's saved brand kits
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingKits ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : !brandKits || brandKits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No brand kits saved yet</p>
                  <p className="text-sm mt-1">
                    Extract colors from a website or create a new brand kit
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {brandKits.map((kit) => (
                    <div
                      key={kit.id}
                      className="flex items-center justify-between gap-4 p-4 rounded-md border border-border flex-wrap"
                      data-testid={`brand-kit-${kit.id}`}
                    >
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex -space-x-1">
                          {[
                            kit.primaryColor,
                            kit.secondaryColor,
                            kit.accentColor,
                          ]
                            .filter(Boolean)
                            .map((color, idx) => (
                              <div
                                key={idx}
                                className="w-8 h-8 rounded-full border-2 border-background"
                                style={{ backgroundColor: color || undefined }}
                              />
                            ))}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium" data-testid={`text-kit-name-${kit.id}`}>
                              {kit.name}
                            </span>
                            {kit.isDefault && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                Default
                              </Badge>
                            )}
                          </div>
                          {kit.sourceUrl && (
                            <a
                              href={kit.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {new URL(kit.sourceUrl).hostname}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditKit(kit)}
                          data-testid={`button-edit-kit-${kit.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingKit(kit)}
                          data-testid={`button-delete-kit-${kit.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!editingKit} onOpenChange={(open) => !open && setEditingKit(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Brand Kit</DialogTitle>
            <DialogDescription>
              Update your brand kit colors and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-kit-name">Name</Label>
              <Input
                id="edit-kit-name"
                value={kitName}
                onChange={(e) => setKitName(e.target.value)}
                className="mt-2"
                data-testid="input-edit-kit-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {colorRoles.map((role) => (
                <ColorSwatch
                  key={role.key}
                  color={palette[role.key]}
                  label={role.label}
                  onChange={(color) =>
                    setPalette((prev) => ({ ...prev, [role.key]: color }))
                  }
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-default-switch"
                checked={isDefault}
                onCheckedChange={setIsDefault}
                data-testid="switch-edit-set-default"
              />
              <Label htmlFor="edit-default-switch">Set as Default</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingKit(null)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateKit}
              disabled={updateMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingKit} onOpenChange={(open) => !open && setDeletingKit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Brand Kit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingKit?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingKit && deleteMutation.mutate(deletingKit.id)}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
