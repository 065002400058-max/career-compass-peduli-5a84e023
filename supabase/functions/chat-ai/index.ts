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

const AI_MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-3.1-flash-lite",
  "openai/gpt-5-nano",
];

/** Ringkas array jadi hitungan per nilai agar prompt kecil (hemat token = respons cepat). */
const tally = (rows: any[], key: string, top = 8) => {
  const map = new Map<string, number>();
  for (const r of rows) {
    const v = (r?.[key] ?? "").toString().trim() || "Tidak diisi";
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode = "umum", stream = false } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content ?? "";
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    // Tentukan konteks yang perlu dimuat SEBELUM query, lalu jalankan semuanya paralel.
    const needAlumni =
      ["alumni"].includes(mode) ||
      /alumni|lulus|angkatan|jurusan|universitas|kampus|asal|tracer/i.test(lastUserMsg);
    const needJobs = mode === "kerja" || /kerja|lowongan|job|karier|gaji|lamar/i.test(lastUserMsg);
    const needEvents = /event|acara|seminar|workshop|webinar|jadwal/i.test(lastUserMsg);
    const needPartners = /mitra|perusahaan|partner|industri/i.test(lastUserMsg);
    const needTests =
      mode === "psikotes" ||
      mode === "minat_bakat" ||
      /psikotes|tes|cbt|minat|bakat|mental|skrining|konseling/i.test(lastUserMsg);

    const [userRes, alumniRes, jobsRes, eventsRes, partnersRes, psiTestsRes, cbtTestsRes] =
      await Promise.all([
        token ? supabase.auth.getUser(token) : Promise.resolve({ data: { user: null } }),
        needAlumni
          ? supabase
              .from("alumni")
              .select("graduation_year,gender,major,university,position,status", { count: "exact" })
              .order("graduation_year", { ascending: false })
              .limit(400)
          : Promise.resolve({ data: null, count: null }),
        needJobs
          ? supabase
              .from("jobs")
              .select("title,company,location,type,salary,status")
              .eq("status", "approved")
              .limit(25)
          : Promise.resolve({ data: null }),
        needEvents
          ? supabase.from("events").select("title,type,date,location,organizer").limit(15)
          : Promise.resolve({ data: null }),
        needPartners
          ? supabase.from("partners").select("name,industry,location").limit(25)
          : Promise.resolve({ data: null }),
        needTests
          ? supabase.from("psikotes_tests").select("title,description").eq("is_active", true).limit(15)
          : Promise.resolve({ data: null }),
        needTests ? supabase.from("cbt_tests").select("title,description").limit(15) : Promise.resolve({ data: null }),
      ]);

    const user = userRes?.data?.user ?? null;

    // Data personal user (satu batch paralel, hanya jika login).
    let userContext = "";
    if (user) {
      const [profileRes, psikotesRes, cbtRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("full_name,bio").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("psikotes_attempts")
          .select("total_score,level,conclusion,completed_at,psikotes_tests(title)")
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false })
          .limit(4),
        supabase
          .from("cbt_attempts")
          .select("total_score,max_score,percentage,passed,completed_at,cbt_tests(title)")
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false })
          .limit(4),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      const profile = profileRes.data;
      const roles = rolesRes.data?.map((r: any) => r.role).join(", ") || "santri";
      userContext = `\n[PROFIL USER LOGIN]\nNama: ${profile?.full_name || "Belum diisi"}\nEmail: ${user.email}\nRole: ${roles}\n${profile?.bio ? `Bio: ${profile.bio}\n` : ""}`;
      userContext += psikotesRes.data?.length
        ? `\n[RIWAYAT PSIKOTES USER]\n${JSON.stringify(psikotesRes.data)}\n`
        : `\n[PSIKOTES] User belum pernah mengerjakan psikotes.\n`;
      userContext += cbtRes.data?.length
        ? `\n[RIWAYAT CBT USER]\n${JSON.stringify(cbtRes.data)}\n`
        : `\n[CBT] User belum pernah mengerjakan tes CBT.\n`;
    }

    let context = "";
    if (alumniRes?.data?.length) {
      const rows = alumniRes.data;
      context += `\n[STATISTIK ALUMNI - Total: ${alumniRes.count ?? rows.length}]
Angkatan: ${tally(rows, "graduation_year")}
Jenis kelamin: ${tally(rows, "gender", 3)}
Status: ${tally(rows, "status", 6)}
Jurusan terbanyak: ${tally(rows, "major")}
Kampus terbanyak: ${tally(rows, "university")}
Posisi/pekerjaan terbanyak: ${tally(rows, "position")}\n`;
    }
    if (jobsRes?.data?.length) context += `\n[LOWONGAN KERJA]\n${JSON.stringify(jobsRes.data)}\n`;
    if (eventsRes?.data?.length) context += `\n[EVENTS]\n${JSON.stringify(eventsRes.data)}\n`;
    if (partnersRes?.data?.length) context += `\n[MITRA]\n${JSON.stringify(partnersRes.data)}\n`;
    if (psiTestsRes?.data?.length) context += `\n[PSIKOTES TERSEDIA]\n${JSON.stringify(psiTestsRes.data)}\n`;
    if (cbtTestsRes?.data?.length) context += `\n[CBT TERSEDIA]\n${JSON.stringify(cbtTestsRes.data)}\n`;

    const systemPrompt = `Kamu adalah asisten AI Career Center PEDULI dengan nuansa Islami yang hangat. Sapa user dengan namanya bila tersedia. Awali dengan "Assalamu'alaikum" bila relevan. ${MODE_PROMPTS[mode] ?? MODE_PROMPTS.umum}

ATURAN PENTING:
- Kamu MENGENAL user yang sedang chat — gunakan nama & riwayat psikotes/CBT mereka untuk respons personal.
- Jika user tanya "psikotes saya gimana?" / "hasil tes saya?" → jawab berdasarkan [RIWAYAT PSIKOTES USER] / [RIWAYAT CBT USER].
- Jika user belum pernah tes, sarankan psikotes/CBT yang tersedia di sistem.
- Untuk pertanyaan alumni gunakan [STATISTIK ALUMNI] (agregat resmi dari database).
- JANGAN mengarang. Jika data tidak ada, jujur katakan "Data belum tersedia".
- Bahasa Indonesia sopan, RINGKAS (maksimal ~180 kata kecuali diminta detail), markdown rapi.
- Konseling: empatik, tidak menghakimi, sarankan profesional bila berat.
${userContext}
KONTEKS DATA REAL-TIME:${context || "\n(Tidak ada data spesifik dimuat)"}`;

    // Hanya kirim 8 pesan terakhir agar payload kecil dan respons cepat.
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages
        .slice(-8)
        .map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    ];

    // Rujukan konseling otomatis (tidak menahan respons AI).
    const maybeCreateReferral = async () => {
      if (mode !== "psikotes" || !user) return;
      if (!/(bunuh diri|ingin mati|tidak ada harapan|sangat tertekan|depresi berat|self.?harm|menyakiti diri)/i.test(lastUserMsg))
        return;
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
      await supabase.from("counseling_referrals").insert({
        user_id: user.id,
        user_name: prof?.full_name || user.email || "User",
        reason: lastUserMsg.slice(0, 500),
        level: "Tinggi",
        source: "chat-ai",
        status: "pending",
      });
    };

    const callGateway = (model: string, wantStream: boolean) =>
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": LOVABLE_API_KEY,
          "X-Lovable-AIG-SDK": "classic-edge-function",
        },
        body: JSON.stringify({ model, messages: aiMessages, stream: wantStream }),
      });

    // ---- Mode streaming: teruskan SSE langsung ke browser (terasa instan) ----
    if (stream) {
      let lastAiError = "";
      for (const model of AI_MODELS) {
        const resp = await callGateway(model, true);
        if (resp.ok && resp.body) {
          maybeCreateReferral().catch((e) => console.error("referral error:", e));
          return new Response(resp.body, {
            headers: {
              ...corsHeaders,
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        }
        const errText = await resp.text();
        lastAiError = `AI Gateway error ${resp.status}: ${errText}`;
        if (resp.status === 402)
          return new Response(JSON.stringify({ error: "Kredit AI habis. Silakan top up di Settings." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        if (resp.status !== 429 && resp.status !== 503) throw new Error(lastAiError);
      }
      console.error("chat-ai stream all models failed:", lastAiError);
      return new Response(JSON.stringify({ error: "Layanan AI sedang ramai. Coba lagi sebentar." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Mode non-streaming (fallback) ----
    let data: any = null;
    let lastAiError = "";
    for (const model of AI_MODELS) {
      const resp = await callGateway(model, false);
      if (resp.ok) {
        data = await resp.json();
        break;
      }
      const errText = await resp.text();
      lastAiError = `AI Gateway error ${resp.status}: ${errText}`;
      if (resp.status === 402)
        return new Response(JSON.stringify({ error: "Kredit AI habis. Silakan top up di Settings." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (resp.status !== 429 && resp.status !== 503) throw new Error(lastAiError);
    }

    if (!data) {
      console.error("chat-ai all models failed:", lastAiError);
      return new Response(JSON.stringify({ error: "Layanan AI sedang ramai. Coba lagi sebentar." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reply = data.choices?.[0]?.message?.content ?? "Maaf, tidak ada jawaban.";
    await maybeCreateReferral().catch((e) => console.error("referral error:", e));

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
