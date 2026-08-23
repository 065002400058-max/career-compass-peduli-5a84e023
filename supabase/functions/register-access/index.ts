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

const DEFAULT_APP_URL = "https://pedulismartcareer-daarululuumlido.com";
const APP_URL = (Deno.env.get("APP_URL") ?? DEFAULT_APP_URL).replace(/\/+$/, "");
const LOGIN_URL = `${APP_URL}/auth`;
const ROLES = ["santri", "alumni", "admin"] as const;
type Role = (typeof ROLES)[number];

const ROLE_LABEL: Record<Role, string> = { santri: "Santri", alumni: "Alumni", admin: "Admin" };

// Pengiriman email lewat antrean Lovable (transactional_emails) yang diproses
// oleh process-email-queue. Email pemberitahuan bersifat OPSIONAL — kegagalan
// pengiriman tidak pernah membatalkan pendaftaran akses.
const SENDER_DOMAIN = "notify.pedulismartcareer-daarululuumlido.com";
const FROM_ADDRESS = "Smart Career Center PEDULI <noreply@pedulismartcareer-daarululuumlido.com>";

/** Rate limit sederhana per-admin: maksimal 30 pendaftaran per 10 menit. */
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 30;
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

const noticeSubject = () => "Akses Smart Career Center PEDULI Anda Telah Didaftarkan";

const noticeHtml = (fullName: string, role: Role) => `<!doctype html>
<html lang="id">
  <body style="margin:0;background-color:#f8fafc;font-family:Poppins,'Helvetica Neue',Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border-radius:16px;padding:28px;border:1px solid #e2e8f0;">
        <h1 style="font-size:20px;color:#0f2c1f;margin:0 0 16px;">Akses Anda Telah Didaftarkan</h1>
        <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 12px;">
          Assalamu'alaikum, <strong>${fullName}</strong>.
        </p>
        <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 12px;">
          Administrator <strong>Smart Career Center PEDULI</strong> telah mendaftarkan alamat email Anda
          sebagai <strong>${ROLE_LABEL[role]}</strong>. Anda sekarang dapat masuk menggunakan
          <strong>akun Google</strong> dengan alamat email ini — tanpa perlu password.
        </p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${LOGIN_URL}" style="background-color:#157a52;color:#faf9f5;font-size:14px;border-radius:12px;padding:12px 24px;text-decoration:none;display:inline-block;">
            Masuk dengan Google
          </a>
        </p>
        <p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0;">
          Atau salin tautan ini ke browser Anda:<br />
          <a href="${LOGIN_URL}" style="color:#157a52;">${LOGIN_URL}</a>
        </p>
      </div>
      <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;">
        Jika Anda tidak merasa didaftarkan, abaikan email ini.
      </p>
    </div>
  </body>
</html>`;

const noticeText = (fullName: string, role: Role) =>
  `Assalamu'alaikum, ${fullName}.\n\n` +
  `Administrator Smart Career Center PEDULI telah mendaftarkan email Anda sebagai ${ROLE_LABEL[role]}.\n` +
  `Anda sekarang dapat masuk menggunakan akun Google dengan alamat email ini (tanpa password).\n\n` +
  `Tautan login: ${LOGIN_URL}\n\n` +
  `Jika Anda tidak merasa didaftarkan, abaikan email ini.`;

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
    if (!isAdmin) return json({ error: "Hanya admin yang dapat mendaftarkan akses" }, 403);

    if (rateLimited(userData.user.id)) {
      return json({ error: "Terlalu banyak pendaftaran akses. Silakan coba lagi beberapa menit lagi." }, 429);
    }

    const body = await req.json().catch(() => ({}));
    // Normalisasi & validasi dilakukan di server
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    const role = String(body.role ?? "santri").trim() as Role;
    const sendNotice = body.send_notice === true;

    if (!fullName) return json({ error: "Nama lengkap wajib diisi" }, 400);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Format email tidak valid" }, 400);
    }
    if (!ROLES.includes(role)) return json({ error: "Peran tidak valid" }, 400);

    const nowIso = new Date().toISOString();

    // Cek duplikasi pada tabel allowlist resmi yang dipakai Login Google
    const { data: existing } = await admin
      .from("allowed_login_emails")
      .select("id, role, status")
      .eq("email", email)
      .maybeSingle();
    const prev = existing as { id: string; role: Role; status: string } | null;

    if (prev) {
      // Sudah terdaftar → perbarui data akses, pastikan aktif
      const { error: updErr } = await admin
        .from("allowed_login_emails")
        .update({
          full_name: fullName,
          role,
          status: "active",
          invited_by: userData.user.id,
          invited_at: nowIso,
        })
        .eq("id", prev.id);
      if (updErr) return json({ error: `Gagal memperbarui akses: ${updErr.message}` }, 400);

      await admin.from("login_access_audit").insert({
        actor_id: userData.user.id,
        target_email: email,
        action: "updated",
        old_role: prev.role,
        new_role: role,
        old_status: prev.status,
        new_status: "active",
      });
    } else {
      const { error: insErr } = await admin.from("allowed_login_emails").insert({
        email,
        full_name: fullName,
        role,
        status: "active",
        created_by: userData.user.id,
        invited_by: userData.user.id,
        invited_at: nowIso,
      });
      if (insErr) return json({ error: `Gagal menyimpan akses: ${insErr.message}` }, 400);

      await admin.from("login_access_audit").insert({
        actor_id: userData.user.id,
        target_email: email,
        action: "email_added",
        new_role: role,
        new_status: "active",
      });
    }

    // Email pemberitahuan OPSIONAL — kegagalan tidak membatalkan akses
    let emailStatus: "none" | "email_queued" | "email_failed" = "none";
    if (sendNotice) {
      try {
        const messageId = crypto.randomUUID();
        await admin.from("email_send_log").insert({
          message_id: messageId,
          template_name: "access_registered",
          recipient_email: email,
          status: "pending",
        });
        const { error: qErr } = await admin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            message_id: messageId,
            to: email,
            from: FROM_ADDRESS,
            sender_domain: SENDER_DOMAIN,
            subject: noticeSubject(),
            html: noticeHtml(fullName, role),
            text: noticeText(fullName, role),
            purpose: "transactional",
            label: "access_registered",
            idempotency_key: `access-registered-${email}-${Date.now()}`,
            queued_at: nowIso,
          },
        });
        if (qErr) throw new Error(qErr.message);
        emailStatus = "email_queued";
      } catch (e) {
        emailStatus = "email_failed";
        console.error("Gagal mengantrekan email pemberitahuan", {
          email_domain: email.split("@")[1],
          message: (e as Error).message,
        });
      }
      await admin
        .from("allowed_login_emails")
        .update({ email_notice_status: emailStatus })
        .eq("email", email);
    }

    console.log(
      JSON.stringify({
        event: prev ? "access_updated" : "access_registered",
        role,
        email_domain: email.split("@")[1],
        email_status: emailStatus,
      }),
    );

    return json({
      success: true,
      email,
      full_name: fullName,
      role,
      status: "active",
      reused: Boolean(prev),
      email_status: emailStatus,
      login_url: LOGIN_URL,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
