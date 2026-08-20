import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { encodeId } from "@/lib/publicId";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, History, ListChecks, Settings, LogIn } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PsikotesManager from "@/components/admin/PsikotesManager";
import { toast } from "@/hooks/use-toast";

const PsikotesList = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const isAdmin = hasRole("admin");

  const { data: tests } = useQuery({
    queryKey: ["psi-tests-active"],
    queryFn: async () => (await supabase.from("psikotes_tests").select("*, psikotes_categories(name)").eq("is_active", true).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: history } = useQuery({
    queryKey: ["psi-history", user?.id],
    queryFn: async () => (await supabase.from("psikotes_attempts").select("*, psikotes_tests(title, psikotes_categories(name))").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
    enabled: !!user,
  });

  const handleStart = (id: string) => {
    if (!user) {
      toast({ title: "Login diperlukan", description: "Silakan masuk atau daftar untuk mulai tes." });
      navigate("/auth");
      return;
    }
    navigate(`/psikotes/${encodeId(id)}`);
  };

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding px-3 md:px-6">
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl gradient-bg flex items-center justify-center shrink-0">
            <HeartPulse className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-lg md:text-3xl font-bold text-foreground leading-tight">Screening Mental & Konseling</h1>
            <p className="text-muted-foreground text-xs md:text-sm">Cek kondisi mental Anda — dapatkan saran konseling personal.</p>
          </div>
        </div>

        {!user && (
          <Card className="glass-card mb-4 border-primary/30">
            <CardContent className="p-3 md:p-4 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs md:text-sm text-muted-foreground">Masuk atau daftar untuk mengikuti tes & menyimpan hasil.</p>
              <Button size="sm" onClick={() => navigate("/auth")}><LogIn className="h-4 w-4 mr-1" />Masuk / Daftar</Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue={isAdmin ? "manage" : "list"}>
          <TabsList className="glass-card mb-4 md:mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="list" className="text-xs md:text-sm"><ListChecks className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />Daftar Tes</TabsTrigger>
            {user && <TabsTrigger value="history" className="text-xs md:text-sm"><History className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />Riwayat</TabsTrigger>}
            {isAdmin && <TabsTrigger value="manage" className="text-xs md:text-sm"><Settings className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />Kelola</TabsTrigger>}
          </TabsList>

          {isAdmin && <TabsContent value="manage"><PsikotesManager /></TabsContent>}

          <TabsContent value="list">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {(tests ?? []).length === 0 ? (
                <Card className="col-span-full glass-card"><CardContent className="p-6 md:p-8 text-center text-muted-foreground text-sm">Belum ada tes tersedia.</CardContent></Card>
              ) : tests!.map((t: any) => (
                <Card key={t.id} className="glass-card hover-lift">
                  <CardHeader className="p-4 md:p-6">
                    <Badge variant="secondary" className="w-fit mb-2">{t.psikotes_categories?.name}</Badge>
                    <CardTitle className="text-base md:text-lg">{t.title}</CardTitle>
                    <CardDescription className="text-xs md:text-sm line-clamp-2">{t.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    <Button size="sm" className="w-full" onClick={() => handleStart(t.id)}>
                      {user ? "Mulai Tes" : (<><LogIn className="h-4 w-4 mr-1" />Login untuk Mulai</>)}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {user && (
            <TabsContent value="history">
              <div className="glass-card rounded-xl divide-y divide-border">
                {(history ?? []).length === 0 ? (
                  <div className="p-6 md:p-8 text-center text-muted-foreground text-sm">Belum ada riwayat.</div>
                ) : history!.map((h: any) => (
                  <div key={h.id} className="p-3 md:p-5">
                    <div className="flex items-center justify-between gap-3 md:gap-4">
                      <div className="min-w-0">
                        <h4 className="font-heading font-semibold text-foreground text-xs md:text-sm truncate">{h.psikotes_tests?.title}</h4>
                        <p className="text-[11px] md:text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("id-ID")} · {h.psikotes_tests?.psikotes_categories?.name}</p>
                      </div>
                      <Badge variant={h.level === "Tinggi" ? "destructive" : h.level === "Sedang" ? "secondary" : "default"} className="shrink-0">{h.level}</Badge>
                    </div>
                    {h.conclusion && <p className="text-[11px] md:text-xs mt-2 text-muted-foreground">{h.conclusion}</p>}
                    {h.recommendation && <p className="text-[11px] md:text-xs mt-1 text-primary italic">💡 {h.recommendation}</p>}
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default PsikotesList;
