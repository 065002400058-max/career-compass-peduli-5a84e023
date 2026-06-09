import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, History, ListChecks } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PsikotesList = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [loading, user, navigate]);

  const { data: tests } = useQuery({
    queryKey: ["psi-tests-active"],
    queryFn: async () => (await supabase.from("psikotes_tests").select("*, psikotes_categories(name)").eq("is_active", true).order("created_at", { ascending: false })).data ?? [],
    enabled: !!user,
  });
  const { data: history } = useQuery({
    queryKey: ["psi-history", user?.id],
    queryFn: async () => (await supabase.from("psikotes_attempts").select("*, psikotes_tests(title, psikotes_categories(name))").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
    enabled: !!user,
  });

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memuat...</div>;

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center">
            <HeartPulse className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Psikotes & Konseling</h1>
            <p className="text-muted-foreground text-sm">Cek kondisi mental Anda — dapatkan saran konseling personal.</p>
          </div>
        </div>

        <Tabs defaultValue="list">
          <TabsList className="glass-card mb-6">
            <TabsTrigger value="list"><ListChecks className="h-4 w-4 mr-2" />Daftar Tes</TabsTrigger>
            <TabsTrigger value="history"><History className="h-4 w-4 mr-2" />Riwayat</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(tests ?? []).length === 0 ? (
                <Card className="col-span-full glass-card"><CardContent className="p-8 text-center text-muted-foreground">Belum ada tes tersedia.</CardContent></Card>
              ) : tests!.map((t: any) => (
                <Card key={t.id} className="glass-card hover-lift">
                  <CardHeader>
                    <Badge variant="secondary" className="w-fit mb-2">{t.psikotes_categories?.name}</Badge>
                    <CardTitle className="text-lg">{t.title}</CardTitle>
                    <CardDescription>{t.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" onClick={() => navigate(`/psikotes/${t.id}`)}>Mulai Tes</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="glass-card rounded-xl divide-y divide-border">
              {(history ?? []).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Belum ada riwayat.</div>
              ) : history!.map((h: any) => (
                <div key={h.id} className="p-4 md:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-heading font-semibold text-foreground text-sm">{h.psikotes_tests?.title}</h4>
                      <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("id-ID")} · {h.psikotes_tests?.psikotes_categories?.name}</p>
                    </div>
                    <Badge variant={h.level === "Tinggi" ? "destructive" : h.level === "Sedang" ? "secondary" : "default"}>{h.level}</Badge>
                  </div>
                  {h.conclusion && <p className="text-xs mt-2 text-muted-foreground">{h.conclusion}</p>}
                  {h.recommendation && <p className="text-xs mt-1 text-primary italic">💡 {h.recommendation}</p>}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PsikotesList;
