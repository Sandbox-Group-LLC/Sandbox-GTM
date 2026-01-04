import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { QRCodeSVG } from "qrcode.react";
import { Printer, Download, QrCode, Users, Check } from "lucide-react";
import type { Attendee, Event } from "@shared/schema";

export default function BadgeGenerator() {
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: attendees = [], isLoading: attendeesLoading } = useQuery<Attendee[]>({
    queryKey: ["/api/attendees"],
  });

  const filteredAttendees = selectedEventId === "all"
    ? attendees
    : attendees.filter(a => a.eventId === selectedEventId);

  const selectedAttendees = filteredAttendees.filter(a => selectedAttendeeIds.has(a.id));

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedAttendeeIds(new Set(filteredAttendees.map(a => a.id)));
    } else {
      setSelectedAttendeeIds(new Set());
    }
  };

  const handleToggleAttendee = (attendeeId: string) => {
    const newSet = new Set(selectedAttendeeIds);
    if (newSet.has(attendeeId)) {
      newSet.delete(attendeeId);
    } else {
      newSet.add(attendeeId);
    }
    setSelectedAttendeeIds(newSet);
    setSelectAll(newSet.size === filteredAttendees.length);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendee Badges</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .badge-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 16px;
              padding: 16px;
            }
            .badge {
              border: 1px solid #e5e5e5;
              border-radius: 8px;
              padding: 24px;
              text-align: center;
              page-break-inside: avoid;
            }
            .badge-name {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 4px;
            }
            .badge-company {
              font-size: 14px;
              color: #666;
              margin-bottom: 16px;
            }
            .badge-qr {
              display: flex;
              justify-content: center;
              margin-bottom: 12px;
            }
            .badge-code {
              font-family: monospace;
              font-size: 14px;
              font-weight: 600;
              letter-spacing: 2px;
              color: #333;
            }
            @media print {
              .badge-grid {
                gap: 12px;
                padding: 12px;
              }
              .badge {
                padding: 16px;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const eventLookup = events.reduce<Record<string, string>>((acc, e) => {
    acc[e.id] = e.name;
    return acc;
  }, {});

  const isLoading = eventsLoading || attendeesLoading;

  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        title="Badge Generator"
      />

      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Event:</span>
            <Select
              value={selectedEventId}
              onValueChange={(value) => {
                setSelectedEventId(value);
                setSelectedAttendeeIds(new Set());
                setSelectAll(false);
              }}
            >
              <SelectTrigger className="w-[250px]" data-testid="select-badge-event">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAttendees.length > 0 && (
            <Button
              onClick={handlePrint}
              data-testid="button-print-badges"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print {selectedAttendees.length} Badge{selectedAttendees.length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : filteredAttendees.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No attendees found for the selected event</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-4 pb-2 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Select All ({filteredAttendees.length})
                </label>
              </div>
              {selectedAttendeeIds.size > 0 && (
                <Badge variant="secondary">
                  {selectedAttendeeIds.size} selected
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAttendees.map((attendee) => (
                <Card
                  key={attendee.id}
                  className={`relative cursor-pointer transition-all ${
                    selectedAttendeeIds.has(attendee.id)
                      ? 'ring-2 ring-primary'
                      : ''
                  }`}
                  onClick={() => handleToggleAttendee(attendee.id)}
                  data-testid={`card-badge-${attendee.id}`}
                >
                  {selectedAttendeeIds.has(attendee.id) && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    </div>
                  )}
                  <CardContent className="flex flex-col items-center pt-6">
                    <div className="bg-white p-3 rounded-lg border mb-3">
                      <QRCodeSVG
                        value={attendee.checkInCode || ""}
                        size={100}
                        level="M"
                      />
                    </div>
                    <p className="font-semibold text-center" data-testid={`text-badge-name-${attendee.id}`}>
                      {attendee.firstName} {attendee.lastName}
                    </p>
                    {attendee.company && (
                      <p className="text-sm text-muted-foreground text-center">
                        {attendee.company}
                      </p>
                    )}
                    <p className="text-xs font-mono mt-2 tracking-wider text-muted-foreground">
                      {attendee.checkInCode || ""}
                    </p>
                    {selectedEventId === "all" && eventLookup[attendee.eventId] && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {eventLookup[attendee.eventId]}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Hidden print content */}
        <div ref={printRef} className="hidden">
          <div className="badge-grid">
            {selectedAttendees.map((attendee) => (
              <div key={attendee.id} className="badge">
                <div className="badge-name">
                  {attendee.firstName} {attendee.lastName}
                </div>
                {attendee.company && (
                  <div className="badge-company">{attendee.company}</div>
                )}
                <div className="badge-qr">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="120"
                    height="120"
                    viewBox="0 0 120 120"
                  >
                    <image
                      href={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(attendee.checkInCode || "")}`}
                      width="120"
                      height="120"
                    />
                  </svg>
                </div>
                <div className="badge-code">{attendee.checkInCode || ""}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
