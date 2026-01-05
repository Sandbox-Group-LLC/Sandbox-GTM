import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { Plus, FileText, Trash2, Pencil, ShieldAlert } from "lucide-react";
import type { CustomFieldTemplate } from "@shared/schema";

const FIELD_TYPES = [
  "text",
  "number",
  "email",
  "phone",
  "url",
  "textarea",
  "select",
  "multiselect",
  "checkbox",
  "radio",
  "date",
  "country",
  "state",
] as const;

const fieldTypeLabels: Record<string, string> = {
  text: "Text",
  number: "Number",
  email: "Email",
  phone: "Phone",
  url: "URL",
  textarea: "Textarea",
  select: "Select",
  multiselect: "Multi-Select",
  checkbox: "Checkbox",
  radio: "Radio",
  date: "Date",
  country: "Country",
  state: "State",
};

const templateFormSchema = z.object({
  name: z
    .string()
    .min(1, "Field name is required")
    .regex(
      /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      "Field name must be a valid identifier (letters, numbers, underscores, starting with letter or underscore)"
    ),
  label: z.string().min(1, "Label is required"),
  fieldType: z.enum(FIELD_TYPES),
  required: z.boolean().default(false),
  isGlobal: z.boolean().default(true),
  isActive: z.boolean().default(true),
  attendeeOnly: z.boolean().default(false),
  displayOrder: z.coerce.number().int().min(0).default(0),
  options: z.string().optional(),
  parentFieldName: z.string().optional(),
  parentTriggerValues: z.string().optional(),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

export default function FieldTemplates() {
  const { user, isLoading: userLoading } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CustomFieldTemplate | null>(null);

  const isSuperAdmin =
    (user?.email?.toLowerCase().endsWith("@makemysandbox.com") || user?.isAdmin) ?? false;

  const { data: templates = [], isLoading } = useQuery<CustomFieldTemplate[]>({
    queryKey: ["/api/super-admin/field-templates"],
    enabled: isSuperAdmin,
  });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      label: "",
      fieldType: "text",
      required: false,
      isGlobal: true,
      isActive: true,
      attendeeOnly: false,
      displayOrder: 0,
      options: "",
      parentFieldName: "",
      parentTriggerValues: "",
    },
  });

  const watchFieldType = form.watch("fieldType");
  const showOptionsField = ["select", "multiselect", "radio"].includes(watchFieldType);

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const payload = {
        name: data.name,
        label: data.label,
        fieldType: data.fieldType,
        required: data.required,
        isGlobal: data.isGlobal,
        isActive: data.isActive,
        attendeeOnly: data.attendeeOnly,
        displayOrder: data.displayOrder,
        options: data.options ? parseJsonArray(data.options) : [],
        parentFieldName: data.parentFieldName || null,
        parentTriggerValues: data.parentTriggerValues ? parseJsonArray(data.parentTriggerValues) : [],
      };
      return await apiRequest("POST", "/api/super-admin/field-templates", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/field-templates"] });
      toast({ title: "Template created successfully" });
      handleDialogClose();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TemplateFormData }) => {
      const payload = {
        name: data.name,
        label: data.label,
        fieldType: data.fieldType,
        required: data.required,
        isGlobal: data.isGlobal,
        isActive: data.isActive,
        attendeeOnly: data.attendeeOnly,
        displayOrder: data.displayOrder,
        options: data.options ? parseJsonArray(data.options) : [],
        parentFieldName: data.parentFieldName || null,
        parentTriggerValues: data.parentTriggerValues ? parseJsonArray(data.parentTriggerValues) : [],
      };
      return await apiRequest("PATCH", `/api/super-admin/field-templates/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/field-templates"] });
      toast({ title: "Template updated successfully" });
      handleDialogClose();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/super-admin/field-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/field-templates"] });
      toast({ title: "Template deleted successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function parseJsonArray(value: string): string[] {
    if (!value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
      return value.split(",").map((s) => s.trim()).filter(Boolean);
    } catch {
      return value.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  function formatArrayForEdit(arr: string[] | null | undefined): string {
    if (!arr || arr.length === 0) return "";
    return JSON.stringify(arr, null, 2);
  }

  if (userLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title="Field Templates"
          breadcrumbs={[{ label: "Super Admin" }, { label: "Field Templates" }]}
        />
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title="Field Templates"
          breadcrumbs={[{ label: "Super Admin" }, { label: "Field Templates" }]}
        />
        <div className="flex-1 overflow-auto p-6">
          <EmptyState
            icon={ShieldAlert}
            title="Access Denied"
            description="You don't have permission to view this page. Super admin privileges are required."
          />
        </div>
      </div>
    );
  }

  const onSubmit = (data: TemplateFormData) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (template: CustomFieldTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      label: template.label,
      fieldType: template.fieldType as typeof FIELD_TYPES[number],
      required: template.required ?? false,
      isGlobal: template.isGlobal ?? true,
      isActive: template.isActive ?? true,
      attendeeOnly: template.attendeeOnly ?? false,
      displayOrder: template.displayOrder ?? 0,
      options: formatArrayForEdit(template.options),
      parentFieldName: template.parentFieldName || "",
      parentTriggerValues: formatArrayForEdit(template.parentTriggerValues),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
    form.reset({
      name: "",
      label: "",
      fieldType: "text",
      required: false,
      isGlobal: true,
      isActive: true,
      attendeeOnly: false,
      displayOrder: 0,
      options: "",
      parentFieldName: "",
      parentTriggerValues: "",
    });
  };

  const openAddDialog = () => {
    setEditingTemplate(null);
    form.reset({
      name: "",
      label: "",
      fieldType: "text",
      required: false,
      isGlobal: true,
      isActive: true,
      attendeeOnly: false,
      displayOrder: 0,
      options: "",
      parentFieldName: "",
      parentTriggerValues: "",
    });
    setIsDialogOpen(true);
  };

  const sortedTemplates = [...templates].sort(
    (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
  );

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title="Field Templates"
          breadcrumbs={[{ label: "Super Admin" }, { label: "Field Templates" }]}
        />
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading templates...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Field Templates"
        breadcrumbs={[{ label: "Super Admin" }, { label: "Field Templates" }]}
        actions={
          <Button size="sm" onClick={openAddDialog} data-testid="button-new-template">
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <p className="text-muted-foreground">
            Manage default custom fields that seed into new organizations
          </p>

          {templates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No field templates yet"
              description="Create field templates that will be automatically added to new organizations"
              action={{
                label: "Add Template",
                onClick: openAddDialog,
              }}
            />
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field Name</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Global</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTemplates.map((template) => (
                    <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                      <TableCell className="font-mono text-sm">{template.name}</TableCell>
                      <TableCell>{template.label}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {fieldTypeLabels[template.fieldType] || template.fieldType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {template.required ? (
                          <Badge variant="default" className="text-xs">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {template.isGlobal ? (
                          <Badge variant="default" className="text-xs">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">No</span>
                        )}
                      </TableCell>
                      <TableCell>{template.displayOrder || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(template)}
                            data-testid={`button-edit-template-${template.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(template.id)}
                            data-testid={`button-delete-template-${template.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Field Template" : "Add Field Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Update the field template configuration"
                : "Create a new field template that will seed into new organizations"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., dietaryRestrictions"
                        {...field}
                        data-testid="input-field-name"
                      />
                    </FormControl>
                    <FormDescription>
                      A unique identifier (letters, numbers, underscores)
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
                        placeholder="e.g., Dietary Restrictions"
                        {...field}
                        data-testid="input-field-label"
                      />
                    </FormControl>
                    <FormDescription>The display label shown to users</FormDescription>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-field-type">
                          <SelectValue placeholder="Select field type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FIELD_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {fieldTypeLabels[type] || type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showOptionsField && (
                <FormField
                  control={form.control}
                  name="options"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Options</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='["Option 1", "Option 2", "Option 3"]'
                          className="font-mono text-sm"
                          rows={4}
                          {...field}
                          data-testid="textarea-options"
                        />
                      </FormControl>
                      <FormDescription>
                        JSON array of options, or comma-separated values
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                        min={0}
                        {...field}
                        data-testid="input-display-order"
                      />
                    </FormControl>
                    <FormDescription>
                      Lower numbers appear first
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="required"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-3 border rounded-md">
                      <div className="space-y-0.5">
                        <FormLabel className="cursor-pointer">Required</FormLabel>
                        <FormDescription>Field must be filled out</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-required"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isGlobal"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-3 border rounded-md">
                      <div className="space-y-0.5">
                        <FormLabel className="cursor-pointer">Global</FormLabel>
                        <FormDescription>
                          Automatically included in all events
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-global"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-3 border rounded-md">
                      <div className="space-y-0.5">
                        <FormLabel className="cursor-pointer">Active</FormLabel>
                        <FormDescription>
                          Whether this template is active
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="attendeeOnly"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-3 border rounded-md">
                      <div className="space-y-0.5">
                        <FormLabel className="cursor-pointer">Attendee Only</FormLabel>
                        <FormDescription>
                          Only shown in attendee registration, not admin forms
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-attendee-only"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">Conditional Visibility (Optional)</h4>
                
                <FormField
                  control={form.control}
                  name="parentFieldName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Field Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., attendeeType"
                          {...field}
                          data-testid="input-parent-field-name"
                        />
                      </FormControl>
                      <FormDescription>
                        The field name that controls visibility of this field
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parentTriggerValues"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Parent Trigger Values</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='["VIP", "Speaker"]'
                          className="font-mono text-sm"
                          rows={3}
                          {...field}
                          data-testid="textarea-parent-trigger-values"
                        />
                      </FormControl>
                      <FormDescription>
                        JSON array of parent field values that trigger showing this field
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingTemplate
                    ? "Update Template"
                    : "Create Template"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
