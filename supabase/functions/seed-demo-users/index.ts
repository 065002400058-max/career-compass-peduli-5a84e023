import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const demoUsers = [
    { email: "admin@demo.com", password: "admin123456", full_name: "Admin Demo", role: "admin" },
    { email: "alumni@demo.com", password: "alumni123456", full_name: "Alumni Demo", role: "alumni" },
    { email: "mitra@demo.com", password: "mitra123456", full_name: "Mitra Demo", role: "mitra" },
  ];

  const results = [];

  for (const u of demoUsers) {
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((eu) => eu.email === u.email);

    let userId: string;

    if (existing) {
      userId = existing.id;
      // Reset password for existing user
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: u.password,
        email_confirm: true,
      });
      if (updateError) {
        results.push({ email: u.email, status: "update_error", error: updateError.message });
        continue;
      }
      results.push({ email: u.email, status: "password_reset", role: u.role });
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name },
      });

      if (error) {
        results.push({ email: u.email, status: "error", error: error.message });
        continue;
      }
      userId = data.user.id;
      results.push({ email: u.email, status: "created", role: u.role });
    }

    // Assign role if not already assigned
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", u.role)
      .maybeSingle();

    if (!existingRole) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: u.role });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
