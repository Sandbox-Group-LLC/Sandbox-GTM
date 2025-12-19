import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DateRangePicker } from "@/components/ui/date-range-picker";

export const eventFormSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  location: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  publicSlug: z.string().optional(),
  isPublic: z.boolean().default(false),
  registrationOpen: z.boolean().default(false),
  status: z.enum(["draft", "published", "cancelled", "completed"]),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormFieldsProps {
  form: UseFormReturn<EventFormValues>;
  testIdPrefix?: string;
}

export function EventFormFields({ form, testIdPrefix = "" }: EventFormFieldsProps) {
  const prefix = testIdPrefix ? `${testIdPrefix}-` : "";

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Event Name</FormLabel>
            <FormControl>
              <Input placeholder="Annual Conference 2025" {...field} data-testid={`input-${prefix}event-name`} />
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
                placeholder="Describe your event..."
                {...field}
                value={field.value || ""}
                data-testid={`input-${prefix}event-description`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormItem>
        <FormLabel>Event Dates</FormLabel>
        <DateRangePicker
          startDate={form.watch("startDate")}
          endDate={form.watch("endDate")}
          onRangeChange={(start, end) => {
            form.setValue("startDate", start, { shouldValidate: true });
            form.setValue("endDate", end, { shouldValidate: true });
          }}
          placeholder="Select start and end dates"
          testId={`input-${prefix}event-dates`}
        />
        {(form.formState.errors.startDate || form.formState.errors.endDate) && (
          <p className="text-sm text-destructive">
            {form.formState.errors.startDate?.message || form.formState.errors.endDate?.message}
          </p>
        )}
      </FormItem>
      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Venue Name</FormLabel>
            <FormControl>
              <Input
                placeholder="Convention Center"
                {...field}
                value={field.value || ""}
                data-testid={`input-${prefix}event-location`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Address</FormLabel>
            <FormControl>
              <Input
                placeholder="123 Main Street"
                {...field}
                value={field.value || ""}
                data-testid={`input-${prefix}event-address`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input
                  placeholder="New York"
                  {...field}
                  value={field.value || ""}
                  data-testid={`input-${prefix}event-city`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State/Province</FormLabel>
              <FormControl>
                <Input
                  placeholder="NY"
                  {...field}
                  value={field.value || ""}
                  data-testid={`input-${prefix}event-state`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <Input
                  placeholder="United States"
                  {...field}
                  value={field.value || ""}
                  data-testid={`input-${prefix}event-country`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="postalCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Postal Code</FormLabel>
              <FormControl>
                <Input
                  placeholder="10001"
                  {...field}
                  value={field.value || ""}
                  data-testid={`input-${prefix}event-postal-code`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input
                  placeholder="+1 (555) 123-4567"
                  {...field}
                  value={field.value || ""}
                  data-testid={`input-${prefix}event-phone`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com"
                  {...field}
                  value={field.value || ""}
                  data-testid={`input-${prefix}event-website`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="publicSlug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Public URL Slug</FormLabel>
              <FormControl>
                <Input
                  placeholder="my-conference-2025"
                  {...field}
                  value={field.value || ""}
                  data-testid={`input-${prefix}event-public-slug`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="isPublic"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between">
            <div>
              <FormLabel>Make Event Public</FormLabel>
              <p className="text-sm text-muted-foreground">Allow public access to event page</p>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                data-testid={`switch-${prefix}event-is-public`}
              />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="registrationOpen"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between">
            <div>
              <FormLabel>Open Registration</FormLabel>
              <p className="text-sm text-muted-foreground">Allow public registration for this event</p>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                data-testid={`switch-${prefix}event-registration-open`}
              />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid={`select-${prefix}event-status`}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
