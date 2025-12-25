import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ListTodo, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  Clock,
  Circle
} from "lucide-react";
import { format, parseISO, differenceInDays, isPast, addDays, isWithinInterval } from "date-fns";
import type { Deliverable, Event } from "@shared/schema";

type Assignee = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
};

const WORKSTREAM_LABELS: Record<string, string> = {
  marketing: "Marketing",
  logistics: "Logistics & Ops",
  content: "Content & Sessions",
  speakers: "Content & Sessions",
  sponsorship: "Sponsors & Partners",
  registration: "Arrival & Registration",
  production: "Production",
  creative: "Creative",
  operations: "Logistics & Ops",
  other: "Other",
};

const WORKSTREAM_ORDER = [
  "Arrival & Registration",
  "Content & Sessions",
  "Engagement Moments",
  "Sponsors & Partners",
  "Logistics & Ops",
  "Production",
  "Marketing",
  "Creative",
  "Other",
];

type RiskState = "on_track" | "attention_needed" | "at_risk";

interface EnrichedDeliverable extends Deliverable {
  riskState: RiskState;
  eventName: string;
  assigneeName: string;
  workstreamGroup: string;
}

function calculateRiskState(deliverable: Deliverable): RiskState {
  const now = new Date();
  const status = deliverable.status || "todo";
  
  // Get the relevant date (executionTime or dueDate)
  let targetDate: Date | null = null;
  if (deliverable.executionTime) {
    targetDate = new Date(deliverable.executionTime);
  } else if (deliverable.dueDate) {
    targetDate = parseISO(deliverable.dueDate);
  }
  
  // At Risk: To Do or In Progress AND overdue
  if ((status === "todo" || status === "in_progress") && targetDate && isPast(targetDate)) {
    return "at_risk";
  }
  
  // Attention Needed: To Do AND due within 48 hours
  if (status === "todo" && targetDate) {
    const hoursUntilDue = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilDue > 0 && hoursUntilDue <= 48) {
      return "attention_needed";
    }
  }
  
  // On Track: Done or In Progress and not overdue
  return "on_track";
}

function getRiskBadge(riskState: RiskState) {
  switch (riskState) {
    case "at_risk":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          At Risk
        </Badge>
      );
    case "attention_needed":
      return (
        <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0">
          <AlertTriangle className="h-3 w-3" />
          Attention
        </Badge>
      );
    case "on_track":
      return (
        <Badge variant="outline" className="gap-1 text-green-600 dark:text-green-400">
          <CheckCircle className="h-3 w-3" />
          On Track
        </Badge>
      );
  }
}

const statusConfig: Record<string, { label: string; icon: typeof Circle; color: string }> = {
  todo: { label: "To Do", icon: Circle, color: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-blue-600 dark:text-blue-400" },
  review: { label: "In Review", icon: AlertCircle, color: "text-amber-600 dark:text-amber-400" },
  done: { label: "Done", icon: CheckCircle, color: "text-green-600 dark:text-green-400" },
};

export default function RunOfShow() {
  const [filterEventId, setFilterEventId] = useState<string>("all");

  const { data: deliverables = [], isLoading: deliverablesLoading } = useQuery<Deliverable[]>({
    queryKey: ["/api/deliverables"],
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: assignees = [] } = useQuery<Assignee[]>({
    queryKey: ["/api/organization/assignees"],
  });

  const isLoading = deliverablesLoading || eventsLoading;

  // Create lookup maps
  const eventsMap = useMemo(() => {
    return events.reduce((acc, event) => {
      acc[event.id] = event;
      return acc;
    }, {} as Record<string, Event>);
  }, [events]);

  const assigneesMap = useMemo(() => {
    return assignees.reduce((acc, a) => {
      acc[a.id] = `${a.firstName || ""} ${a.lastName || ""}`.trim() || a.email || "";
      return acc;
    }, {} as Record<string, string>);
  }, [assignees]);

  // Filter and enrich deliverables for Run of Show
  // Now includes ALL phases (Pre-Program, Program-Live, Post-Program) for complete execution timeline
  const runOfShowItems = useMemo(() => {
    return deliverables
      .filter((d) => {
        // Apply event filter
        if (filterEventId && filterEventId !== "all" && d.eventId !== filterEventId) {
          return false;
        }

        const event = eventsMap[d.eventId];
        if (!event) return false;

        // Get target date - prefer executionTime, then dueDate
        let targetDate: Date | null = null;
        if (d.executionTime) {
          targetDate = new Date(d.executionTime);
        } else if (d.dueDate) {
          targetDate = parseISO(d.dueDate);
        }

        // Require a target date for inclusion in the execution timeline
        if (!targetDate) {
          return false;
        }

        // Include all deliverables that have a valid target date within the planning window
        // The planning window starts from planningStartDate (or event creation/start) through event end
        if (event.startDate) {
          const planningStart = event.planningStartDate 
            ? parseISO(event.planningStartDate) 
            : (event.createdAt ? new Date(event.createdAt) : addDays(parseISO(event.startDate), -90));
          const eventEnd = event.endDate ? parseISO(event.endDate) : parseISO(event.startDate);
          // Extend window 30 days after event end for post-program deliverables
          const windowEnd = addDays(eventEnd, 30);

          if (isWithinInterval(targetDate, { start: planningStart, end: windowEnd })) {
            return true;
          }
        }

        return false;
      })
      .map((d): EnrichedDeliverable => ({
        ...d,
        riskState: calculateRiskState(d),
        eventName: eventsMap[d.eventId]?.name || "Unknown",
        assigneeName: d.assignedTo ? assigneesMap[d.assignedTo] || "Unassigned" : "Unassigned",
        workstreamGroup: d.workstream ? WORKSTREAM_LABELS[d.workstream] || "Other" : "Other",
      }))
      .sort((a, b) => {
        // Sort by execution time, then due date
        const aTime = a.executionTime ? new Date(a.executionTime).getTime() : 
                     a.dueDate ? parseISO(a.dueDate).getTime() : Infinity;
        const bTime = b.executionTime ? new Date(b.executionTime).getTime() : 
                     b.dueDate ? parseISO(b.dueDate).getTime() : Infinity;
        return aTime - bTime;
      });
  }, [deliverables, events, eventsMap, assigneesMap, filterEventId]);

  // Group by workstream
  const groupedItems = useMemo(() => {
    const groups: Record<string, EnrichedDeliverable[]> = {};
    
    for (const item of runOfShowItems) {
      const group = item.workstreamGroup;
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
    }

    // Sort groups by predefined order
    const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
      const aIndex = WORKSTREAM_ORDER.indexOf(a);
      const bIndex = WORKSTREAM_ORDER.indexOf(b);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    return sortedGroups;
  }, [runOfShowItems]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = runOfShowItems.length;
    const onTrack = runOfShowItems.filter(d => d.riskState === "on_track").length;
    const atRisk = runOfShowItems.filter(d => d.riskState === "at_risk").length;
    const attentionNeeded = runOfShowItems.filter(d => d.riskState === "attention_needed").length;
    const completed = runOfShowItems.filter(d => d.status === "done").length;

    return { total, onTrack, atRisk, attentionNeeded, completed };
  }, [runOfShowItems]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Run of Show" 
        breadcrumbs={[{ label: "Run of Show" }]}
      />

      <div className="flex-1 overflow-auto p-6">
        <p className="text-muted-foreground text-sm mb-4">
          Execution timeline derived from Deliverables — showing Program-Live items and tasks due near event dates
        </p>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card data-testid="card-total-items">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-count">
                {isLoading ? <Skeleton className="h-8 w-12" /> : stats.total}
              </div>
              <p className="text-xs text-muted-foreground">Execution items</p>
            </CardContent>
          </Card>

          <Card data-testid="card-on-track">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Track</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-on-track-count">
                {isLoading ? <Skeleton className="h-8 w-12" /> : stats.onTrack}
              </div>
              <p className="text-xs text-muted-foreground">Progressing well</p>
            </CardContent>
          </Card>

          <Card data-testid="card-attention-needed">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attention Needed</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-attention-count">
                {isLoading ? <Skeleton className="h-8 w-12" /> : stats.attentionNeeded}
              </div>
              <p className="text-xs text-muted-foreground">Due within 48 hours</p>
            </CardContent>
          </Card>

          <Card data-testid="card-at-risk">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">At Risk</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive" data-testid="text-at-risk-count">
                {isLoading ? <Skeleton className="h-8 w-12" /> : stats.atRisk}
              </div>
              <p className="text-xs text-muted-foreground">Overdue items</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4 mb-4">
          <Select value={filterEventId} onValueChange={setFilterEventId}>
            <SelectTrigger className="w-[250px]" data-testid="select-filter-event">
              <SelectValue placeholder="Filter by program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timeline Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : runOfShowItems.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="No execution items"
            description="Deliverables with Program-Live phase or due dates near event start will appear here automatically"
          />
        ) : (
          <div className="space-y-6">
            {groupedItems.map(([groupName, items]) => (
              <Card key={groupName} data-testid={`card-group-${groupName.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {groupName}
                    <Badge variant="secondary" className="ml-2">{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>Time / Due</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const statusCfg = statusConfig[item.status || "todo"];
                        const StatusIcon = statusCfg.icon;
                        
                        // Format time display
                        let timeDisplay = "—";
                        if (item.executionTime) {
                          timeDisplay = format(new Date(item.executionTime), "MMM d, h:mm a");
                        } else if (item.dueDate) {
                          timeDisplay = format(parseISO(item.dueDate), "MMM d, yyyy");
                        }

                        return (
                          <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell className="text-muted-foreground">{item.eventName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="gap-1">
                                <StatusIcon className={`h-3 w-3 ${statusCfg.color}`} />
                                {statusCfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell>{getRiskBadge(item.riskState)}</TableCell>
                            <TableCell className="text-muted-foreground">{item.assigneeName}</TableCell>
                            <TableCell className="text-muted-foreground">{timeDisplay}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
