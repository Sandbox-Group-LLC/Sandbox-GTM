import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Package, Trash2, X } from "lucide-react";
import type { Package as PackageType, Event } from "@shared/schema";

const packageFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be 0 or greater").default(0),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  eventIds: z.array(z.string()).default([]),
});

type PackageFormData = z.infer<typeof packageFormSchema>;

export default function Packages() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageType | null>(null);
  const [newFeature, setNewFeature] = useState("");
  const [originalEventIds, setOriginalEventIds] = useState<string[]>([]);

  const { data: packages = [], isLoading } = useQuery<PackageType[]>({
    queryKey: ["/api/packages"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const packageId = editingPackage?.id;
  const { data: packageEventIds = [] } = useQuery<string[]>({
    queryKey: ["/api/packages", packageId, "events"],
    queryFn: async () => {
      if (!packageId) return [];
      const res = await fetch(`/api/packages/${packageId}/events`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch package events");
      return res.json();
    },
    enabled: !!packageId,
  });

  const form = useForm<PackageFormData>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      features: [],
      isActive: true,
      eventIds: [],
    },
  });

  useEffect(() => {
    if (editingPackage) {
      form.setValue("eventIds", packageEventIds);
      setOriginalEventIds(packageEventIds);
    }
  }, [editingPackage, packageEventIds, form]);

  const createMutation = useMutation({
    mutationFn: async (data: PackageFormData) => {
      const { eventIds, ...packageData } = data;
      const response = await apiRequest("POST", "/api/packages", packageData);
      const newPackage = await response.json();
      
      for (const eventId of eventIds) {
        await apiRequest("PUT", `/api/events/${eventId}/packages/${newPackage.id}`, { isEnabled: true });
      }
      
      return newPackage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({ title: "Package created successfully" });
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
    mutationFn: async ({ id, data }: { id: string; data: PackageFormData }) => {
      const { eventIds, ...packageData } = data;
      await apiRequest("PATCH", `/api/packages/${id}`, packageData);
      
      const addedEventIds = eventIds.filter((eventId) => !originalEventIds.includes(eventId));
      const removedEventIds = originalEventIds.filter((eventId) => !eventIds.includes(eventId));
      
      for (const eventId of addedEventIds) {
        await apiRequest("PUT", `/api/events/${eventId}/packages/${id}`, { isEnabled: true });
      }
      
      for (const eventId of removedEventIds) {
        await apiRequest("DELETE", `/api/events/${eventId}/packages/${id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({ title: "Package updated successfully" });
      setIsDialogOpen(false);
      setEditingPackage(null);
      setOriginalEventIds([]);
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/packages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({ title: "Package deleted successfully" });
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

  const onSubmit = (data: PackageFormData) => {
    if (editingPackage) {
      updateMutation.mutate({ id: editingPackage.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (pkg: PackageType) => {
    setEditingPackage(pkg);
    setOriginalEventIds([]);
    form.reset({
      name: pkg.name,
      description: pkg.description || "",
      price: Number(pkg.price) || 0,
      features: pkg.features || [],
      isActive: pkg.isActive ?? true,
      eventIds: [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this package?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingPackage(null);
    setNewFeature("");
    setOriginalEventIds([]);
    form.reset();
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      const currentFeatures = form.getValues("features") || [];
      form.setValue("features", [...currentFeatures, newFeature.trim()]);
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    const currentFeatures = form.getValues("features") || [];
    form.setValue("features", currentFeatures.filter((_, i) => i !== index));
  };

  const formatPrice = (price: string | number | null) => {
    const numPrice = Number(price) || 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(numPrice);
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (pkg: PackageType) => (
        <div className="font-medium" data-testid={`text-name-${pkg.id}`}>
          {pkg.name}
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (pkg: PackageType) => (
        <span className="text-muted-foreground" data-testid={`text-description-${pkg.id}`}>
          {pkg.description || "-"}
        </span>
      ),
    },
    {
      key: "price",
      header: "Price",
      cell: (pkg: PackageType) => (
        <span data-testid={`text-price-${pkg.id}`}>{formatPrice(pkg.price)}</span>
      ),
    },
    {
      key: "features",
      header: "Features",
      cell: (pkg: PackageType) => (
        <div className="flex flex-wrap gap-1" data-testid={`text-features-${pkg.id}`}>
          {pkg.features && pkg.features.length > 0 ? (
            pkg.features.slice(0, 3).map((feature, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
          {pkg.features && pkg.features.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{pkg.features.length - 3} more
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (pkg: PackageType) => (
        <Badge
          variant={pkg.isActive ? "default" : "secondary"}
          data-testid={`badge-status-${pkg.id}`}
        >
          {pkg.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (pkg: PackageType) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(pkg);
            }}
            data-testid={`button-edit-${pkg.id}`}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(pkg.id);
            }}
            data-testid={`button-delete-${pkg.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
      className: "w-32",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Packages"
        breadcrumbs={[{ label: "Attendees" }, { label: "Packages" }]}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : handleDialogClose()}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-package">
                <Plus className="h-4 w-4 mr-2" />
                Add Package
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>{editingPackage ? "Edit Package" : "Add New Package"}</DialogTitle>
                <DialogDescription>
                  {editingPackage ? "Update package information" : "Create a new registration package"}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 -mx-6 px-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Package name"
                            {...field}
                            data-testid="input-name"
                          />
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
                          <Textarea
                            placeholder="Package description"
                            {...field}
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            data-testid="input-price"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="features"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Features</FormLabel>
                        <FormDescription>Add features included in this package</FormDescription>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add a feature"
                              value={newFeature}
                              onChange={(e) => setNewFeature(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addFeature();
                                }
                              }}
                              data-testid="input-new-feature"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={addFeature}
                              data-testid="button-add-feature"
                            >
                              Add
                            </Button>
                          </div>
                          {field.value && field.value.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {field.value.map((feature, index) => (
                                <Badge key={index} variant="secondary" className="gap-1">
                                  {feature}
                                  <button
                                    type="button"
                                    onClick={() => removeFeature(index)}
                                    className="ml-1 hover:text-destructive"
                                    data-testid={`button-remove-feature-${index}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <FormLabel>Active</FormLabel>
                          <FormDescription>Make this package available for registration</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-is-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="eventIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Events</FormLabel>
                        <FormDescription>Select events where this package will be available</FormDescription>
                        <div className="border rounded-md p-3">
                          <ScrollArea className="h-40">
                            <div className="space-y-2">
                              {events.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No events available</p>
                              ) : (
                                events.map((event) => (
                                  <div
                                    key={event.id}
                                    className="flex items-center gap-2"
                                    data-testid={`event-checkbox-container-${event.id}`}
                                  >
                                    <Checkbox
                                      id={`event-${event.id}`}
                                      checked={field.value?.includes(event.id)}
                                      onCheckedChange={(checked) => {
                                        const currentIds = field.value || [];
                                        if (checked) {
                                          field.onChange([...currentIds, event.id]);
                                        } else {
                                          field.onChange(currentIds.filter((id) => id !== event.id));
                                        }
                                      }}
                                      data-testid={`checkbox-event-${event.id}`}
                                    />
                                    <Label
                                      htmlFor={`event-${event.id}`}
                                      className="text-sm font-normal cursor-pointer"
                                    >
                                      {event.name}
                                    </Label>
                                  </div>
                                ))
                              )}
                            </div>
                          </ScrollArea>
                        </div>
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
                      data-testid="button-submit-package"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? "Saving..."
                        : editingPackage
                        ? "Update"
                        : "Create Package"}
                    </Button>
                  </div>
                </form>
              </Form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {!isLoading && packages.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No packages yet"
              description="Start by adding your first registration package"
              action={{
                label: "Add Package",
                onClick: () => setIsDialogOpen(true),
              }}
            />
          ) : (
            <DataTable
              columns={columns}
              data={packages}
              isLoading={isLoading}
              emptyMessage="No packages found"
              getRowKey={(pkg) => pkg.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
