import { Building2, Users, Briefcase, ExternalLink, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PartnersManager from "@/components/admin/PartnersManager";

const Partners = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: extraStats } = useQuery({
    queryKey: ["partner-stats"],
    queryFn: async () => {
      const [jobs, placed] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "approved"),
        fetchAllRows(() => supabase.rpc("alumni_directory")).then((data) => ({ data })),
      ]);
      const placedCount = ((placed.data as any[]) ?? []).filter((a) => a.company).length;
      return { jobs: jobs.count ?? 0, placed: placedCount };
    },
  });

  const grid = (
    <>
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Memuat data...</div>
      ) : partners.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Belum ada data perusahaan mitra.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map((p) => (
            <div key={p.id} className="glass-card-hover rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground font-heading font-bold text-sm">
                  {p.name.split(" ").pop()?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.industry}</p>
                </div>
              </div>
              {p.description && <p className="text-sm text-muted-foreground mb-3">{p.description}</p>}
              {p.location && <p className="text-xs text-muted-foreground">{p.location}</p>}
              {p.website && (
                <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-2">
                  <ExternalLink className="h-3 w-3" />Website
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Perusahaan Mitra</h1>
            <p className="text-muted-foreground mt-1">Jaringan mitra perusahaan Career Center PEDULI</p>
          </div>
          {isAdmin ? (
            <Badge variant="destructive">Mode Admin</Badge>
          ) : (
            <Button asChild>
              <a href="mailto:careercenter@daarululuumlido.sch.id?subject=Pendaftaran%20Mitra%20Career%20Center%20PEDULI">
                Daftar Sebagai Mitra
              </a>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-card rounded-xl p-5 text-center">
            <Building2 className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-heading font-bold text-foreground">{partners.length}</p>
            <p className="text-xs text-muted-foreground">Perusahaan</p>
          </div>
          <div className="glass-card rounded-xl p-5 text-center">
            <Briefcase className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-heading font-bold text-foreground">{extraStats?.jobs ?? "-"}</p>
            <p className="text-xs text-muted-foreground">Lowongan Dibuka</p>
          </div>
          <div className="glass-card rounded-xl p-5 text-center">
            <Users className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-heading font-bold text-foreground">{extraStats?.placed ?? "-"}</p>
            <p className="text-xs text-muted-foreground">Alumni Ditempatkan</p>
          </div>
        </div>

        {isAdmin ? (
          <Tabs defaultValue="all">
            <TabsList className="glass-card flex-wrap h-auto mb-5">
              <TabsTrigger value="all">Daftar Mitra</TabsTrigger>
              <TabsTrigger value="manage"><Settings className="h-4 w-4 mr-2" />Kelola (Admin)</TabsTrigger>
            </TabsList>
            <TabsContent value="all">{grid}</TabsContent>
            <TabsContent value="manage"><PartnersManager /></TabsContent>
          </Tabs>
        ) : (
          grid
        )}
      </div>
    </div>
  );
};


export default Partners;
