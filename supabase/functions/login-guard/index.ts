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

const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 30;

/**
 * Penjaga login: seluruh keputusan lock dihitung di server.
 * action:
 *  - "check"   -> apakah email/IP sedang terkunci
 *  - "failure" -> catat percobaan gagal (lock 30 detik setelah 5 kali)
 *  - "success" -> reset seluruh counter
 * Catatan: password TIDAK pernah dikirim maupun dicatat di sini.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const action = String(body.action ?? "check");

    if (!email || !email.includes("@")) return json({ error: "Email tidak valid" }, 400);
    if (!["check", "failure", "success"].includes(action)) {
      return json({ error: "Aksi tidak valid" }, 400);
    }

    const ipKey =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64) || "";

    // Baris per (email, ip) -> kegagalan satu akun tidak mengunci akun lain
    const load = async () => {
      const { data } = await admin
        .from("login_attempts")
        .select("*")
        .eq("email", email)
        .eq("ip_key", ipKey)
        .maybeSingle();
      return data as
        | { id: string; failed_attempts: number; locked_until: string | null }
        | null;
    };

    const lockedInfo = (row: { locked_until: string | null } | null) => {
      if (!row?.locked_until) return { locked: false, retry_after: 0 };
      const ms = new Date(row.locked_until).getTime() - Date.now();
      return ms > 0 ? { locked: true, retry_after: Math.ceil(ms / 1000) } : { locked: false, retry_after: 0 };
    };

    const current = await load();

    if (action === "check") {
      return json({ ...lockedInfo(current), max_attempts: MAX_ATTEMPTS });
    }

    if (action === "success") {
      if (current) {
        await admin
          .from("login_attempts")
          .update({ failed_attempts: 0, locked_until: null })
          .eq("id", current.id);
      }
      return json({ locked: false, retry_after: 0 });
    }

    // action === "failure"
    const stillLocked = lockedInfo(current);
    if (stillLocked.locked) {
      return json({ ...stillLocked, attempts: current?.failed_attempts ?? 0 });
    }

    const attempts = (current?.failed_attempts ?? 0) + 1;
    const lockedUntil =
      attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_SECONDS * 1000).toISOString() : null;

    if (current) {
      await admin
        .from("login_attempts")
        .update({
          failed_attempts: lockedUntil ? 0 : attempts, // reset counter saat mulai terkunci
          last_failed_attempt: new Date().toISOString(),
          locked_until: lockedUntil,
        })
        .eq("id", current.id);
    } else {
      await admin.from("login_attempts").insert({
        email,
        ip_key: ipKey,
        failed_attempts: attempts,
        last_failed_attempt: new Date().toISOString(),
        locked_until: lockedUntil,
      });
    }

    return json({
      locked: !!lockedUntil,
      retry_after: lockedUntil ? LOCK_SECONDS : 0,
      attempts_left: lockedUntil ? 0 : Math.max(0, MAX_ATTEMPTS - attempts),
    });
  } catch (e) {
    console.error("login-guard error", e);
    return json({ error: "Terjadi kesalahan pada server" }, 500);
  }
});
