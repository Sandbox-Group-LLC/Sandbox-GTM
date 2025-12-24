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
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { COUNTRIES } from "@/lib/countries";

// Schema for acquisition milestone
const acquisitionMilestoneSchema = z.object({
  date: z.string(),
  targetAttendees: z.number().min(0),
});

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
  // Acquisition milestones
  setAcquisitionMilestones: z.boolean().default(false),
  acquisitionGoal: z.coerce.number().min(0).optional().nullable(),
  acquisitionMilestones: z.array(acquisitionMilestoneSchema).optional().nullable(),
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
              <AddressAutocomplete
                value={field.value || ""}
                onChange={field.onChange}
                onAddressSelect={(address) => {
                  form.setValue("address", address.address, { shouldValidate: true });
                  form.setValue("city", address.city, { shouldValidate: true });
                  form.setValue("state", address.state, { shouldValidate: true });
                  form.setValue("country", address.country, { shouldValidate: true });
                  form.setValue("postalCode", address.postalCode, { shouldValidate: true });
                }}
                placeholder="Start typing an address..."
                testId={`input-${prefix}event-address`}
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
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger data-testid={`select-${prefix}event-country`}>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Switch
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              data-testid={`switch-${prefix}event-is-public`}
            />
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
            <Switch
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              data-testid={`switch-${prefix}event-registration-open`}
            />
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
      <FormField
        control={form.control}
        name="setAcquisitionMilestones"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between">
            <div>
              <FormLabel>Set Acquisition Milestones</FormLabel>
              <p className="text-sm text-muted-foreground">Track registration goals with target dates</p>
            </div>
            <Switch
              checked={field.value === true}
              onCheckedChange={(checked) => {
                field.onChange(checked === true);
                if (!checked) {
                  form.setValue("acquisitionGoal", null);
                  form.setValue("acquisitionMilestones", null);
                } else {
                  form.setValue("acquisitionMilestones", [
                    { date: "", targetAttendees: 0 },
                    { date: "", targetAttendees: 0 },
                    { date: "", targetAttendees: 0 },
                  ]);
                }
              }}
              data-testid={`switch-${prefix}event-acquisition-milestones`}
            />
          </FormItem>
        )}
      />
      {form.watch("setAcquisitionMilestones") && (
        <div className="space-y-4 p-4 rounded-md bg-muted/50">
          <FormField
            control={form.control}
            name="acquisitionGoal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Acquisition Goal</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Total target attendees"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    data-testid={`input-${prefix}event-acquisition-goal`}
                  />
                </FormControl>
                <p className="text-sm text-muted-foreground">Your total attendee target for this program</p>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-3">
            <p className="text-sm font-medium">Milestones</p>
            {[0, 1, 2].map((index) => (
              <div key={index} className="grid grid-cols-2 gap-3">
                <FormItem>
                  <FormLabel className="text-xs">Milestone {index + 1} Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={form.watch(`acquisitionMilestones.${index}.date`) || ""}
                      onChange={(e) => {
                        const milestones = form.getValues("acquisitionMilestones") || [];
                        const updated = [...milestones];
                        if (!updated[index]) {
                          updated[index] = { date: "", targetAttendees: 0 };
                        }
                        updated[index].date = e.target.value;
                        form.setValue("acquisitionMilestones", updated);
                      }}
                      data-testid={`input-${prefix}event-milestone-${index + 1}-date`}
                    />
                  </FormControl>
                </FormItem>
                <FormItem>
                  <FormLabel className="text-xs">Target Attendees</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.watch(`acquisitionMilestones.${index}.targetAttendees`) || ""}
                      onChange={(e) => {
                        const milestones = form.getValues("acquisitionMilestones") || [];
                        const updated = [...milestones];
                        if (!updated[index]) {
                          updated[index] = { date: "", targetAttendees: 0 };
                        }
                        updated[index].targetAttendees = e.target.value ? Number(e.target.value) : 0;
                        form.setValue("acquisitionMilestones", updated);
                      }}
                      data-testid={`input-${prefix}event-milestone-${index + 1}-target`}
                    />
                  </FormControl>
                </FormItem>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
