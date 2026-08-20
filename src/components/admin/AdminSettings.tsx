import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, ShieldCheck, User as UserIcon, RefreshCw, Bot, MailPlus } from "lucide-react";
import DeleteAllButton from "@/components/admin/DeleteAllButton";
import { toast } from "sonner";

const CardBox = ({ title, icon: Icon, children, desc }: any) => (
  <div className="rounded-xl border border-border bg-card p-4 md:p-5">
    <div className="flex items-center gap-2 mb-1">
      {Icon && <Icon className="h-4 w-4 text-primary" strokeWidth={1.8} />}
      <h3 className="font-heading text-[14px] font-semibold text-foreground">{title}</h3>
    </div>
    {desc && <p className="text-[12px] text-muted-foreground mb-3">{desc}</p>}
    <div className="mt-3">{children}</div>
  </div>
);

const AdminSettings = ({ onNavigate }: { onNavigate?: (key: string) => void }) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-settings-stats"],
    queryFn: async () => {
      const tables = ["profiles", "alumni", "jobs", "partners", "events", "universities", "scholarships", "counseling", "counseling_referrals", "chat_threads", "chat_messages", "ai_access_audit", "invitations"] as const;
      const results = await Promise.all(
        tables.map(async (t) => {
          const { count } = await supabase.from(t as any).select("id", { count: "exact", head: true });
          return [t, count ?? 0] as const;
        }),
      );
      return Object.fromEntries(results) as Record<string, number>;
    },
  });

  const clearAiHistory = async () => {
    for (const t of ["chat_messages", "chat_threads", "ai_access_audit"]) {
      const { error } = await supabase.from(t as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    }
    qc.invalidateQueries({ queryKey: ["admin-settings-stats"] });
    qc.invalidateQueries({ queryKey: ["admin-ai-history"] });
  };

  const rows: [string, string][] = [
    ["Akun terdaftar", "profiles"],
    ["Data alumni", "alumni"],
    ["Lowongan kerja", "jobs"],
    ["Mitra", "partners"],
    ["Event karier", "events"],
    ["Data kampus", "universities"],
    ["Beasiswa", "scholarships"],
    ["Sesi konseling", "counseling"],
    ["Rujukan konseling", "counseling_referrals"],
    ["Undangan akun", "invitations"],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CardBox title="Profil Administrator" icon={UserIcon} desc="Akun yang sedang masuk ke panel admin.">
        <div className="space-y-1.5 text-[13px]">
          <p className="text-foreground font-medium">{user?.user_metadata?.full_name || user?.email?.split("@")[0]}</p>
          <p className="text-muted-foreground break-all">{user?.email}</p>
          <Badge className="mt-1">Administrator</Badge>
        </div>
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <a href="/profil"><UserIcon className="h-4 w-4 mr-1.5" /> Kelola Profil Saya</a>
        </Button>
      </CardBox>

      <CardBox title="Keamanan & Akses" icon={ShieldCheck} desc="Kebijakan login yang aktif pada aplikasi.">
        <ul className="space-y-2 text-[12.5px] text-muted-foreground">
          <li>• Pendaftaran hanya melalui undangan admin (invite-only).</li>
          <li>• Kunci otomatis 30 detik setelah 5 kali gagal login.</li>
          <li>• Sesi berakhir otomatis setelah 3 menit tidak aktif.</li>
          <li>• Akses data dibatasi per peran (admin, alumni, mitra, santri).</li>
        </ul>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => onNavigate?.("invitations")}>
          <MailPlus className="h-4 w-4 mr-1.5" /> Kelola Undangan Akun
        </Button>
      </CardBox>

      <CardBox title="Ringkasan Database" icon={Database} desc="Jumlah data terkini pada setiap modul.">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
            {rows.map(([label, key]) => (
              <div key={key} className="flex items-center justify-between gap-2 border-b border-border/60 pb-1">
                <dt className="text-muted-foreground truncate">{label}</dt>
                <dd className="font-semibold text-foreground tabular-nums">{stats?.[key] ?? 0}</dd>
              </div>
            ))}
          </dl>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => { qc.invalidateQueries({ queryKey: ["admin-settings-stats"] }); toast.success("Data disegarkan"); }}
        >
          <RefreshCw className="h-4 w-4 mr-1.5" /> Segarkan Data
        </Button>
      </CardBox>

      <CardBox title="Pemeliharaan Data" icon={Bot} desc="Kosongkan riwayat percakapan AI Peduli beserta log aksesnya.">
        <p className="text-[12.5px] text-muted-foreground mb-3">
          Total {(stats?.chat_messages ?? 0)} pesan pada {(stats?.chat_threads ?? 0)} percakapan dan {(stats?.ai_access_audit ?? 0)} log akses.
        </p>
        <DeleteAllButton label="riwayat AI" count={(stats?.chat_messages ?? 0) + (stats?.chat_threads ?? 0) + (stats?.ai_access_audit ?? 0)} onDelete={clearAiHistory} />
      </CardBox>
    </div>
  );
};

export default AdminSettings;
