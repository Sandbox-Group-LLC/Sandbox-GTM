import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Download,
  FileImage,
  FolderOpen,
  X,
  ImageIcon,
  FileText,
  Share2,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Clock,
  User,
  Link2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ProofRequest, Event, ProofShareLink } from "@shared/schema";

interface ProofVersionData {
  id: string;
  fileName: string | null;
  fileUrl: string | null;
  versionNumber: number;
}

interface ApprovedProofWithDetails extends ProofRequest {
  currentVersion?: ProofVersionData | null;
  event?: { name: string } | null;
  statusHistory?: Array<{
    id: string;
    status: string;
    createdAt: string;
  }>;
}

function isImageFile(fileName: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proof: ApprovedProofWithDetails;
}

function ShareDialog({ open, onOpenChange, proof }: ShareDialogProps) {
  const { toast } = useToast();
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: shareLinks = [], isLoading: linksLoading } = useQuery<ProofShareLink[]>({
    queryKey: ["/api/proof-share-links", proof.id],
    queryFn: async () => {
      const res = await fetch(`/api/proof-share-links/${proof.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch share links");
      return res.json();
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/proof-share-links", {
        proofRequestId: proof.id,
        recipientName: recipientName || null,
        recipientEmail: recipientEmail || null,
        expiresInDays: parseInt(expiresInDays),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proof-share-links", proof.id] });
      setRecipientName("");
      setRecipientEmail("");
      toast({
        title: "Share link created",
        description: "The share link has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create share link.",
        variant: "destructive",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (linkId: string) => {
      await apiRequest("DELETE", `/api/proof-share-links/${linkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proof-share-links", proof.id] });
      toast({
        title: "Link deactivated",
        description: "The share link has been deactivated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate share link.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (token: string, linkId: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(linkId);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Copied",
        description: "Share link copied to clipboard.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy link.",
        variant: "destructive",
      });
    }
  };

  const activeLinks = shareLinks.filter(link => link.isActive && new Date(link.expiresAt!) > new Date());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Approved Asset
          </DialogTitle>
          <DialogDescription>
            Create a secure, time-limited link to share "{proof.title}" with external vendors.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Create New Share Link</h4>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipientName">Recipient Name (optional)</Label>
                <Input
                  id="recipientName"
                  placeholder="e.g., Print Vendor Co."
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  data-testid="input-recipient-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipientEmail">Recipient Email (optional)</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  placeholder="vendor@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  data-testid="input-recipient-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresInDays">Expires In</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger data-testid="select-expiry">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="w-full"
              data-testid="button-create-share-link"
            >
              {createMutation.isPending ? "Creating..." : "Create Share Link"}
            </Button>
          </div>

          {(linksLoading || activeLinks.length > 0) && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Active Share Links ({activeLinks.length})
              </h4>
              {linksLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="space-y-2">
                  {activeLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted"
                      data-testid={`share-link-${link.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        {link.recipientName && (
                          <div className="flex items-center gap-1 text-sm font-medium truncate">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{link.recipientName}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires: {format(new Date(link.expiresAt!), "MMM d, yyyy")}
                          </span>
                          {link.accessCount !== null && link.accessCount > 0 && (
                            <span>Views: {link.accessCount}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(link.token, link.id)}
                          data-testid={`button-copy-${link.id}`}
                        >
                          {copiedId === link.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          asChild
                        >
                          <a
                            href={`${window.location.origin}/shared/${link.token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`button-open-${link.id}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deactivateMutation.mutate(link.id)}
                          disabled={deactivateMutation.isPending}
                          data-testid={`button-deactivate-${link.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-dialog">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssetCard({ proof }: { proof: ApprovedProofWithDetails }) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const approvalDate = useMemo(() => {
    const approvedStatus = proof.statusHistory?.find(h => h.status === 'approved');
    return approvedStatus?.createdAt || proof.updatedAt;
  }, [proof.statusHistory, proof.updatedAt]);

  const version = proof.currentVersion;
  const isImage = version?.fileName ? isImageFile(version.fileName) : false;

  return (
    <>
      <Card className="overflow-visible" data-testid={`card-approved-asset-${proof.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-16 h-16 rounded-md bg-muted flex items-center justify-center overflow-hidden">
              {version?.fileUrl && isImage ? (
                <img
                  src={version.fileUrl}
                  alt={version.fileName || proof.title}
                  className="w-full h-full object-cover"
                  data-testid={`img-thumbnail-${proof.id}`}
                />
              ) : (
                <FileText className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate" data-testid={`text-title-${proof.id}`}>
                {proof.title}
              </h4>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {proof.category && (
                  <Badge variant="outline" className="text-xs" data-testid={`badge-category-${proof.id}`}>
                    {proof.category}
                  </Badge>
                )}
                {version?.fileName && (
                  <span className="text-xs text-muted-foreground" data-testid={`text-filename-${proof.id}`}>
                    {version.fileName}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1" data-testid={`text-approval-date-${proof.id}`}>
                Approved: {approvalDate ? format(new Date(approvalDate), "MMM d, yyyy") : "-"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShareDialogOpen(true)}
                data-testid={`button-share-${proof.id}`}
              >
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
              {version?.fileUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  data-testid={`button-download-${proof.id}`}
                >
                  <a href={version.fileUrl} download={version.fileName} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        proof={proof}
      />
    </>
  );
}

export default function ApprovedAssets() {
  const [eventFilter, setEventFilter] = useState("all");
  const [vendorSearch, setVendorSearch] = useState("");
  const [areaSearch, setAreaSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");

  const { data: approvedProofs, isLoading } = useQuery<ApprovedProofWithDetails[]>({
    queryKey: ["/api/approved-proofs"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const filteredProofs = useMemo(() => {
    if (!approvedProofs) return [];
    
    return approvedProofs.filter((proof) => {
      if (eventFilter !== "all" && proof.eventId !== eventFilter) return false;
      if (vendorSearch && !proof.printVendor?.toLowerCase().includes(vendorSearch.toLowerCase())) return false;
      if (areaSearch && !proof.area?.toLowerCase().includes(areaSearch.toLowerCase())) return false;
      if (globalSearch) {
        const searchLower = globalSearch.toLowerCase();
        const matchesTitle = proof.title?.toLowerCase().includes(searchLower);
        const matchesVendor = proof.printVendor?.toLowerCase().includes(searchLower);
        const matchesArea = proof.area?.toLowerCase().includes(searchLower);
        const matchesCategory = proof.category?.toLowerCase().includes(searchLower);
        const matchesFileName = proof.currentVersion?.fileName?.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesVendor && !matchesArea && !matchesCategory && !matchesFileName) return false;
      }
      return true;
    });
  }, [approvedProofs, eventFilter, vendorSearch, areaSearch, globalSearch]);

  const groupedByVendor = useMemo(() => {
    const groups: Record<string, Record<string, ApprovedProofWithDetails[]>> = {};
    
    filteredProofs.forEach((proof) => {
      const vendor = proof.printVendor || "No Vendor";
      const area = proof.area || "No Area";
      
      if (!groups[vendor]) {
        groups[vendor] = {};
      }
      if (!groups[vendor][area]) {
        groups[vendor][area] = [];
      }
      groups[vendor][area].push(proof);
    });

    return groups;
  }, [filteredProofs]);

  const vendorKeys = Object.keys(groupedByVendor).sort();

  const hasFilters = eventFilter !== "all" || vendorSearch || areaSearch || globalSearch;

  const clearFilters = () => {
    setEventFilter("all");
    setVendorSearch("");
    setAreaSearch("");
    setGlobalSearch("");
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <PageHeader
        title="Approved Assets"
        breadcrumbs={[{ label: "Approved Assets" }]}
      />

      <div className="px-0">
        <p className="text-muted-foreground text-sm mb-4">
          Browse and download all approved graphic proofs organized by print vendor and area
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search all fields..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="pl-9"
            data-testid="input-global-search"
          />
        </div>

        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-event-filter">
            <SelectValue placeholder="Filter by event" />
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Vendor..."
            value={vendorSearch}
            onChange={(e) => setVendorSearch(e.target.value)}
            className="pl-9 w-[150px]"
            data-testid="input-vendor-search"
          />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Area..."
            value={areaSearch}
            onChange={(e) => setAreaSearch(e.target.value)}
            className="pl-9 w-[150px]"
            data-testid="input-area-search"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filteredProofs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileImage className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground" data-testid="text-empty-state">
              {hasFilters ? "No approved assets match your filters." : "No approved assets yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={vendorKeys}
          className="space-y-4"
          data-testid="accordion-vendors"
        >
          {vendorKeys.map((vendor) => {
            const areaGroups = groupedByVendor[vendor];
            const areaKeys = Object.keys(areaGroups).sort();
            const totalAssets = areaKeys.reduce((sum, area) => sum + areaGroups[area].length, 0);

            return (
              <AccordionItem
                key={vendor}
                value={vendor}
                className="border rounded-lg px-4"
                data-testid={`accordion-vendor-${vendor.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <AccordionTrigger className="py-4" data-testid={`trigger-vendor-${vendor.replace(/\s+/g, '-').toLowerCase()}`}>
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{vendor}</span>
                    <Badge variant="secondary" className="text-xs">
                      {totalAssets} {totalAssets === 1 ? "asset" : "assets"}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <Accordion
                    type="multiple"
                    defaultValue={areaKeys}
                    className="space-y-2 ml-4"
                  >
                    {areaKeys.map((area) => {
                      const assets = areaGroups[area];
                      return (
                        <AccordionItem
                          key={area}
                          value={area}
                          className="border rounded-md px-3"
                          data-testid={`accordion-area-${area.replace(/\s+/g, '-').toLowerCase()}`}
                        >
                          <AccordionTrigger className="py-3" data-testid={`trigger-area-${area.replace(/\s+/g, '-').toLowerCase()}`}>
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{area}</span>
                              <Badge variant="outline" className="text-xs">
                                {assets.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-3">
                            <div className="space-y-3">
                              {assets.map((proof) => (
                                <AssetCard key={proof.id} proof={proof} />
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
