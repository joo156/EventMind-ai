import { useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Bell,
  Trash2,
  Check,
  ExternalLink,
  Download,
  Sparkles,
} from "lucide-react";
import type { ExtractedEvent } from "@/lib/extract.functions";
import { downloadICS, googleCalendarUrl, outlookCalendarUrl } from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function categoryColor(cat?: string) {
  const map: Record<string, string> = {
    Meeting: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    Work: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    Travel: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
    Health: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    School: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    Conference: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    Birthday: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
    Wedding: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    Personal: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
  return map[cat ?? ""] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function formatDate(d?: string) {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

export function EventCard({
  event,
  onChange,
  onDelete,
}: {
  event: ExtractedEvent;
  onChange: (e: ExtractedEvent) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const conf = event.confidence ?? 90;
  const confColor =
    conf >= 90 ? "text-emerald-600" : conf >= 70 ? "text-amber-600" : "text-rose-600";

  return (
    <div className="group rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] transition-all hover:shadow-[var(--shadow-glow)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input
              value={event.title}
              onChange={(e) => onChange({ ...event, title: e.target.value })}
              className="text-lg font-semibold"
            />
          ) : (
            <h3 className="text-lg font-semibold text-foreground truncate">
              {event.title || "Untitled"}
            </h3>
          )}
          {event.subtitle && !editing && (
            <p className="text-sm text-muted-foreground mt-0.5">{event.subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {event.category && (
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${categoryColor(event.category)}`}
            >
              {event.category}
            </span>
          )}
          <span className={`text-xs font-semibold ${confColor} flex items-center gap-1`}>
            <Sparkles className="h-3 w-3" />
            {conf}%
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-foreground">
          <Calendar className="h-4 w-4 text-primary" />
          {editing ? (
            <Input
              type="date"
              value={event.startDate ?? ""}
              onChange={(e) => onChange({ ...event, startDate: e.target.value })}
              className="h-8"
            />
          ) : (
            <span>{formatDate(event.startDate)}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-foreground">
          <Clock className="h-4 w-4 text-primary" />
          {editing ? (
            <div className="flex items-center gap-1">
              <Input
                type="time"
                value={event.startTime ?? ""}
                onChange={(e) => onChange({ ...event, startTime: e.target.value })}
                className="h-8"
              />
              <span>–</span>
              <Input
                type="time"
                value={event.endTime ?? ""}
                onChange={(e) => onChange({ ...event, endTime: e.target.value })}
                className="h-8"
              />
            </div>
          ) : (
            <span>
              {event.allDay
                ? "All day"
                : `${event.startTime ?? "—"}${event.endTime ? ` – ${event.endTime}` : ""}`}
            </span>
          )}
        </div>
        {(event.location || editing) && (
          <div className="flex items-center gap-2 text-foreground sm:col-span-2">
            <MapPin className="h-4 w-4 text-primary" />
            {editing ? (
              <Input
                value={event.location ?? ""}
                placeholder="Location"
                onChange={(e) => onChange({ ...event, location: e.target.value })}
                className="h-8"
              />
            ) : (
              <span className="truncate">{event.location}</span>
            )}
          </div>
        )}
        {event.meetingLink && (
          <div className="flex items-center gap-2 text-foreground sm:col-span-2">
            <Video className="h-4 w-4 text-primary" />
            <a
              href={event.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline truncate"
            >
              {event.meetingPlatform ?? "Meeting link"}
            </a>
          </div>
        )}
        {event.guests && event.guests.length > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
            <Users className="h-4 w-4" />
            <span className="truncate">{event.guests.join(", ")}</span>
          </div>
        )}
        {event.reminderMinutes ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bell className="h-4 w-4" />
            <span>
              {event.reminderMinutes >= 1440
                ? `${Math.round(event.reminderMinutes / 1440)} day(s) before`
                : `${event.reminderMinutes} min before`}
            </span>
          </div>
        ) : null}
      </div>

      {editing && (
        <div className="mt-3">
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <Textarea
            value={event.description ?? ""}
            onChange={(e) => onChange({ ...event, description: e.target.value })}
            rows={2}
            className="mt-1"
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => setEditing((v) => !v)}>
          {editing ? <Check className="h-4 w-4" /> : null}
          {editing ? "Done" : "Edit"}
        </Button>
        <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline">
            <ExternalLink className="h-4 w-4" />
            Google
          </Button>
        </a>
        <a href={outlookCalendarUrl(event)} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline">
            <ExternalLink className="h-4 w-4" />
            Outlook
          </Button>
        </a>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            downloadICS(
              [event],
              `${(event.title || "event").replace(/\s+/g, "-").toLowerCase()}.ics`,
            )
          }
        >
          <Download className="h-4 w-4" />
          Apple / .ics
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {event.tags && event.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {event.tags.map((t) => (
            <Badge key={t} variant="secondary" className="text-xs">
              {t}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
