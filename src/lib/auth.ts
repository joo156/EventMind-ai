import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return { user, loading };
}

export function useIsAdmin() {
  const { user } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);
  return isAdmin;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// Anonymous local quota
const ANON_KEY = "eventmind_anon_used";
export const ANON_LIMIT = 2;
export function getAnonUsed(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(ANON_KEY) ?? "0");
}
export function bumpAnonUsed() {
  if (typeof window === "undefined") return;
  localStorage.setItem(ANON_KEY, String(getAnonUsed() + 1));
}
