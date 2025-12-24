import { useState, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PortalObjectUploader } from "@/components/PortalObjectUploader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  Building2,
  Mail,
  Phone,
  User,
  Globe,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ClipboardList,
  Users,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  ImageIcon,
  Trash2,
  Send,
  X,
  FileText,
  UserPlus,
  Download,
  QrCode,
  Calendar,
  Briefcase,
  Camera,
  Video,
} from "lucide-react";
import { SiLinkedin, SiX, SiFacebook, SiInstagram } from "react-icons/si";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import type { EventSponsor, SponsorTask, SponsorTaskCompletion, EventLead, SponsorContactInvitation } from "@shared/schema";
import { SPONSOR_CONTACT_PERMISSIONS } from "@shared/schema";

// Camera QR Scanner Component
function CameraScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const isStoppingRef = useRef(false);

  const stopScanner = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    
    try {
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        
        // Check if scanner is actually running before stopping
        if (scanner.isScanning) {
          await scanner.stop();
        }
        // Clear the scanner to release camera
        scanner.clear();
      }
    } catch (err) {
      // Ignore cleanup errors
      console.log("Scanner cleanup:", err);
    } finally {
      isStoppingRef.current = false;
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  useEffect(() => {
    isMountedRef.current = true;
    const containerId = "qr-reader-container";
    
    const startScanner = async () => {
      try {
        if (!isMountedRef.current) return;
        
        setIsStarting(true);
        setError(null);

        // Create scanner instance
        const html5QrCode = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        
        if (!isMountedRef.current) {
          html5QrCode.clear();
          return;
        }
        
        scannerRef.current = html5QrCode;

        // Get available cameras
        const devices = await Html5Qrcode.getCameras();
        
        if (!isMountedRef.current) {
          html5QrCode.clear();
          return;
        }
        
        if (devices && devices.length > 0) {
          // Prefer back camera if available
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes("back") || 
            d.label.toLowerCase().includes("rear") ||
            d.label.toLowerCase().includes("environment")
          );
          const cameraId = backCamera?.id || devices[0].id;

          await html5QrCode.start(
            cameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            async (decodedText) => {
              // Success callback - stop scanner first, then callback
              await stopScanner();
              if (isMountedRef.current) {
                onScan(decodedText);
              }
            },
            () => {
              // Error callback (scan failure) - ignore silently
            }
          );
          
          if (isMountedRef.current) {
            setIsScanning(true);
            setIsStarting(false);
          }
        } else {
          if (isMountedRef.current) {
            setError("No cameras found. Please ensure camera access is allowed.");
            setIsStarting(false);
          }
        }
      } catch (err: unknown) {
        console.error("Camera error:", err);
        if (isMountedRef.current) {
          if (err instanceof Error) {
            if (err.message.includes("NotAllowedError") || err.message.includes("Permission denied")) {
              setError("Camera access denied. Please allow camera permissions in your browser settings.");
            } else if (err.message.includes("NotFoundError")) {
              setError("No camera found on this device.");
            } else {
              setError(err.message || "Failed to start camera. Please try again.");
            }
          } else {
            setError("Failed to start camera. Please try again.");
          }
          setIsStarting(false);
        }
      }
    };

    startScanner();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [onScan]);

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-square bg-muted rounded-md overflow-hidden">
        <div id="qr-reader-container" className="w-full h-full" />
        
        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Starting camera...</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={handleClose} data-testid="button-close-camera">
          Cancel
        </Button>
      </div>
    </div>
  );
}

interface SponsorInvitation extends SponsorContactInvitation {
  inviterName?: string;
}

interface SponsorContactInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  permissions: string[];
}

interface SponsorWithEvent extends EventSponsor {
  event?: {
    id: string;
    name: string;
    publicSlug: string;
  };
  sponsorContact?: SponsorContactInfo | null;
}

interface TasksResponse {
  tasks: SponsorTask[];
  completions: SponsorTaskCompletion[];
}

const profileFormSchema = z.object({
  bio: z.string().optional(),
  contactEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  logoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  socialLinks: z.object({
    linkedin: z.string().url("Invalid URL").optional().or(z.literal("")),
    twitter: z.string().url("Invalid URL").optional().or(z.literal("")),
    facebook: z.string().url("Invalid URL").optional().or(z.literal("")),
    instagram: z.string().url("Invalid URL").optional().or(z.literal("")),
  }).optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

function getToken(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("token");
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    case "submitted":
      return (
        <Badge variant="default" className="bg-yellow-600">
          <Clock className="w-3 h-3 mr-1" />
          Submitted
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
  }
}

function ProfileTab({ sponsor, token }: { sponsor: SponsorWithEvent; token: string }) {
  const { toast } = useToast();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      bio: sponsor.bio || "",
      contactEmail: sponsor.contactEmail || "",
      contactName: sponsor.contactName || "",
      contactPhone: sponsor.contactPhone || "",
      logoUrl: sponsor.logoUrl || "",
      socialLinks: {
        linkedin: sponsor.socialLinks?.linkedin || "",
        twitter: sponsor.socialLinks?.twitter || "",
        facebook: sponsor.socialLinks?.facebook || "",
        instagram: sponsor.socialLinks?.instagram || "",
      },
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await fetch(`/api/sponsor-portal/profile?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your company profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sponsor-portal/auth", token] });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Information
          </CardTitle>
          <CardDescription>Your current sponsorship details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Company Name</p>
              <p className="font-medium" data-testid="text-company-name">{sponsor.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tier</p>
              <Badge variant="outline" className="capitalize" data-testid="badge-tier">
                {sponsor.tier}
              </Badge>
            </div>
            {sponsor.websiteUrl && (
              <div>
                <p className="text-sm text-muted-foreground">Website</p>
                <a
                  href={sponsor.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm flex items-center gap-1 hover:underline"
                  data-testid="link-website"
                >
                  {sponsor.websiteUrl}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {sponsor.logoUrl && (
              <div>
                <p className="text-sm text-muted-foreground">Logo</p>
                <img
                  src={sponsor.logoUrl}
                  alt={`${sponsor.name} logo`}
                  className="h-12 w-auto object-contain mt-1"
                  data-testid="img-logo"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Editable Profile</CardTitle>
          <CardDescription>Update your company details for the event</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell attendees about your company..."
                        className="min-h-[120px]"
                        {...field}
                        data-testid="input-bio"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Company Logo</FormLabel>
                <div className="flex items-start gap-4 flex-wrap">
                  {form.watch("logoUrl") ? (
                    <div className="relative">
                      <img
                        src={form.watch("logoUrl")}
                        alt="Company logo"
                        className="h-24 w-auto max-w-48 object-contain border rounded-md p-2"
                        data-testid="img-logo-preview"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => form.setValue("logoUrl", "")}
                        data-testid="button-remove-logo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-24 w-24 border rounded-md flex items-center justify-center bg-muted">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <PortalObjectUploader
                      token={token}
                      onComplete={(result) => form.setValue("logoUrl", result.uploadUrl)}
                      accept="image/*"
                      buttonText="Upload Logo"
                      buttonVariant="outline"
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: Square image, at least 200x200 pixels
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input placeholder="Primary contact name" className="pl-10" {...field} data-testid="input-contact-name" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="email" placeholder="contact@company.com" className="pl-10" {...field} data-testid="input-contact-email" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="tel" placeholder="+1 (555) 123-4567" className="pl-10" {...field} data-testid="input-contact-phone" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Social Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="socialLinks.linkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <SiLinkedin className="w-4 h-4" />
                          LinkedIn
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://linkedin.com/company/..." {...field} data-testid="input-linkedin" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialLinks.twitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <SiX className="w-4 h-4" />
                          X (Twitter)
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://x.com/..." {...field} data-testid="input-twitter" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialLinks.facebook"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <SiFacebook className="w-4 h-4" />
                          Facebook
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://facebook.com/..." {...field} data-testid="input-facebook" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialLinks.instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <SiInstagram className="w-4 h-4" />
                          Instagram
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://instagram.com/..." {...field} data-testid="input-instagram" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Profile"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function TaskCompletionForm({
  task,
  completion,
  token,
  onSuccess,
}: {
  task: SponsorTask;
  completion?: SponsorTaskCompletion;
  token: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const existing = completion?.submittedData as Record<string, string> | undefined;
    return existing || {};
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sponsor-portal/task-completions/${task.id}?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submittedData: formData }),
      });
      if (!res.ok) throw new Error("Failed to submit task");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Task submitted",
        description: "Your task submission has been received.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Submission failed",
        description: "There was an error submitting your task. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Only lock editing when approved - allow resubmission when status is "submitted" (pending review or unapproved)
  const isApproved = completion?.status === "approved";
  const isSubmitted = completion?.status === "submitted";
  const isRejected = completion?.status === "rejected";
  const isLocked = isApproved; // Can only edit when not approved

  const renderFormFields = () => {
    switch (task.taskType) {
      case "company_info":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Company Information</label>
              <Textarea
                value={formData.companyInfo || ""}
                onChange={(e) => setFormData({ ...formData, companyInfo: e.target.value })}
                placeholder="Enter your company information..."
                className="mt-1"
                disabled={isLocked}
                data-testid={`input-task-${task.id}-company-info`}
              />
            </div>
          </div>
        );
      case "logo_upload":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Company Logo</label>
              <div className="flex items-start gap-4 flex-wrap mt-2">
                {formData.logoUrl ? (
                  <div className="relative">
                    <img
                      src={formData.logoUrl}
                      alt="Logo preview"
                      className="h-20 w-auto max-w-40 object-contain border rounded-md p-2"
                      data-testid={`img-task-${task.id}-logo-preview`}
                    />
                    {!isLocked && (
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setFormData({ ...formData, logoUrl: "" })}
                        data-testid={`button-task-${task.id}-remove-logo`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="h-20 w-20 border rounded-md flex items-center justify-center bg-muted">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                {!isLocked && (
                  <PortalObjectUploader
                    token={token}
                    onComplete={(result) => setFormData({ ...formData, logoUrl: result.uploadUrl })}
                    accept="image/*"
                    buttonText="Upload Logo"
                    buttonVariant="outline"
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Upload your company logo (PNG, JPG, or SVG recommended)
              </p>
            </div>
          </div>
        );
      case "social_links":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">LinkedIn</label>
              <Input
                value={formData.linkedin || ""}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                placeholder="https://linkedin.com/company/..."
                className="mt-1"
                disabled={isLocked}
                data-testid={`input-task-${task.id}-linkedin`}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Twitter/X</label>
              <Input
                value={formData.twitter || ""}
                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                placeholder="https://x.com/..."
                className="mt-1"
                disabled={isLocked}
                data-testid={`input-task-${task.id}-twitter`}
              />
            </div>
          </div>
        );
      case "bio":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Company Bio</label>
              <Textarea
                value={formData.bio || ""}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Write a brief description of your company..."
                className="mt-1 min-h-[150px]"
                disabled={isLocked}
                data-testid={`input-task-${task.id}-bio`}
              />
            </div>
          </div>
        );
      case "document_upload":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Document</label>
              <div className="flex items-start gap-4 flex-wrap mt-2">
                {formData.documentUrl ? (
                  <div className="relative flex items-center gap-2 border rounded-md p-3 bg-muted/50">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate max-w-[200px]">
                        {formData.documentName || "Document uploaded"}
                      </p>
                      <a
                        href={formData.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                        data-testid={`link-task-${task.id}-document-view`}
                      >
                        View document
                      </a>
                    </div>
                    {!isLocked && (
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="h-6 w-6 ml-2"
                        onClick={() => setFormData({ ...formData, documentUrl: "", documentName: "" })}
                        data-testid={`button-task-${task.id}-remove-document`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="h-16 w-16 border rounded-md flex items-center justify-center bg-muted">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                {!isLocked && (
                  <PortalObjectUploader
                    token={token}
                    onComplete={(result) => setFormData({ 
                      ...formData, 
                      documentUrl: result.uploadUrl,
                      documentName: result.fileName || "Document"
                    })}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    buttonText="Upload Document"
                    buttonVariant="outline"
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Upload your document (PDF, Word, Excel, PowerPoint, or text files)
              </p>
            </div>
          </div>
        );
      case "custom":
      default:
        const requiredFields = (task.requiredFields as string[]) || ["response"];
        return (
          <div className="space-y-4">
            {requiredFields.map((field) => (
              <div key={field}>
                <label className="text-sm font-medium capitalize">{field.replace(/_/g, " ")}</label>
                <Input
                  value={formData[field] || ""}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  placeholder={`Enter ${field.replace(/_/g, " ")}...`}
                  className="mt-1"
                  disabled={isLocked}
                  data-testid={`input-task-${task.id}-${field}`}
                />
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {renderFormFields()}

      {isRejected && completion?.reviewNotes && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm font-medium text-destructive">Reviewer Notes:</p>
          <p className="text-sm text-destructive/80">{completion.reviewNotes}</p>
        </div>
      )}

      {!isLocked && (
        <Button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending}
          data-testid={`button-submit-task-${task.id}`}
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : isRejected ? (
            "Resubmit"
          ) : isSubmitted ? (
            "Update Submission"
          ) : (
            "Submit"
          )}
        </Button>
      )}
    </div>
  );
}

function TasksTab({ token }: { token: string }) {
  const { data, isLoading, refetch } = useQuery<TasksResponse>({
    queryKey: ["/api/sponsor-portal/tasks", token],
    queryFn: async () => {
      const res = await fetch(`/api/sponsor-portal/tasks?token=${token}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!data || data.tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No tasks assigned yet</p>
        </CardContent>
      </Card>
    );
  }

  const getCompletionForTask = (taskId: string) =>
    data.completions.find((c) => c.taskId === taskId);

  return (
    <div className="space-y-4">
      {data.tasks.map((task) => {
        const completion = getCompletionForTask(task.id);
        const status = completion?.status || "pending";

        return (
          <Card key={task.id} data-testid={`card-task-${task.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-lg">{task.name}</CardTitle>
                  {task.description && (
                    <CardDescription className="mt-1">{task.description}</CardDescription>
                  )}
                </div>
                <StatusBadge status={status} />
              </div>
              <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground mt-2">
                <span className="capitalize">Type: {task.taskType?.replace(/_/g, " ")}</span>
                {task.dueDate && (
                  <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                )}
                {task.isRequired && <Badge variant="outline">Required</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <TaskCompletionForm
                task={task}
                completion={completion}
                token={token}
                onSuccess={() => refetch()}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string | null;
  createdAt?: Date | string | null;
}

interface TeamMembersResponse {
  teamMembers: TeamMember[];
}

const teamMemberFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  jobTitle: z.string().optional(),
});

type TeamMemberFormData = z.infer<typeof teamMemberFormSchema>;

function SendInviteButton({ attendeeId, memberName }: { attendeeId: string; memberName: string }) {
  const token = getToken();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const handleSendInvite = async () => {
    if (!token) return;
    
    setSending(true);
    try {
      const res = await fetch(`/api/sponsor-portal/team-members/${attendeeId}/send-invite?token=${token}`, {
        method: "POST",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to send invite");
      }
      
      toast({
        title: "Invite Sent",
        description: `An invitation email has been sent to ${memberName}.`,
      });
    } catch (error) {
      toast({
        title: "Failed to Send Invite",
        description: error instanceof Error ? error.message : "Could not send the invitation email.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleSendInvite}
      disabled={sending}
      data-testid={`button-send-invite-${attendeeId}`}
      title="Send invitation email"
    >
      {sending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
    </Button>
  );
}

const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  permissions: z.array(z.string()).default([]),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

function InviteTeamMemberDialog({
  sponsorId,
  token,
  onSuccess,
}: {
  sponsorId: string;
  token: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      permissions: [],
    },
  });

  const createInvitationMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const res = await fetch(`/api/sponsor-portal/invitations/${sponsorId}?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "The team member invitation has been sent successfully.",
      });
      form.reset();
      setOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InviteFormData) => {
    createInvitationMutation.mutate(data);
  };

  const permissionOptions = [
    { value: SPONSOR_CONTACT_PERMISSIONS.LEAD_CAPTURE, label: "Lead Capture" },
    { value: SPONSOR_CONTACT_PERMISSIONS.VIEW_LEADS, label: "View Leads" },
    { value: SPONSOR_CONTACT_PERMISSIONS.EXPORT_LEADS, label: "Export Leads" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-invite-team-member">
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Team Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Invite a colleague to access the sponsor portal for your team.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="email" 
                        placeholder="colleague@company.com" 
                        className="pl-10" 
                        {...field} 
                        data-testid="input-invite-email" 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} data-testid="input-invite-firstname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} data-testid="input-invite-lastname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permissions</FormLabel>
                  <div className="space-y-2">
                    {permissionOptions.map((permission) => (
                      <div key={permission.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`permission-${permission.value}`}
                          checked={field.value?.includes(permission.value)}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            if (checked) {
                              field.onChange([...current, permission.value]);
                            } else {
                              field.onChange(current.filter((v) => v !== permission.value));
                            }
                          }}
                          data-testid={`checkbox-permission-${permission.value}`}
                        />
                        <Label 
                          htmlFor={`permission-${permission.value}`} 
                          className="text-sm font-normal cursor-pointer"
                        >
                          {permission.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                data-testid="button-cancel-invite"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createInvitationMutation.isPending}
                data-testid="button-send-invitation"
              >
                {createInvitationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function InvitationStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "accepted":
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Accepted
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <AlertCircle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    case "revoked":
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Revoked
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          {status}
        </Badge>
      );
  }
}

function getPermissionLabel(permission: string): string {
  switch (permission) {
    case SPONSOR_CONTACT_PERMISSIONS.LEAD_CAPTURE:
      return "Lead Capture";
    case SPONSOR_CONTACT_PERMISSIONS.VIEW_LEADS:
      return "View Leads";
    case SPONSOR_CONTACT_PERMISSIONS.EXPORT_LEADS:
      return "Export Leads";
    case SPONSOR_CONTACT_PERMISSIONS.INVITE_TEAM:
      return "Invite Team";
    default:
      return permission;
  }
}

function TeamTab({ sponsor, token, permissions }: { sponsor: SponsorWithEvent; token: string; permissions: string[] }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const canInviteTeam = permissions.includes(SPONSOR_CONTACT_PERMISSIONS.INVITE_TEAM);

  const { data: teamData, isLoading: teamLoading, refetch: refetchTeam } = useQuery<TeamMembersResponse>({
    queryKey: ["/api/sponsor-portal/team-members", token],
    queryFn: async () => {
      const res = await fetch(`/api/sponsor-portal/team-members?token=${token}`);
      if (!res.ok) throw new Error("Failed to fetch team members");
      return res.json();
    },
  });

  const { data: invitationsData, isLoading: invitationsLoading, refetch: refetchInvitations } = useQuery<SponsorInvitation[]>({
    queryKey: ["/api/sponsor-portal/invitations", sponsor.id, token],
    queryFn: async () => {
      const res = await fetch(`/api/sponsor-portal/invitations/${sponsor.id}?token=${token}`);
      if (!res.ok) throw new Error("Failed to fetch invitations");
      return res.json();
    },
    enabled: canInviteTeam,
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await fetch(`/api/sponsor-portal/invitations/${sponsor.id}/${invitationId}/revoke?token=${token}`, {
        method: "POST",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to revoke invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation revoked",
        description: "The invitation has been revoked successfully.",
      });
      refetchInvitations();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to revoke invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: sponsorData } = useQuery<SponsorWithEvent>({
    queryKey: ["/api/sponsor-portal/auth", token],
  });

  const currentSponsor = sponsorData || sponsor;
  const seatsUsed = currentSponsor.seatsUsed || 0;
  const totalSeats = currentSponsor.registrationSeats || 0;
  const seatsRemaining = Math.max(0, totalSeats - seatsUsed);
  const progressPercent = totalSeats > 0 ? (seatsUsed / totalSeats) * 100 : 0;

  const invitations = invitationsData || [];

  const form = useForm<TeamMemberFormData>({
    resolver: zodResolver(teamMemberFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      jobTitle: "",
    },
  });

  const addTeamMemberMutation = useMutation({
    mutationFn: async (data: TeamMemberFormData) => {
      const res = await fetch(`/api/sponsor-portal/team-members?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to add team member");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Team member added",
        description: "The team member has been registered successfully.",
      });
      form.reset();
      refetchTeam();
      queryClient.invalidateQueries({ queryKey: ["/api/sponsor-portal/auth", token] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TeamMemberFormData) => {
    addTeamMemberMutation.mutate(data);
  };

  const inviteLink = currentSponsor.event?.publicSlug && currentSponsor.baseInviteCodeId
    ? `${import.meta.env.VITE_APP_URL || window.location.origin}/event/${currentSponsor.event.publicSlug}/register?invite=${currentSponsor.baseInviteCodeId}`
    : null;

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const teamMembers = teamData?.teamMembers || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Registration Seats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold" data-testid="text-seats-used">
              {seatsUsed}
            </div>
            <div className="text-muted-foreground">
              of {totalSeats} seats used
            </div>
          </div>
          {totalSeats > 0 && (
            <div className="space-y-2">
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  data-testid="progress-seats"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {seatsRemaining > 0 ? (
                  <>{seatsRemaining} seat{seatsRemaining !== 1 ? "s" : ""} remaining</>
                ) : (
                  <>All seats have been used</>
                )}
              </p>
            </div>
          )}
          {totalSeats === 0 && (
            <p className="text-sm text-muted-foreground">
              No team registration seats allocated for this sponsorship
            </p>
          )}
        </CardContent>
      </Card>

      {seatsRemaining > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Add Team Member
            </CardTitle>
            <CardDescription>
              Register a new team member for the event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} data-testid="input-team-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} data-testid="input-team-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="email" placeholder="john@company.com" className="pl-10" {...field} data-testid="input-team-email" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Software Engineer" {...field} data-testid="input-team-job-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={addTeamMemberMutation.isPending} data-testid="button-add-team-member">
                  {addTeamMemberMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Team Member"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {inviteLink && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Link</CardTitle>
            <CardDescription>
              Share this link with your team members to self-register for the event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input value={inviteLink} readOnly className="font-mono text-sm" data-testid="input-invite-link" />
              <Button variant="outline" size="icon" onClick={copyInviteLink} data-testid="button-copy-link">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Team members registered using your sponsor activation key
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No team members have registered yet</p>
              {seatsRemaining > 0 && (
                <p className="text-sm mt-2">
                  Use the form above or share the invite link with your team
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-3 rounded-md border bg-muted/30"
                  data-testid={`team-member-${member.id}`}
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" data-testid={`text-member-name-${member.id}`}>
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground truncate" data-testid={`text-member-email-${member.id}`}>
                      {member.email}
                    </p>
                  </div>
                  {member.jobTitle && (
                    <Badge variant="secondary" className="hidden sm:inline-flex" data-testid={`badge-member-title-${member.id}`}>
                      {member.jobTitle}
                    </Badge>
                  )}
                  <SendInviteButton 
                    attendeeId={member.id} 
                    memberName={`${member.firstName} ${member.lastName}`}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canInviteTeam && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Team Invitations
                </CardTitle>
                <CardDescription>
                  Invite colleagues to access the sponsor portal
                </CardDescription>
              </div>
              <InviteTeamMemberDialog
                sponsorId={sponsor.id}
                token={token}
                onSuccess={() => refetchInvitations()}
              />
            </div>
          </CardHeader>
          <CardContent>
            {invitationsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : invitations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No invitations sent yet</p>
                <p className="text-sm mt-2">
                  Invite team members to collaborate on the sponsor portal
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center gap-4 p-3 rounded-md border bg-muted/30"
                    data-testid={`invitation-${invitation.id}`}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" data-testid={`text-invitation-name-${invitation.id}`}>
                        {invitation.firstName && invitation.lastName 
                          ? `${invitation.firstName} ${invitation.lastName}`
                          : invitation.email}
                      </p>
                      <p className="text-sm text-muted-foreground truncate" data-testid={`text-invitation-email-${invitation.id}`}>
                        {invitation.email}
                      </p>
                      {invitation.permissions && invitation.permissions.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {invitation.permissions.map((perm) => (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {getPermissionLabel(perm)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <InvitationStatusBadge status={invitation.status || "pending"} />
                    {invitation.status === "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => revokeInvitationMutation.mutate(invitation.id)}
                        disabled={revokeInvitationMutation.isPending}
                        data-testid={`button-revoke-${invitation.id}`}
                        title="Revoke invitation"
                      >
                        {revokeInvitationMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface LeadStats {
  totalLeads: number;
  leadsToday: number;
  qrScanned: number;
  manualEntry: number;
}

const leadFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

function LeadsTab({ 
  sponsor, 
  token, 
  permissions 
}: { 
  sponsor: SponsorWithEvent; 
  token: string; 
  permissions: string[];
}) {
  const { toast } = useToast();
  const [showManualForm, setShowManualForm] = useState(false);
  const [qrValue, setQrValue] = useState("");
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  const canCapture = permissions.includes(SPONSOR_CONTACT_PERMISSIONS.LEAD_CAPTURE);
  const canViewLeads = permissions.includes(SPONSOR_CONTACT_PERMISSIONS.VIEW_LEADS) || canCapture;
  const canExport = permissions.includes(SPONSOR_CONTACT_PERMISSIONS.EXPORT_LEADS);

  const { data: leads = [], isLoading: leadsLoading } = useQuery<EventLead[]>({
    queryKey: ["/api/sponsor-portal/leads", sponsor.id, sponsor.eventId, token],
    queryFn: async () => {
      const res = await fetch(`/api/sponsor-portal/leads/${sponsor.id}/${sponsor.eventId}?token=${token}`);
      if (!res.ok) throw new Error("Failed to fetch leads");
      return res.json();
    },
    enabled: canViewLeads,
  });

  const { data: stats } = useQuery<LeadStats>({
    queryKey: ["/api/sponsor-portal/leads/stats", sponsor.id, sponsor.eventId, token],
    queryFn: async () => {
      const res = await fetch(`/api/sponsor-portal/leads/${sponsor.id}/${sponsor.eventId}/stats?token=${token}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: canViewLeads,
  });

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      jobTitle: "",
      phone: "",
      notes: "",
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: LeadFormData) => {
      const res = await fetch(`/api/sponsor-portal/leads/${sponsor.id}/${sponsor.eventId}?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create lead");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Lead captured", description: "Lead has been added successfully." });
      form.reset();
      setShowManualForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/sponsor-portal/leads", sponsor.id, sponsor.eventId, token] });
      queryClient.invalidateQueries({ queryKey: ["/api/sponsor-portal/leads/stats", sponsor.id, sponsor.eventId, token] });
    },
    onError: () => {
      toast({ title: "Failed to capture lead", description: "Please try again.", variant: "destructive" });
    },
  });

  const scanQrMutation = useMutation({
    mutationFn: async (badgeCode: string) => {
      const res = await fetch(`/api/sponsor-portal/leads/${sponsor.id}/${sponsor.eventId}/scan?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badgeCode }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to scan badge");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Lead captured", description: `${data.firstName} ${data.lastName} has been added.` });
      setQrValue("");
      queryClient.invalidateQueries({ queryKey: ["/api/sponsor-portal/leads", sponsor.id, sponsor.eventId, token] });
      queryClient.invalidateQueries({ queryKey: ["/api/sponsor-portal/leads/stats", sponsor.id, sponsor.eventId, token] });
    },
    onError: (error: Error) => {
      toast({ title: "Scan failed", description: error.message, variant: "destructive" });
    },
  });

  const handleExport = () => {
    window.open(`/api/sponsor-portal/leads/${sponsor.id}/${sponsor.eventId}/export?token=${token}`, "_blank");
  };

  const handleQrScan = () => {
    if (qrValue.trim()) {
      scanQrMutation.mutate(qrValue.trim());
    }
  };

  const onSubmit = (data: LeadFormData) => {
    createLeadMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold" data-testid="stat-total-leads">{stats.totalLeads ?? 0}</div>
              <p className="text-sm text-muted-foreground">Total Leads</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold" data-testid="stat-today-leads">{stats.leadsToday ?? 0}</div>
              <p className="text-sm text-muted-foreground">Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold" data-testid="stat-qr-scans">{stats.qrScanned ?? 0}</div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <QrCode className="w-3 h-3" /> QR Scanned
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold" data-testid="stat-manual-entries">{stats.manualEntry ?? 0}</div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> Manual Entry
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {canCapture && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Capture Leads
            </CardTitle>
            <CardDescription>Scan attendee badges or manually enter lead information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                placeholder="Enter or scan badge code..."
                value={qrValue}
                onChange={(e) => setQrValue(e.target.value)}
                className="flex-1 min-w-[200px]"
                onKeyDown={(e) => e.key === "Enter" && handleQrScan()}
                data-testid="input-badge-code"
              />
              <Button onClick={handleQrScan} disabled={!qrValue.trim() || scanQrMutation.isPending} data-testid="button-scan-badge">
                {scanQrMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}
                Scan
              </Button>
              <Button variant="outline" onClick={() => setShowCameraScanner(true)} data-testid="button-camera-scan">
                <Camera className="w-4 h-4 mr-2" />
                Camera Scan
              </Button>
              <Button variant="outline" onClick={() => setShowManualForm(!showManualForm)} data-testid="button-manual-entry">
                <UserPlus className="w-4 h-4 mr-2" />
                {showManualForm ? "Hide Form" : "Manual Entry"}
              </Button>
            </div>

            {/* Camera Scanner Dialog */}
            <Dialog open={showCameraScanner} onOpenChange={setShowCameraScanner}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Scan QR Code
                  </DialogTitle>
                  <DialogDescription>
                    Point your camera at an attendee's badge QR code
                  </DialogDescription>
                </DialogHeader>
                <CameraScanner
                  onScan={(code) => {
                    setShowCameraScanner(false);
                    setQrValue(code);
                    scanQrMutation.mutate(code);
                  }}
                  onClose={() => setShowCameraScanner(false)}
                />
              </DialogContent>
            </Dialog>

            {showManualForm && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4 p-4 border rounded-md bg-muted/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} data-testid="input-lead-firstname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} data-testid="input-lead-lastname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="email" placeholder="john@company.com" className="pl-10" {...field} data-testid="input-lead-email" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input placeholder="Acme Corp" className="pl-10" {...field} data-testid="input-lead-company" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input placeholder="Marketing Manager" className="pl-10" {...field} data-testid="input-lead-jobtitle" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="tel" placeholder="+1 (555) 123-4567" className="pl-10" {...field} data-testid="input-lead-phone" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Add any notes about this lead..." {...field} data-testid="input-lead-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={createLeadMutation.isPending} data-testid="button-save-lead">
                      {createLeadMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                      ) : (
                        "Save Lead"
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowManualForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Captured Leads
              </CardTitle>
              <CardDescription>All leads captured at your booth</CardDescription>
            </div>
            {canExport && leads.length > 0 && (
              <Button variant="outline" onClick={handleExport} data-testid="button-export-leads">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : leads.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No leads captured yet</p>
              {canCapture && (
                <p className="text-sm mt-2">
                  Use the QR scanner or manual entry form above to capture leads
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center gap-4 p-3 rounded-md border bg-muted/30"
                  data-testid={`lead-${lead.id}`}
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" data-testid={`lead-name-${lead.id}`}>
                      {lead.firstName} {lead.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground truncate" data-testid={`lead-email-${lead.id}`}>
                      {lead.email}
                    </p>
                    {(lead.company || lead.jobTitle) && (
                      <p className="text-sm text-muted-foreground truncate">
                        {lead.jobTitle && <span>{lead.jobTitle}</span>}
                        {lead.jobTitle && lead.company && <span> at </span>}
                        {lead.company && <span>{lead.company}</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={lead.captureMethod === "qr_scan" ? "default" : "secondary"} data-testid={`lead-method-${lead.id}`}>
                      {lead.captureMethod === "qr_scan" ? (
                        <><QrCode className="w-3 h-3 mr-1" />QR</>
                      ) : (
                        <><User className="w-3 h-3 mr-1" />Manual</>
                      )}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden sm:inline" data-testid={`lead-date-${lead.id}`}>
                      {lead.createdAt && new Date(lead.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SponsorPortalTabs({ sponsor, token }: { sponsor: SponsorWithEvent; token: string }) {
  // Primary contacts (sponsorContact is null) get all permissions
  const permissions = sponsor.sponsorContact?.permissions || [
    SPONSOR_CONTACT_PERMISSIONS.LEAD_CAPTURE,
    SPONSOR_CONTACT_PERMISSIONS.VIEW_LEADS,
    SPONSOR_CONTACT_PERMISSIONS.EXPORT_LEADS,
    SPONSOR_CONTACT_PERMISSIONS.INVITE_TEAM,
  ];
  const hasLeadsAccess = permissions.includes(SPONSOR_CONTACT_PERMISSIONS.LEAD_CAPTURE) || 
                         permissions.includes(SPONSOR_CONTACT_PERMISSIONS.VIEW_LEADS);

  const { data: stats } = useQuery<LeadStats>({
    queryKey: ["/api/sponsor-portal/leads/stats", sponsor.id, sponsor.eventId, token],
    queryFn: async () => {
      const res = await fetch(`/api/sponsor-portal/leads/${sponsor.id}/${sponsor.eventId}/stats?token=${token}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: hasLeadsAccess,
  });

  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList data-testid="tabs-navigation">
        <TabsTrigger value="profile" data-testid="tab-profile">
          <Building2 className="w-4 h-4 mr-2" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="tasks" data-testid="tab-tasks">
          <ClipboardList className="w-4 h-4 mr-2" />
          Tasks
        </TabsTrigger>
        <TabsTrigger value="team" data-testid="tab-team">
          <Users className="w-4 h-4 mr-2" />
          Team
        </TabsTrigger>
        {hasLeadsAccess && (
          <TabsTrigger value="leads" data-testid="tab-leads" className="relative">
            <UserPlus className="w-4 h-4 mr-2" />
            Leads
            {stats && stats.totalLeads > 0 && (
              <Badge variant="secondary" className="ml-2 px-1.5 min-w-[1.25rem] h-5" data-testid="badge-leads-count">
                {stats.totalLeads}
              </Badge>
            )}
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="profile">
        <ProfileTab sponsor={sponsor} token={token} />
      </TabsContent>

      <TabsContent value="tasks">
        <TasksTab token={token} />
      </TabsContent>

      <TabsContent value="team">
        <TeamTab sponsor={sponsor} token={token} permissions={permissions} />
      </TabsContent>

      {hasLeadsAccess && (
        <TabsContent value="leads">
          <LeadsTab sponsor={sponsor} token={token} permissions={permissions} />
        </TabsContent>
      )}
    </Tabs>
  );
}

export default function SponsorPortal() {
  const token = getToken();
  const { toast } = useToast();

  const { data: sponsor, isLoading, error } = useQuery<SponsorWithEvent>({
    queryKey: ["/api/sponsor-portal/auth", token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      const res = await fetch(`/api/sponsor-portal/auth?token=${token}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Invalid or expired token");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-error-title">Access Token Required</h2>
            <p className="text-muted-foreground mb-4">
              Please use the sponsor portal link provided by the event organizer.
            </p>
            <p className="text-sm text-muted-foreground">
              If you need access, please contact the event organizer for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !sponsor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-error-title">Invalid Access Token</h2>
            <p className="text-muted-foreground mb-4">
              {(error as Error)?.message || "The provided token is invalid or has expired."}
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact the event organizer for a new sponsor portal link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            {sponsor.logoUrl && (
              <img
                src={sponsor.logoUrl}
                alt={`${sponsor.name} logo`}
                className="h-12 w-auto object-contain"
                data-testid="img-header-logo"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-sponsor-name">{sponsor.name}</h1>
              {sponsor.event && (
                <p className="text-muted-foreground" data-testid="text-event-name">
                  {sponsor.event.name} Sponsor Portal
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        <SponsorPortalTabs sponsor={sponsor} token={token} />
      </main>
    </div>
  );
}
