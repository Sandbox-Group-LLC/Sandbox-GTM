import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { QrCode, UserCheck, Users, Clock, CheckCircle, XCircle, Search } from "lucide-react";
import type { Attendee } from "@shared/schema";

interface CheckInStats {
  totalAttendees: number;
  checkedIn: number;
  pending: number;
  checkInRate: number;
}

interface CheckInResponse {
  message: string;
  attendee: Attendee;
}

export default function CheckIn() {
  const { toast } = useToast();
  const [checkInCode, setCheckInCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastCheckedIn, setLastCheckedIn] = useState<Attendee | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<CheckInStats>({
    queryKey: ["/api/check-in/stats"],
  });

  const { data: attendees, isLoading: attendeesLoading } = useQuery<Attendee[]>({
    queryKey: ["/api/attendees"],
  });

  const checkInMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/check-in/scan", { code });
      return res.json() as Promise<CheckInResponse>;
    },
    onSuccess: (data) => {
      setLastCheckedIn(data.attendee);
      setCheckInCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/check-in/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendees"] });
      toast({ title: "Check-in successful", description: `${data.attendee.firstName} ${data.attendee.lastName} checked in` });
    },
    onError: (error: Error) => {
      toast({ title: "Check-in failed", description: error.message, variant: "destructive" });
    },
  });

  const manualCheckInMutation = useMutation({
    mutationFn: async (attendeeId: string) => {
      const res = await apiRequest("PATCH", `/api/attendees/${attendeeId}`, { checkedIn: true, checkInTime: new Date().toISOString() });
      return res.json() as Promise<Attendee>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/check-in/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendees"] });
      toast({ title: "Check-in successful", description: `${data.firstName} ${data.lastName} checked in manually` });
    },
    onError: () => {
      toast({ title: "Check-in failed", variant: "destructive" });
    },
  });

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkInCode.trim()) {
      checkInMutation.mutate(checkInCode.trim());
    }
  };

  const filteredAttendees = attendees?.filter(a => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.firstName.toLowerCase().includes(query) ||
      a.lastName.toLowerCase().includes(query) ||
      a.email.toLowerCase().includes(query) ||
      a.checkInCode?.toLowerCase().includes(query)
    );
  }) || [];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Attendee Check-In"
        breadcrumbs={[{ label: "Check-In" }]}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {statsLoading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : (
            <>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-muted">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Registered</p>
                      <p className="text-2xl font-semibold" data-testid="text-total-registered">{stats?.totalAttendees || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Checked In</p>
                      <p className="text-2xl font-semibold" data-testid="text-checked-in">{stats?.checkedIn || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900/30">
                      <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-semibold" data-testid="text-pending">{stats?.pending || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                      <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Check-in Rate</p>
                      <p className="text-2xl font-semibold" data-testid="text-checkin-rate">{stats?.checkInRate || 0}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Scan Check-In Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleScanSubmit} className="space-y-4">
                <Input
                  data-testid="input-checkin-code"
                  placeholder="Enter or scan check-in code"
                  value={checkInCode}
                  onChange={(e) => setCheckInCode(e.target.value.toUpperCase())}
                  className="text-lg font-mono text-center tracking-wider"
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!checkInCode.trim() || checkInMutation.isPending}
                  data-testid="button-scan-checkin"
                >
                  {checkInMutation.isPending ? "Processing..." : "Check In"}
                </Button>
              </form>

              {lastCheckedIn && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-300">Last Check-In</span>
                  </div>
                  <p className="text-lg font-semibold">{lastCheckedIn.firstName} {lastCheckedIn.lastName}</p>
                  <p className="text-sm text-muted-foreground">{lastCheckedIn.email}</p>
                  {lastCheckedIn.company && <p className="text-sm text-muted-foreground">{lastCheckedIn.company}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Manual Check-In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                data-testid="input-search-attendee"
                placeholder="Search attendee by name, email, or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4"
              />

              <div className="space-y-2 max-h-[400px] overflow-auto">
                {attendeesLoading ? (
                  <>
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                  </>
                ) : filteredAttendees.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">No attendees found</p>
                ) : (
                  filteredAttendees.slice(0, 20).map((attendee) => (
                    <div
                      key={attendee.id}
                      className="flex items-center justify-between p-3 rounded-md border bg-card"
                      data-testid={`row-attendee-${attendee.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{attendee.firstName} {attendee.lastName}</p>
                        <p className="text-sm text-muted-foreground truncate">{attendee.email}</p>
                        {attendee.checkInCode && (
                          <p className="text-xs font-mono text-muted-foreground">{attendee.checkInCode}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {attendee.checkedIn ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Checked In
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => manualCheckInMutation.mutate(attendee.id)}
                            disabled={manualCheckInMutation.isPending}
                            data-testid={`button-checkin-${attendee.id}`}
                          >
                            Check In
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
