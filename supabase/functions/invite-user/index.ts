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

    // Hanya admin yang boleh mengundang
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Hanya admin yang dapat mengirim undangan" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    const role = String(body.role ?? "santri").trim();
    const redirectTo = String(body.redirect_to ?? "").trim() || undefined;

    if (!email || !email.includes("@")) return json({ error: "Email tidak valid" }, 400);
    if (!["santri", "alumni", "mitra", "admin"].includes(role)) {
      return json({ error: "Peran tidak valid" }, 400);
    }

    // 1) Catat / perbarui undangan
    const { data: invitation, error: invErr } = await admin
      .from("invitations")
      .upsert(
        {
          email,
          full_name: fullName || null,
          role,
          status: "menunggu",
          invited_by: userData.user.id,
          updated_by: userData.user.id,
          expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        },
        { onConflict: "email" },
      )
      .select()
      .maybeSingle();
    if (invErr) return json({ error: `Gagal menyimpan undangan: ${invErr.message}` }, 400);

    // 2) Kirim email undangan
    const meta = { full_name: fullName || undefined, role };
    const { error: sendErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: meta,
      redirectTo,
    });

    let actionLink: string | null = null;
    let emailSent = !sendErr;
    let warning: string | null = null;

    if (sendErr) {
      const msg = sendErr.message ?? "";
      if (/already been registered|already registered|already exists/i.test(msg)) {
        await admin
          .from("invitations")
          .update({ status: "aktif", accepted_at: new Date().toISOString() })
          .eq("id", invitation?.id);
        return json({ success: true, already_registered: true, invitation });
      }
      // Fallback: buat link aktivasi manual agar admin bisa membagikannya
      const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: { data: meta, redirectTo },
      });
      if (linkErr) return json({ error: linkErr.message }, 400);
      actionLink = link?.properties?.action_link ?? null;
      warning = `Email otomatis gagal terkirim (${msg}). Bagikan link aktivasi berikut secara manual.`;
      emailSent = false;
    }

    const { data: updated } = await admin
      .from("invitations")
      .update({ status: "terkirim", updated_by: userData.user.id })
      .eq("id", invitation?.id)
      .select()
      .maybeSingle();

    return json({
      success: true,
      email_sent: emailSent,
      action_link: actionLink,
      warning,
      invitation: updated ?? invitation,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
