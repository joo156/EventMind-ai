import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState, type DragEvent, type ClipboardEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Upload,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Mail,
  Globe,
  FileSpreadsheet,
  Presentation,
  Ticket,
  Calendar as CalIcon,
  Loader2,
  Wand2,
  Download,
  Check,
  X,
  Zap,
  ShieldCheck,
  Layers,
  AlertTriangle,
  Save,
  ArrowRight,
} from "lucide-react";
import { extractEvents, type ExtractedEvent } from "@/lib/extract.functions";
import { saveExtraction, checkAndIncrementQuota } from "@/lib/events.functions";
import { EventCard } from "@/components/EventCard";
import { EventChatDialog } from "@/components/EventChatDialog";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { downloadICS } from "@/lib/calendar";
import { toast } from "sonner";
import { useSession, getAnonUsed, bumpAnonUsed, ANON_LIMIT } from "@/lib/auth";

export const Route = createFileRoute("/")({ component: Index });

type PendingFile = { name: string; mime: string; dataUrl: string; size: number };

const SAMPLE = `Team offsite kickoff on Friday March 21, 2026 from 9:30am to 4:00pm at 500 Terry Francois Blvd, San Francisco. Zoom for remote folks: https://zoom.us/j/9876543210

Then dinner at Nopa 7:30pm Saturday March 22.`;

function readFileAsDataURL(file: File): Promise<PendingFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        name: file.name,
        mime: file.type || "application/octet-stream",
        dataUrl: String(reader.result),
        size: file.size,
      });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function findConflicts(events: ExtractedEvent[]): number[][] {
  const groups: number[][] = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i],
        b = events[j];
      if (!a.startDate || !b.startDate) continue;
      if (
        a.startDate === b.startDate &&
        a.startTime &&
        b.startTime &&
        a.startTime === b.startTime
      ) {
        groups.push([i, j]);
      }
    }
  }
  return groups;
}

function findDuplicates(events: ExtractedEvent[]): Set<number> {
  const dup = new Set<number>();
  const seen = new Map<string, number>();
  events.forEach((e, i) => {
    const key = `${(e.title ?? "").toLowerCase().trim()}|${e.startDate ?? ""}|${e.startTime ?? ""}`;
    if (seen.has(key)) {
      dup.add(i);
      dup.add(seen.get(key)!);
    } else seen.set(key, i);
  });
  return dup;
}

function Index() {
  const extract = useServerFn(extractEvents);
  const save = useServerFn(saveExtraction);
  const quota = useServerFn(checkAndIncrementQuota);
  const navigate = useNavigate();
  const { user } = useSession();

  const [text, setText] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<ExtractedEvent[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [chatIdx, setChatIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const addFiles = useCallback(async (list: FileList | File[]) => {
    const converted = await Promise.all(Array.from(list).map(readFileAsDataURL));
    setFiles((prev) => [...prev, ...converted]);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const onPaste = useCallback(
    (e: ClipboardEvent) => {
      if (e.clipboardData.files.length > 0) {
        e.preventDefault();
        addFiles(e.clipboardData.files);
      }
    },
    [addFiles],
  );

  const run = async () => {
    if (!text.trim() && files.length === 0) {
      toast.error("Paste text or add a file first");
      return;
    }
    if (!user) {
      const used = getAnonUsed();
      if (used >= ANON_LIMIT) {
        toast.error(
          `You've used your ${ANON_LIMIT} free anonymous extractions. Sign in for 20 free/month.`,
        );
        navigate({ to: "/auth", search: { mode: "signup" } });
        return;
      }
    } else {
      try {
        const q = await quota();
        if (!q.allowed) {
          toast.error(`Monthly limit reached (${q.used}/${q.limit}). Upgrade to Pro.`);
          return;
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Quota check failed");
        return;
      }
    }

    setLoading(true);
    setEvents(null);
    setSelected(new Set());
    try {
      const res = await extract({ data: { text, files } });
      if (!res.events.length) {
        toast.error("No events found. Try adding a date or more context.");
        return;
      }
      setEvents(res.events);
      setSelected(new Set(res.events.map((_, i) => i)));
      if (!user) bumpAnonUsed();
      toast.success(`Found ${res.events.length} event${res.events.length > 1 ? "s" : ""}`);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const duplicates = useMemo(() => (events ? findDuplicates(events) : new Set<number>()), [events]);
  const conflicts = useMemo(() => (events ? findConflicts(events) : []), [events]);

  const saveSelected = async () => {
    if (!user) {
      navigate({ to: "/auth", search: { mode: "signup" } });
      return;
    }
    if (!events) return;
    const picked = events.filter((_, i) => selected.has(i));
    if (!picked.length) {
      toast.error("Select at least one event");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          sourceText: text || undefined,
          sourceFiles: files.map((f) => ({ name: f.name, mime: f.mime, size: f.size })),
          events: picked,
        },
      });
      toast.success(
        `Saved ${picked.length} event${picked.length > 1 ? "s" : ""} to your dashboard`,
      );
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  };
  const toggleAll = () => {
    if (!events) return;
    setSelected(selected.size === events.length ? new Set() : new Set(events.map((_, i) => i)));
  };

  const inputTypes = [
    { icon: FileText, label: "PDF" },
    { icon: ImageIcon, label: "Images" },
    { icon: Mail, label: "Emails" },
    { icon: Globe, label: "Websites" },
    { icon: FileText, label: "Text" },
    { icon: FileText, label: "Word" },
    { icon: FileSpreadsheet, label: "Excel" },
    { icon: Presentation, label: "PowerPoint" },
    { icon: ImageIcon, label: "Screenshots" },
    { icon: Ticket, label: "Tickets" },
    { icon: CalIcon, label: "ICS Files" },
    { icon: Globe, label: "Meeting Links" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 em-grid-bg opacity-70 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-14 text-center em-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/80 backdrop-blur px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            AI that understands every event
          </div>
          <h1 className="mt-6 font-display text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.02]">
            Turn{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              anything
            </span>
            <br />
            into a calendar event.
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-lg text-muted-foreground">
            Drop an email, a screenshot, a PDF, a website — EventMind reads it all and gives you
            clean, exportable calendar entries in seconds.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button
              size="lg"
              className="h-12 px-6 text-base"
              onClick={() =>
                document.getElementById("start")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Try it free <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-6 text-base"
              onClick={() => {
                setText(SAMPLE);
                setTimeout(
                  () => document.getElementById("start")?.scrollIntoView({ behavior: "smooth" }),
                  20,
                );
              }}
            >
              See demo
            </Button>
          </div>
          {!user && (
            <p className="mt-4 text-xs text-muted-foreground">
              {ANON_LIMIT - getAnonUsed()} free anonymous extraction
              {ANON_LIMIT - getAnonUsed() === 1 ? "" : "s"} left · Sign in for 20/month
            </p>
          )}
        </div>
      </section>

      {/* Universal input */}
      <section id="start" className="mx-auto max-w-4xl px-6 pb-8 -mt-2">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`relative rounded-3xl border-2 border-dashed bg-card p-6 sm:p-8 shadow-[var(--shadow-soft)] transition-all ${
            dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border"
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="h-9 w-9 rounded-xl grid place-items-center text-white em-float"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <Wand2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Drop anything related to an event</div>
              <div className="text-xs text-muted-foreground">
                or paste text — the AI figures out the rest
              </div>
            </div>
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={onPaste}
            placeholder="Paste an email, a schedule, a ticket confirmation, a URL, meeting notes..."
            className="min-h-[160px] resize-y border-0 bg-transparent focus-visible:ring-0 shadow-none p-0 text-base"
          />

          {files.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-2 rounded-full border bg-secondary/60 pl-3 pr-1 py-1 text-xs em-fade-up"
                >
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span className="max-w-[220px] truncate">{f.name}</span>
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="h-5 w-5 rounded-full grid place-items-center hover:bg-background"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              accept=".txt,.pdf,.png,.jpg,.jpeg,.webp,.docx,.doc,.pptx,.xlsx,.csv,.ics,.eml,.msg,image/*,application/pdf"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Upload files
            </Button>
            <div className="flex-1" />
            <Button onClick={run} disabled={loading} size="lg" className="min-w-[180px]">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Understanding…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Extract events
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {inputTypes.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground em-card-hover"
            >
              <Icon className="h-3.5 w-3.5 text-primary" /> {label}
            </div>
          ))}
        </div>
      </section>

      {/* Results */}
      <section ref={resultsRef} className="mx-auto max-w-4xl px-6 pt-8 pb-16">
        {loading && (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="relative h-40 rounded-2xl border bg-card overflow-hidden">
                <div className="absolute inset-0 em-shimmer" />
              </div>
            ))}
          </div>
        )}

        {events && events.length > 0 && (
          <div className="em-fade-up">
            {(duplicates.size > 0 || conflicts.length > 0) && (
              <div className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  {duplicates.size > 0 && (
                    <div>
                      <strong>{duplicates.size}</strong> possible duplicate
                      {duplicates.size > 1 ? "s" : ""} detected.
                    </div>
                  )}
                  {conflicts.length > 0 && (
                    <div>
                      <strong>{conflicts.length}</strong> time conflict
                      {conflicts.length > 1 ? "s" : ""} detected.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selected.size === events.length}
                  onCheckedChange={toggleAll}
                  id="select-all"
                />
                <label htmlFor="select-all" className="text-sm cursor-pointer">
                  {selected.size} of {events.length} selected
                </label>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => downloadICS(events, "eventmind-all.ics")}>
                  <Download className="h-4 w-4" /> Download .ics
                </Button>
                <Button onClick={saveSelected} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {user ? "Save selected" : "Sign in & save"}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {events.map((e, i) => (
                <div
                  key={i}
                  className="relative em-fade-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="absolute -left-1 top-6 z-10">
                    <Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} />
                  </div>
                  <div className="pl-6">
                    <div className="flex flex-wrap gap-1 mb-1 pl-1">
                      {duplicates.has(i) && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                          Possible duplicate
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <EventCard
                        event={e}
                        onChange={(next) =>
                          setEvents((prev) => prev!.map((x, idx) => (idx === i ? next : x)))
                        }
                        onDelete={() => setEvents((prev) => prev!.filter((_, idx) => idx !== i))}
                      />
                      <button
                        aria-label="AI edit"
                        onClick={() => setChatIdx(i)}
                        className="absolute top-4 right-4 rounded-full border bg-background p-1.5 hover:bg-secondary text-primary"
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {chatIdx !== null && events && (
          <EventChatDialog
            event={events[chatIdx]}
            open={chatIdx !== null}
            onOpenChange={(v) => !v && setChatIdx(null)}
            onUpdate={(next) =>
              setEvents((prev) => prev!.map((x, idx) => (idx === chatIdx ? next : x)))
            }
          />
        )}
      </section>

      {/* How it works */}
      <section id="how" className="border-t bg-card/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center font-display text-4xl font-bold">How it works</h2>
          <p className="mt-3 text-center text-muted-foreground max-w-xl mx-auto">
            One universal input. No dropdowns, no templates.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Upload,
                title: "Drop anything",
                body: "PDFs, screenshots, emails, tickets, URLs — everything goes into one box.",
              },
              {
                icon: Wand2,
                title: "AI understands",
                body: "OCR, timezone detection, multi-event splitting, smart reminders.",
              },
              {
                icon: Check,
                title: "One-click export",
                body: "Send to Apple, Google, or Outlook. Or download a clean .ics file.",
              },
            ].map(({ icon: Icon, title, body }, i) => (
              <div
                key={title}
                className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] em-card-hover em-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className="h-10 w-10 rounded-xl grid place-items-center text-white"
                  style={{ backgroundImage: "var(--gradient-primary)" }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center font-display text-4xl font-bold">Built to feel magical</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Layers,
              title: "Multi-event extraction",
              body: "Agendas and itineraries split into individual events automatically.",
            },
            {
              icon: Zap,
              title: "Smart reminders",
              body: "Doctor gets 24h notice. Meetings get 30min. Suggested by context.",
            },
            {
              icon: ShieldCheck,
              title: "You stay in control",
              body: "Review confidence scores, edit anything, export only what you want.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border p-6 em-card-hover">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-display font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-card/40">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center font-display text-4xl font-bold">Simple pricing</h2>
          <p className="mt-3 text-center text-muted-foreground">
            Start free. Upgrade when you're ready.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Anonymous",
                price: "$0",
                features: [
                  `${ANON_LIMIT} extractions total`,
                  "No sign-up needed",
                  "Export to .ics",
                ],
                cta: "Try now",
              },
              {
                name: "Free",
                price: "$0",
                featured: true,
                features: [
                  "20 AI imports / month",
                  "Dashboard & history",
                  "Google, Outlook, .ics",
                  "AI assistant editing",
                ],
                cta: "Sign up free",
              },
              {
                name: "Pro",
                price: "$9",
                features: ["Unlimited imports", "Priority AI", "Advanced OCR", "Shared calendars"],
                cta: "Coming soon",
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border p-6 flex flex-col em-card-hover ${p.featured ? "shadow-[var(--shadow-glow)] border-primary bg-card" : "bg-card"}`}
              >
                <div className="text-sm font-medium text-muted-foreground">{p.name}</div>
                <div className="mt-2 text-4xl font-bold font-display">
                  {p.price}
                  {p.name === "Pro" && (
                    <span className="text-base font-normal text-muted-foreground">/mo</span>
                  )}
                </div>
                <ul className="mt-6 space-y-2 text-sm flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6"
                  variant={p.featured ? "default" : "outline"}
                  onClick={() => {
                    if (p.name === "Pro") {
                      toast("Pro checkout is coming soon.");
                      return;
                    }
                    if (p.name === "Anonymous") {
                      document.getElementById("start")?.scrollIntoView({ behavior: "smooth" });
                      return;
                    }
                    navigate({ to: "/auth", search: { mode: "signup" } });
                  }}
                >
                  {p.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded-md grid place-items-center text-white"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <CalIcon className="h-3 w-3" />
            </div>
            EventMind AI
          </div>
          <div>© {new Date().getFullYear()} EventMind AI. Your AI understands every event.</div>
        </div>
      </footer>
    </div>
  );
}
