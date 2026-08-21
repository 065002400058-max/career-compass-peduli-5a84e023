import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

type Invitation = {
  id: string;
  email: string;
  full_name: string | null;
  role: "santri" | "alumni" | "admin";
  status: string;
  token_expires_at: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "verify");
    const rawToken = String(body.token ?? "").trim();
    if (!rawToken || rawToken.length < 32) return json({ code: "invalid" }, 400);

    const tokenHash = await sha256(rawToken);
    const { data } = await admin
      .from("invitations")
      .select("id, email, full_name, role, status, token_expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    const inv = data as Invitation | null;
    if (!inv) return json({ code: "invalid" }, 400);
    if (inv.status === "aktif") return json({ code: "used" }, 409);
    if (inv.status === "dibatalkan") return json({ code: "revoked" }, 403);
    if (!inv.token_expires_at || new Date(inv.token_expires_at).getTime() < Date.now()) {
      await admin.from("invitations").update({ status: "kedaluwarsa" }).eq("id", inv.id);
      return json({ code: "expired" }, 410);
    }

    if (action === "verify") {
      return json({
        code: "ok",
        invitation: { email: inv.email, full_name: inv.full_name, role: inv.role },
      });
    }

    if (action !== "activate") return json({ code: "invalid" }, 400);

    const password = String(body.password ?? "");
    if (password.length < 8) return json({ code: "weak_password" }, 400);

    // Buat akun (atau set password bila akun undangan sudah ada)
    let userId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: inv.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: inv.full_name ?? "", role: inv.role },
    });

    if (createErr) {
      if (!/already/i.test(createErr.message)) return json({ code: "error" }, 400);
      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("email", inv.email)
        .maybeSingle();
      userId = (existing as { id: string } | null)?.id ?? null;
      if (!userId) return json({ code: "error" }, 400);
      const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });
      if (updErr) return json({ code: "error" }, 400);
    } else {
      userId = created.user?.id ?? null;
    }
    if (!userId) return json({ code: "error" }, 400);

    // Peran & status akun ditetapkan server-side, bukan dari frontend
    await admin
      .from("profiles")
      .update({
        full_name: inv.full_name || inv.email.split("@")[0],
        email: inv.email,
        role: inv.role,
        account_status: "active",
        activated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    await admin.from("user_roles").upsert({ user_id: userId, role: inv.role }, { onConflict: "user_id,role" });
    await admin.from("user_roles").delete().eq("user_id", userId).neq("role", inv.role);

    // Token hangus: sekali pakai
    await admin
      .from("invitations")
      .update({
        status: "aktif",
        accepted_at: new Date().toISOString(),
        token_hash: null,
        token_expires_at: null,
      })
      .eq("id", inv.id);

    console.log(JSON.stringify({ event: "invitation_activated", role: inv.role }));

    return json({ code: "ok", email: inv.email, role: inv.role });
  } catch {
    return json({ code: "error" }, 500);
  }
});
