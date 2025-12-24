import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { titleCase } from "@/lib/utils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Settings2, Trash2, Lock } from "lucide-react";
import type { CustomField } from "@shared/schema";

// System properties that are built into the attendee profile
const SYSTEM_PROPERTIES = [
  { name: "firstName", label: "First Name", fieldType: "text", required: true, description: "Attendee's first name" },
  { name: "lastName", label: "Last Name", fieldType: "text", required: true, description: "Attendee's last name" },
  { name: "email", label: "Email", fieldType: "text", required: true, description: "Attendee's email address" },
  { name: "phone", label: "Phone", fieldType: "text", required: false, description: "Attendee's phone number" },
  { name: "company", label: "Company", fieldType: "text", required: false, description: "Attendee's company or organization" },
  { name: "jobTitle", label: "Job Title", fieldType: "text", required: false, description: "Attendee's job title or role" },
  { name: "attendeeType", label: "Audience Type", fieldType: "select", required: false, description: "Categorization of the attendee" },
  { name: "emergencyContact", label: "Emergency Contact", fieldType: "text", required: false, description: "Emergency contact name" },
  { name: "emergencyPhone", label: "Emergency Contact Phone", fieldType: "text", required: false, description: "Emergency contact phone number" },
  { name: "emergencyEmail", label: "Emergency Contact Email", fieldType: "text", required: false, description: "Emergency contact email address" },
];

const customFieldFormSchema = z.object({
  name: z.string().min(1, "Name is required").regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Name must be a valid identifier (letters, numbers, underscores, starting with letter or underscore)"),
  label: z.string().min(1, "Label is required"),
  fieldType: z.enum(["text", "textarea", "select", "checkbox", "number"]),
  required: z.boolean().default(false),
  options: z.array(z.string()).default([]),
  displayOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  attendeeOnly: z.boolean().default(false),
});

type CustomFieldFormData = z.infer<typeof customFieldFormSchema>;

const fieldTypeLabels: Record<string, string> = {
  text: "Text",
  textarea: "Textarea",
  select: "Select",
  checkbox: "Checkbox",
  number: "Number",
};

export default function CustomFields() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [optionsText, setOptionsText] = useState("");
  
  // Local state for toggles and field type to avoid form.watch issues
  const [toggles, setToggles] = useState({ required: false, isActive: true, attendeeOnly: false });
  const [selectedFieldType, setSelectedFieldType] = useState<string>("text");

  const { data: customFields = [], isLoading } = useQuery<CustomField[]>({
    queryKey: ["/api/custom-fields"],
  });

  const form = useForm<CustomFieldFormData>({
    resolver: zodResolver(customFieldFormSchema),
    defaultValues: {
      name: "",
      label: "",
      fieldType: "text",
      required: false,
      options: [],
      displayOrder: 0,
      isActive: true,
      attendeeOnly: false,
    },
  });


  const createMutation = useMutation({
    mutationFn: async (data: CustomFieldFormData) => {
      const response = await apiRequest("POST", "/api/custom-fields", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      toast({ title: "Custom field created successfully" });
      setIsDialogOpen(false);
      form.reset();
      setOptionsText("");
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
    mutationFn: async ({ id, data }: { id: string; data: CustomFieldFormData }) => {
      await apiRequest("PATCH", `/api/custom-fields/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      toast({ title: "Custom field updated successfully" });
      setIsDialogOpen(false);
      setEditingField(null);
      form.reset();
      setOptionsText("");
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
      await apiRequest("DELETE", `/api/custom-fields/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      toast({ title: "Custom field deleted successfully" });
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

  const handleEdit = (field: CustomField) => {
    setEditingField(field);
    form.reset({
      name: field.name,
      label: field.label,
      fieldType: field.fieldType as "text" | "textarea" | "select" | "checkbox" | "number",
      required: field.required ?? false,
      options: field.options ?? [],
      displayOrder: field.displayOrder ?? 0,
      isActive: field.isActive ?? true,
      attendeeOnly: field.attendeeOnly ?? false,
    });
    setToggles({
      required: field.required ?? false,
      isActive: field.isActive ?? true,
      attendeeOnly: field.attendeeOnly ?? false,
    });
    setSelectedFieldType(field.fieldType);
    setOptionsText((field.options ?? []).join("\n"));
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this custom field?")) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: CustomFieldFormData) => {
    const options = selectedFieldType === "select"
      ? optionsText.split("\n").map(o => o.trim()).filter(o => o.length > 0)
      : [];
    
    // Merge toggle state with form data
    const submitData = { ...data, ...toggles, options };

    if (editingField) {
      updateMutation.mutate({ id: editingField.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingField(null);
      form.reset();
      setOptionsText("");
      setToggles({ required: false, isActive: true, attendeeOnly: false });
      setSelectedFieldType("text");
    }
    setIsDialogOpen(open);
  };

  const columns = [
    { key: "name", header: "Name" },
    { key: "label", header: "Label" },
    {
      key: "fieldType",
      header: "Type",
      cell: (field: CustomField) => (
        <Badge variant="secondary" className="text-xs">
          {fieldTypeLabels[field.fieldType] || titleCase(field.fieldType)}
        </Badge>
      ),
    },
    {
      key: "required",
      header: "Required",
      cell: (field: CustomField) => (
        field.required ? (
          <Badge variant="default" className="text-xs">Required</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">Optional</span>
        )
      ),
    },
    {
      key: "displayOrder",
      header: "Order",
    },
    {
      key: "isActive",
      header: "Status",
      cell: (field: CustomField) => (
        field.isActive ? (
          <Badge variant="default" className="text-xs">Active</Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">Inactive</Badge>
        )
      ),
    },
    {
      key: "attendeeOnly",
      header: "Visibility",
      cell: (field: CustomField) => (
        field.attendeeOnly ? (
          <Badge variant="outline" className="text-xs">Attendee Only</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">All Forms</span>
        )
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (field: CustomField) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(field)}
            data-testid={`button-edit-field-${field.id}`}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(field.id)}
            data-testid={`button-delete-field-${field.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Properties"
        breadcrumbs={[{ label: "Programs", href: "/events" }, { label: "Properties" }]}
        actions={
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-custom-field">
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        }
      />

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingField ? "Edit Property" : "Add Property"}</DialogTitle>
              <DialogDescription>
                {editingField ? "Update the custom field details" : "Create a new custom field for attendee registration"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="field_name"
                          {...field}
                          data-testid="input-field-name"
                        />
                      </FormControl>
                      <FormDescription>
                        Unique identifier (letters, numbers, underscores)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Field Label"
                          {...field}
                          data-testid="input-field-label"
                        />
                      </FormControl>
                      <FormDescription>
                        Display label shown to attendees
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fieldType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Field Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedFieldType(value);
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-field-type">
                            <SelectValue placeholder="Select field type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="textarea">Textarea</SelectItem>
                          <SelectItem value="select">Select</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {selectedFieldType === "select" && (
                  <FormItem>
                    <FormLabel>Options</FormLabel>
                    <Textarea
                      placeholder="Enter one option per line"
                      value={optionsText}
                      onChange={(e) => setOptionsText(e.target.value)}
                      rows={4}
                      data-testid="textarea-field-options"
                    />
                    <FormDescription>
                      Enter each option on a new line
                    </FormDescription>
                  </FormItem>
                )}
                <FormField
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          data-testid="input-field-order"
                        />
                      </FormControl>
                      <FormDescription>
                        Lower numbers appear first
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <Label htmlFor="required-checkbox" className="cursor-pointer">Required field</Label>
                    <Checkbox
                      id="required-checkbox"
                      checked={toggles.required}
                      onCheckedChange={(checked) => setToggles({ ...toggles, required: checked === true })}
                      data-testid="switch-field-required"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <Label htmlFor="active-checkbox" className="cursor-pointer">Active</Label>
                    <Checkbox
                      id="active-checkbox"
                      checked={toggles.isActive}
                      onCheckedChange={(checked) => setToggles({ ...toggles, isActive: checked === true })}
                      data-testid="switch-field-active"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <Label htmlFor="attendee-only-checkbox" className="cursor-pointer">Attendee Only</Label>
                      <p className="text-sm text-muted-foreground">Only shown in attendee registration, not admin forms</p>
                    </div>
                    <Checkbox
                      id="attendee-only-checkbox"
                      checked={toggles.attendeeOnly}
                      onCheckedChange={(checked) => setToggles({ ...toggles, attendeeOnly: checked === true })}
                      data-testid="switch-field-attendee-only"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDialogClose(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-field"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : editingField
                        ? "Update Field"
                        : "Create Field"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              System Properties
            </CardTitle>
            <CardDescription>
              Built-in properties that are automatically collected for every attendee
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {SYSTEM_PROPERTIES.map((prop) => (
                <div key={prop.name} className="p-3 border rounded-md space-y-2" data-testid={`card-system-property-${prop.name}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{prop.label}</span>
                    {prop.required ? (
                      <Badge variant="default" className="text-xs">Required</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Optional</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <code className="bg-muted px-1.5 py-0.5 rounded">{prop.name}</code>
                    <Badge variant="outline" className="text-xs">
                      {fieldTypeLabels[prop.fieldType] || titleCase(prop.fieldType)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table view */}
            <div className="hidden md:block rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Label</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Required</th>
                  </tr>
                </thead>
                <tbody>
                  {SYSTEM_PROPERTIES.map((prop) => (
                    <tr key={prop.name} className="border-b last:border-0" data-testid={`row-system-property-${prop.name}`}>
                      <td className="p-3">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{prop.name}</code>
                      </td>
                      <td className="p-3">{prop.label}</td>
                      <td className="p-3">
                        <Badge variant="secondary" className="text-xs">
                          {fieldTypeLabels[prop.fieldType] || titleCase(prop.fieldType)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {prop.required ? (
                          <Badge variant="default" className="text-xs">Required</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Optional</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold">Custom Properties</h3>
              <p className="text-sm text-muted-foreground">
                Additional properties you can configure for attendee registration
              </p>
            </div>
          </div>
          {customFields.length === 0 ? (
            <EmptyState
              icon={Settings2}
              title="No custom properties"
              description="Create custom properties to collect additional information from attendees during registration."
              action={{
                label: "Add Property",
                onClick: () => setIsDialogOpen(true),
              }}
            />
          ) : (
            <>
              {/* Mobile card view */}
              <div className="md:hidden space-y-3">
                {customFields.map((field) => (
                  <div key={field.id} className="p-3 border rounded-md space-y-3" data-testid={`card-custom-field-${field.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <span className="font-medium text-sm block truncate">{field.label}</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{field.name}</code>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(field)}
                          data-testid={`button-edit-field-mobile-${field.id}`}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(field.id)}
                          data-testid={`button-delete-field-mobile-${field.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {fieldTypeLabels[field.fieldType] || titleCase(field.fieldType)}
                      </Badge>
                      {field.required && (
                        <Badge variant="default" className="text-xs">Required</Badge>
                      )}
                      {field.isActive ? (
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                      {field.attendeeOnly && (
                        <Badge variant="outline" className="text-xs">Attendee Only</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table view */}
              <div className="hidden md:block">
                <DataTable
                  data={customFields}
                  columns={columns}
                  getRowKey={(field) => field.id}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
