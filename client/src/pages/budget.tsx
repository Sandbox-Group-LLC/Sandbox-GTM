import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { StatsCard } from "@/components/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { EventSelectField } from "@/components/event-select-field";
import type { BudgetItem } from "@shared/schema";

const budgetFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  plannedAmount: z.string().min(1, "Planned amount is required"),
  actualAmount: z.string().optional(),
  status: z.string().default("pending"),
  notes: z.string().optional(),
});

type BudgetFormData = z.infer<typeof budgetFormSchema>;

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  spent: "outline",
  over_budget: "destructive",
};

const categories = [
  "Venue",
  "Catering",
  "AV Equipment",
  "Marketing",
  "Speakers",
  "Transportation",
  "Accommodation",
  "Signage",
  "Staff",
  "Miscellaneous",
];

export default function Budget() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);

  const { data: budgetItems = [], isLoading } = useQuery<BudgetItem[]>({
    queryKey: ["/api/budget"],
  });

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      eventId: "",
      category: "",
      description: "",
      plannedAmount: "",
      actualAmount: "",
      status: "pending",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: BudgetFormData) => {
      return await apiRequest("POST", "/api/budget", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Budget item added successfully" });
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
    mutationFn: async ({ id, data }: { id: string; data: BudgetFormData }) => {
      return await apiRequest("PATCH", `/api/budget/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Budget item updated successfully" });
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

  const onSubmit = (data: BudgetFormData) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (item: BudgetItem) => {
    setEditingItem(item);
    form.reset({
      eventId: item.eventId,
      category: item.category,
      description: item.description,
      plannedAmount: item.plannedAmount,
      actualAmount: item.actualAmount || "",
      status: item.status || "pending",
      notes: item.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    form.reset();
  };

  const totalPlanned = budgetItems.reduce((sum, item) => sum + parseFloat(item.plannedAmount || "0"), 0);
  const totalActual = budgetItems.reduce((sum, item) => sum + parseFloat(item.actualAmount || "0"), 0);
  const variance = totalPlanned - totalActual;
  const usagePercent = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;

  const columns = [
    {
      key: "category",
      header: "Category",
      cell: (item: BudgetItem) => (
        <Badge variant="outline">{item.category}</Badge>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (item: BudgetItem) => item.description,
    },
    {
      key: "plannedAmount",
      header: "Planned",
      cell: (item: BudgetItem) => (
        <span className="font-mono">${parseFloat(item.plannedAmount).toLocaleString()}</span>
      ),
      className: "text-right",
    },
    {
      key: "actualAmount",
      header: "Actual",
      cell: (item: BudgetItem) => (
        <span className="font-mono">
          {item.actualAmount ? `$${parseFloat(item.actualAmount).toLocaleString()}` : "-"}
        </span>
      ),
      className: "text-right",
    },
    {
      key: "variance",
      header: "Variance",
      cell: (item: BudgetItem) => {
        const planned = parseFloat(item.plannedAmount || "0");
        const actual = parseFloat(item.actualAmount || "0");
        const diff = planned - actual;
        if (!item.actualAmount) return "-";
        return (
          <span className={`font-mono ${diff >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {diff >= 0 ? "+" : ""}{diff.toLocaleString()}
          </span>
        );
      },
      className: "text-right",
    },
    {
      key: "status",
      header: "Status",
      cell: (item: BudgetItem) => (
        <Badge variant={statusColors[item.status || "pending"]}>
          {item.status?.replace("_", " ") || "pending"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (item: BudgetItem) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(item);
          }}
          data-testid={`button-edit-${item.id}`}
        >
          Edit
        </Button>
      ),
      className: "w-20",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Budget"
        breadcrumbs={[{ label: "Budget" }]}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleDialogClose()}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-budget">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Budget Item" : "Add Budget Item"}</DialogTitle>
                <DialogDescription>
                  {editingItem ? "Update the budget item details" : "Add a new budget line item"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <EventSelectField control={form.control} />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          <Input {...field} data-testid="input-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="plannedAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Planned Amount</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} data-testid="input-planned" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="actualAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actual Amount</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} data-testid="input-actual" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="spent">Spent</SelectItem>
                            <SelectItem value="over_budget">Over Budget</SelectItem>
                          </SelectContent>
                        </Select>
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
                          <Textarea {...field} data-testid="input-notes" />
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
                      data-testid="button-submit-budget"
                    >
                      {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingItem ? "Update" : "Add Item"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard
              title="Total Budget"
              value={`$${totalPlanned.toLocaleString()}`}
              icon={Wallet}
            />
            <StatsCard
              title="Total Spent"
              value={`$${totalActual.toLocaleString()}`}
              icon={DollarSign}
            />
            <StatsCard
              title="Variance"
              value={`${variance >= 0 ? "+" : ""}$${variance.toLocaleString()}`}
              icon={variance >= 0 ? TrendingUp : TrendingDown}
            />
            <div className="p-6 rounded-lg border bg-card">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-medium text-muted-foreground">Budget Usage</span>
                <span className="text-sm font-mono">{usagePercent.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(usagePercent, 100)} className="h-2" />
            </div>
          </div>

          {!isLoading && budgetItems.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No budget items yet"
              description="Start tracking your event budget by adding line items"
              action={{
                label: "Add Budget Item",
                onClick: () => setIsDialogOpen(true),
              }}
            />
          ) : (
            <DataTable
              columns={columns}
              data={budgetItems}
              isLoading={isLoading}
              emptyMessage="No budget items found"
              getRowKey={(item) => item.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
