import * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CalendarProps = {
  mode?: "single";
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  initialFocus?: boolean;
  className?: string;
};

export function Calendar({ selected, onSelect, className }: CalendarProps) {
  const [viewDate, setViewDate] = React.useState(selected || new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)];

  return (
    <div className={cn("p-3 select-none", className)}>
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm font-medium">{MONTHS[month]} {year}</span>
        <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map(d => <div key={d} className="text-center text-xs text-muted-foreground">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const date = new Date(year, month, day);
          const isSelected = selected && date.toDateString() === selected.toDateString();
          return (
            <button
              key={day}
              onClick={() => onSelect?.(date)}
              className={cn(
                "h-8 w-8 rounded-md text-sm flex items-center justify-center hover:bg-accent",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
