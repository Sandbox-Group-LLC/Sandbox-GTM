import { useState, memo, useCallback } from "react";
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
import { Plus, Settings2, Trash2, Lock, Link2, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  isGlobal: z.boolean().default(false),
  parentFieldId: z.string().nullable().optional(),
  parentTriggerValues: z.array(z.string()).optional(),
});

type CustomFieldFormData = z.infer<typeof customFieldFormSchema>;

type ToggleState = { required: boolean; isActive: boolean; attendeeOnly: boolean; isGlobal: boolean };

interface ToggleSectionProps {
  toggles: ToggleState;
  onToggleChange: (key: keyof ToggleState, value: boolean) => void;
}

const ToggleSection = memo(function ToggleSection({ toggles, onToggleChange }: ToggleSectionProps) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between p-3 border rounded-md">
        <Label htmlFor="required-checkbox" className="cursor-pointer">Required field</Label>
        <Checkbox
          id="required-checkbox"
          checked={toggles.required}
          onCheckedChange={(checked) => onToggleChange('required', checked === true)}
          data-testid="switch-field-required"
        />
      </div>
      <div className="flex items-center justify-between p-3 border rounded-md">
        <Label htmlFor="active-checkbox" className="cursor-pointer">Active</Label>
        <Checkbox
          id="active-checkbox"
          checked={toggles.isActive}
          onCheckedChange={(checked) => onToggleChange('isActive', checked === true)}
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
          onCheckedChange={(checked) => onToggleChange('attendeeOnly', checked === true)}
          data-testid="switch-field-attendee-only"
        />
      </div>
      <div className="flex items-center justify-between p-3 border rounded-md">
        <div>
          <Label htmlFor="global-checkbox" className="cursor-pointer">Global Property</Label>
          <p className="text-sm text-muted-foreground">Automatically included in all events</p>
        </div>
        <Checkbox
          id="global-checkbox"
          checked={toggles.isGlobal}
          onCheckedChange={(checked) => onToggleChange('isGlobal', checked === true)}
          data-testid="switch-field-global"
        />
      </div>
    </div>
  );
});

const fieldTypeLabels: Record<string, string> = {
  text: "Text",
  textarea: "Textarea",
  select: "Select",
  checkbox: "Checkbox",
  number: "Number",
};

function SortableCustomFieldRow({ field, children }: { field: CustomField; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        data-testid={`drag-handle-${field.id}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function SortableTableRow({ field, children }: { field: CustomField; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b last:border-0"
      data-testid={`row-custom-field-${field.id}`}
    >
      <td className="p-3">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          data-testid={`drag-handle-table-${field.id}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      {children}
    </tr>
  );
}

export default function CustomFields() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [optionsText, setOptionsText] = useState("");
  
  // Local state for toggles and field type to avoid form.watch issues
  const [toggles, setToggles] = useState<ToggleState>({ required: false, isActive: true, attendeeOnly: false, isGlobal: false });
  const [selectedFieldType, setSelectedFieldType] = useState<string>("text");
  
  // Parent-child conditional visibility state
  const [parentFieldId, setParentFieldId] = useState<string | null>(null);
  const [parentTriggerValues, setParentTriggerValues] = useState<string[]>([]);
  
  const handleToggleChange = useCallback((key: keyof ToggleState, value: boolean) => {
    setToggles(prev => ({ ...prev, [key]: value }));
  }, []);

  const { data: customFields = [], isLoading } = useQuery<CustomField[]>({
    queryKey: ["/api/custom-fields"],
  });
  
  // Fetch attendee types for parent field option
  const { data: attendeeTypes = [] } = useQuery<{ id: string; type: string }[]>({
    queryKey: ["/api/attendee-types"],
  });
  
  // Get unique attendee type names for the dropdown
  const uniqueAttendeeTypeNames = Array.from(new Set(attendeeTypes.map(at => at.type))).sort();
  
  // Special marker for attendee type as parent field
  const ATTENDEE_TYPE_PARENT_ID = "__attendeeType__";

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
      isGlobal: false,
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

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await apiRequest("PATCH", "/api/custom-fields/reorder", { orderedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
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

  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/custom-fields/seed-defaults");
      return await res.json();
    },
    onSuccess: (data: { message: string; seeded: number; skipped: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      toast({ title: "Success", description: data.message || "Default fields have been seeded" });
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedFields = [...customFields].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedFields.findIndex(f => f.id === active.id);
      const newIndex = sortedFields.findIndex(f => f.id === over.id);
      const newOrder = arrayMove(sortedFields, oldIndex, newIndex);
      reorderMutation.mutate(newOrder.map(f => f.id));
    }
  }

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
      isGlobal: field.isGlobal ?? false,
    });
    setToggles({
      required: field.required ?? false,
      isActive: field.isActive ?? true,
      attendeeOnly: field.attendeeOnly ?? false,
      isGlobal: field.isGlobal ?? false,
    });
    setSelectedFieldType(field.fieldType);
    setOptionsText((field.options ?? []).join("\n"));
    setParentFieldId(field.parentFieldId ?? null);
    setParentTriggerValues(field.parentTriggerValues ?? []);
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
    const submitData = { 
      ...data, 
      ...toggles, 
      options,
      parentFieldId: parentFieldId || null,
      parentTriggerValues: parentFieldId ? parentTriggerValues : [],
    };

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
      setToggles({ required: false, isActive: true, attendeeOnly: false, isGlobal: false });
      setSelectedFieldType("text");
      setParentFieldId(null);
      setParentTriggerValues([]);
    }
    setIsDialogOpen(open);
  };

  // Helper to get parent field label
  const getParentFieldLabel = (field: CustomField) => {
    if (!field.parentFieldId) return null;
    // Handle special attendee type marker
    if (field.parentFieldId === ATTENDEE_TYPE_PARENT_ID) {
      return "Attendee Type";
    }
    const parent = customFields.find(f => f.id === field.parentFieldId);
    return parent?.label ?? null;
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
      key: "parentFieldId",
      header: "Parent",
      cell: (field: CustomField) => {
        const parentLabel = getParentFieldLabel(field);
        return parentLabel ? (
          <Badge variant="outline" className="text-xs">
            <Link2 className="h-3 w-3 mr-1" />
            {parentLabel}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">None</span>
        );
      },
    },
    {
      key: "isGlobal",
      header: "Scope",
      cell: (field: CustomField) => (
        field.isGlobal ? (
          <Badge variant="default" className="text-xs">Global</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">Per Event</span>
        )
      ),
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
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => seedDefaultsMutation.mutate()}
              disabled={seedDefaultsMutation.isPending}
              data-testid="button-seed-default-fields"
            >
              {seedDefaultsMutation.isPending ? "Seeding..." : "Seed Default Fields"}
            </Button>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-custom-field">
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </div>
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

                {/* Conditional Visibility Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Conditional Visibility</Label>
                  </div>
                  <FormItem>
                    <FormLabel>Parent Field</FormLabel>
                    <Select
                      value={parentFieldId ?? "none"}
                      onValueChange={(value) => {
                        if (value === "none") {
                          setParentFieldId(null);
                          setParentTriggerValues([]);
                        } else {
                          setParentFieldId(value);
                          setParentTriggerValues([]);
                        }
                      }}
                    >
                      <SelectTrigger data-testid="select-parent-field">
                        <SelectValue placeholder="Select parent field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {/* Attendee Type as a special parent option - always show */}
                        <SelectItem value={ATTENDEE_TYPE_PARENT_ID}>
                          Attendee Type
                        </SelectItem>
                        {customFields
                          .filter((f) => 
                            (f.fieldType === "select" || f.fieldType === "checkbox") &&
                            f.isActive &&
                            f.id !== editingField?.id
                          )
                          .map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Only show this field when a parent field has specific values
                    </FormDescription>
                  </FormItem>

                  {parentFieldId && (() => {
                    // Handle attendee type as parent
                    if (parentFieldId === ATTENDEE_TYPE_PARENT_ID) {
                      if (uniqueAttendeeTypeNames.length === 0) {
                        // No attendee types exist yet - show helpful message
                        return (
                          <div className="space-y-2">
                            <Label className="text-sm">Show when attendee type is</Label>
                            <div className="border rounded-md p-4 bg-muted/30 text-center">
                              <p className="text-sm text-muted-foreground mb-2">
                                No attendee types found in your events.
                              </p>
                              <p className="text-xs text-muted-foreground">
                                To use this feature, create attendee types in your events first (e.g., "speaker", "attendee", "exhibitor").
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-2">
                          <Label className="text-sm">Show when attendee type is</Label>
                          <div className="space-y-2 border rounded-md p-3">
                            {uniqueAttendeeTypeNames.map((typeName) => (
                              <div key={typeName} className="flex items-center gap-2">
                                <Checkbox
                                  id={`trigger-type-${typeName}`}
                                  checked={parentTriggerValues.includes(typeName)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setParentTriggerValues([...parentTriggerValues, typeName]);
                                    } else {
                                      setParentTriggerValues(parentTriggerValues.filter(v => v !== typeName));
                                    }
                                  }}
                                  data-testid={`checkbox-trigger-type-${typeName}`}
                                />
                                <Label htmlFor={`trigger-type-${typeName}`} className="text-sm cursor-pointer">
                                  {titleCase(typeName)}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    
                    const selectedParent = customFields.find(f => f.id === parentFieldId);
                    const parentOptions = selectedParent?.options ?? [];
                    if (parentOptions.length === 0 && selectedParent?.fieldType === "checkbox") {
                      return (
                        <div className="space-y-2">
                          <Label className="text-sm">Show when checked</Label>
                          <div className="flex items-center gap-2 p-2 border rounded-md">
                            <Checkbox
                              id="trigger-checked"
                              checked={parentTriggerValues.includes("true")}
                              onCheckedChange={(checked) => {
                                setParentTriggerValues(checked ? ["true"] : []);
                              }}
                              data-testid="checkbox-trigger-checked"
                            />
                            <Label htmlFor="trigger-checked" className="text-sm cursor-pointer">
                              Parent checkbox is checked
                            </Label>
                          </div>
                        </div>
                      );
                    }
                    if (parentOptions.length > 0) {
                      return (
                        <div className="space-y-2">
                          <Label className="text-sm">Show when parent value is</Label>
                          <div className="space-y-2 border rounded-md p-3">
                            {parentOptions.map((option) => (
                              <div key={option} className="flex items-center gap-2">
                                <Checkbox
                                  id={`trigger-${option}`}
                                  checked={parentTriggerValues.includes(option)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setParentTriggerValues([...parentTriggerValues, option]);
                                    } else {
                                      setParentTriggerValues(parentTriggerValues.filter(v => v !== option));
                                    }
                                  }}
                                  data-testid={`checkbox-trigger-${option}`}
                                />
                                <Label htmlFor={`trigger-${option}`} className="text-sm cursor-pointer">
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <ToggleSection toggles={toggles} onToggleChange={handleToggleChange} />
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
          {sortedFields.length === 0 ? (
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedFields.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                {/* Mobile card view */}
                <div className="md:hidden space-y-3">
                  {sortedFields.map((field) => (
                    <SortableCustomFieldRow key={field.id} field={field}>
                      <div className="p-3 border rounded-md space-y-3" data-testid={`card-custom-field-${field.id}`}>
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
                          {getParentFieldLabel(field) && (
                            <Badge variant="outline" className="text-xs">
                              <Link2 className="h-3 w-3 mr-1" />
                              Child of: {getParentFieldLabel(field)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </SortableCustomFieldRow>
                  ))}
                </div>
                {/* Desktop table view with drag handles */}
                <div className="hidden md:block rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="w-8 p-3"></th>
                        <th className="text-left p-3 font-medium">Name</th>
                        <th className="text-left p-3 font-medium">Label</th>
                        <th className="text-left p-3 font-medium">Type</th>
                        <th className="text-left p-3 font-medium">Required</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Scope</th>
                        <th className="w-20 p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedFields.map((field) => (
                        <SortableTableRow key={field.id} field={field}>
                          <td className="p-3">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{field.name}</code>
                          </td>
                          <td className="p-3">{field.label}</td>
                          <td className="p-3">
                            <Badge variant="secondary" className="text-xs">
                              {fieldTypeLabels[field.fieldType] || titleCase(field.fieldType)}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {field.required ? (
                              <Badge variant="default" className="text-xs">Required</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">Optional</span>
                            )}
                          </td>
                          <td className="p-3">
                            {field.isActive ? (
                              <Badge variant="default" className="text-xs">Active</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </td>
                          <td className="p-3">
                            {field.isGlobal ? (
                              <Badge variant="default" className="text-xs">Global</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">Per Event</span>
                            )}
                          </td>
                          <td className="p-3">
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
                          </td>
                        </SortableTableRow>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
