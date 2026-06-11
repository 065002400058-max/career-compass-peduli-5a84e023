import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const ReferralManager = () => {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => (await supabase.from("counseling_referrals").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("counseling_referrals").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status diperbarui");
    qc.invalidateQueries({ queryKey: ["admin-referrals"] });
  };

  const levelColor = (l: string) => l === "Tinggi" ? "destructive" : l === "Sedang" ? "default" : "secondary";

  return (
    <div className="glass-card rounded-xl divide-y divide-border">
      {data.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground"><HeartPulse className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>Belum ada rujukan konseling.</p></div>
      ) : data.map((r: any) => (
        <div key={r.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm">{r.user_name}</h4>
              <Badge variant={levelColor(r.level) as any}>Level: {r.level}</Badge>
              <Badge variant="outline">{r.source}</Badge>
              <Badge variant={r.status === "selesai" ? "secondary" : r.status === "diproses" ? "default" : "outline"}>{r.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{r.reason}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString("id-ID")}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {r.status === "pending" && <Button size="sm" onClick={() => setStatus(r.id, "diproses")}><Clock className="h-3.5 w-3.5 mr-1" />Proses</Button>}
            {r.status !== "selesai" && <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "selesai")}><CheckCircle className="h-3.5 w-3.5 mr-1" />Selesai</Button>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReferralManager;
