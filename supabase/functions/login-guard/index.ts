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

    // Dua baris: level akun (ip_key = '') dan level IP -> lock akun ATAU IP.
    const keys = ipKey ? ["", ipKey] : [""];

    const load = async () => {
      const { data } = await admin
        .from("login_attempts")
        .select("*")
        .eq("email", email)
        .in("ip_key", keys);
      return (data ?? []) as {
        id: string;
        ip_key: string;
        failed_attempts: number;
        locked_until: string | null;
      }[];
    };

    const lockSeconds = (rows: { locked_until: string | null }[]) => {
      const max = rows.reduce((acc, r) => {
        if (!r.locked_until) return acc;
        const ms = new Date(r.locked_until).getTime() - Date.now();
        return ms > acc ? ms : acc;
      }, 0);
      return max > 0 ? Math.ceil(max / 1000) : 0;
    };

    const rows = await load();
    const secs = lockSeconds(rows);

    if (action === "check") {
      return json({ locked: secs > 0, retry_after: secs, max_attempts: MAX_ATTEMPTS });
    }

    if (action === "success") {
      if (rows.length) {
        await admin
          .from("login_attempts")
          .update({ failed_attempts: 0, locked_until: null })
          .in("id", rows.map((r) => r.id));
      }
      return json({ locked: false, retry_after: 0 });
    }

    // action === "failure"
    if (secs > 0) return json({ locked: true, retry_after: secs });

    let locked = false;
    let attemptsLeft = MAX_ATTEMPTS;

    for (const key of keys) {
      const row = rows.find((r) => r.ip_key === key);
      const attempts = (row?.failed_attempts ?? 0) + 1;
      const lockedUntil =
        attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_SECONDS * 1000).toISOString() : null;
      if (lockedUntil) locked = true;
      attemptsLeft = Math.min(attemptsLeft, Math.max(0, MAX_ATTEMPTS - attempts));

      if (row) {
        await admin
          .from("login_attempts")
          .update({
            failed_attempts: lockedUntil ? 0 : attempts, // counter direset saat mulai terkunci
            last_failed_attempt: new Date().toISOString(),
            locked_until: lockedUntil,
          })
          .eq("id", row.id);
      } else {
        await admin.from("login_attempts").insert({
          email,
          ip_key: key,
          failed_attempts: attempts,
          last_failed_attempt: new Date().toISOString(),
          locked_until: lockedUntil,
        });
      }
    }

    return json({
      locked,
      retry_after: locked ? LOCK_SECONDS : 0,
      attempts_left: locked ? 0 : attemptsLeft,
    });
  } catch (e) {
    console.error("login-guard error", e);
    return json({ error: "Terjadi kesalahan pada server" }, 500);
  }
});
