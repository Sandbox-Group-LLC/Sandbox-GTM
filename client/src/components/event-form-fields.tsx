import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { COUNTRIES } from "@/lib/countries";
import { cn } from "@/lib/utils";

// Schema for acquisition milestone with proper number coercion
const acquisitionMilestoneSchema = z.object({
  date: z.string(),
  targetAttendees: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 0 : Number(val)),
    z.number().min(0)
  ),
});

export const eventFormSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  description: z.string().optional(),
  planningStartDate: z.string().optional(), // When planning began for execution timeline
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
  acquisitionGoal: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().min(0).nullable()
  ),
  acquisitionMilestones: z.array(acquisitionMilestoneSchema).nullable(),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormFieldsProps {
  form: UseFormReturn<EventFormValues>;
  testIdPrefix?: string;
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function EventFormFields({ form, testIdPrefix = "" }: EventFormFieldsProps) {
  const prefix = testIdPrefix ? `${testIdPrefix}-` : "";
  const [planningDateOpen, setPlanningDateOpen] = useState(false);

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
      <FormField
        control={form.control}
        name="planningStartDate"
        render={({ field }) => {
          const selectedDate = field.value ? parseLocalDate(field.value) : undefined;
          return (
            <FormItem>
              <FormLabel>Planning Start Date</FormLabel>
              <FormControl>
                <Popover open={planningDateOpen} onOpenChange={setPlanningDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-auto py-3",
                        !field.value && "text-muted-foreground"
                      )}
                      data-testid={`input-${prefix}planning-start-date`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      {selectedDate ? format(selectedDate, "EEE, MMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DayPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          field.onChange(formatLocalDate(date));
                        } else {
                          field.onChange("");
                        }
                        setPlanningDateOpen(false);
                      }}
                      showOutsideDays={true}
                      className="p-3"
                      classNames={{
                        months: "flex flex-col sm:flex-row gap-4",
                        month: "space-y-3",
                        caption: "flex justify-center pt-1 relative items-center h-9",
                        caption_label: "text-sm font-medium",
                        nav: "space-x-1 flex items-center",
                        nav_button: cn(
                          buttonVariants({ variant: "ghost" }),
                          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100"
                        ),
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        table: "w-full border-collapse",
                        head_row: "flex",
                        head_cell: "text-muted-foreground w-9 font-normal text-[0.75rem] uppercase",
                        row: "flex w-full mt-1",
                        cell: cn(
                          "relative h-9 w-9 text-center text-sm p-0 focus-within:relative focus-within:z-20"
                        ),
                        day: cn(
                          buttonVariants({ variant: "ghost" }),
                          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-full"
                        ),
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full",
                        day_today: "border border-accent-foreground/20",
                        day_outside: "day-outside text-muted-foreground opacity-50",
                        day_disabled: "text-muted-foreground opacity-50",
                        day_hidden: "invisible",
                      }}
                      components={{
                        IconLeft: ({ className, ...props }) => (
                          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
                        ),
                        IconRight: ({ className, ...props }) => (
                          <ChevronRight className={cn("h-4 w-4", className)} {...props} />
                        ),
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Optional. Used for execution timeline tracking.
              </p>
              <FormMessage />
            </FormItem>
          );
        }}
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
                <FormField
                  control={form.control}
                  name={`acquisitionMilestones.${index}.date`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Milestone {index + 1} Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value || ""}
                          data-testid={`input-${prefix}event-milestone-${index + 1}-date`}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`acquisitionMilestones.${index}.targetAttendees`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Target Attendees</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                          data-testid={`input-${prefix}event-milestone-${index + 1}-target`}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
