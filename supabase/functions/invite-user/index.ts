import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import {
  credentialsEmailText,
  credentialsSubject,
  renderCredentialsEmail,
  type InviteRole,
} from "../_shared/invite-email.ts";

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
const LOGIN_URL = `${APP_URL}/auth`;
const ROLES: InviteRole[] = ["santri", "alumni", "admin"];
const RESEND_COOLDOWN_MS = 90_000;

/** Rate limit sederhana per-admin: maksimal 20 pembuatan akun per 10 menit. */
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 20;
const rateBucket = new Map<string, number[]>();
const rateLimited = (adminId: string) => {
  const now = Date.now();
  const hits = (rateBucket.get(adminId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) {
    rateBucket.set(adminId, hits);
    return true;
  }
  hits.push(now);
  rateBucket.set(adminId, hits);
  return false;
};

/**
 * Password sementara acak & unik (16 karakter) — dibuat hanya di backend.
 * Menjamin minimal 1 huruf besar, huruf kecil, angka, dan simbol.
 * Tidak memakai pola nama/email/role.
 */
const generateTempPassword = () => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%*?&+=";
  const all = upper + lower + digits + symbols;

  const pick = (set: string, n = 1) => {
    const bytes = crypto.getRandomValues(new Uint32Array(n));
    return Array.from(bytes, (b) => set[b % set.length]).join("");
  };

  const chars = (pick(upper) + pick(lower) + pick(digits) + pick(symbols) + pick(all, 12)).split("");
  // Fisher-Yates dengan sumber acak kriptografis
  for (let i = chars.length - 1; i > 0; i--) {
    const r = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[r]] = [chars[r], chars[i]];
  }
  return chars.join("");
};

const sendViaSmtp = async (to: string, subject: string, html: string, text: string) => {
  const hostname = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");
  if (!hostname || !user || !pass) return { sent: false as const, reason: "SMTP belum dikonfigurasi" };

  const port = Number(Deno.env.get("SMTP_PORT") ?? "465");
  // SMTP_SECURE=true/1/ssl memaksa SSL/TLS; default mengikuti port (465 = TLS).
  const secureEnv = (Deno.env.get("SMTP_SECURE") ?? "").trim().toLowerCase();
  const useTls = secureEnv
    ? ["true", "1", "ssl", "tls"].includes(secureEnv)
    : port === 465;

  const fromAddress =
    Deno.env.get("SMTP_FROM") ?? "admin@pedulismartcareer-daarululuumlido.com";
  const fromName = Deno.env.get("SMTP_FROM_NAME") ?? "Smart Career Center PEDULI";
  const from = fromAddress.includes("<") ? fromAddress : `${fromName} <${fromAddress}>`;

  const client = new SMTPClient({
    connection: { hostname, port, tls: useTls, auth: { username: user, password: pass } },
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
    if (!isAdmin) return json({ error: "Hanya admin yang dapat membuat akun pengguna" }, 403);

    if (rateLimited(userData.user.id)) {
      return json({ error: "Terlalu banyak pembuatan akun. Silakan coba lagi beberapa menit lagi." }, 429);
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    const role = String(body.role ?? "santri").trim() as InviteRole;

    if (!fullName) return json({ error: "Nama lengkap wajib diisi" }, 400);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Format email tidak valid" }, 400);
    if (!ROLES.includes(role)) return json({ error: "Peran tidak valid" }, 400);

    // Cooldown kirim ulang berbasis catatan undangan
    const { data: current } = await admin
      .from("invitations")
      .select("id, status, last_sent_at")
      .eq("email", email)
      .maybeSingle();
    const prev = current as { id: string; status: string; last_sent_at: string | null } | null;
    if (prev?.last_sent_at) {
      const waited = Date.now() - new Date(prev.last_sent_at).getTime();
      if (waited < RESEND_COOLDOWN_MS) {
        return json(
          {
            cooldown: true,
            retry_after: Math.ceil((RESEND_COOLDOWN_MS - waited) / 1000),
            error: "Email akun untuk alamat ini baru saja dikirim. Silakan tunggu sebelum mengirim ulang.",
          },
          429,
        );
      }
    }

    // Password sementara unik untuk setiap akun / setiap pengiriman ulang
    const tempPassword = generateTempPassword();

    // Cari akun yang sudah ada berdasarkan email (hindari akun duplikat)
    let userId: string | null = null;
    let reused = false;

    const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });

    if (createErr) {
      if (!/already|exist|registered|duplicate/i.test(createErr.message)) {
        return json({ error: `Gagal membuat akun: ${createErr.message}` }, 400);
      }
      // Akun sudah ada → cabut password lama dengan menetapkan password sementara baru
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = list?.users?.find((u) => (u.email ?? "").toLowerCase() === email)?.id ?? null;
      if (!userId) {
        const { data: prof } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
        userId = (prof as { id: string } | null)?.id ?? null;
      }
      if (!userId) return json({ error: "Akun sudah ada namun tidak dapat ditemukan." }, 409);

      const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        email_confirm: true,
      });
      if (updErr) return json({ error: `Gagal memperbarui password sementara: ${updErr.message}` }, 400);
      reused = true;
    } else {
      userId = createdUser.user?.id ?? null;
    }
    if (!userId) return json({ error: "Gagal membuat akun" }, 400);

    // Profil & peran ditetapkan server-side
    const nowIso = new Date().toISOString();
    await admin
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name: fullName,
          email,
          role,
          account_status: "active",
          must_change_password: true,
          activated_at: nowIso,
        },
        { onConflict: "id" },
      );

    await admin.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
    await admin.from("user_roles").delete().eq("user_id", userId).neq("role", role);

    // Catatan undangan (tanpa menyimpan password dalam bentuk apa pun)
    const { data: invitation } = await admin
      .from("invitations")
      .upsert(
        {
          email,
          full_name: fullName,
          role,
          status: "terkirim",
          invited_by: userData.user.id,
          updated_by: userData.user.id,
          token_hash: null,
          token_expires_at: null,
          last_sent_at: nowIso,
          invited_at: nowIso,
          accepted_at: null,
          expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        },
        { onConflict: "email" },
      )
      .select("id, email, full_name, role, status, created_at, last_sent_at")
      .maybeSingle();

    const subject = credentialsSubject(role);
    const html = renderCredentialsEmail({
      role,
      fullName,
      email,
      password: tempPassword,
      loginUrl: LOGIN_URL,
      appUrl: APP_URL,
    });
    const text = credentialsEmailText({ role, fullName, email, password: tempPassword, loginUrl: LOGIN_URL });

    let emailSent = false;
    let warning: string | null = null;
    try {
      const res = await sendViaSmtp(email, subject, html, text);
      emailSent = res.sent;
      if (!res.sent) {
        warning =
          "SMTP pengirim belum dikonfigurasi sehingga email gagal terkirim. Password sementara di bawah hanya ditampilkan satu kali — sampaikan kepada penerima secara aman.";
      }
    } catch (e) {
      warning = `Email gagal terkirim (${(e as Error).message}). Password sementara di bawah hanya ditampilkan satu kali — sampaikan kepada penerima secara aman.`;
    }

    // Log aman: tanpa password, tanpa email lengkap
    console.log(
      JSON.stringify({
        event: reused ? "account_credentials_reissued" : "account_created",
        role,
        email_domain: email.split("@")[1],
        email_sent: emailSent,
      }),
    );

    return json({
      success: true,
      email_sent: emailSent,
      warning,
      reused,
      // Hanya dikirim bila email gagal terkirim; tidak pernah disimpan di database.
      temp_password: emailSent ? null : tempPassword,
      login_url: LOGIN_URL,
      invitation,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
