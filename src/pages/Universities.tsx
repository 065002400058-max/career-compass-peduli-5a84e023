import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GraduationCap, ExternalLink, Search, MapPin, Globe2, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UniversitiesManager from "@/components/admin/UniversitiesManager";

const TYPE_LABELS: Record<string, string> = {
  dalam_negeri: "Dalam Negeri",
  luar_negeri: "Luar Negeri",
  kedinasan: "Sekolah Kedinasan",
};

const Universities = () => {
  const [q, setQ] = useState("");
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const { data: items, isLoading } = useQuery({
    queryKey: ["universities-public"],
    queryFn: async () =>
      (await supabase.from("universities").select("*").order("name")).data ?? [],
  });

  const filter = (tp?: string) =>
    (items ?? [])
      .filter((u: any) => (tp ? u.type === tp : true))
      .filter((u: any) =>
        !q.trim()
          ? true
          : [u.name, u.country, u.city, u.description].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase())
      );

  const renderGrid = (list: any[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map((u) => (
        <a key={u.id} href={u.website_url} target="_blank" rel="noreferrer" className="group">
          <Card className="glass-card h-full hover:border-primary/40 transition-all hover:-translate-y-0.5">
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-11 w-11 rounded-xl gradient-bg flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-sm group-hover:text-primary transition-colors line-clamp-2">{u.name}</h3>
                  <Badge variant="secondary" className="mt-1 text-[10px]">{TYPE_LABELS[u.type]}</Badge>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {u.city ? `${u.city}, ` : ""}{u.country}</p>
                <p className="flex items-center gap-1 text-primary truncate"><Globe2 className="h-3 w-3 shrink-0" /> {u.website_url.replace(/^https?:\/\//, "")}</p>
              </div>
              {u.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{u.description}</p>}
              <div className="flex items-center justify-end mt-3 text-xs text-primary font-medium">
                Kunjungi Website <ExternalLink className="h-3 w-3 ml-1" />
              </div>
            </CardContent>
          </Card>
        </a>
      ))}
      {list.length === 0 && (
        <p className="col-span-full text-center text-sm text-muted-foreground py-12">Tidak ada kampus ditemukan.</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold">Jelajahi Kampus</h1>
            <p className="text-muted-foreground text-sm">Perguruan tinggi resmi dalam & luar negeri serta sekolah kedinasan</p>
          </div>
        </div>

        <div className="relative my-6 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kampus, kota, atau negara..." className="pl-9" />
        </div>

        <Tabs defaultValue="all">
          <TabsList className="glass-card flex-wrap h-auto mb-5">
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="dalam_negeri">Dalam Negeri</TabsTrigger>
            <TabsTrigger value="luar_negeri">Luar Negeri</TabsTrigger>
            <TabsTrigger value="kedinasan">Kedinasan</TabsTrigger>
            {isAdmin && <TabsTrigger value="manage"><Settings className="h-4 w-4 mr-2" />Kelola (Admin)</TabsTrigger>}
          </TabsList>
          <TabsContent value="all">{isLoading ? <p className="text-sm text-muted-foreground">Memuat...</p> : renderGrid(filter())}</TabsContent>
          <TabsContent value="dalam_negeri">{renderGrid(filter("dalam_negeri"))}</TabsContent>
          <TabsContent value="luar_negeri">{renderGrid(filter("luar_negeri"))}</TabsContent>
          <TabsContent value="kedinasan">{renderGrid(filter("kedinasan"))}</TabsContent>
          {isAdmin && <TabsContent value="manage"><UniversitiesManager /></TabsContent>}
        </Tabs>
      </div>
    </div>
  );
};

export default Universities;
