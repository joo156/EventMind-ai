import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
    setIsIOS(ios);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    setInstalled(standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferred) return null;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice.outcome;
  };

  return {
    installed,
    isIOS,
    canPrompt: !!deferred,
    promptInstall,
  };
}

export async function enableNotifications(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

export function scheduleReminder(title: string, body: string, fireAt: Date): number | null {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  if (Notification.permission !== "granted") return null;
  const delay = fireAt.getTime() - Date.now();
  if (delay <= 0 || delay > 24 * 60 * 60 * 1000 * 30) return null;
  return window.setTimeout(() => {
    try {
      new Notification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png" });
    } catch {
      /* ignore */
    }
  }, delay) as unknown as number;
}
