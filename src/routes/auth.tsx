import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/AppHeader";
import { toast } from "sonner";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional().default("signin"),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const { mode, redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Handle already-logged-in users
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: redirect ?? "/dashboard" });
    });

    // Handle OAuth callback — Supabase fires SIGNED_IN after the code exchange
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        navigate({ to: redirect ?? "/dashboard" });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [navigate, redirect]);

  const google = async () => {
    setBusy(true);
    // redirectTo must match one of the "Redirect URLs" in Supabase Auth → URL Configuration.
    // We send it back to the origin root; Supabase will append #access_token=... and
    // the Supabase JS client will pick it up automatically on the next page load.
    const redirectTo = `${window.location.origin}/auth?redirect=${encodeURIComponent(redirect ?? "/dashboard")}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      toast.error(error.message ?? "Google sign-in failed");
      setBusy(false);
      return;
    }
    // No need to navigate — Supabase redirects the browser automatically.
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Account created — you're in!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: redirect ?? "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div
        className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 em-grid-bg opacity-60" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-lg font-bold">EventMind</span>
        </Link>
        <div className="relative space-y-6 max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Your calendar,
            <br />
            finally on autopilot.
          </h1>
          <p className="text-muted-foreground">
            Drop anything — an email, a screenshot, a ticket — and EventMind understands it.
          </p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> 20 free AI imports every month
          </div>
        </div>
        <div className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} EventMind AI
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm em-fade-up">
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <BrandMark />
            <span className="font-display text-lg font-bold">EventMind</span>
          </div>
          <h2 className="font-display text-2xl font-bold">
            {tab === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === "signin"
              ? "Sign in to sync your events."
              : "Free forever — 20 AI imports/month."}
          </p>

          <Button className="w-full mt-6" variant="outline" onClick={google} disabled={busy}>
            <GoogleIcon /> Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or email{" "}
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {tab === "signup" && (
              <div>
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            )}
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {tab === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-center text-muted-foreground">
            {tab === "signin" ? "New here? " : "Already have an account? "}
            <button
              type="button"
              className="text-primary font-medium hover:underline"
              onClick={() => setTab(tab === "signin" ? "signup" : "signin")}
            >
              {tab === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.4 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c6.9 0 11.5-4.9 11.5-11.7 0-.8-.1-1.4-.2-2H12z"
      />
    </svg>
  );
}
