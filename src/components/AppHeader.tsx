import { Link, useNavigate } from "@tanstack/react-router";
import { useSession, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
// Brand icon is served from /public/brand-icon.png
const BRAND_ICON_URL = "/brand-icon.png";

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <img
      src={BRAND_ICON_URL}
      alt="EventMind"
      width={size}
      height={size}
      className="rounded-xl shadow-[var(--shadow-soft)]"
      style={{ width: size, height: size }}
    />
  );
}

export function AppHeader({ variant = "landing" }: { variant?: "landing" | "app" }) {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-lg font-bold tracking-tight">EventMind</span>
        </Link>
        {variant === "landing" && (
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#how" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
          </nav>
        )}
        <div className="hidden sm:flex items-center gap-2">
          {loading ? null : user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/auth", search: { mode: "signin" } })}
              >
                Sign in
              </Button>
              <Button
                size="sm"
                onClick={() => navigate({ to: "/auth", search: { mode: "signup" } })}
              >
                Get started
              </Button>
            </>
          )}
        </div>
        <button className="sm:hidden p-2" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="sm:hidden border-t bg-background px-6 py-4 flex flex-col gap-3">
          {user ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  navigate({ to: "/dashboard" });
                }}
              >
                Dashboard
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  setOpen(false);
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  navigate({ to: "/auth", search: { mode: "signin" } });
                }}
              >
                Sign in
              </Button>
              <Button
                onClick={() => {
                  setOpen(false);
                  navigate({ to: "/auth", search: { mode: "signup" } });
                }}
              >
                Get started
              </Button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
