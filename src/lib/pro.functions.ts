import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const requestProUpgrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ message: z.string().max(1000).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", userId)
      .maybeSingle();

    const email = profile?.email ?? context.claims.email ?? "unknown";
    const displayName = profile?.display_name ?? null;

    const { data: existing } = await supabase
      .from("pro_requests")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return { ok: true, alreadyRequested: true, id: existing.id, email, displayName };
    }

    const { data: inserted, error } = await supabase
      .from("pro_requests")
      .insert({
        user_id: userId,
        email,
        display_name: displayName,
        message: data.message ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, alreadyRequested: false, id: inserted.id, email, displayName };
  });

export const myProRequestStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("pro_requests")
      .select("id, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { request: data ?? null };
  });

export const grantProByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check admin role using service-role client bypasses RPC permissions
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

    const isAdmin = roles && roles.length > 0;
    if (!isAdmin) throw new Error("Forbidden");

    const target = data.email.trim().toLowerCase();

    // Find target user via profiles (fallback: search auth users).
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .ilike("email", target)
      .maybeSingle();

    let targetId = prof?.id as string | undefined;
    if (!targetId) {
      // Fallback: page through auth users to find by email.
      let page = 1;
      while (page <= 20 && !targetId) {
        const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (error) throw new Error(error.message);
        const match = list.users.find((u) => (u.email ?? "").toLowerCase() === target);
        if (match) targetId = match.id;
        if (!list.users.length || list.users.length < 200) break;
        page += 1;
      }
    }

    if (!targetId) {
      return { ok: false, reason: "no_such_user" as const };
    }

    const { error: upErr } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: targetId, role: "pro" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    if (upErr) throw new Error(upErr.message);

    // Mark any pending request as approved.
    await supabaseAdmin
      .from("pro_requests")
      .update({ status: "approved" })
      .eq("user_id", targetId)
      .eq("status", "pending");

    return { ok: true, userId: targetId, email: target };
  });

export const revokeProByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check admin role using service-role client bypasses RPC permissions
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

    const isAdmin = roles && roles.length > 0;
    if (!isAdmin) throw new Error("Forbidden");

    const target = data.email.trim().toLowerCase();
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", target)
      .maybeSingle();
    if (!prof?.id) return { ok: false, reason: "no_such_user" as const };
    await supabaseAdmin.from("user_roles").delete().eq("user_id", prof.id).eq("role", "pro");
    return { ok: true };
  });
