import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { inviteEmailText, inviteSubject, renderInviteEmail, type InviteRole } from "../_shared/invite-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const DEFAULT_APP_URL = "https://pedulismartcareer-daarululuumlido.com";
const APP_URL = (Deno.env.get("APP_URL") ?? DEFAULT_APP_URL).replace(/\/+$/, "");
const ROLES: InviteRole[] = ["santri", "alumni", "admin"];
const RESEND_COOLDOWN_MS = 90_000;
const TOKEN_TTL_MS = 24 * 3600 * 1000;

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const randomToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const sendViaSmtp = async (to: string, subject: string, html: string, text: string) => {
  const hostname = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");
  if (!hostname || !user || !pass) return { sent: false, reason: "SMTP belum dikonfigurasi" };

  const port = Number(Deno.env.get("SMTP_PORT") ?? "465");
  const from =
    Deno.env.get("SMTP_FROM") ??
    `Career Center PEDULI <no-reply@pedulismartcareer-daarululuumlido.com>`;

  const client = new SMTPClient({
    connection: { hostname, port, tls: port === 465, auth: { username: user, password: pass } },
  });
  try {
    await client.send({ from, to, subject, content: text, html });
    return { sent: true as const };
  } finally {
    try {
      await client.close();
    } catch {
      // abaikan error penutupan koneksi
    }
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Tidak terautentikasi" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Sesi tidak valid" }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Hanya admin yang dapat mengirim undangan" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    const role = String(body.role ?? "santri").trim() as InviteRole;

    if (!fullName) return json({ error: "Nama lengkap wajib diisi" }, 400);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Format email tidak valid" }, 400);
    if (!ROLES.includes(role)) return json({ error: "Peran tidak valid" }, 400);

    // 1) Email yang sudah punya akun aktif tidak boleh diundang lagi
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, account_status")
      .eq("email", email)
      .maybeSingle();
    if (existingProfile && (existingProfile as { account_status?: string }).account_status === "active") {
      return json({ already_registered: true, error: "Email ini sudah memiliki akun aktif." }, 409);
    }

    // 2) Cooldown pengiriman ulang
    const { data: current } = await admin
      .from("invitations")
      .select("id, status, last_sent_at")
      .eq("email", email)
      .maybeSingle();

    const prev = current as { id: string; status: string; last_sent_at: string | null } | null;
    if (prev && prev.status === "aktif") {
      return json({ already_registered: true, error: "Email ini sudah memiliki akun aktif." }, 409);
    }
    if (prev?.last_sent_at) {
      const waited = Date.now() - new Date(prev.last_sent_at).getTime();
      if (waited < RESEND_COOLDOWN_MS) {
        return json(
          {
            cooldown: true,
            retry_after: Math.ceil((RESEND_COOLDOWN_MS - waited) / 1000),
            error:
              "Undangan untuk email ini masih aktif. Anda dapat mengirim ulang undangan setelah masa tunggu berakhir.",
          },
          429,
        );
      }
    }

    // 3) Token baru (token lama otomatis tidak berlaku karena hash ditimpa)
    const rawToken = randomToken();
    const tokenHash = await sha256(rawToken);
    const now = new Date();

    const { data: invitation, error: invErr } = await admin
      .from("invitations")
      .upsert(
        {
          email,
          full_name: fullName,
          role,
          status: "terkirim",
          invited_by: userData.user.id,
          updated_by: userData.user.id,
          token_hash: tokenHash,
          token_expires_at: new Date(now.getTime() + TOKEN_TTL_MS).toISOString(),
          last_sent_at: now.toISOString(),
          invited_at: now.toISOString(),
          accepted_at: null,
          expires_at: new Date(now.getTime() + TOKEN_TTL_MS).toISOString(),
        },
        { onConflict: "email" },
      )
      .select("id, email, full_name, role, status, created_at, last_sent_at, token_expires_at")
      .maybeSingle();
    if (invErr) return json({ error: `Gagal menyimpan undangan: ${invErr.message}` }, 400);

    const actionUrl = `${APP_URL}/aktivasi?token=${rawToken}`;
    const subject = inviteSubject(role);
    const html = renderInviteEmail({ role, fullName, actionUrl, appUrl: APP_URL });
    const text = inviteEmailText({ role, fullName, actionUrl });

    let emailSent = false;
    let warning: string | null = null;
    try {
      const res = await sendViaSmtp(email, subject, html, text);
      emailSent = res.sent;
      if (!res.sent) {
        warning =
          "SMTP pengirim belum dikonfigurasi. Bagikan tautan aktivasi berikut kepada penerima secara manual.";
      }
    } catch (e) {
      warning = `Email gagal terkirim (${(e as Error).message}). Bagikan tautan aktivasi berikut secara manual.`;
    }

    // Log aman: tanpa token, tanpa password
    console.log(
      JSON.stringify({ event: "invitation_sent", role, email_domain: email.split("@")[1], email_sent: emailSent }),
    );

    return json({
      success: true,
      email_sent: emailSent,
      warning,
      action_link: emailSent ? null : actionUrl,
      invitation,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
