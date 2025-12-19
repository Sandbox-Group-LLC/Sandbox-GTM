import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { titleCase } from "@/lib/utils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, CheckSquare, Clock, AlertCircle, CheckCircle, Circle } from "lucide-react";
import { EventSelectField } from "@/components/event-select-field";
import type { Deliverable } from "@shared/schema";

const deliverableFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.string().default("todo"),
  priority: z.string().default("medium"),
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

export default function Deliverables() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Deliverable | null>(null);

  const { data: deliverables = [], isLoading } = useQuery<Deliverable[]>({
    queryKey: ["/api/deliverables"],
  });

  const form = useForm<DeliverableFormData>({
    resolver: zodResolver(deliverableFormSchema),
    defaultValues: {
      eventId: "",
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
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
      status: item.status || "todo",
      priority: item.priority || "medium",
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {columns.map((status) => {
                const config = statusConfig[status];
                const StatusIcon = config.icon;
                return (
                  <div key={status} className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <StatusIcon className={`h-4 w-4 ${config.color}`} />
                      <h3 className="font-medium">{config.label}</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {groupedDeliverables[status]?.length || 0}
                      </Badge>
                    </div>
                    <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-muted/30">
                      {groupedDeliverables[status]?.map((item) => (
                        <Card
                          key={item.id}
                          className="hover-elevate cursor-pointer"
                          onClick={() => handleEdit(item)}
                          data-testid={`card-deliverable-${item.id}`}
                        >
                          <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 pt-0 space-y-2">
                            {item.description && (
                              <CardDescription className="text-xs line-clamp-2">
                                {item.description}
                              </CardDescription>
                            )}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <Badge variant={priorityColors[item.priority || "medium"]} className="text-xs">
                                {titleCase(item.priority || "medium")}
                              </Badge>
                              {item.dueDate && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(item.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
