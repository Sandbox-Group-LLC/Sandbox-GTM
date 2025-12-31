import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isSameDay, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  SessionRoom,
  AttendeeMeeting,
  RoomOpenHours,
  Attendee,
} from "@shared/schema";

interface RoomScheduleGridProps {
  eventId: string;
  organizationId: string;
}

interface PortalMember {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}

interface MeetingWithDetails extends AttendeeMeeting {
  requester?: Attendee;
  invitee?: Attendee;
  portalMember?: PortalMember | null;
}

interface TimeSlot {
  time: string;
  label: string;
}

function generateTimeSlots(startTime: string, endTime: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  
  let currentHour = startHour;
  let currentMin = startMin;
  
  const endMinutes = endHour * 60 + endMin;
  
  while (currentHour * 60 + currentMin < endMinutes) {
    const timeStr = `${currentHour.toString().padStart(2, "0")}:${currentMin.toString().padStart(2, "0")}`;
    const hour12 = currentHour > 12 ? currentHour - 12 : currentHour === 0 ? 12 : currentHour;
    const ampm = currentHour >= 12 ? "PM" : "AM";
    const label = `${hour12}:${currentMin.toString().padStart(2, "0")} ${ampm}`;
    
    slots.push({ time: timeStr, label });
    
    currentMin += 30;
    if (currentMin >= 60) {
      currentMin = 0;
      currentHour += 1;
    }
  }
  
  return slots;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function isMeetingInSlot(
  meeting: MeetingWithDetails,
  slotTime: string,
  selectedDate: Date
): boolean {
  if (!meeting.startTime || !meeting.endTime) return false;
  
  const meetingStart = new Date(meeting.startTime);
  const meetingEnd = new Date(meeting.endTime);
  
  if (!isSameDay(meetingStart, selectedDate)) return false;
  
  const meetingStartMinutes = meetingStart.getHours() * 60 + meetingStart.getMinutes();
  const meetingEndMinutes = meetingEnd.getHours() * 60 + meetingEnd.getMinutes();
  const slotMinutes = timeToMinutes(slotTime);
  const slotEndMinutes = slotMinutes + 30;
  
  return meetingStartMinutes < slotEndMinutes && meetingEndMinutes > slotMinutes;
}

function getMeetingDisplayName(meeting: MeetingWithDetails): string {
  // First try requester (attendee who scheduled)
  if (meeting.requester) {
    const { firstName, lastName, email } = meeting.requester;
    if (firstName || lastName) {
      return `${firstName || ""} ${lastName || ""}`.trim();
    }
    return email || "Unknown";
  }
  // Then try portal member (team member who scheduled via portal)
  if (meeting.portalMember) {
    const { firstName, lastName, email } = meeting.portalMember;
    if (firstName || lastName) {
      return `${firstName || ""} ${lastName || ""}`.trim();
    }
    return email || "Unknown";
  }
  return "Meeting";
}

export function RoomScheduleGrid({ eventId, organizationId }: RoomScheduleGridProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { data: allRooms, isLoading: roomsLoading, isError: roomsError } = useQuery<SessionRoom[]>({
    queryKey: ["/api/session-rooms"],
  });

  const rooms = useMemo(() => {
    return allRooms?.filter((room) => room.eventId === eventId) || [];
  }, [allRooms, eventId]);

  const { data: meetings, isLoading: meetingsLoading, isError: meetingsError } = useQuery<MeetingWithDetails[]>({
    queryKey: ["/api/events", eventId, "meetings", organizationId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/meetings?organizationId=${organizationId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch meetings");
      return res.json();
    },
    enabled: !!eventId && !!organizationId,
  });

  const { data: allOpenHours, isLoading: openHoursLoading, isError: openHoursError } = useQuery<Record<string, RoomOpenHours[]>>({
    queryKey: ["/api/events", eventId, "rooms", "open-hours", rooms.map((r) => r.id)],
    queryFn: async () => {
      const openHoursMap: Record<string, RoomOpenHours[]> = {};
      await Promise.all(
        rooms.map(async (room) => {
          try {
            const res = await fetch(
              `/api/events/${eventId}/rooms/${room.id}/open-hours`,
              { credentials: "include" }
            );
            if (res.ok) {
              openHoursMap[room.id] = await res.json();
            } else {
              openHoursMap[room.id] = [];
            }
          } catch {
            openHoursMap[room.id] = [];
          }
        })
      );
      return openHoursMap;
    },
    enabled: rooms.length > 0,
  });

  const availableDates = useMemo(() => {
    if (!allOpenHours) return [];
    const dates = new Set<string>();
    Object.values(allOpenHours).forEach((hours) => {
      hours.forEach((oh) => {
        if (oh.openDate) {
          dates.add(oh.openDate);
        }
      });
    });
    return Array.from(dates).sort();
  }, [allOpenHours]);

  const effectiveDate = useMemo(() => {
    if (selectedDate) return selectedDate;
    if (availableDates.length > 0) {
      return parseISO(availableDates[0]);
    }
    return startOfDay(new Date());
  }, [selectedDate, availableDates]);

  const openHoursForDate = useMemo(() => {
    if (!allOpenHours) return {};
    const dateStr = format(effectiveDate, "yyyy-MM-dd");
    const result: Record<string, RoomOpenHours | undefined> = {};
    Object.entries(allOpenHours).forEach(([roomId, hours]) => {
      result[roomId] = hours.find((oh) => oh.openDate === dateStr);
    });
    return result;
  }, [allOpenHours, effectiveDate]);

  const timeSlots = useMemo(() => {
    const openHours = Object.values(openHoursForDate).filter(Boolean) as RoomOpenHours[];
    if (openHours.length === 0) {
      return generateTimeSlots("09:00", "17:00");
    }

    const earliestStart = openHours.reduce(
      (min, oh) => (oh.startTime < min ? oh.startTime : min),
      "23:59"
    );
    const latestEnd = openHours.reduce(
      (max, oh) => (oh.endTime > max ? oh.endTime : max),
      "00:00"
    );

    return generateTimeSlots(earliestStart, latestEnd);
  }, [openHoursForDate]);

  const getMeetingForCell = (roomId: string, slotTime: string): MeetingWithDetails | undefined => {
    if (!meetings) return undefined;
    return meetings.find(
      (m) => m.roomId === roomId && isMeetingInSlot(m, slotTime, effectiveDate)
    );
  };

  const isRoomOpenAtSlot = (roomId: string, slotTime: string): boolean => {
    const oh = openHoursForDate[roomId];
    if (!oh) return false;
    const slotMinutes = timeToMinutes(slotTime);
    const startMinutes = timeToMinutes(oh.startTime);
    const endMinutes = timeToMinutes(oh.endTime);
    return slotMinutes >= startMinutes && slotMinutes < endMinutes;
  };

  const isLoading = roomsLoading || meetingsLoading || openHoursLoading;
  const isError = roomsError || meetingsError || openHoursError;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Room Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Clock className="h-5 w-5" />
            Error Loading Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            There was an error loading the rooms or meetings. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (rooms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Room Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No rooms available for this event. Add rooms in the Rooms page first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Room Schedule
          </CardTitle>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                data-testid="button-date-picker"
                className={cn(
                  "justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(effectiveDate, "MMMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setCalendarOpen(false);
                }}
                disabled={(date) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  return availableDates.length > 0 && !availableDates.includes(dateStr);
                }}
                initialFocus
                data-testid="calendar-date-picker"
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 min-w-[100px]">
                  Time
                </TableHead>
                {rooms.map((room) => (
                  <TableHead
                    key={room.id}
                    className="min-w-[150px] text-center"
                    data-testid={`header-room-${room.id}`}
                  >
                    {room.name}
                    {room.capacity && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({room.capacity})
                      </span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeSlots.map((slot) => (
                <TableRow key={slot.time} data-testid={`row-time-${slot.time}`}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm whitespace-nowrap">
                    {slot.label}
                  </TableCell>
                  {rooms.map((room) => {
                    const meeting = getMeetingForCell(room.id, slot.time);
                    const isOpen = isRoomOpenAtSlot(room.id, slot.time);

                    return (
                      <TableCell
                        key={`${room.id}-${slot.time}`}
                        className={cn(
                          "text-center p-2 min-w-[150px]",
                          !isOpen && "bg-muted/50"
                        )}
                        data-testid={`cell-${room.id}-${slot.time}`}
                      >
                        {meeting ? (
                          <Badge
                            variant="secondary"
                            className="text-xs truncate max-w-full"
                            data-testid={`meeting-${meeting.id}`}
                          >
                            {getMeetingDisplayName(meeting)}
                          </Badge>
                        ) : isOpen ? (
                          <span
                            className="text-muted-foreground text-xs"
                            data-testid={`available-${room.id}-${slot.time}`}
                          >
                            -
                          </span>
                        ) : (
                          <span
                            className="text-muted-foreground/50 text-xs"
                            data-testid={`closed-${room.id}-${slot.time}`}
                          >
                            Closed
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {timeSlots.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-4">
            No open hours configured for this date.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
