import type { ExtractedEvent } from "./extract.functions";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateTime(date?: string, time?: string, allDay?: boolean): Date | null {
  if (!date) return null;
  if (allDay || !time) return new Date(`${date}T00:00:00`);
  return new Date(`${date}T${time}:00`);
}

function fmtUTC(d: Date) {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function fmtDate(d: Date) {
  return d.getFullYear().toString() + pad(d.getMonth() + 1) + pad(d.getDate());
}

function escapeICS(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildICS(events: ExtractedEvent[]) {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventMind AI//EN",
    "CALSCALE:GREGORIAN",
  ];
  const stamp = fmtUTC(new Date());
  for (const [i, e] of events.entries()) {
    const start = toDateTime(e.startDate, e.startTime, e.allDay);
    if (!start) continue;
    let end = toDateTime(e.endDate ?? e.startDate, e.endTime, e.allDay);
    if (!end || end <= start) {
      end = new Date(start.getTime() + (e.allDay ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000));
    }
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${stamp}-${i}@eventmind.ai`);
    lines.push(`DTSTAMP:${stamp}`);
    if (e.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${fmtDate(start)}`);
      lines.push(`DTEND;VALUE=DATE:${fmtDate(end)}`);
    } else {
      lines.push(`DTSTART:${fmtUTC(start)}`);
      lines.push(`DTEND:${fmtUTC(end)}`);
    }
    lines.push(`SUMMARY:${escapeICS(e.title || "Untitled event")}`);
    if (e.location) lines.push(`LOCATION:${escapeICS(e.location)}`);
    const descParts: string[] = [];
    if (e.description) descParts.push(e.description);
    if (e.meetingLink) descParts.push(`Meeting: ${e.meetingLink}`);
    if (e.organizer) descParts.push(`Organizer: ${e.organizer}`);
    if (descParts.length) lines.push(`DESCRIPTION:${escapeICS(descParts.join("\n"))}`);
    if (e.meetingLink) lines.push(`URL:${e.meetingLink}`);
    if (e.reminderMinutes && e.reminderMinutes > 0) {
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:${escapeICS(e.title || "Reminder")}`);
      lines.push(`TRIGGER:-PT${e.reminderMinutes}M`);
      lines.push("END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICS(events: ExtractedEvent[], filename = "eventmind.ics") {
  const blob = new Blob([buildICS(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function googleCalendarUrl(e: ExtractedEvent): string {
  const start = toDateTime(e.startDate, e.startTime, e.allDay);
  if (!start) return "https://calendar.google.com/calendar/r/eventedit";
  let end = toDateTime(e.endDate ?? e.startDate, e.endTime, e.allDay);
  if (!end || end <= start) {
    end = new Date(start.getTime() + (e.allDay ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000));
  }
  const dates = e.allDay ? `${fmtDate(start)}/${fmtDate(end)}` : `${fmtUTC(start)}/${fmtUTC(end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title || "Untitled event",
    dates,
  });
  const details: string[] = [];
  if (e.description) details.push(e.description);
  if (e.meetingLink) details.push(`Meeting: ${e.meetingLink}`);
  if (details.length) params.set("details", details.join("\n"));
  if (e.location) params.set("location", e.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(e: ExtractedEvent): string {
  const start = toDateTime(e.startDate, e.startTime, e.allDay);
  const end = toDateTime(e.endDate ?? e.startDate, e.endTime, e.allDay);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title || "Untitled event",
  });
  if (start) params.set("startdt", start.toISOString());
  if (end) params.set("enddt", end.toISOString());
  if (e.location) params.set("location", e.location);
  const body = [e.description, e.meetingLink ? `Meeting: ${e.meetingLink}` : ""]
    .filter(Boolean)
    .join("\n");
  if (body) params.set("body", body);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
