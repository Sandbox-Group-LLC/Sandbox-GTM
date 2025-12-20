import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, DollarSign, CheckCircle, Clock, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Vendor, BudgetCategory, BudgetItem } from "@shared/schema";
import { titleCase } from "@/lib/utils";

export default function Vendors() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorCategoryId, setNewVendorCategoryId] = useState("");
  const [newVendorCost, setNewVendorCost] = useState("");

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: categories = [] } = useQuery<BudgetCategory[]>({
    queryKey: ["/api/budget-categories"],
  });

  const { data: budgetItems = [] } = useQuery<BudgetItem[]>({
    queryKey: ["/api/budget"],
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: { name: string; categoryId?: string; cost?: string; contractStatus: string; approvalStatus: string }) => {
      return apiRequest("POST", "/api/vendors", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsAddDialogOpen(false);
      setNewVendorName("");
      setNewVendorCategoryId("");
      setNewVendorCost("");
      toast({ title: "Vendor added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add vendor", variant: "destructive" });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; contractStatus?: string; approvalStatus?: string }) => {
      return apiRequest("PATCH", `/api/vendors/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor updated" });
    },
    onError: () => {
      toast({ title: "Failed to update vendor", variant: "destructive" });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/vendors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove vendor", variant: "destructive" });
    },
  });

  const handleAddVendor = () => {
    if (!newVendorName.trim()) {
      toast({ title: "Please enter a vendor name", variant: "destructive" });
      return;
    }
    createVendorMutation.mutate({
      name: newVendorName.trim(),
      categoryId: newVendorCategoryId || undefined,
      cost: newVendorCost || "0",
      contractStatus: "active",
      approvalStatus: "pending",
    });
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "-";
    const category = categories.find((c) => c.id === categoryId);
    return category ? titleCase(category.name) : "-";
  };

  const totalForecastCost = budgetItems.reduce((sum, item) => sum + parseFloat(item.forecastAmount || "0"), 0);
  const activeContracts = vendors.filter((v) => v.contractStatus === "active").length;
  const pendingApproval = vendors.filter((v) => v.approvalStatus === "pending").length;

  const getContractStatusVariant = (status: string): "default" | "secondary" | "outline" => {
    return status === "active" ? "default" : "secondary";
  };

  const getApprovalStatusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case "approved":
        return "default";
      case "denied":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Vendors" />

      <div className="flex-1 overflow-auto p-6">
        <p className="text-muted-foreground text-sm mb-4">Manage vendor relationships and contracts</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-vendors">{vendors.length}</div>
              <p className="text-xs text-muted-foreground">Currently engaged</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-spend">
                ${totalForecastCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-muted-foreground">Total forecast cost</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contracts Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-contracts-active">{activeContracts}</div>
              <p className="text-xs text-muted-foreground">Current agreements</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pending-approval">{pendingApproval}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Vendor Directory</CardTitle>
              <CardDescription>Manage your vendor relationships</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-vendor">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Vendor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Vendor</DialogTitle>
                  <DialogDescription>Enter the vendor details below</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendorName">Vendor Name</Label>
                    <Input
                      id="vendorName"
                      placeholder="Enter vendor name"
                      value={newVendorName}
                      onChange={(e) => setNewVendorName(e.target.value)}
                      data-testid="input-vendor-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendorCategory">Category</Label>
                    <Select value={newVendorCategoryId} onValueChange={setNewVendorCategoryId}>
                      <SelectTrigger data-testid="select-vendor-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {titleCase(category.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendorCost">Cost</Label>
                    <Input
                      id="vendorCost"
                      type="number"
                      placeholder="Enter cost"
                      value={newVendorCost}
                      onChange={(e) => setNewVendorCost(e.target.value)}
                      data-testid="input-vendor-cost"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddVendor}
                    disabled={createVendorMutation.isPending}
                    data-testid="button-save-vendor"
                  >
                    {createVendorMutation.isPending ? "Adding..." : "Add Vendor"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">Loading vendors...</div>
            ) : vendors.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Truck className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">No vendors yet</p>
                  <p className="text-sm mt-2">Add your first vendor to get started</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-sm">Vendor Name</th>
                      <th className="text-left py-3 px-2 font-medium text-sm">Category</th>
                      <th className="text-left py-3 px-2 font-medium text-sm">Cost</th>
                      <th className="text-left py-3 px-2 font-medium text-sm">Contract Status</th>
                      <th className="text-left py-3 px-2 font-medium text-sm">Approval Status</th>
                      <th className="text-right py-3 px-2 font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((vendor) => (
                      <tr key={vendor.id} className="border-b" data-testid={`row-vendor-${vendor.id}`}>
                        <td className="py-3 px-2 font-medium">{vendor.name}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline">{getCategoryName(vendor.categoryId)}</Badge>
                        </td>
                        <td className="py-3 px-2">
                          {vendor.cost ? `$${parseFloat(vendor.cost).toLocaleString()}` : "-"}
                        </td>
                        <td className="py-3 px-2">
                          <Select
                            value={vendor.contractStatus || "active"}
                            onValueChange={(value) =>
                              updateVendorMutation.mutate({ id: vendor.id, contractStatus: value })
                            }
                          >
                            <SelectTrigger className="w-32" data-testid={`select-contract-status-${vendor.id}`}>
                              <Badge variant={getContractStatusVariant(vendor.contractStatus || "active")}>
                                {titleCase(vendor.contractStatus || "active")}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-2">
                          <Select
                            value={vendor.approvalStatus || "pending"}
                            onValueChange={(value) =>
                              updateVendorMutation.mutate({ id: vendor.id, approvalStatus: value })
                            }
                          >
                            <SelectTrigger className="w-32" data-testid={`select-approval-status-${vendor.id}`}>
                              <Badge variant={getApprovalStatusVariant(vendor.approvalStatus || "pending")}>
                                {titleCase(vendor.approvalStatus || "pending")}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="denied">Denied</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteVendorMutation.mutate(vendor.id)}
                            disabled={deleteVendorMutation.isPending}
                            data-testid={`button-delete-vendor-${vendor.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
