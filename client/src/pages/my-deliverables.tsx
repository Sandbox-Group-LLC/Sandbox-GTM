import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { titleCase } from "@/lib/utils";
import { CheckSquare, Clock, AlertCircle, CheckCircle, Circle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Deliverable } from "@shared/schema";

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

const statusUpdateSchema = z.object({
  status: z.string(),
});

type StatusUpdateData = z.infer<typeof statusUpdateSchema>;

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

const columns: Array<keyof typeof statusConfig> = ["todo", "in_progress", "review", "done"];

export default function MyDeliverables() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedItem, setSelectedItem] = useState<Deliverable | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: allDeliverables = [], isLoading: deliverablesLoading } = useQuery<Deliverable[]>({
    queryKey: ["/api/deliverables"],
  });

  const isLoading = authLoading || deliverablesLoading;
  
  // Debug logging to trace the issue - will show in browser console
  console.log('[My Deliverables Debug]', {
    userId: user?.id,
    totalDeliverables: allDeliverables.length,
    deliverables: allDeliverables.map(d => ({
      id: d.id,
      title: d.title,
      assignedTo: d.assignedTo,
      organizationId: d.organizationId,
      matches: d.assignedTo === user?.id,
    })),
  });
  
  const myDeliverables = user ? allDeliverables.filter(d => d.assignedTo === user.id) : [];

  const form = useForm<StatusUpdateData>({
    resolver: zodResolver(statusUpdateSchema),
    defaultValues: {
      status: "todo",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/deliverables/${data.id}`, { status: data.status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliverables"] });
      toast({ title: "Status updated" });
      setIsDialogOpen(false);
      setSelectedItem(null);
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const handleCardClick = (item: Deliverable) => {
    setSelectedItem(item);
    form.reset({ status: item.status || "todo" });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: StatusUpdateData) => {
    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, status: data.status });
    }
  };

  const groupedDeliverables = columns.reduce((acc, status) => {
    acc[status] = myDeliverables.filter(d => d.status === status);
    return acc;
  }, {} as Record<string, Deliverable[]>);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="My Deliverables"
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
          ) : myDeliverables.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No deliverables assigned"
              description="You don't have any tasks assigned to you yet"
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
                      {groupedDeliverables[status]?.map((item) => {
                        const workstreamLabel = item.workstream ? WORKSTREAM_OPTIONS.find(w => w.value === item.workstream)?.label : null;
                        return (
                          <Card
                            key={item.id}
                            className="hover-elevate cursor-pointer"
                            onClick={() => handleCardClick(item)}
                            data-testid={`card-my-deliverable-${item.id}`}
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
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge variant={priorityColors[item.priority || "medium"]} className="text-xs">
                                    {titleCase(item.priority || "medium")}
                                  </Badge>
                                  {workstreamLabel && (
                                    <Badge variant="outline" className="text-xs">
                                      {workstreamLabel}
                                    </Badge>
                                  )}
                                </div>
                                {item.dueDate && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(item.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedItem?.title}</DialogTitle>
            <DialogDescription>
              {selectedItem?.description || "Update the status of this deliverable"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-my-deliverable-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([value, config]) => (
                          <SelectItem key={value} value={value} data-testid={`option-status-${value}`}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-status"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-update-status"
                >
                  {updateMutation.isPending ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
