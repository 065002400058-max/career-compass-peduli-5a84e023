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

    // Fetch relevant context from DB
    let context = "";
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content ?? "";

    if (["alumni", "umum", "kerja"].includes(mode) || /alumni|lulus|angkatan/i.test(lastUserMsg)) {
      const { data } = await supabase.from("alumni").select("name,graduation_year,company,position,location,status").limit(200);
      if (data?.length) context += `\n[DATA ALUMNI]\n${JSON.stringify(data)}\n`;
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

    const systemPrompt = `Kamu adalah asisten AI Career Center PEDULI dengan nuansa Islami yang hangat. Awali sapaan dengan "Assalamu'alaikum" bila relevan. ${MODE_PROMPTS[mode] ?? MODE_PROMPTS.umum}

ATURAN PENTING:
- Jawab HANYA berdasarkan data/konten di bawah bila pertanyaan tentang alumni/lowongan/event/mitra.
- Jika data tidak tersedia, jujur katakan "Data belum tersedia di sistem".
- Gunakan bahasa Indonesia yang sopan, ringkas, dan markdown rapi (list, bold).
- Untuk konseling: empatik, tidak menghakimi, sarankan profesional bila berat.

KONTEKS DATA REAL-TIME:${context || "\n(Tidak ada data spesifik dimuat)"}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Coba lagi sebentar." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Kredit AI habis. Silakan top up." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`Gateway error: ${errText}`);
    }

    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content ?? "Maaf, tidak ada jawaban.";

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
