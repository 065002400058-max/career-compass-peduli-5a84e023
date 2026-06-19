// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODE_PROMPTS: Record<string, string> = {
  kerja: "Fokus pada pencarian kerja, lowongan, tips karier, CV, interview, dan info perusahaan mitra.",
  kuliah: "Fokus pada panduan kuliah, jurusan, beasiswa, dan persiapan akademik.",
  perguruan_tinggi:
    "Fokus pada info perguruan tinggi resmi (dalam & luar negeri) serta sekolah kedinasan (STAN, IPDN, AKPOL, Akmil, dll), jalur masuk, syarat, dan beasiswa.",
  psikotes:
    "Berperan sebagai konselor kesehatan mental yang empatik. Berikan dukungan, deteksi awal stres/kecemasan, latihan refleksi, dan sarankan konsultasi profesional bila perlu. Jangan mendiagnosis.",
  minat_bakat:
    "Berperan sebagai konselor tes potensi akademik/minat bakat. Berikan pertanyaan reflektif, analisis singkat, dan rekomendasi jurusan/karier berdasarkan jawaban user.",
  alumni: "Fokus menjawab pertanyaan tentang data alumni: tahun lulus, tempat kerja, posisi, lokasi.",
  umum: "Bantu user secara umum di lingkup Career Center PEDULI.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode = "umum" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Identify user from Authorization header
    let userContext = "";
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const [profileRes, psikotesRes, cbtRes, rolesRes] = await Promise.all([
          supabase.from("profiles").select("full_name,phone,bio").eq("user_id", user.id).maybeSingle(),
          supabase.from("psikotes_attempts")
            .select("total_score,level,conclusion,recommendation,completed_at,test_id,psikotes_tests(title)")
            .eq("user_id", user.id).order("completed_at", { ascending: false }).limit(10),
          supabase.from("cbt_attempts")
            .select("total_score,max_score,percentage,passed,recommendation,completed_at,test_id,cbt_tests(title)")
            .eq("user_id", user.id).order("completed_at", { ascending: false }).limit(10),
          supabase.from("user_roles").select("role").eq("user_id", user.id),
        ]);

        const profile = profileRes.data;
        const roles = rolesRes.data?.map((r: any) => r.role).join(", ") || "santri";
        userContext = `\n[PROFIL USER LOGIN]\nNama: ${profile?.full_name || "Belum diisi"}\nEmail: ${user.email}\nRole: ${roles}\n${profile?.bio ? `Bio: ${profile.bio}\n` : ""}`;

        if (psikotesRes.data?.length) {
          userContext += `\n[RIWAYAT PSIKOTES USER (${psikotesRes.data.length} tes terakhir)]\n${JSON.stringify(psikotesRes.data)}\n`;
        } else {
          userContext += `\n[PSIKOTES] User belum pernah mengerjakan psikotes.\n`;
        }
        if (cbtRes.data?.length) {
          userContext += `\n[RIWAYAT CBT/TES USER (${cbtRes.data.length} tes terakhir)]\n${JSON.stringify(cbtRes.data)}\n`;
        } else {
          userContext += `\n[CBT] User belum pernah mengerjakan tes CBT.\n`;
        }
      }
    }

    // Fetch relevant context from DB
    let context = "";
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content ?? "";

    if (["alumni", "umum", "kerja"].includes(mode) || /alumni|lulus|angkatan|jurusan|universitas|kampus|asal/i.test(lastUserMsg)) {
      const { count } = await supabase.from("alumni").select("id", { count: "exact", head: true });
      const { data } = await supabase
        .from("alumni")
        .select("name,gender,graduation_year,origin,education_level,major,university,position")
        .order("graduation_year", { ascending: false })
        .limit(2000);
      if (data?.length) {
        context += `\n[DATA ALUMNI - Total: ${count ?? data.length} alumni, ditampilkan ${data.length}]\n${JSON.stringify(data)}\n`;
      }
    }
    if (["kerja", "umum"].includes(mode) || /kerja|lowongan|job/i.test(lastUserMsg)) {
      const { data } = await supabase.from("jobs").select("title,company,location,type,salary,description,status").eq("status", "approved").limit(50);
      if (data?.length) context += `\n[LOWONGAN KERJA]\n${JSON.stringify(data)}\n`;
    }
    if (/event|acara|seminar|workshop|konseling|tes/i.test(lastUserMsg) || mode === "umum") {
      const { data } = await supabase.from("events").select("title,type,date,location,description,organizer").limit(30);
      if (data?.length) context += `\n[EVENTS]\n${JSON.stringify(data)}\n`;
    }
    if (/mitra|perusahaan|partner/i.test(lastUserMsg)) {
      const { data } = await supabase.from("partners").select("name,industry,location,description,website").limit(50);
      if (data?.length) context += `\n[MITRA]\n${JSON.stringify(data)}\n`;
    }
    // Always include available psikotes & cbt tests so AI knows what's available
    if (mode === "psikotes" || mode === "minat_bakat" || /psikotes|tes|cbt|minat|bakat|mental/i.test(lastUserMsg)) {
      const [psiTests, cbtTests] = await Promise.all([
        supabase.from("psikotes_tests").select("title,description,is_active").eq("is_active", true).limit(30),
        supabase.from("cbt_tests").select("title,description").limit(30),
      ]);
      if (psiTests.data?.length) context += `\n[PSIKOTES TERSEDIA]\n${JSON.stringify(psiTests.data)}\n`;
      if (cbtTests.data?.length) context += `\n[CBT TERSEDIA]\n${JSON.stringify(cbtTests.data)}\n`;
    }

    const systemPrompt = `Kamu adalah asisten AI Career Center PEDULI dengan nuansa Islami yang hangat. Sapa user dengan namanya bila tersedia. Awali dengan "Assalamu'alaikum" bila relevan. ${MODE_PROMPTS[mode] ?? MODE_PROMPTS.umum}

ATURAN PENTING:
- Kamu MENGENAL user yang sedang chat — gunakan nama & riwayat psikotes/CBT mereka untuk respons personal.
- Jika user tanya "psikotes saya gimana?" / "hasil tes saya?" → jawab berdasarkan [RIWAYAT PSIKOTES USER] / [RIWAYAT CBT/TES USER].
- Jika user belum pernah tes, sarankan psikotes/CBT yang tersedia di sistem.
- Jawab HANYA berdasarkan data di bawah untuk pertanyaan alumni/lowongan/event/mitra/psikotes/cbt.
- JANGAN mengarang. Jika data tidak ada, jujur katakan "Data belum tersedia".
- Bahasa Indonesia sopan, ringkas, markdown rapi.
- Konseling: empatik, tidak menghakimi, sarankan profesional bila berat.
${userContext}
KONTEKS DATA REAL-TIME:${context || "\n(Tidak ada data spesifik dimuat)"}`;

    // Call Lovable AI Gateway (OpenAI-compatible)
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    ];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Kredit AI habis. Silakan top up di Settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI Gateway error ${resp.status}: ${errText}`);
    }

    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content ?? "Maaf, tidak ada jawaban.";

    // Auto-create counseling referral if psikotes mode + high distress keywords
    if (mode === "psikotes" && authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user && /(bunuh diri|ingin mati|tidak ada harapan|sangat tertekan|depresi berat|self.?harm|menyakiti diri)/i.test(lastUserMsg)) {
        const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
        await supabase.from("counseling_referrals").insert({
          user_id: user.id,
          user_name: prof?.full_name || user.email || "User",
          reason: lastUserMsg.slice(0, 500),
          level: "Tinggi",
          source: "chat-ai",
          status: "pending",
        });
      }
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("chat-ai error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
