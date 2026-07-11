import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ExtractedEvent } from "@/lib/extract.functions";

const EventSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  allDay: z.boolean().optional(),
  timezone: z.string().optional(),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  meetingPlatform: z.string().optional(),
  organizer: z.string().optional(),
  guests: z.array(z.string()).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  confidence: z.number().optional(),
  reminderMinutes: z.number().optional(),
  repeatRule: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
type EventInput = z.infer<typeof EventSchema>;

function toRow(e: ExtractedEvent, userId: string, extractionId: string | null) {
  return {
    user_id: userId,
    extraction_id: extractionId,
    title: e.title || "Untitled",
    subtitle: e.subtitle ?? null,
    start_date: e.startDate ?? null,
    start_time: e.startTime ?? null,
    end_date: e.endDate ?? null,
    end_time: e.endTime ?? null,
    all_day: e.allDay ?? false,
    timezone: e.timezone ?? null,
    location: e.location ?? null,
    meeting_link: e.meetingLink ?? null,
    meeting_platform: e.meetingPlatform ?? null,
    organizer: e.organizer ?? null,
    guests: e.guests ?? null,
    description: e.description ?? null,
    category: e.category ?? null,
    priority: e.priority ?? null,
    confidence: e.confidence ?? null,
    reminder_minutes: e.reminderMinutes ?? null,
    repeat_rule: e.repeatRule ?? null,
    tags: e.tags ?? null,
  };
}

export function rowToEvent(
  r: Record<string, unknown>,
): ExtractedEvent & { id: string; isFavorite: boolean; createdAt: string } {
  return {
    id: r.id as string,
    title: (r.title as string) ?? "Untitled",
    subtitle: (r.subtitle as string) ?? undefined,
    startDate: (r.start_date as string) ?? undefined,
    startTime: (r.start_time as string) ?? undefined,
    endDate: (r.end_date as string) ?? undefined,
    endTime: (r.end_time as string) ?? undefined,
    allDay: (r.all_day as boolean) ?? undefined,
    timezone: (r.timezone as string) ?? undefined,
    location: (r.location as string) ?? undefined,
    meetingLink: (r.meeting_link as string) ?? undefined,
    meetingPlatform: (r.meeting_platform as string) ?? undefined,
    organizer: (r.organizer as string) ?? undefined,
    guests: (r.guests as string[]) ?? undefined,
    description: (r.description as string) ?? undefined,
    category: (r.category as string) ?? undefined,
    priority: (r.priority as ExtractedEvent["priority"]) ?? undefined,
    confidence: (r.confidence as number) ?? undefined,
    reminderMinutes: (r.reminder_minutes as number) ?? undefined,
    repeatRule: (r.repeat_rule as string) ?? undefined,
    tags: (r.tags as string[]) ?? undefined,
    isFavorite: (r.is_favorite as boolean) ?? false,
    createdAt: (r.created_at as string) ?? "",
  };
}

export const saveExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        sourceText: z.string().optional(),
        sourceFiles: z
          .array(z.object({ name: z.string(), mime: z.string(), size: z.number().optional() }))
          .optional(),
        events: z.array(EventSchema),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ex, error: exErr } = await supabase
      .from("extractions")
      .insert({
        user_id: userId,
        source_text: data.sourceText ?? null,
        source_files: data.sourceFiles ?? [],
        event_count: data.events.length,
      })
      .select("id")
      .single();
    if (exErr) throw new Error(exErr.message);
    const rows = data.events.map((e) => toRow(e, userId, ex.id));
    const { data: inserted, error } = await supabase.from("events").insert(rows).select("*");
    if (error) throw new Error(error.message);
    return { extractionId: ex.id, events: (inserted ?? []).map(rowToEvent) };
  });

export const listMyEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { events: (data ?? []).map(rowToEvent) };
  });

export const listMyExtractions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("extractions")
      .select("id, source_text, source_files, event_count, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { extractions: data ?? [] };
  });

export const updateEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ id: z.string().uuid(), patch: EventSchema.partial() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const p = data.patch as Partial<EventInput>;
    const map: Record<keyof EventInput, string> = {
      title: "title",
      subtitle: "subtitle",
      startDate: "start_date",
      startTime: "start_time",
      endDate: "end_date",
      endTime: "end_time",
      allDay: "all_day",
      timezone: "timezone",
      location: "location",
      meetingLink: "meeting_link",
      meetingPlatform: "meeting_platform",
      organizer: "organizer",
      guests: "guests",
      description: "description",
      category: "category",
      priority: "priority",
      confidence: "confidence",
      reminderMinutes: "reminder_minutes",
      repeatRule: "repeat_rule",
      tags: "tags",
    };
    const patch: Record<string, unknown> = {};
    (Object.keys(p) as (keyof EventInput)[]).forEach((k) => {
      if (p[k] !== undefined) patch[map[k]] = p[k];
    });
    const { data: updated, error } = await supabase
      .from("events")
      .update(patch as never)
      .eq("id", data.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToEvent(updated);
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ id: z.string().uuid(), value: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("events")
      .update({ is_favorite: data.value })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const roleList = (roles ?? []).map((r) => r.role as string);
    const isAdmin = roleList.includes("admin");
    const isPro = isAdmin || roleList.includes("pro");
    return { profile, isAdmin, isPro };
  });

export const checkAndIncrementQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("monthly_imports_used, monthly_period")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId).in("role", ["admin", "pro"]),
    ]);
    const isPrivileged = (roles ?? []).length > 0;
    const isAdmin = (roles ?? []).some((r) => (r.role as string) === "admin");
    if (isPrivileged) return { allowed: true, used: 0, limit: Infinity, isAdmin };
    const period = new Date().toISOString().slice(0, 7);
    const used = profile?.monthly_period === period ? (profile?.monthly_imports_used ?? 0) : 0;
    const LIMIT = 20;
    if (used >= LIMIT) return { allowed: false, used, limit: LIMIT, isAdmin: false };
    const nextUsed = used + 1;
    const { error } = await supabase
      .from("profiles")
      .update({ monthly_imports_used: nextUsed, monthly_period: period })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { allowed: true, used: nextUsed, limit: LIMIT, isAdmin: false };
  });
