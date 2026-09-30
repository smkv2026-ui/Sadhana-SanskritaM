/** Minimal RFC 5545 calendar file generated in the browser (no server). */
export interface IcsEvent {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  url?: string;
  start: Date;
  durationMinutes: number;
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

/** Lines longer than 75 octets must be folded. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join('\r\n');
}

export function buildIcs(events: IcsEvent[], calendarName = 'Sadhana Sanskritam'): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sadhana Sanskritam//Courses//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escape(calendarName)}`,
  ];
  for (const ev of events) {
    const end = new Date(ev.start.getTime() + ev.durationMinutes * 60_000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.uid}@sadhanasanskritam`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(ev.start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escape(ev.title)}`,
    );
    if (ev.description) lines.push(`DESCRIPTION:${escape(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${escape(ev.location)}`);
    if (ev.url) lines.push(`URL:${ev.url}`);
    lines.push(
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escape(ev.title)} starts in 1 hour`,
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n');
}

export function downloadText(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function googleCalendarUrl(ev: IcsEvent): string {
  const end = new Date(ev.start.getTime() + ev.durationMinutes * 60_000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${stamp(ev.start)}/${stamp(end)}`,
    details: ev.description ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
