import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAIService } from "@/lib/ai-provider";

const InputSchema = z.object({
  text: z.string().optional(),
  files: z
    .array(
      z.object({
        name: z.string(),
        mime: z.string(),
        dataUrl: z.string(), // data:<mime>;base64,....
      }),
    )
    .optional(),
});

export type ExtractedEvent = {
  title: string;
  subtitle?: string;
  startDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:MM (24h)
  endDate?: string;
  endTime?: string;
  allDay?: boolean;
  timezone?: string;
  location?: string;
  meetingLink?: string;
  meetingPlatform?: string;
  organizer?: string;
  guests?: string[];
  description?: string;
  category?: string;
  priority?: "high" | "medium" | "low";
  confidence?: number; // 0-100
  reminderMinutes?: number;
  repeatRule?: string;
  tags?: string[];
};

const SYSTEM = `You are EventMind AI, an expert at extracting calendar events from ANY content: plain text, emails, meeting invites, tickets, itineraries, posters, screenshots, PDFs, schedules, timetables.

Rules:
- Return ONE OR MANY events. Timetables, itineraries, and agendas usually have many.
- Dates as YYYY-MM-DD. Times as HH:MM (24h). If year missing, infer nearest upcoming.
- If time missing, allDay=true.
- Detect meeting platform from links (Zoom/Google Meet/Teams/Webex/FaceTime).
- Category one of: Work, School, Personal, Travel, Health, Birthday, Conference, Meeting, Interview, Wedding, Workshop, Concert, Sports, Finance, Shopping, Holiday, Family, Fitness, Appointment, Other.
- Priority: high/medium/low.
- confidence: overall 0-100.
- Suggest reminderMinutes based on category (Flight 1440, Doctor 1440, Meeting 30, Birthday 10080, Exam 4320, default 60).
- Timezone: IANA like "America/New_York" when inferable.

Respond ONLY with strict JSON: {"events": [ ...ExtractedEvent ]}. No markdown, no prose.`;

export const extractEvents = createServerFn({ method: "POST" })
  .validator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const ai = getAIService();

      // Build user message with input content
      let userMessage = `Today is ${new Date().toISOString().slice(0, 10)}. Extract every calendar event.\n\n`;

      if (data.text && data.text.trim()) {
        userMessage += `Content:\n${data.text.trim()}\n`;
      }

      // Note: In a production system, we'd handle multimodal content
      // (images, PDFs) differently for each provider. For now, we support text.
      if (data.files && data.files.length > 0) {
        userMessage += `\nFiles provided: ${data.files.map((f) => f.name).join(", ")}\n`;
        userMessage +=
          "(Note: File contents are not yet fully supported in this release. Please paste text content instead.)";
      }

      if (!userMessage.trim()) {
        throw new Error("Provide text or files");
      }

      const response = await ai.chat({
        systemPrompt: SYSTEM,
        userMessage,
        responseFormat: "json_object",
      });

      let parsed: { events?: ExtractedEvent[] } = {};
      try {
        parsed = JSON.parse(response.content);
      } catch {
        const match = response.content.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }

      const events = Array.isArray(parsed.events) ? parsed.events : [];
      return { events };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Event extraction failed: ${error.message}`);
      }
      throw error;
    }
  });
