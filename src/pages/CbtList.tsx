import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Clock, ListChecks, Trophy, History, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CbtManager from "@/components/admin/CbtManager";

const CBT_LABEL: Record<string, string> = {
  tpa: "TPA", minat_bakat: "Minat Bakat", verbal: "Verbal",
  numerik: "Numerik", logika: "Logika", kepribadian: "Kepribadian",
};

const CbtList = () => {
  const { user, loading, hasRole } = useAuth();
  const navigate = useNavigate();
  const isAdmin = hasRole("admin");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  const { data: tests } = useQuery({
    queryKey: ["cbt-tests-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cbt_tests")
        .select("*, cbt_categories(name, type)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: history } = useQuery({
    queryKey: ["cbt-history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("cbt_attempts")
        .select("*, cbt_tests(title, cbt_categories(name, type))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memuat...</div>;

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Tes Potensi Akademik & Minat Bakat</h1>
            <p className="text-muted-foreground text-sm">Asah potensi, temukan jalur karier yang tepat.</p>
          </div>
        </div>

        <Tabs defaultValue={isAdmin ? "manage" : "list"}>
          <TabsList className="glass-card mb-6 flex-wrap h-auto">
            <TabsTrigger value="list"><ListChecks className="h-4 w-4 mr-2" />Daftar Tes</TabsTrigger>
            <TabsTrigger value="history"><History className="h-4 w-4 mr-2" />Riwayat Saya</TabsTrigger>
            {isAdmin && <TabsTrigger value="manage"><Settings className="h-4 w-4 mr-2" />Kelola (Admin)</TabsTrigger>}
          </TabsList>

          {isAdmin && (
            <TabsContent value="manage"><CbtManager /></TabsContent>
          )}

          <TabsContent value="list">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(tests ?? []).length === 0 ? (
                <Card className="col-span-full glass-card"><CardContent className="p-8 text-center text-muted-foreground">Belum ada tes yang tersedia.</CardContent></Card>
              ) : tests!.map((t: any) => (
                <Card key={t.id} className="glass-card hover-lift">
                  <CardHeader>
                    <Badge className="w-fit mb-2" variant="secondary">{CBT_LABEL[t.cbt_categories?.type] ?? t.cbt_categories?.name}</Badge>
                    <CardTitle className="text-lg">{t.title}</CardTitle>
                    <CardDescription>{t.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{t.duration_minutes} mnt</span>
                      <span className="flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" />{t.total_questions} soal</span>
                      {t.passing_score > 0 && <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" />Lulus {t.passing_score}%</span>}
                    </div>
                    <Button className="w-full" onClick={() => navigate(`/cbt/${t.id}`)}>Mulai Tes</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="glass-card rounded-xl divide-y divide-border">
              {(history ?? []).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Belum ada riwayat tes.</div>
              ) : history!.map((h: any) => (
                <div key={h.id} className="p-4 md:p-5 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-heading font-semibold text-foreground text-sm">{h.cbt_tests?.title}</h4>
                    <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("id-ID")} · {CBT_LABEL[h.cbt_tests?.cbt_categories?.type] ?? ""}</p>
                    {h.recommendation && <p className="text-xs text-muted-foreground mt-1 italic">{h.recommendation}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-heading text-2xl font-bold text-primary">{Number(h.percentage).toFixed(0)}%</div>
                    <Badge variant={h.passed ? "default" : "secondary"} className="text-[10px]">{h.passed ? "Lulus" : "Selesai"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CbtList;
