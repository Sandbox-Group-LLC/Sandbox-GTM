import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Send, 
  CheckCircle, 
  Mail, 
  MousePointerClick, 
  AlertTriangle,
  XCircle,
  BarChart3,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import type { EmailCampaign, Organization } from "@shared/schema";

interface EmailAnalyticsData {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalComplained: number;
  messages: Array<{
    id: string;
    recipientEmail: string;
    recipientName: string | null;
    status: string | null;
    sentAt: string | null;
    deliveredAt: string | null;
    openedAt: string | null;
    clickedAt: string | null;
    bouncedAt: string | null;
    openCount: number | null;
    clickCount: number | null;
  }>;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  sent: "secondary",
  delivered: "default",
  opened: "default",
  clicked: "default",
  bounced: "destructive",
  complained: "destructive",
  failed: "destructive",
};

export default function EmailAnalytics() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

  const { data: organization } = useQuery<Organization>({
    queryKey: ["/api/auth/organization"],
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<EmailCampaign[]>({
    queryKey: ["/api/emails"],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<EmailAnalyticsData>({
    queryKey: ["/api/organizations", organization?.id, "email-campaigns", selectedCampaignId, "analytics"],
    enabled: !!organization?.id && !!selectedCampaignId,
    queryFn: async () => {
      const res = await fetch(
        `/api/organizations/${organization!.id}/email-campaigns/${selectedCampaignId}/analytics`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  const selectedCampaign = useMemo(() => {
    return campaigns.find((c) => c.id === selectedCampaignId);
  }, [campaigns, selectedCampaignId]);

  const openRate = useMemo(() => {
    if (!analytics || analytics.totalDelivered === 0) return 0;
    return ((analytics.totalOpened / analytics.totalDelivered) * 100).toFixed(1);
  }, [analytics]);

  const clickRate = useMemo(() => {
    if (!analytics || analytics.totalDelivered === 0) return 0;
    return ((analytics.totalClicked / analytics.totalDelivered) * 100).toFixed(1);
  }, [analytics]);

  const bounceRate = useMemo(() => {
    if (!analytics || analytics.totalSent === 0) return 0;
    return ((analytics.totalBounced / analytics.totalSent) * 100).toFixed(1);
  }, [analytics]);

  const messageColumns = [
    {
      key: "recipientEmail",
      header: "Recipient",
      cell: (message: EmailAnalyticsData["messages"][0]) => (
        <div>
          <div className="font-medium">{message.recipientEmail}</div>
          {message.recipientName && (
            <div className="text-sm text-muted-foreground">{message.recipientName}</div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (message: EmailAnalyticsData["messages"][0]) => (
        <Badge variant={statusColors[message.status || "sent"]}>
          {message.status ? message.status.charAt(0).toUpperCase() + message.status.slice(1) : "Sent"}
        </Badge>
      ),
    },
    {
      key: "openCount",
      header: "Opens",
      cell: (message: EmailAnalyticsData["messages"][0]) => (
        <span className="text-muted-foreground">{message.openCount || 0}</span>
      ),
    },
    {
      key: "clickCount",
      header: "Clicks",
      cell: (message: EmailAnalyticsData["messages"][0]) => (
        <span className="text-muted-foreground">{message.clickCount || 0}</span>
      ),
    },
    {
      key: "sentAt",
      header: "Sent",
      cell: (message: EmailAnalyticsData["messages"][0]) => (
        <span className="text-muted-foreground text-sm">
          {message.sentAt ? format(new Date(message.sentAt), "MMM d, h:mm a") : "-"}
        </span>
      ),
    },
    {
      key: "deliveredAt",
      header: "Delivered",
      cell: (message: EmailAnalyticsData["messages"][0]) => (
        <span className="text-muted-foreground text-sm">
          {message.deliveredAt ? format(new Date(message.deliveredAt), "MMM d, h:mm a") : "-"}
        </span>
      ),
    },
    {
      key: "openedAt",
      header: "Opened",
      cell: (message: EmailAnalyticsData["messages"][0]) => (
        <span className="text-muted-foreground text-sm">
          {message.openedAt ? format(new Date(message.openedAt), "MMM d, h:mm a") : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Email Analytics"
        breadcrumbs={[
          { label: "Marketing", href: "/emails" },
          { label: "Email Analytics" },
        ]}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Select
              value={selectedCampaignId}
              onValueChange={setSelectedCampaignId}
            >
              <SelectTrigger className="w-[350px]" data-testid="select-campaign">
                <SelectValue placeholder="Select an email campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaignsLoading ? (
                  <div className="p-2 text-sm text-muted-foreground">Loading campaigns...</div>
                ) : campaigns.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No campaigns found</div>
                ) : (
                  campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.subject}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedCampaign && (
              <Badge variant="outline" className="text-muted-foreground">
                {selectedCampaign.status}
              </Badge>
            )}
          </div>

          {!selectedCampaignId ? (
            <EmptyState
              icon={BarChart3}
              title="Select a Campaign"
              description="Choose an email campaign from the dropdown above to view its analytics."
            />
          ) : analyticsLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card data-testid="card-total-sent">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
                    <Send className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalSent}</div>
                  </CardContent>
                </Card>

                <Card data-testid="card-total-delivered">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalDelivered}</div>
                  </CardContent>
                </Card>

                <Card data-testid="card-total-opened">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Opened</CardTitle>
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalOpened}</div>
                  </CardContent>
                </Card>

                <Card data-testid="card-total-clicked">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Clicked</CardTitle>
                    <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalClicked}</div>
                  </CardContent>
                </Card>

                <Card data-testid="card-total-bounced">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Bounced</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalBounced}</div>
                  </CardContent>
                </Card>

                <Card data-testid="card-total-complained">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Complained</CardTitle>
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalComplained}</div>
                  </CardContent>
                </Card>

                <Card data-testid="card-open-rate">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{openRate}%</div>
                    <p className="text-xs text-muted-foreground">opened / delivered</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-click-rate">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{clickRate}%</div>
                    <p className="text-xs text-muted-foreground">clicked / delivered</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Message Details</h3>
                {analytics.messages.length === 0 ? (
                  <EmptyState
                    icon={Mail}
                    title="No Messages"
                    description="No email messages have been sent for this campaign yet."
                  />
                ) : (
                  <DataTable
                    columns={messageColumns}
                    data={analytics.messages}
                    getRowKey={(message) => message.id}
                    emptyMessage="No messages found"
                  />
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
