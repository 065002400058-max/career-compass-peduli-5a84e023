import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, Calendar, ExternalLink, Search, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { assetUrl } from "@/lib/assetUrl";
import { scholarshipImages } from "@/lib/defaultImages";

const Scholarships = () => {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["scholarships"],
    queryFn: async () => {
      const { data } = await supabase.from("scholarships").select("*").eq("is_active", true).order("deadline", { ascending: true });
      return data ?? [];
    },
  });

  const filtered = data.filter((s: any) =>
    !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.provider.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl gradient-bg flex items-center justify-center">
            <Award className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Database Beasiswa</h1>
            <p className="text-sm text-muted-foreground">Beasiswa dalam & luar negeri untuk santri & alumni.</p>
          </div>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari beasiswa..." className="pl-9" />
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Memuat...</p>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center">
            <Award className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Belum ada beasiswa terdaftar.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((s: any) => {
              const isDomestic = s.type === "dalam_negeri" || s.country === "Indonesia";
              const imageUrl = s.image_url || (isDomestic ? scholarshipImages.domestic : scholarshipImages.abroad);
              return (
                <div key={s.id} className="glass-card rounded-xl overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                  <button type="button" onClick={() => setSelected({ ...s, imageUrl })} className="relative h-24 overflow-hidden text-left w-full" aria-label={`Lihat detail ${s.name}`}>
                    <img
                      src={assetUrl(imageUrl)}
                      alt={s.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {s.type === "luar_negeri" ? "Luar Negeri" : s.type === "dalam_negeri" ? "Dalam Negeri" : s.type}
                      </Badge>
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-background/80">{s.country}</Badge>
                    </div>
                  </button>
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="flex items-start gap-2 mb-1">
                      <div className="h-7 w-7 rounded-lg gradient-bg flex items-center justify-center shrink-0">
                        <GraduationCap className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-heading font-semibold text-sm leading-tight line-clamp-1">{s.name}</h3>
                        <p className="text-xs text-primary line-clamp-1">{s.provider}</p>
                      </div>
                    </div>
                    {s.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{s.description}</p>}
                    {s.amount && <p className="text-xs font-medium mb-1.5">💰 {s.amount}</p>}
                    {s.deadline && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-2">
                        <Calendar className="h-3 w-3" /> Deadline: {new Date(s.deadline).toLocaleDateString("id-ID")}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelected({ ...s, imageUrl })}
                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-auto"
                    >
                      Lihat Detail <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0">
          {selected && (
            <>
              <div className="relative h-40 overflow-hidden rounded-t-lg">
                <img src={assetUrl(selected.imageUrl)} alt={selected.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <Badge variant="secondary" className="absolute top-3 left-3">
                  {selected.type === "luar_negeri" ? "Luar Negeri" : selected.type === "dalam_negeri" ? "Dalam Negeri" : selected.type}
                </Badge>
                {selected.country && (
                  <Badge variant="outline" className="absolute bottom-3 right-3 bg-background/80">{selected.country}</Badge>
                )}
              </div>
              <div className="p-5">
                <DialogHeader className="mb-2">
                  <DialogTitle className="font-heading text-lg leading-snug">{selected.name}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-primary mb-3">{selected.provider}</p>
                {selected.description && <p className="text-sm text-foreground/80 whitespace-pre-line mb-3">{selected.description}</p>}
                <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                  {selected.amount && <p>💰 Nilai beasiswa: {selected.amount}</p>}
                  {selected.deadline && (
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                      Deadline: {new Date(selected.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                  {selected.requirements && (
                    <p className="whitespace-pre-line text-foreground/80">Persyaratan: {selected.requirements}</p>
                  )}
                </div>
                {selected.url ? (
                  <Button asChild className="w-full gradient-bg border-0 hover:opacity-90">
                    <a href={selected.url} target="_blank" rel="noopener noreferrer">
                      Daftar / Info Lengkap <ExternalLink className="h-4 w-4 ml-1.5" />
                    </a>
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">Tautan pendaftaran belum tersedia.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Scholarships;
