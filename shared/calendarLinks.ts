export interface CalendarEventDetails {
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

export interface CalendarLinks {
  google: string;
  outlook: string;
  office365: string;
  yahoo: string;
  ical: string;
  apple: string;
}

function formatDateForGoogle(date: string, time?: string): string {
  const d = new Date(date);
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    d.setHours(hours, minutes, 0, 0);
  }
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function formatDateForOutlook(date: string, time?: string): string {
  const d = new Date(date);
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    d.setHours(hours, minutes, 0, 0);
  }
  return d.toISOString();
}

function formatDateForYahoo(date: string, time?: string): string {
  const d = new Date(date);
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    d.setHours(hours, minutes, 0, 0);
  }
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').slice(0, 15);
}

export function generateCalendarLinks(event: CalendarEventDetails): CalendarLinks {
  const { title, description = '', location = '', startDate, endDate, startTime, endTime } = event;
  
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);
  const encodedLocation = encodeURIComponent(location);
  
  const end = endDate || startDate;
  const eTime = endTime || startTime;
  
  const googleStart = formatDateForGoogle(startDate, startTime);
  const googleEnd = formatDateForGoogle(end, eTime);
  
  const outlookStart = formatDateForOutlook(startDate, startTime);
  const outlookEnd = formatDateForOutlook(end, eTime);
  
  const yahooStart = formatDateForYahoo(startDate, startTime);
  const yahooEnd = formatDateForYahoo(end, eTime);

  return {
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&dates=${googleStart}/${googleEnd}&details=${encodedDescription}&location=${encodedLocation}`,
    
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodedTitle}&startdt=${outlookStart}&enddt=${outlookEnd}&body=${encodedDescription}&location=${encodedLocation}`,
    
    office365: `https://outlook.office.com/calendar/0/deeplink/compose?subject=${encodedTitle}&startdt=${outlookStart}&enddt=${outlookEnd}&body=${encodedDescription}&location=${encodedLocation}`,
    
    yahoo: `https://calendar.yahoo.com/?v=60&title=${encodedTitle}&st=${yahooStart}&et=${yahooEnd}&desc=${encodedDescription}&in_loc=${encodedLocation}`,
    
    ical: `data:text/calendar;charset=utf-8,${encodeURIComponent(generateICalContent(event))}`,
    
    apple: `data:text/calendar;charset=utf-8,${encodeURIComponent(generateICalContent(event))}`,
  };
}

function generateICalContent(event: CalendarEventDetails): string {
  const { title, description = '', location = '', startDate, endDate, startTime } = event;
  
  const formatICalDate = (date: string, time?: string): string => {
    const d = new Date(date);
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      d.setHours(hours, minutes, 0, 0);
    }
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const start = formatICalDate(startDate, startTime);
  const end = formatICalDate(endDate || startDate, startTime);
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Event Management CMS//EN
BEGIN:VEVENT
UID:${Date.now()}@eventcms
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
SUMMARY:${title.replace(/,/g, '\\,')}
DESCRIPTION:${description.replace(/\n/g, '\\n').replace(/,/g, '\\,')}
LOCATION:${location.replace(/,/g, '\\,')}
END:VEVENT
END:VCALENDAR`;
}

export function generateCalendarLinksHtml(event: CalendarEventDetails): string {
  const links = generateCalendarLinks(event);
  
  return `
<div style="text-align: center; margin: 24px 0;">
  <p style="font-size: 14px; color: #374151; margin-bottom: 12px; font-weight: 500;">Add event to calendar</p>
  <div style="display: inline-flex; gap: 16px; align-items: center;">
    <a href="${links.apple}" download="event.ics" style="text-decoration: none;" title="Apple Calendar">
      <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/apple.svg" alt="Apple" width="28" height="28" style="opacity: 0.8;" />
    </a>
    <a href="${links.google}" target="_blank" rel="noopener noreferrer" style="text-decoration: none;" title="Google Calendar">
      <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/google.svg" alt="Google" width="28" height="28" style="opacity: 0.8;" />
    </a>
    <a href="${links.outlook}" target="_blank" rel="noopener noreferrer" style="text-decoration: none;" title="Outlook.com">
      <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/microsoftoutlook.svg" alt="Outlook" width="28" height="28" style="opacity: 0.8;" />
    </a>
    <a href="${links.office365}" target="_blank" rel="noopener noreferrer" style="text-decoration: none;" title="Office 365">
      <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/microsoft.svg" alt="Office 365" width="28" height="28" style="opacity: 0.8;" />
    </a>
    <a href="${links.yahoo}" target="_blank" rel="noopener noreferrer" style="text-decoration: none;" title="Yahoo Calendar">
      <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/yahoo.svg" alt="Yahoo" width="28" height="28" style="opacity: 0.8;" />
    </a>
  </div>
</div>`;
}
