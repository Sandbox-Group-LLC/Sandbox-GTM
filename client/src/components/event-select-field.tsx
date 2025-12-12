import { useQuery } from "@tanstack/react-query";
import { Control } from "react-hook-form";
import {
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
import type { Event } from "@shared/schema";

interface EventSelectFieldProps {
  control: Control<any>;
  name?: string;
  label?: string;
  required?: boolean;
}

export function EventSelectField({
  control,
  name = "eventId",
  label = "Event",
  required = true,
}: EventSelectFieldProps) {
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}{required && " *"}</FormLabel>
          <Select onValueChange={field.onChange} value={field.value || ""}>
            <FormControl>
              <SelectTrigger data-testid={`select-${name}`}>
                <SelectValue placeholder={isLoading ? "Loading events..." : "Select an event"} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {!events || events.length === 0 ? (
                <SelectItem value="no-events" disabled>
                  No events available
                </SelectItem>
              ) : (
                events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
