import * as React from "react";
import { format, addMonths } from "date-fns";
import { Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import { DateRange, DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onRangeChange: (start: string, end: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  testId?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  className,
  placeholder = "Select dates",
  disabled = false,
  testId,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const dateRange: DateRange | undefined = React.useMemo(() => {
    if (!startDate && !endDate) return undefined;
    return {
      from: startDate ? new Date(startDate) : undefined,
      to: endDate ? new Date(endDate) : undefined,
    };
  }, [startDate, endDate]);

  const [month, setMonth] = React.useState<Date>(
    dateRange?.from || new Date()
  );

  const handleSelect = (range: DateRange | undefined) => {
    const start = range?.from ? format(range.from, "yyyy-MM-dd") : "";
    const end = range?.to ? format(range.to, "yyyy-MM-dd") : "";
    onRangeChange(start, end);
  };

  const formatDisplayDate = (date: Date) => {
    return format(date, "EEE, MMM d");
  };

  const hasSelection = dateRange?.from || dateRange?.to;
  const nightsCount = dateRange?.from && dateRange?.to
    ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-auto py-3",
            !hasSelection && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          data-testid={testId}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {hasSelection ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="truncate">
                {dateRange?.from ? formatDisplayDate(dateRange.from) : "Start"}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {dateRange?.to ? formatDisplayDate(dateRange.to) : "End"}
              </span>
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="bg-popover rounded-lg">
          <div className="border-b px-4 py-3">
            <div className="text-sm font-medium text-center">Event Dates</div>
            <div className="flex items-center justify-center gap-3 mt-2 px-3 py-2 bg-muted rounded-full text-sm">
              <span className="font-medium">
                {dateRange?.from ? formatDisplayDate(dateRange.from) : "Start Date"}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {dateRange?.to ? formatDisplayDate(dateRange.to) : "End Date"}
              </span>
            </div>
          </div>

          <DayPicker
            mode="range"
            defaultMonth={month}
            onMonthChange={setMonth}
            selected={dateRange}
            onSelect={handleSelect}
            numberOfMonths={2}
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
                "relative h-9 w-9 text-center text-sm p-0 focus-within:relative focus-within:z-20",
                "[&:has([aria-selected])]:bg-accent",
                "[&:has([aria-selected].day-range-end)]:rounded-r-full",
                "[&:has([aria-selected].day-range-start)]:rounded-l-full",
                "first:[&:has([aria-selected])]:rounded-l-full",
                "last:[&:has([aria-selected])]:rounded-r-full"
              ),
              day: cn(
                buttonVariants({ variant: "ghost" }),
                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-full"
              ),
              day_range_start: "day-range-start bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-full",
              day_range_end: "day-range-end bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-full",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full",
              day_today: "border border-accent-foreground/20",
              day_outside: "day-outside text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
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

          {nightsCount > 0 && (
            <div className="border-t px-4 py-3">
              <Button
                className="w-full"
                onClick={() => setOpen(false)}
                data-testid={testId ? `${testId}-confirm` : undefined}
              >
                {nightsCount} {nightsCount === 1 ? "Day" : "Days"} Selected
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
