import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, CheckSquare, Clock, AlertCircle, CheckCircle, Circle, User, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { EventSelectField } from "@/components/event-select-field";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Deliverable, Event } from "@shared/schema";

type Assignee = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
};

const WORKSTREAM_OPTIONS = [
  { value: "marketing", label: "Marketing" },
  { value: "logistics", label: "Logistics" },
  { value: "content", label: "Content" },
  { value: "speakers", label: "Speakers" },
  { value: "sponsorship", label: "Sponsorship" },
  { value: "registration", label: "Registration" },
  { value: "production", label: "Production" },
  { value: "creative", label: "Creative" },
  { value: "operations", label: "Operations" },
  { value: "other", label: "Other" },
];

const deliverableFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  workstream: z.string().optional(),
  status: z.string().default("todo"),
  priority: z.string().default("medium"),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
});

type DeliverableFormData = z.infer<typeof deliverableFormSchema>;

const statusConfig: Record<string, { label: string; icon: typeof Circle; color: string }> = {
  todo: { label: "To Do", icon: Circle, color: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-blue-600 dark:text-blue-400" },
  review: { label: "In Review", icon: AlertCircle, color: "text-amber-600 dark:text-amber-400" },
  done: { label: "Done", icon: CheckCircle, color: "text-green-600 dark:text-green-400" },
};

const priorityColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

type SortColumn = "title" | "status" | "priority" | "workstream" | "assignedTo" | "dueDate" | "event";
type SortDirection = "asc" | "desc" | null;

export default function Deliverables() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Deliverable | null>(null);
  const [filterEventId, setFilterEventId] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const { data: deliverables = [], isLoading } = useQuery<Deliverable[]>({
    queryKey: ["/api/deliverables"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: assignees = [] } = useQuery<Assignee[]>({
    queryKey: ["/api/organization/assignees"],
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4 ml-1" />;
    if (sortDirection === "desc") return <ArrowDown className="h-4 w-4 ml-1" />;
    return <ArrowUpDown className="h-4 w-4 ml-1" />;
  };

  const eventsMap = useMemo(() => {
    return events.reduce((acc, event) => {
      acc[event.id] = event.name;
      return acc;
    }, {} as Record<string, string>);
  }, [events]);

  const assigneesMap = useMemo(() => {
    return assignees.reduce((acc, a) => {
      acc[a.id] = `${a.firstName || ""} ${a.lastName || ""}`.trim() || a.email || "";
      return acc;
    }, {} as Record<string, string>);
  }, [assignees]);

  const filteredAndSortedDeliverables = useMemo(() => {
    let result = [...deliverables];

    if (filterEventId && filterEventId !== "all") {
      result = result.filter(d => d.eventId === filterEventId);
    }

    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        let aVal: string | null = null;
        let bVal: string | null = null;

        switch (sortColumn) {
          case "title":
            aVal = a.title || "";
            bVal = b.title || "";
            break;
          case "status":
            aVal = a.status || "";
            bVal = b.status || "";
            break;
          case "priority":
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            aVal = String(priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2);
            bVal = String(priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2);
            break;
          case "workstream":
            aVal = a.workstream || "";
            bVal = b.workstream || "";
            break;
          case "assignedTo":
            aVal = a.assignedTo ? assigneesMap[a.assignedTo] || "" : "";
            bVal = b.assignedTo ? assigneesMap[b.assignedTo] || "" : "";
            break;
          case "dueDate":
            aVal = a.dueDate || "";
            bVal = b.dueDate || "";
            break;
          case "event":
            aVal = eventsMap[a.eventId] || "";
            bVal = eventsMap[b.eventId] || "";
            break;
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [deliverables, filterEventId, sortColumn, sortDirection, eventsMap, assigneesMap]);

  const form = useForm<DeliverableFormData>({
    resolver: zodResolver(deliverableFormSchema),
    defaultValues: {
      eventId: "",
      title: "",
      description: "",
      workstream: "",
      status: "todo",
      priority: "medium",
      assignedTo: "",
      dueDate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DeliverableFormData) => {
      return await apiRequest("POST", "/api/deliverables", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliverables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Deliverable created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DeliverableFormData }) => {
      return await apiRequest("PATCH", `/api/deliverables/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliverables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Deliverable updated successfully" });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: DeliverableFormData) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (item: Deliverable) => {
    setEditingItem(item);
    form.reset({
      eventId: item.eventId,
      title: item.title,
      description: item.description || "",
      workstream: item.workstream || "",
      status: item.status || "todo",
      priority: item.priority || "medium",
      assignedTo: item.assignedTo || "",
      dueDate: item.dueDate || "",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    form.reset();
  };

  const columns = ["todo", "in_progress", "review", "done"];
  const groupedDeliverables = columns.reduce((acc, status) => {
    acc[status] = deliverables.filter((d) => d.status === status);
    return acc;
  }, {} as Record<string, Deliverable[]>);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Deliverables"
        breadcrumbs={[{ label: "Deliverables" }]}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleDialogClose()}>
            <DialogTrigger asChild>
              <Button size="icon" className="sm:w-auto sm:px-4" data-testid="button-add-deliverable">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Deliverable</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Deliverable" : "Create Deliverable"}</DialogTitle>
                <DialogDescription>
                  {editingItem ? "Update the deliverable details" : "Add a new task to track"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <EventSelectField control={form.control} />
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="workstream"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Workstream</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-workstream">
                                <SelectValue placeholder="Select workstream" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {WORKSTREAM_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="assignedTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned To</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-assignee">
                                <SelectValue placeholder="Select team member" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {assignees.map((assignee) => (
                                <SelectItem key={assignee.id} value={assignee.id}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={assignee.profileImageUrl || undefined} />
                                      <AvatarFallback className="text-xs">
                                        {(assignee.firstName?.[0] || assignee.email?.[0] || '?').toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span>{assignee.firstName} {assignee.lastName}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="todo">To Do</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="review">In Review</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-priority">
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-due-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit-deliverable"
                    >
                      {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingItem ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-4 gap-4">
              {columns.map((col) => (
                <div key={col} className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ))}
            </div>
          ) : deliverables.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No deliverables yet"
              description="Start tracking your event tasks and deliverables"
              action={{
                label: "Add Deliverable",
                onClick: () => setIsDialogOpen(true),
              }}
            />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {columns.map((status) => {
                  const config = statusConfig[status];
                  const StatusIcon = config.icon;
                  const count = groupedDeliverables[status]?.length || 0;
                  return (
                    <Card key={status} data-testid={`card-stage-${status}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`h-5 w-5 ${config.color}`} />
                          <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold" data-testid={`text-count-${status}`}>{count}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
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

                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer" 
                          onClick={() => handleSort("title")}
                          data-testid="th-title"
                        >
                          <div className="flex items-center">
                            Title
                            {getSortIcon("title")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer" 
                          onClick={() => handleSort("event")}
                          data-testid="th-event"
                        >
                          <div className="flex items-center">
                            Program
                            {getSortIcon("event")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer" 
                          onClick={() => handleSort("status")}
                          data-testid="th-status"
                        >
                          <div className="flex items-center">
                            Status
                            {getSortIcon("status")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer" 
                          onClick={() => handleSort("priority")}
                          data-testid="th-priority"
                        >
                          <div className="flex items-center">
                            Priority
                            {getSortIcon("priority")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer" 
                          onClick={() => handleSort("workstream")}
                          data-testid="th-workstream"
                        >
                          <div className="flex items-center">
                            Workstream
                            {getSortIcon("workstream")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer" 
                          onClick={() => handleSort("assignedTo")}
                          data-testid="th-assignee"
                        >
                          <div className="flex items-center">
                            Assignee
                            {getSortIcon("assignedTo")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer" 
                          onClick={() => handleSort("dueDate")}
                          data-testid="th-due-date"
                        >
                          <div className="flex items-center">
                            Due Date
                            {getSortIcon("dueDate")}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedDeliverables.map((item) => {
                        const statusCfg = statusConfig[item.status || "todo"];
                        const workstreamLabel = item.workstream 
                          ? WORKSTREAM_OPTIONS.find(w => w.value === item.workstream)?.label 
                          : null;
                        return (
                          <TableRow 
                            key={item.id} 
                            className="cursor-pointer"
                            onClick={() => handleEdit(item)}
                            data-testid={`row-deliverable-${item.id}`}
                          >
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell>{eventsMap[item.eventId] || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="gap-1">
                                <statusCfg.icon className={`h-3 w-3 ${statusCfg.color}`} />
                                {statusCfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={priorityColors[item.priority || "medium"]}>
                                {(item.priority || "medium").charAt(0).toUpperCase() + (item.priority || "medium").slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>{workstreamLabel || "—"}</TableCell>
                            <TableCell>
                              {item.assignedTo && assigneesMap[item.assignedTo] 
                                ? assigneesMap[item.assignedTo] 
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {item.dueDate 
                                ? new Date(item.dueDate).toLocaleDateString() 
                                : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredAndSortedDeliverables.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No deliverables found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
