import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Send, Wand2 } from "lucide-react";
import { chatEditEvent } from "@/lib/chat.functions";
import type { ExtractedEvent } from "@/lib/extract.functions";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Move to next Friday at 3pm",
  "Add a Zoom link and 15-min reminder",
  "Change location to my office",
  "Make it recurring weekly",
];

export function EventChatDialog({
  event,
  open,
  onOpenChange,
  onUpdate,
}: {
  event: ExtractedEvent;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdate: (next: ExtractedEvent) => void;
}) {
  const chat = useServerFn(chatEditEvent);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setHistory((h) => [...h, { role: "user", text }]);
    setMsg("");
    try {
      const res = await chat({
        data: { instruction: text, event: event as unknown as Record<string, unknown> },
      });
      onUpdate(res.event);
      setHistory((h) => [...h, { role: "ai", text: res.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Wand2 className="h-4 w-4 text-primary" /> AI event assistant
          </DialogTitle>
          <DialogDescription>
            Editing “{event.title}”. Try natural language — “move to Friday 3pm”.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
          {history.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs rounded-full border px-3 py-1.5 hover:bg-secondary transition-colors"
                >
                  <Sparkles className="inline h-3 w-3 text-primary mr-1" />
                  {s}
                </button>
              ))}
            </div>
          )}
          {history.map((m, i) => (
            <div
              key={i}
              className={`rounded-xl p-3 text-sm em-fade-up ${m.role === "user" ? "bg-primary/10 ml-6" : "bg-secondary mr-6"}`}
            >
              {m.text}
            </div>
          ))}
          {busy && (
            <div className="rounded-xl p-3 text-sm bg-secondary mr-6 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          )}
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(msg);
              }
            }}
            placeholder="Ask the assistant to edit this event…"
            className="min-h-[60px]"
          />
          <Button onClick={() => send(msg)} disabled={busy || !msg.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
