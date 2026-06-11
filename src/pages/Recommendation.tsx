import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, GraduationCap, Briefcase, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Recom = {
  jurusan: { nama: string; alasan: string; prospek: string }[];
  kampus: { nama: string; lokasi: string; jurusan: string }[];
  beasiswa: { nama: string; provider: string; deadline: string }[];
  ringkasan: string;
};

const Recommendation = () => {
  const [minat, setMinat] = useState("");
  const [kepribadian, setKepribadian] = useState("");
  const [nilai, setNilai] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Recom | null>(null);

  const handleSubmit = async () => {
    if (!minat.trim()) return toast.error("Isi minimal minat kamu");
    setLoading(true);
    setResult(null);
    try {
      const prompt = `User Profile:\n- Minat & Hobi: ${minat}\n- Kepribadian: ${kepribadian || "tidak diisi"}\n- Nilai akademik / pelajaran favorit: ${nilai || "tidak diisi"}\n\nBerikan rekomendasi terstruktur dalam JSON murni (tanpa markdown fence) dengan schema:\n{"jurusan":[{"nama":"","alasan":"","prospek":""}],"kampus":[{"nama":"","lokasi":"","jurusan":""}],"beasiswa":[{"nama":"","provider":"","deadline":""}],"ringkasan":""}\nMinimal 4 jurusan, 4 kampus Indonesia, 3 beasiswa relevan. Ringkasan max 2 kalimat. Bahasa Indonesia.`;
      const { data, error } = await supabase.functions.invoke("chat-ai", {
        body: { messages: [{ role: "user", content: prompt }], mode: "minat_bakat" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const raw: string = data.reply;
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Format respons tidak valid");
      const parsed = JSON.parse(jsonMatch[0]);
      setResult(parsed);
    } catch (e: any) {
      toast.error(e.message || "Gagal mendapatkan rekomendasi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding max-w-5xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl gradient-bg mb-3">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-3xl font-bold">Rekomendasi Jurusan & Karier</h1>
          <p className="text-muted-foreground mt-1">Isi minat & kepribadianmu, AI akan rekomendasikan jurusan, kampus, dan beasiswa.</p>
        </div>

        <div className="glass-card rounded-xl p-6 space-y-4 mb-6">
          <div>
            <Label>Minat & Hobi *</Label>
            <Textarea value={minat} onChange={(e) => setMinat(e.target.value)} placeholder="Contoh: suka ngoding, desain grafis, ngajar anak..." rows={3} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Kepribadian</Label>
              <Input value={kepribadian} onChange={(e) => setKepribadian(e.target.value)} placeholder="Contoh: ekstrovert, suka analisa" />
            </div>
            <div><Label>Pelajaran favorit / nilai bagus</Label>
              <Input value={nilai} onChange={(e) => setNilai(e.target.value)} placeholder="Matematika, Biologi, Bahasa..." />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menganalisis...</> : <><Sparkles className="h-4 w-4 mr-2" />Dapatkan Rekomendasi</>}
          </Button>
        </div>

        {result && (
          <div className="space-y-6 animate-fade-up">
            <div className="glass-card rounded-xl p-6 border-l-4 border-primary">
              <h3 className="font-heading font-semibold mb-2">📋 Ringkasan</h3>
              <p className="text-sm text-muted-foreground">{result.ringkasan}</p>
            </div>

            <section>
              <div className="flex items-center gap-2 mb-4"><GraduationCap className="h-5 w-5 text-primary" /><h2 className="font-heading text-xl font-bold">Rekomendasi Jurusan</h2></div>
              <div className="grid md:grid-cols-2 gap-4">
                {result.jurusan?.map((j, i) => (
                  <div key={i} className="glass-card rounded-xl p-5 hover:shadow-lg transition-shadow">
                    <h3 className="font-heading font-semibold text-primary mb-1">{j.nama}</h3>
                    <p className="text-xs text-muted-foreground mb-2"><strong>Alasan:</strong> {j.alasan}</p>
                    <p className="text-xs text-muted-foreground"><strong>Prospek:</strong> {j.prospek}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4"><Briefcase className="h-5 w-5 text-primary" /><h2 className="font-heading text-xl font-bold">Kampus Tujuan</h2></div>
              <div className="grid md:grid-cols-2 gap-4">
                {result.kampus?.map((k, i) => (
                  <div key={i} className="glass-card rounded-xl p-5">
                    <h3 className="font-heading font-semibold mb-1">{k.nama}</h3>
                    <p className="text-xs text-muted-foreground">📍 {k.lokasi} · {k.jurusan}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4"><Award className="h-5 w-5 text-primary" /><h2 className="font-heading text-xl font-bold">Beasiswa Relevan</h2></div>
              <div className="grid md:grid-cols-3 gap-4">
                {result.beasiswa?.map((b, i) => (
                  <div key={i} className="glass-card rounded-xl p-5">
                    <h3 className="font-heading font-semibold text-primary mb-1">{b.nama}</h3>
                    <p className="text-xs text-muted-foreground">{b.provider}</p>
                    <p className="text-xs text-muted-foreground mt-1">⏰ {b.deadline}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendation;
