import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAIService } from "@/lib/ai-provider";
import type { ExtractedEvent } from "@/lib/extract.functions";

const CURRENT_EVENT_KEYS = [
  "title",
  "subtitle",
  "startDate",
  "startTime",
  "endDate",
  "endTime",
  "allDay",
  "timezone",
  "location",
  "meetingLink",
  "meetingPlatform",
  "organizer",
  "guests",
  "description",
  "category",
  "priority",
  "reminderMinutes",
  "repeatRule",
  "tags",
] as const;

export const chatEditEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        instruction: z.string().min(1).max(2000),
        event: z.record(z.string(), z.unknown()),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const ai = getAIService();

      const eventJson = JSON.stringify(data.event, null, 2);
      const system = `You edit a single calendar event based on a natural-language instruction.
Return ONLY strict JSON: {"event": <updated ExtractedEvent>, "reply": "<one short sentence>"}.
Keep fields you don't change. Dates YYYY-MM-DD, times HH:MM (24h). Today is ${new Date().toISOString().slice(0, 10)}.
Allowed event keys: ${CURRENT_EVENT_KEYS.join(", ")}.`;

      const userMessage = `Current event:\n${eventJson}\n\nInstruction: ${data.instruction}`;

      const response = await ai.chat({
        systemPrompt: system,
        userMessage,
        responseFormat: "json_object",
      });

      let parsed: { event?: ExtractedEvent; reply?: string } = {};
      try {
        parsed = JSON.parse(response.content);
      } catch {
        const m = response.content.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      }

      return {
        event: parsed.event ?? (data.event as unknown as ExtractedEvent),
        reply: parsed.reply ?? "Updated.",
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Event edit failed: ${error.message}`);
      }
      throw error;
    }
  });
