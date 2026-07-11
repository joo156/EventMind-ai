import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import {
  listMyEvents,
  listMyExtractions,
  deleteEvent,
  toggleFavorite,
  getMyProfile,
} from "@/lib/events.functions";
import { AppHeader } from "@/components/AppHeader";
import {
  requestProUpgrade,
  myProRequestStatus,
  grantProByEmail,
  revokeProByEmail,
} from "@/lib/pro.functions";
import { EventCard } from "@/components/EventCard";
import { EventChatDialog } from "@/components/EventChatDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  CalendarDays,
  Star,
  Layers,
  TrendingUp,
  Sparkles,
  Wand2,
  ArrowRight,
  Crown,
  Mail,
  Copy,
  Smartphone,
  Bell,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { downloadICS } from "@/lib/calendar";
import type { ExtractedEvent } from "@/lib/extract.functions";
import { toast } from "sonner";
import { useInstallPrompt, enableNotifications, scheduleReminder } from "@/lib/pwa";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const ADMIN_EMAIL = "y2005azab@gmail.com";
type SavedEvent = ExtractedEvent & { id: string; isFavorite: boolean; createdAt: string };

function Dashboard() {
  const qc = useQueryClient();
  const list = useServerFn(listMyEvents);
  const listX = useServerFn(listMyExtractions);
  const prof = useServerFn(getMyProfile);
  const del = useServerFn(deleteEvent);
  const fav = useServerFn(toggleFavorite);
  const reqPro = useServerFn(requestProUpgrade);
  const proStatus = useServerFn(myProRequestStatus);
  const grantPro = useServerFn(grantProByEmail);
  const revokePro = useServerFn(revokeProByEmail);

  const events = useQuery({ queryKey: ["events"], queryFn: () => list() });
  const extractions = useQuery({ queryKey: ["extractions"], queryFn: () => listX() });
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => prof() });
  const proReq = useQuery({ queryKey: ["pro-request"], queryFn: () => proStatus() });

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "upcoming" | "favorites">("all");
  const [chatEvent, setChatEvent] = useState<SavedEvent | null>(null);
  const [proOpen, setProOpen] = useState(false);
  const [proMsg, setProMsg] = useState("");
  const [grantEmail, setGrantEmail] = useState("");
  const [grantBusy, setGrantBusy] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("default");
  const [installOpen, setInstallOpen] = useState(false);

  const install = useInstallPrompt();

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifPerm("unsupported");
    } else {
      setNotifPerm(Notification.permission);
    }
  }, []);

  const filtered = useMemo(() => {
    const all = (events.data?.events ?? []) as SavedEvent[];
    const today = new Date().toISOString().slice(0, 10);
    let out = all;
    if (filter === "upcoming") out = out.filter((e) => (e.startDate ?? "9999") >= today);
    if (filter === "favorites") out = out.filter((e) => e.isFavorite);
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter((e) =>
        [e.title, e.location, e.description, e.category, ...(e.tags ?? [])]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(s)),
      );
    }
    return out;
  }, [events.data, filter, q]);

  const stats = useMemo(() => {
    const all = (events.data?.events ?? []) as SavedEvent[];
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: all.length,
      upcoming: all.filter((e) => (e.startDate ?? "9999") >= today).length,
      favorites: all.filter((e) => e.isFavorite).length,
      imports: extractions.data?.extractions.length ?? 0,
    };
  }, [events.data, extractions.data]);

  const isAdmin = profile.data?.isAdmin;
  const isPro = profile.data?.isPro;
  const used = profile.data?.profile?.monthly_imports_used ?? 0;
  const userEmail = profile.data?.profile?.email ?? "";
  const userName = profile.data?.profile?.display_name ?? "";

  const remove = async (id: string) => {
    await del({ data: { id } });
    qc.invalidateQueries({ queryKey: ["events"] });
    toast.success("Deleted");
  };
  const star = async (e: SavedEvent) => {
    await fav({ data: { id: e.id, value: !e.isFavorite } });
    qc.invalidateQueries({ queryKey: ["events"] });
  };

  const openProDialog = async () => {
    // Log the request server-side (best effort), then open the local mailto dialog.
    try {
      await reqPro({ data: { message: proMsg || undefined } });
      qc.invalidateQueries({ queryKey: ["pro-request"] });
    } catch {
      /* ignore — we still show the mailto dialog */
    }
    setProOpen(true);
  };

  const emailSubject = `EventMind — Pro upgrade request from ${userEmail || "a user"}`;
  const emailBody =
    `Hi Yousef,\n\n` +
    `I'd like to upgrade my EventMind account to Pro.\n\n` +
    `Name: ${userName || "(not set)"}\n` +
    `Account email: ${userEmail || "(unknown)"}\n\n` +
    `Message:\n${proMsg || "(none)"}\n\n` +
    `Please grant Pro access to this email address.\n\nThanks!`;
  const mailto = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  const enableNotif = async () => {
    const perm = await enableNotifications();
    setNotifPerm(perm);
    if (perm === "granted") {
      toast.success("Notifications enabled");
      // Schedule reminders for upcoming events (while tab is open).
      const all = (events.data?.events ?? []) as SavedEvent[];
      let scheduled = 0;
      for (const e of all) {
        if (!e.startDate) continue;
        const t = e.startTime && !e.allDay ? e.startTime : "09:00";
        const when = new Date(`${e.startDate}T${t}`);
        const reminderAt = new Date(when.getTime() - (e.reminderMinutes ?? 30) * 60_000);
        if (scheduleReminder(e.title, e.location ?? "Upcoming event", reminderAt) !== null) {
          scheduled += 1;
        }
      }
      if (scheduled > 0) toast.info(`Scheduled ${scheduled} reminder${scheduled === 1 ? "" : "s"}`);
    } else if (perm === "denied") {
      toast.error("Notifications blocked in browser settings");
    }
  };

  const doGrantPro = async () => {
    if (!grantEmail) return;
    setGrantBusy(true);
    try {
      const res = await grantPro({ data: { email: grantEmail } });
      if (!res.ok) toast.error("No user found with that email");
      else {
        toast.success(`Pro granted to ${res.email}`);
        setGrantEmail("");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setGrantBusy(false);
    }
  };
  const doRevokePro = async () => {
    if (!grantEmail) return;
    setGrantBusy(true);
    try {
      const res = await revokePro({ data: { email: grantEmail } });
      if (!res.ok) toast.error("No user found with that email");
      else toast.success("Pro access revoked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setGrantBusy(false);
    }
  };

  const showInstall = !install.installed;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader variant="app" />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight truncate">
              Welcome back{userName ? `, ${userName}` : ""}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {isAdmin ? (
                <span className="inline-flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5 text-amber-500" /> Admin — unlimited access
                </span>
              ) : isPro ? (
                <span className="inline-flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5 text-amber-500" /> Pro — unlimited imports
                </span>
              ) : (
                <>You've used {used} of 20 free imports this month.</>
              )}
            </p>
          </div>
          <Link to="/">
            <Button size="sm" className="sm:size-default">
              <Sparkles className="h-4 w-4" />{" "}
              <span className="hidden sm:inline">New extraction</span>
              <span className="sm:hidden">New</span> <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Quick actions: install PWA + notifications */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {showInstall && (
            <div className="rounded-2xl border bg-card p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Smartphone className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">Install EventMind</div>
                  <p className="text-xs text-muted-foreground truncate">
                    Add to your home screen — works like a native app.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (install.canPrompt) {
                    const outcome = await install.promptInstall();
                    if (outcome === "accepted") toast.success("Installed!");
                  } else {
                    setInstallOpen(true);
                  }
                }}
              >
                Install
              </Button>
            </div>
          )}
          <div className="rounded-2xl border bg-card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Bell className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">Event reminders</div>
                <p className="text-xs text-muted-foreground truncate">
                  {notifPerm === "granted"
                    ? "On — you'll be pinged before events."
                    : notifPerm === "unsupported"
                      ? "Not supported on this browser."
                      : "Get browser notifications before events start."}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={notifPerm === "unsupported" || notifPerm === "granted"}
              onClick={enableNotif}
            >
              {notifPerm === "granted" ? "Enabled" : "Turn on"}
            </Button>
          </div>
        </div>

        {!isPro && (
          <div className="mt-5 rounded-2xl border bg-gradient-to-r from-amber-500/10 via-primary/10 to-fuchsia-500/10 p-4 sm:p-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <Crown className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
              <div className="min-w-0">
                <div className="font-display font-semibold">You're on the Free plan</div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Unlock unlimited imports, priority AI, and premium features with Pro.
                </p>
              </div>
            </div>
            <Button size="sm" className="sm:size-default" onClick={openProDialog}>
              <Crown className="h-4 w-4" />{" "}
              <span className="hidden sm:inline">Request Pro account</span>
              <span className="sm:hidden">Request Pro</span>
            </Button>
          </div>
        )}

        {isAdmin && (
          <div className="mt-5 rounded-2xl border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="font-display font-semibold">Admin — grant Pro access</h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Enter any user's email to give them full Pro features immediately.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <Input
                type="email"
                placeholder="user@example.com"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
              />
              <Button onClick={doGrantPro} disabled={grantBusy || !grantEmail}>
                <UserPlus className="h-4 w-4" /> Grant Pro
              </Button>
              <Button variant="outline" onClick={doRevokePro} disabled={grantBusy || !grantEmail}>
                Revoke
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={CalendarDays} label="Total events" value={stats.total} />
          <Stat icon={TrendingUp} label="Upcoming" value={stats.upcoming} />
          <Stat icon={Star} label="Favorites" value={stats.favorites} />
          <Stat icon={Layers} label="Imports" value={stats.imports} />
        </div>

        <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search events, tags, locations…"
              className="pl-9"
            />
          </div>
          {(["all", "upcoming", "favorites"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
          {filtered.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadICS(filtered, "eventmind-export.ics")}
            >
              Export .ics
            </Button>
          )}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            {events.isLoading && <div className="h-32 rounded-2xl border bg-card animate-pulse" />}
            {!events.isLoading && filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed p-10 text-center">
                <Sparkles className="h-8 w-8 mx-auto text-primary" />
                <h3 className="mt-3 font-semibold">No events yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Head to the homepage and drop anything.
                </p>
              </div>
            )}
            {filtered.map((e) => (
              <div key={e.id} className="relative em-fade-up">
                <EventCard
                  event={e}
                  onChange={() => qc.invalidateQueries({ queryKey: ["events"] })}
                  onDelete={() => remove(e.id)}
                />
                <div className="absolute top-4 right-4 flex gap-1">
                  <button
                    aria-label="Favorite"
                    onClick={() => star(e)}
                    className={`rounded-full border bg-background p-1.5 hover:bg-secondary ${e.isFavorite ? "text-amber-500" : "text-muted-foreground"}`}
                  >
                    <Star className="h-3.5 w-3.5" fill={e.isFavorite ? "currentColor" : "none"} />
                  </button>
                  <button
                    aria-label="AI assistant"
                    onClick={() => setChatEvent(e)}
                    className="rounded-full border bg-background p-1.5 hover:bg-secondary text-primary"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <aside className="space-y-3">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Recent imports
            </h3>
            {(extractions.data?.extractions ?? []).slice(0, 8).map((x) => (
              <div key={x.id} className="rounded-xl border bg-card p-3 em-card-hover">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(x.created_at).toLocaleDateString()}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {x.event_count} events
                  </Badge>
                </div>
                <p className="mt-1 text-sm line-clamp-2">
                  {(x.source_text as string | null)?.slice(0, 140) ||
                    `${(x.source_files as unknown[])?.length ?? 0} file(s)`}
                </p>
              </div>
            ))}
            {(extractions.data?.extractions ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing here yet.</p>
            )}
          </aside>
        </div>
      </main>

      {chatEvent && (
        <EventChatDialog
          event={chatEvent}
          open={!!chatEvent}
          onOpenChange={(v) => !v && setChatEvent(null)}
          onUpdate={async (next) => {
            const { updateEvent } = await import("@/lib/events.functions");
            await updateEvent({ data: { id: chatEvent.id, patch: next } });
            qc.invalidateQueries({ queryKey: ["events"] });
          }}
        />
      )}

      {/* Pro upgrade request dialog */}
      <Dialog open={proOpen} onOpenChange={setProOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" /> Request Pro upgrade
            </DialogTitle>
            <DialogDescription>
              Send this to the admin. Tap "Open mail app" to send from your email, or copy the
              details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">To:</span>{" "}
                <span className="font-medium">{ADMIN_EMAIL}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Subject:</span> {emailSubject}
              </div>
            </div>
            <Textarea
              rows={4}
              placeholder="Optional: add a short note about why you'd like Pro…"
              value={proMsg}
              onChange={(e) => setProMsg(e.target.value)}
            />
            <div className="rounded-lg border p-3 text-xs whitespace-pre-wrap bg-background max-h-48 overflow-auto">
              {emailBody}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `To: ${ADMIN_EMAIL}\nSubject: ${emailSubject}\n\n${emailBody}`,
                  );
                  toast.success("Copied to clipboard");
                } catch {
                  toast.error("Copy failed");
                }
              }}
            >
              <Copy className="h-4 w-4" /> Copy
            </Button>
            <a href={mailto} className="w-full sm:w-auto">
              <Button className="w-full">
                <Mail className="h-4 w-4" /> Open mail app
              </Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Install instructions dialog (iOS / desktop fallback) */}
      <Dialog open={installOpen} onOpenChange={setInstallOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" /> Add EventMind to your home screen
            </DialogTitle>
            <DialogDescription>
              Get one-tap access, a full-screen app feel, and reminders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <div className="font-semibold mb-1">iPhone / iPad (Safari)</div>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>
                  Tap the <b>Share</b> button in Safari.
                </li>
                <li>
                  Choose <b>Add to Home Screen</b>.
                </li>
                <li>
                  Tap <b>Add</b> — EventMind appears as an app icon.
                </li>
              </ol>
            </div>
            <div>
              <div className="font-semibold mb-1">Android (Chrome)</div>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>
                  Tap the <b>⋮</b> menu.
                </li>
                <li>
                  Choose <b>Install app</b> or <b>Add to Home screen</b>.
                </li>
                <li>Confirm to add the icon.</li>
              </ol>
            </div>
            <div>
              <div className="font-semibold mb-1">Desktop (Chrome / Edge)</div>
              <p className="text-muted-foreground">
                Click the install icon in the address bar, or use browser menu →{" "}
                <b>Install EventMind</b>.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 em-card-hover">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 text-2xl font-bold font-display">{value}</div>
    </div>
  );
}
