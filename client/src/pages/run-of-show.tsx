import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Circle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  List
} from "lucide-react";
import { 
  format, 
  parseISO, 
  isPast, 
  addDays, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isToday
} from "date-fns";
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

const WORKSTREAM_COLORS: Record<string, string> = {
  marketing: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  logistics: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  content: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  speakers: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  sponsorship: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  registration: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  production: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  creative: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  operations: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

type RiskState = "on_track" | "attention_needed" | "at_risk";

interface EnrichedDeliverable extends Deliverable {
  riskState: RiskState;
  eventName: string;
  assigneeName: string;
  workstreamGroup: string;
  targetDate: Date | null;
}

function calculateRiskState(deliverable: Deliverable): RiskState {
  const now = new Date();
  const status = deliverable.status || "todo";
  
  let targetDate: Date | null = null;
  if (deliverable.executionTime) {
    targetDate = new Date(deliverable.executionTime);
  } else if (deliverable.dueDate) {
    targetDate = parseISO(deliverable.dueDate);
  }
  
  if ((status === "todo" || status === "in_progress") && targetDate && isPast(targetDate)) {
    return "at_risk";
  }
  
  if (status === "todo" && targetDate) {
    const hoursUntilDue = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilDue > 0 && hoursUntilDue <= 48) {
      return "attention_needed";
    }
  }
  
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

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_ITEMS = 3;

const PHASE_DOT_COLORS: Record<string, string> = {
  "Pre-Program": "text-blue-600 dark:text-blue-400",
  "Program-Live": "text-green-600 dark:text-green-400",
  "Post-Program": "text-amber-600 dark:text-amber-400",
};

function DeliverablePill({ item }: { item: EnrichedDeliverable }) {
  const colorClass = WORKSTREAM_COLORS[item.workstream || "other"] || WORKSTREAM_COLORS.other;
  const isDone = item.status === "done";
  const phase = item.phase || "Pre-Program";
  const dotColor = PHASE_DOT_COLORS[phase] || "text-muted-foreground";
  
  return (
    <div 
      className={`text-xs px-1.5 py-0.5 rounded truncate ${colorClass} ${isDone ? "opacity-60 line-through" : ""}`}
      title={`${item.title} (${phase} - ${item.workstreamGroup})`}
      data-testid={`pill-deliverable-${item.id}`}
    >
      <span className={dotColor}>●</span> {item.title}
    </div>
  );
}

function MonthlyCalendar({ 
  items, 
  currentDate, 
  onDateChange 
}: { 
  items: EnrichedDeliverable[]; 
  currentDate: Date;
  onDateChange: (date: Date) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  const itemsByDate = useMemo(() => {
    const map = new Map<string, EnrichedDeliverable[]>();
    for (const item of items) {
      if (item.targetDate) {
        const dateKey = format(item.targetDate, "yyyy-MM-dd");
        const existing = map.get(dateKey) || [];
        existing.push(item);
        map.set(dateKey, existing);
      }
    }
    return map;
  }, [items]);
  
  const goToPrevMonth = () => onDateChange(subMonths(currentDate, 1));
  const goToNextMonth = () => onDateChange(addMonths(currentDate, 1));
  const goToToday = () => onDateChange(new Date());
  
  return (
    <Card data-testid="card-monthly-calendar">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg" data-testid="text-month-header">
            {format(currentDate, "MMMM yyyy")}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToPrevMonth}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToToday}
              data-testid="button-today-month"
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToNextMonth}
              data-testid="button-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
          {DAY_NAMES.map((day) => (
            <div 
              key={day} 
              className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
          {calendarDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayItems = itemsByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);
            const visibleItems = dayItems.slice(0, MAX_VISIBLE_ITEMS);
            const remainingCount = dayItems.length - MAX_VISIBLE_ITEMS;
            
            return (
              <div 
                key={dateKey}
                className={`bg-background min-h-[100px] p-1 ${!isCurrentMonth ? "opacity-40" : ""}`}
                data-testid={`cell-day-${dateKey}`}
              >
                <div className={`text-sm mb-1 ${isTodayDate ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : "text-muted-foreground"}`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <DeliverablePill key={item.id} item={item} />
                  ))}
                  {remainingCount > 0 && (
                    <div 
                      className="text-xs text-muted-foreground px-1"
                      data-testid={`text-more-${dateKey}`}
                    >
                      +{remainingCount} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyCalendar({ 
  items, 
  currentDate, 
  onDateChange 
}: { 
  items: EnrichedDeliverable[]; 
  currentDate: Date;
  onDateChange: (date: Date) => void;
}) {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const itemsByDate = useMemo(() => {
    const map = new Map<string, EnrichedDeliverable[]>();
    for (const item of items) {
      if (item.targetDate) {
        const dateKey = format(item.targetDate, "yyyy-MM-dd");
        const existing = map.get(dateKey) || [];
        existing.push(item);
        map.set(dateKey, existing);
      }
    }
    return map;
  }, [items]);
  
  const goToPrevWeek = () => onDateChange(subWeeks(currentDate, 1));
  const goToNextWeek = () => onDateChange(addWeeks(currentDate, 1));
  const goToToday = () => onDateChange(new Date());
  
  const weekRangeText = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
  
  return (
    <Card data-testid="card-weekly-calendar">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg" data-testid="text-week-header">
            {weekRangeText}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToPrevWeek}
              data-testid="button-prev-week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToToday}
              data-testid="button-today-week"
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToNextWeek}
              data-testid="button-next-week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
          {weekDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayItems = itemsByDate.get(dateKey) || [];
            const isTodayDate = isToday(day);
            
            return (
              <div 
                key={dateKey}
                className="bg-background"
                data-testid={`cell-week-day-${dateKey}`}
              >
                <div className={`p-2 text-center border-b ${isTodayDate ? "bg-primary/10" : "bg-muted"}`}>
                  <div className="text-sm font-medium text-muted-foreground">
                    {format(day, "EEE")}
                  </div>
                  <div className={`text-lg ${isTodayDate ? "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto" : ""}`}>
                    {format(day, "d")}
                  </div>
                </div>
                <div className="min-h-[150px] p-1.5 space-y-1">
                  {dayItems.map((item) => (
                    <DeliverablePill key={item.id} item={item} />
                  ))}
                  {dayItems.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center pt-4">
                      No items
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RunOfShow() {
  const [filterEventId, setFilterEventId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarType, setCalendarType] = useState<"week" | "month">("month");
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

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

  const runOfShowItems = useMemo(() => {
    return deliverables
      .filter((d) => {
        if (filterEventId && filterEventId !== "all" && d.eventId !== filterEventId) {
          return false;
        }

        const event = eventsMap[d.eventId];
        if (!event) return false;

        let targetDate: Date | null = null;
        if (d.executionTime) {
          targetDate = new Date(d.executionTime);
        } else if (d.dueDate) {
          targetDate = parseISO(d.dueDate);
        }

        if (!targetDate) {
          return false;
        }

        if (event.startDate) {
          const eventEnd = event.endDate ? parseISO(event.endDate) : parseISO(event.startDate);
          const windowEnd = addDays(eventEnd, 30);
          
          if (targetDate <= windowEnd) {
            return true;
          }
        }

        return false;
      })
      .map((d): EnrichedDeliverable => {
        let targetDate: Date | null = null;
        if (d.executionTime) {
          targetDate = new Date(d.executionTime);
        } else if (d.dueDate) {
          targetDate = parseISO(d.dueDate);
        }
        
        return {
          ...d,
          riskState: calculateRiskState(d),
          eventName: eventsMap[d.eventId]?.name || "Unknown",
          assigneeName: d.assignedTo ? assigneesMap[d.assignedTo] || "Unassigned" : "Unassigned",
          workstreamGroup: d.workstream ? WORKSTREAM_LABELS[d.workstream] || "Other" : "Other",
          targetDate,
        };
      })
      .sort((a, b) => {
        const aTime = a.targetDate ? a.targetDate.getTime() : Infinity;
        const bTime = b.targetDate ? b.targetDate.getTime() : Infinity;
        return aTime - bTime;
      });
  }, [deliverables, events, eventsMap, assigneesMap, filterEventId]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, EnrichedDeliverable[]> = {};
    
    for (const item of runOfShowItems) {
      const group = item.workstreamGroup;
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
    }

    const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
      const aIndex = WORKSTREAM_ORDER.indexOf(a);
      const bIndex = WORKSTREAM_ORDER.indexOf(b);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    return sortedGroups;
  }, [runOfShowItems]);

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
          Execution timeline derived from Deliverables — showing pre-program, live, and post-program tasks
        </p>

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

        <div className="flex items-center gap-4 mb-4 flex-wrap">
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

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "calendar")} className="w-full">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <TabsList data-testid="tabs-view-mode">
              <TabsTrigger value="list" data-testid="tab-list-view">
                <List className="h-4 w-4 mr-2" />
                List
              </TabsTrigger>
              <TabsTrigger value="calendar" data-testid="tab-calendar-view">
                <Calendar className="h-4 w-4 mr-2" />
                Calendar
              </TabsTrigger>
            </TabsList>
            
            {viewMode === "calendar" && (
              <div className="flex items-center gap-1">
                <Button
                  variant={calendarType === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarType("week")}
                  data-testid="button-week-view"
                >
                  Week
                </Button>
                <Button
                  variant={calendarType === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarType("month")}
                  data-testid="button-month-view"
                >
                  Month
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="list" className="mt-0">
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
                description="Deliverables with scheduled dates will appear here automatically"
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
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            {isLoading ? (
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[400px] w-full" />
                </CardContent>
              </Card>
            ) : runOfShowItems.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No execution items"
                description="Deliverables with scheduled dates will appear here automatically"
              />
            ) : calendarType === "month" ? (
              <MonthlyCalendar 
                items={runOfShowItems} 
                currentDate={calendarDate}
                onDateChange={setCalendarDate}
              />
            ) : (
              <WeeklyCalendar 
                items={runOfShowItems} 
                currentDate={calendarDate}
                onDateChange={setCalendarDate}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
