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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Plus,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Settings,
  Trash2,
  Pencil,
} from "lucide-react";
import type {
  BudgetItem,
  BudgetCategory,
  BudgetOffset,
  EventBudgetSettings,
  BudgetPayment,
  Event,
} from "@shared/schema";

const budgetItemFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  categoryId: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  estimateAmount: z.string().default("0"),
  forecastAmount: z.string().default("0"),
  onsiteAmount: z.string().default("0"),
  finalAmount: z.string().default("0"),
  notes: z.string().optional(),
});

const offsetFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  name: z.string().min(1, "Name is required"),
  estimateAmount: z.string().default("0"),
  forecastAmount: z.string().default("0"),
  onsiteAmount: z.string().default("0"),
  finalAmount: z.string().default("0"),
  notes: z.string().optional(),
});

const paymentFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  budgetItemId: z.string().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  amount: z.string().min(1, "Amount is required"),
  status: z.string().default("pending"),
  notes: z.string().optional(),
});

const budgetSettingsFormSchema = z.object({
  budgetCap: z.string().optional(),
});

const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  sortOrder: z.string().default("0"),
});

type BudgetItemFormData = z.infer<typeof budgetItemFormSchema>;
type CategoryFormData = z.infer<typeof categoryFormSchema>;
type OffsetFormData = z.infer<typeof offsetFormSchema>;
type PaymentFormData = z.infer<typeof paymentFormSchema>;
type BudgetSettingsFormData = z.infer<typeof budgetSettingsFormSchema>;

const paymentStatusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  paid: "default",
  overdue: "destructive",
  cancelled: "outline",
};

function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num === null || num === undefined || isNaN(num)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function parseAmount(value: string | null | undefined): number {
  if (!value) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

export default function Budget() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isOffsetDialogOpen, setIsOffsetDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [editingOffset, setEditingOffset] = useState<BudgetOffset | null>(null);
  const [editingPayment, setEditingPayment] = useState<BudgetPayment | null>(null);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: categories = [] } = useQuery<BudgetCategory[]>({
    queryKey: ["/api/budget-categories"],
  });

  const { data: budgetItems = [], isLoading: itemsLoading } = useQuery<BudgetItem[]>({
    queryKey: ["/api/budget", selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const res = await fetch(`/api/budget?eventId=${selectedEventId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch budget items");
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const { data: offsets = [] } = useQuery<BudgetOffset[]>({
    queryKey: ["/api/budget-offsets", selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const res = await fetch(`/api/budget-offsets?eventId=${selectedEventId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch offsets");
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const { data: budgetSettings } = useQuery<EventBudgetSettings | null>({
    queryKey: ["/api/events", selectedEventId, "budget-settings"],
    queryFn: async () => {
      if (!selectedEventId) return null;
      const res = await fetch(`/api/events/${selectedEventId}/budget-settings`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const { data: payments = [] } = useQuery<BudgetPayment[]>({
    queryKey: ["/api/budget-payments", selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const res = await fetch(`/api/budget-payments?eventId=${selectedEventId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const itemForm = useForm<BudgetItemFormData>({
    resolver: zodResolver(budgetItemFormSchema),
    defaultValues: {
      eventId: selectedEventId,
      categoryId: "",
      category: "",
      description: "",
      estimateAmount: "0",
      forecastAmount: "0",
      onsiteAmount: "0",
      finalAmount: "0",
      notes: "",
    },
  });

  const offsetForm = useForm<OffsetFormData>({
    resolver: zodResolver(offsetFormSchema),
    defaultValues: {
      eventId: selectedEventId,
      name: "",
      estimateAmount: "0",
      forecastAmount: "0",
      onsiteAmount: "0",
      finalAmount: "0",
      notes: "",
    },
  });

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      eventId: selectedEventId,
      budgetItemId: "",
      invoiceNumber: "",
      amount: "",
      status: "pending",
      notes: "",
    },
  });

  const settingsForm = useForm<BudgetSettingsFormData>({
    resolver: zodResolver(budgetSettingsFormSchema),
    defaultValues: {
      budgetCap: budgetSettings?.budgetCap || "",
    },
  });

  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      sortOrder: "0",
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      return await apiRequest("POST", "/api/budget-categories", {
        name: data.name,
        sortOrder: parseInt(data.sortOrder) || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-categories"] });
      toast({ title: "Category added" });
      setIsCategoryDialogOpen(false);
      categoryForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryFormData }) => {
      return await apiRequest("PATCH", `/api/budget-categories/${id}`, {
        name: data.name,
        sortOrder: parseInt(data.sortOrder) || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-categories"] });
      toast({ title: "Category updated" });
      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/budget-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-categories"] });
      toast({ title: "Category deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: BudgetItemFormData) => {
      return await apiRequest("POST", "/api/budget", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget", selectedEventId] });
      toast({ title: "Budget item added" });
      setIsItemDialogOpen(false);
      itemForm.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BudgetItemFormData }) => {
      return await apiRequest("PATCH", `/api/budget/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget", selectedEventId] });
      toast({ title: "Budget item updated" });
      setIsItemDialogOpen(false);
      setEditingItem(null);
      itemForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/budget/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget", selectedEventId] });
      toast({ title: "Budget item deleted" });
    },
  });

  const createOffsetMutation = useMutation({
    mutationFn: async (data: OffsetFormData) => {
      return await apiRequest("POST", "/api/budget-offsets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-offsets", selectedEventId] });
      toast({ title: "Offset added" });
      setIsOffsetDialogOpen(false);
      offsetForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateOffsetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: OffsetFormData }) => {
      return await apiRequest("PATCH", `/api/budget-offsets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-offsets", selectedEventId] });
      toast({ title: "Offset updated" });
      setIsOffsetDialogOpen(false);
      setEditingOffset(null);
      offsetForm.reset();
    },
  });

  const deleteOffsetMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/budget-offsets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-offsets", selectedEventId] });
      toast({ title: "Offset deleted" });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      return await apiRequest("POST", "/api/budget-payments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-payments", selectedEventId] });
      toast({ title: "Payment added" });
      setIsPaymentDialogOpen(false);
      paymentForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PaymentFormData }) => {
      return await apiRequest("PATCH", `/api/budget-payments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-payments", selectedEventId] });
      toast({ title: "Payment updated" });
      setIsPaymentDialogOpen(false);
      setEditingPayment(null);
      paymentForm.reset();
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/budget-payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-payments", selectedEventId] });
      toast({ title: "Payment deleted" });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: BudgetSettingsFormData) => {
      return await apiRequest("PUT", `/api/events/${selectedEventId}/budget-settings`, {
        eventId: selectedEventId,
        budgetCap: data.budgetCap || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "budget-settings"] });
      toast({ title: "Budget settings saved" });
      setIsSettingsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const groupedItems = useMemo(() => {
    const groups: Record<string, BudgetItem[]> = {};
    budgetItems.forEach((item) => {
      const cat = item.category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [budgetItems]);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, { estimate: number; forecast: number; onsite: number; final: number }> = {};
    Object.entries(groupedItems).forEach(([cat, items]) => {
      totals[cat] = {
        estimate: items.reduce((sum, item) => sum + parseAmount(item.estimateAmount), 0),
        forecast: items.reduce((sum, item) => sum + parseAmount(item.forecastAmount), 0),
        onsite: items.reduce((sum, item) => sum + parseAmount(item.onsiteAmount), 0),
        final: items.reduce((sum, item) => sum + parseAmount(item.finalAmount), 0),
      };
    });
    return totals;
  }, [groupedItems]);

  const grandTotals = useMemo(() => {
    return {
      estimate: budgetItems.reduce((sum, item) => sum + parseAmount(item.estimateAmount), 0),
      forecast: budgetItems.reduce((sum, item) => sum + parseAmount(item.forecastAmount), 0),
      onsite: budgetItems.reduce((sum, item) => sum + parseAmount(item.onsiteAmount), 0),
      final: budgetItems.reduce((sum, item) => sum + parseAmount(item.finalAmount), 0),
    };
  }, [budgetItems]);

  const offsetTotals = useMemo(() => {
    return {
      estimate: offsets.reduce((sum, o) => sum + parseAmount(o.estimateAmount), 0),
      forecast: offsets.reduce((sum, o) => sum + parseAmount(o.forecastAmount), 0),
      onsite: offsets.reduce((sum, o) => sum + parseAmount(o.onsiteAmount), 0),
      final: offsets.reduce((sum, o) => sum + parseAmount(o.finalAmount), 0),
    };
  }, [offsets]);

  const netTotals = useMemo(() => {
    return {
      estimate: grandTotals.estimate - offsetTotals.estimate,
      forecast: grandTotals.forecast - offsetTotals.forecast,
      onsite: grandTotals.onsite - offsetTotals.onsite,
      final: grandTotals.final - offsetTotals.final,
    };
  }, [grandTotals, offsetTotals]);

  const budgetCap = parseAmount(budgetSettings?.budgetCap);
  const delta = budgetCap - netTotals.final;
  const isOverBudget = budgetCap > 0 && netTotals.final > budgetCap;

  const paymentTotals = useMemo(() => {
    const paid = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + parseAmount(p.amount), 0);
    const pending = payments.filter((p) => p.status === "pending").reduce((sum, p) => sum + parseAmount(p.amount), 0);
    return { paid, pending, total: paid + pending };
  }, [payments]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleEditItem = (item: BudgetItem) => {
    setEditingItem(item);
    itemForm.reset({
      eventId: item.eventId,
      categoryId: item.categoryId || "",
      category: item.category,
      description: item.description,
      estimateAmount: item.estimateAmount || "0",
      forecastAmount: item.forecastAmount || "0",
      onsiteAmount: item.onsiteAmount || "0",
      finalAmount: item.finalAmount || "0",
      notes: item.notes || "",
    });
    setIsItemDialogOpen(true);
  };

  const handleEditOffset = (offset: BudgetOffset) => {
    setEditingOffset(offset);
    offsetForm.reset({
      eventId: offset.eventId,
      name: offset.name,
      estimateAmount: offset.estimateAmount || "0",
      forecastAmount: offset.forecastAmount || "0",
      onsiteAmount: offset.onsiteAmount || "0",
      finalAmount: offset.finalAmount || "0",
      notes: offset.notes || "",
    });
    setIsOffsetDialogOpen(true);
  };

  const handleEditPayment = (payment: BudgetPayment) => {
    setEditingPayment(payment);
    paymentForm.reset({
      eventId: payment.eventId,
      budgetItemId: payment.budgetItemId || "",
      invoiceNumber: payment.invoiceNumber,
      amount: payment.amount,
      status: payment.status || "pending",
      notes: payment.notes || "",
    });
    setIsPaymentDialogOpen(true);
  };

  const onItemSubmit = (data: BudgetItemFormData) => {
    const payload = { ...data, eventId: selectedEventId };
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createItemMutation.mutate(payload);
    }
  };

  const onOffsetSubmit = (data: OffsetFormData) => {
    const payload = { ...data, eventId: selectedEventId };
    if (editingOffset) {
      updateOffsetMutation.mutate({ id: editingOffset.id, data: payload });
    } else {
      createOffsetMutation.mutate(payload);
    }
  };

  const onPaymentSubmit = (data: PaymentFormData) => {
    const payload = { ...data, eventId: selectedEventId };
    if (editingPayment) {
      updatePaymentMutation.mutate({ id: editingPayment.id, data: payload });
    } else {
      createPaymentMutation.mutate(payload);
    }
  };

  const onSettingsSubmit = (data: BudgetSettingsFormData) => {
    updateSettingsMutation.mutate(data);
  };

  const handleEditCategory = (category: BudgetCategory) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      sortOrder: String(category.sortOrder || 0),
    });
    setIsCategoryDialogOpen(true);
  };

  const onCategorySubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const allCategories = useMemo(() => {
    const catSet = new Set<string>();
    categories.forEach((c) => catSet.add(c.name));
    budgetItems.forEach((item) => catSet.add(item.category));
    return Array.from(catSet).sort();
  }, [categories, budgetItems]);

  if (eventsLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Budget" breadcrumbs={[{ label: "Budget" }]} />
        <div className="flex-1 p-6">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Budget"
        breadcrumbs={[{ label: "Budget" }]}
        actions={
          selectedEventId && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  settingsForm.reset({ budgetCap: budgetSettings?.budgetCap || "" });
                  setIsSettingsDialogOpen(true);
                }}
                data-testid="button-budget-settings"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          )
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Select
              value={selectedEventId}
              onValueChange={(val) => setSelectedEventId(val)}
            >
              <SelectTrigger className="w-64" data-testid="select-event">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedEventId ? (
            <EmptyState
              icon={DollarSign}
              title="Select an event"
              description="Choose an event to view and manage its budget"
            />
          ) : (
            <Tabs defaultValue="summary" className="space-y-6">
              <TabsList>
                <TabsTrigger value="summary" data-testid="tab-summary">Summary</TabsTrigger>
                <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
                <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-6">
                {budgetCap > 0 && (
                  <Card className={isOverBudget ? "border-destructive" : ""}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          {isOverBudget ? (
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                          ) : (
                            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                          )}
                          <div>
                            <p className="text-sm text-muted-foreground">Budget Cap (Do Not Exceed)</p>
                            <p className="text-2xl font-bold font-mono">{formatCurrency(budgetCap)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Delta</p>
                          <p className={`text-2xl font-bold font-mono ${isOverBudget ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                            {delta >= 0 ? "+" : ""}{formatCurrency(delta)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
                    <CardTitle className="text-lg">Budget Items</CardTitle>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingItem(null);
                        itemForm.reset({
                          eventId: selectedEventId,
                          categoryId: "",
                          category: "",
                          description: "",
                          estimateAmount: "0",
                          forecastAmount: "0",
                          onsiteAmount: "0",
                          finalAmount: "0",
                          notes: "",
                        });
                        setIsItemDialogOpen(true);
                      }}
                      data-testid="button-add-budget-item"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {itemsLoading ? (
                      <div className="p-6">
                        <Skeleton className="h-48 w-full" />
                      </div>
                    ) : budgetItems.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">
                        No budget items yet. Add your first item to get started.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-[300px]">Category / Description</TableHead>
                              <TableHead className="text-right w-[120px]">Estimate</TableHead>
                              <TableHead className="text-right w-[120px]">Forecast</TableHead>
                              <TableHead className="text-right w-[120px]">Onsite</TableHead>
                              <TableHead className="text-right w-[120px]">Final</TableHead>
                              <TableHead className="text-right w-[80px]">% Budget</TableHead>
                              <TableHead className="text-right w-[120px]">Variance</TableHead>
                              <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(groupedItems).map(([category, items]) => {
                              const totals = categoryTotals[category];
                              const isExpanded = expandedCategories.has(category);
                              const percentOfBudget = grandTotals.final > 0
                                ? ((totals.final / grandTotals.final) * 100).toFixed(1)
                                : "0.0";
                              const variance = totals.estimate - totals.final;

                              return (
                                <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)} asChild>
                                  <>
                                    <CollapsibleTrigger asChild>
                                      <TableRow
                                        className="cursor-pointer hover-elevate bg-muted/30"
                                        data-testid={`row-category-${category}`}
                                      >
                                        <TableCell className="font-medium">
                                          <div className="flex items-center gap-2">
                                            {isExpanded ? (
                                              <ChevronDown className="h-4 w-4" />
                                            ) : (
                                              <ChevronRight className="h-4 w-4" />
                                            )}
                                            {category}
                                            <Badge variant="secondary" className="ml-2">
                                              {items.length}
                                            </Badge>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                          {formatCurrency(totals.estimate)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                          {formatCurrency(totals.forecast)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                          {formatCurrency(totals.onsite)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-medium">
                                          {formatCurrency(totals.final)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                          {percentOfBudget}%
                                        </TableCell>
                                        <TableCell className={`text-right font-mono ${variance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                          {variance >= 0 ? "+" : ""}{formatCurrency(variance)}
                                        </TableCell>
                                        <TableCell></TableCell>
                                      </TableRow>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent asChild>
                                      <>
                                        {items.map((item) => {
                                          const itemVariance = parseAmount(item.estimateAmount) - parseAmount(item.finalAmount);
                                          const itemPercent = grandTotals.final > 0
                                            ? ((parseAmount(item.finalAmount) / grandTotals.final) * 100).toFixed(1)
                                            : "0.0";

                                          return (
                                            <TableRow key={item.id} className="hover-elevate" data-testid={`row-item-${item.id}`}>
                                              <TableCell className="pl-10 text-muted-foreground">
                                                {item.description}
                                              </TableCell>
                                              <TableCell className="text-right font-mono text-muted-foreground">
                                                {formatCurrency(item.estimateAmount)}
                                              </TableCell>
                                              <TableCell className="text-right font-mono text-muted-foreground">
                                                {formatCurrency(item.forecastAmount)}
                                              </TableCell>
                                              <TableCell className="text-right font-mono text-muted-foreground">
                                                {formatCurrency(item.onsiteAmount)}
                                              </TableCell>
                                              <TableCell className="text-right font-mono">
                                                {formatCurrency(item.finalAmount)}
                                              </TableCell>
                                              <TableCell className="text-right font-mono text-muted-foreground">
                                                {itemPercent}%
                                              </TableCell>
                                              <TableCell className={`text-right font-mono ${itemVariance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                                {itemVariance >= 0 ? "+" : ""}{formatCurrency(itemVariance)}
                                              </TableCell>
                                              <TableCell>
                                                <div className="flex items-center gap-1">
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEditItem(item)}
                                                    data-testid={`button-edit-item-${item.id}`}
                                                  >
                                                    <Pencil className="h-4 w-4" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteItemMutation.mutate(item.id)}
                                                    data-testid={`button-delete-item-${item.id}`}
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </>
                                    </CollapsibleContent>
                                  </>
                                </Collapsible>
                              );
                            })}
                            <TableRow className="bg-muted font-bold">
                              <TableCell className="rounded-bl-lg">Subtotal (Expenses)</TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(grandTotals.estimate)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(grandTotals.forecast)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(grandTotals.onsite)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(grandTotals.final)}
                              </TableCell>
                              <TableCell className="text-right">100%</TableCell>
                              <TableCell className={`text-right font-mono ${grandTotals.estimate - grandTotals.final >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                {grandTotals.estimate - grandTotals.final >= 0 ? "+" : ""}
                                {formatCurrency(grandTotals.estimate - grandTotals.final)}
                              </TableCell>
                              <TableCell className="rounded-br-lg"></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
                    <CardTitle className="text-lg">Revenue / Credits (Offsets)</CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingOffset(null);
                        offsetForm.reset({
                          eventId: selectedEventId,
                          name: "",
                          estimateAmount: "0",
                          forecastAmount: "0",
                          onsiteAmount: "0",
                          finalAmount: "0",
                          notes: "",
                        });
                        setIsOffsetDialogOpen(true);
                      }}
                      data-testid="button-add-offset"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Offset
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[300px]">Name</TableHead>
                            <TableHead className="text-right w-[120px]">Estimate</TableHead>
                            <TableHead className="text-right w-[120px]">Forecast</TableHead>
                            <TableHead className="text-right w-[120px]">Onsite</TableHead>
                            <TableHead className="text-right w-[120px]">Final</TableHead>
                            <TableHead className="w-[200px]"></TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {offsets.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                No offsets yet. Add revenue or credits to offset expenses.
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {offsets.map((offset) => (
                                <TableRow key={offset.id} className="hover-elevate" data-testid={`row-offset-${offset.id}`}>
                                  <TableCell>{offset.name}</TableCell>
                                  <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                                    -{formatCurrency(offset.estimateAmount)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                                    -{formatCurrency(offset.forecastAmount)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                                    -{formatCurrency(offset.onsiteAmount)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                                    -{formatCurrency(offset.finalAmount)}
                                  </TableCell>
                                  <TableCell></TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditOffset(offset)}
                                        data-testid={`button-edit-offset-${offset.id}`}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteOffsetMutation.mutate(offset.id)}
                                        data-testid={`button-delete-offset-${offset.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-muted font-bold">
                                <TableCell className="rounded-bl-lg">Total Offsets</TableCell>
                                <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                                  -{formatCurrency(offsetTotals.estimate)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                                  -{formatCurrency(offsetTotals.forecast)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                                  -{formatCurrency(offsetTotals.onsite)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                                  -{formatCurrency(offsetTotals.final)}
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell className="rounded-br-lg"></TableCell>
                              </TableRow>
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableBody>
                          <TableRow className="border-0">
                            <TableCell className="font-bold text-lg w-[300px]">Net Budget</TableCell>
                            <TableCell className="text-right font-mono font-bold w-[120px]">
                              {formatCurrency(netTotals.estimate)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold w-[120px]">
                              {formatCurrency(netTotals.forecast)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold w-[120px]">
                              {formatCurrency(netTotals.onsite)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-lg w-[120px]">
                              {formatCurrency(netTotals.final)}
                            </TableCell>
                            <TableCell className="w-[200px]"></TableCell>
                            <TableCell className="w-[80px]"></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Receipt className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Total Invoices</p>
                          <p className="text-2xl font-bold font-mono">{formatCurrency(paymentTotals.total)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="text-sm text-muted-foreground">Paid</p>
                          <p className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
                            {formatCurrency(paymentTotals.paid)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <TrendingDown className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                        <div>
                          <p className="text-sm text-muted-foreground">Pending</p>
                          <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                            {formatCurrency(paymentTotals.pending)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
                    <CardTitle className="text-lg">Invoice Tracker</CardTitle>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingPayment(null);
                        paymentForm.reset({
                          eventId: selectedEventId,
                          budgetItemId: "",
                          invoiceNumber: "",
                          amount: "",
                          status: "pending",
                          notes: "",
                        });
                        setIsPaymentDialogOpen(true);
                      }}
                      data-testid="button-add-payment"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Invoice
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Budget Item</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                No invoices yet. Add invoices to track payments.
                              </TableCell>
                            </TableRow>
                          ) : (
                            payments.map((payment) => {
                              const linkedItem = budgetItems.find((i) => i.id === payment.budgetItemId);
                              return (
                                <TableRow key={payment.id} className="hover-elevate" data-testid={`row-payment-${payment.id}`}>
                                  <TableCell className="font-mono">{payment.invoiceNumber}</TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {linkedItem ? linkedItem.description : "-"}
                                  </TableCell>
                                  <TableCell className="text-right font-mono font-medium">
                                    {formatCurrency(payment.amount)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={paymentStatusColors[payment.status || "pending"]}>
                                      {payment.status || "pending"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                                    {payment.notes || "-"}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditPayment(payment)}
                                        data-testid={`button-edit-payment-${payment.id}`}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deletePaymentMutation.mutate(payment.id)}
                                        data-testid={`button-delete-payment-${payment.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="categories" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
                    <CardTitle className="text-lg">Budget Categories</CardTitle>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingCategory(null);
                        categoryForm.reset({
                          name: "",
                          sortOrder: "0",
                        });
                        setIsCategoryDialogOpen(true);
                      }}
                      data-testid="button-add-category"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Category Name</TableHead>
                            <TableHead className="text-center">Sort Order</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categories.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                No categories defined yet. Add categories to organize your budget items.
                              </TableCell>
                            </TableRow>
                          ) : (
                            categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((category) => (
                              <TableRow key={category.id} className="hover-elevate" data-testid={`row-category-${category.id}`}>
                                <TableCell className="font-medium">{category.name}</TableCell>
                                <TableCell className="text-center text-muted-foreground">{category.sortOrder || 0}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditCategory(category)}
                                      data-testid={`button-edit-category-${category.id}`}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deleteCategoryMutation.mutate(category.id)}
                                      data-testid={`button-delete-category-${category.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCategoryDialogOpen(false);
          setEditingCategory(null);
          categoryForm.reset();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update the category details" : "Add a new budget category"}
            </DialogDescription>
          </DialogHeader>
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-category-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={categoryForm.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-category-sort" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsCategoryDialogOpen(false);
                  setEditingCategory(null);
                  categoryForm.reset();
                }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  data-testid="button-submit-category"
                >
                  {createCategoryMutation.isPending || updateCategoryMutation.isPending ? "Saving..." : editingCategory ? "Update" : "Add Category"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isItemDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsItemDialogOpen(false);
          setEditingItem(null);
          itemForm.reset();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Budget Item" : "Add Budget Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the budget item details" : "Add a new budget line item"}
            </DialogDescription>
          </DialogHeader>
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit(onItemSubmit)} className="space-y-4">
              <FormField
                control={itemForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itemForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-item-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={itemForm.control}
                  name="estimateAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimate</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-item-estimate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="forecastAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forecast</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-item-forecast" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="onsiteAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Onsite</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-item-onsite" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="finalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Final</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-item-final" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={itemForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-item-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsItemDialogOpen(false);
                  setEditingItem(null);
                  itemForm.reset();
                }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createItemMutation.isPending || updateItemMutation.isPending}
                  data-testid="button-submit-item"
                >
                  {createItemMutation.isPending || updateItemMutation.isPending ? "Saving..." : editingItem ? "Update" : "Add Item"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isOffsetDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsOffsetDialogOpen(false);
          setEditingOffset(null);
          offsetForm.reset();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOffset ? "Edit Offset" : "Add Offset"}</DialogTitle>
            <DialogDescription>
              {editingOffset ? "Update the offset details" : "Add revenue or credits to offset expenses"}
            </DialogDescription>
          </DialogHeader>
          <Form {...offsetForm}>
            <form onSubmit={offsetForm.handleSubmit(onOffsetSubmit)} className="space-y-4">
              <FormField
                control={offsetForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Sponsorship, Ticket Sales" data-testid="input-offset-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={offsetForm.control}
                  name="estimateAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimate</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-offset-estimate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={offsetForm.control}
                  name="forecastAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forecast</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-offset-forecast" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={offsetForm.control}
                  name="onsiteAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Onsite</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-offset-onsite" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={offsetForm.control}
                  name="finalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Final</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-offset-final" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={offsetForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-offset-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsOffsetDialogOpen(false);
                  setEditingOffset(null);
                  offsetForm.reset();
                }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createOffsetMutation.isPending || updateOffsetMutation.isPending}
                  data-testid="button-submit-offset"
                >
                  {createOffsetMutation.isPending || updateOffsetMutation.isPending ? "Saving..." : editingOffset ? "Update" : "Add Offset"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsPaymentDialogOpen(false);
          setEditingPayment(null);
          paymentForm.reset();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPayment ? "Edit Invoice" : "Add Invoice"}</DialogTitle>
            <DialogDescription>
              {editingPayment ? "Update the invoice details" : "Track an invoice or payment"}
            </DialogDescription>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
              <FormField
                control={paymentForm.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-payment-invoice" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="budgetItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Item (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-item">
                          <SelectValue placeholder="Link to budget item" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {budgetItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.category} - {item.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid="input-payment-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-payment-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsPaymentDialogOpen(false);
                  setEditingPayment(null);
                  paymentForm.reset();
                }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createPaymentMutation.isPending || updatePaymentMutation.isPending}
                  data-testid="button-submit-payment"
                >
                  {createPaymentMutation.isPending || updatePaymentMutation.isPending ? "Saving..." : editingPayment ? "Update" : "Add Invoice"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsDialogOpen} onOpenChange={(open) => {
        if (!open) setIsSettingsDialogOpen(false);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Budget Settings</DialogTitle>
            <DialogDescription>
              Configure budget settings for this event
            </DialogDescription>
          </DialogHeader>
          <Form {...settingsForm}>
            <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-4">
              <FormField
                control={settingsForm.control}
                name="budgetCap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Cap (Do Not Exceed)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter maximum budget"
                        {...field}
                        data-testid="input-budget-cap"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-submit-settings"
                >
                  {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
