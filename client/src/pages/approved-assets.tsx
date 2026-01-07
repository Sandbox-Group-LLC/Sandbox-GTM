import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Search,
  Download,
  FileImage,
  FolderOpen,
  X,
  ImageIcon,
  FileText,
} from "lucide-react";
import type { ProofRequest, Event } from "@shared/schema";

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

function AssetCard({ proof }: { proof: ApprovedProofWithDetails }) {
  const approvalDate = useMemo(() => {
    const approvedStatus = proof.statusHistory?.find(h => h.status === 'approved');
    return approvedStatus?.createdAt || proof.updatedAt;
  }, [proof.statusHistory, proof.updatedAt]);

  const version = proof.currentVersion;
  const isImage = version?.fileName ? isImageFile(version.fileName) : false;

  return (
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
      </CardContent>
    </Card>
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
