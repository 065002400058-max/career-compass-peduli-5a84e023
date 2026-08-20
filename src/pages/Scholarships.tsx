import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, Calendar, ExternalLink, Search, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { assetUrl } from "@/lib/assetUrl";
import { scholarshipImages } from "@/lib/defaultImages";

const Scholarships = () => {
  const [q, setQ] = useState("");
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s: any) => (
              <div key={s.id} className="glass-card rounded-xl p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary">
                    {s.type === "luar_negeri"
                      ? "Luar Negeri"
                      : s.type === "dalam_negeri"
                        ? "Dalam Negeri"
                        : s.type}
                  </Badge>
                  <Badge variant="outline">{s.country}</Badge>
                </div>
                <h3 className="font-heading font-semibold text-lg mb-1">{s.name}</h3>
                <p className="text-sm text-primary mb-2">{s.provider}</p>
                {s.description && <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{s.description}</p>}
                {s.amount && <p className="text-sm font-medium mb-2">💰 {s.amount}</p>}
                {s.deadline && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                    <Calendar className="h-3 w-3" /> Deadline: {new Date(s.deadline).toLocaleDateString("id-ID")}
                  </p>
                )}
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    Daftar / Info <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scholarships;
