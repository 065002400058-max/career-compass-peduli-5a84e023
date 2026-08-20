import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HeartPulse, CheckCircle, Clock, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ReferralManager = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ level: "Ringan", status: "pending", reason: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counseling_referrals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-referrals"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  useEffect(() => {
    if (!editing) return;
    setForm({
      level: editing.level ?? "Ringan",
      status: editing.status ?? "pending",
      reason: editing.reason ?? "",
      notes: editing.notes ?? "",
    });
  }, [editing]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("counseling_referrals").update({ status }).eq("id", id);
    if (error) return toast.error(`Gagal memperbarui: ${error.message}`);
    toast.success("Status diperbarui");
    refresh();
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reason.trim()) return toast.error("Alasan wajib diisi");
    setBusy(true);
    const { error } = await supabase
      .from("counseling_referrals")
      .update({ level: form.level, status: form.status, reason: form.reason.trim(), notes: form.notes?.trim() || null })
      .eq("id", editing.id);
    setBusy(false);
    if (error) return toast.error(`Gagal menyimpan: ${error.message}`);
    toast.success("Rujukan diperbarui");
    setEditing(null);
    refresh();
  };

  const del = async (r: any) => {
    if (!confirm(`Hapus rujukan untuk "${r.user_name}"?`)) return;
    const { error } = await supabase.from("counseling_referrals").delete().eq("id", r.id);
    if (error) return toast.error(`Gagal menghapus: ${error.message}`);
    toast.success("Rujukan dihapus");
    refresh();
  };

  const levelColor = (l: string) => (l === "Tinggi" ? "destructive" : l === "Sedang" ? "default" : "secondary");

  const filtered = data.filter((r: any) => {
    const s = search.toLowerCase();
    const matchSearch =
      (r.user_name ?? "").toLowerCase().includes(s) || (r.reason ?? "").toLowerCase().includes(s);
    const matchStatus = statusFilter === "semua" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <Input placeholder="Cari nama / alasan..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {["semua", "pending", "diproses", "selesai"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="glass-card rounded-xl divide-y divide-border">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <HeartPulse className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Belum ada rujukan konseling.</p>
          </div>
        ) : (
          filtered.map((r: any) => (
            <div key={r.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="font-semibold text-sm">{r.user_name}</h4>
                  <Badge variant={levelColor(r.level) as any}>Level: {r.level}</Badge>
                  {r.source && <Badge variant="outline">{r.source}</Badge>}
                  <Badge variant={r.status === "selesai" ? "secondary" : r.status === "diproses" ? "default" : "outline"}>{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{r.reason}</p>
                {r.notes && <p className="text-xs text-foreground/70 mt-1">Catatan: {r.notes}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString("id-ID")}</p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {(r.level ?? "").toLowerCase() === "tinggi" ? (
                  <>
                    {r.status === "pending" && (
                      <Button size="sm" onClick={() => setStatus(r.id, "diproses")}><Clock className="h-3.5 w-3.5 mr-1" />Proses</Button>
                    )}
                    {r.status !== "selesai" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "selesai")}><CheckCircle className="h-3.5 w-3.5 mr-1" />Selesai</Button>
                    )}
                  </>
                ) : (
                  r.status !== "selesai" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "selesai")}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />Cukup Dipantau
                    </Button>
                  )
                )}

                <Button size="icon" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(r)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Rujukan — {editing?.user_name}</DialogTitle></DialogHeader>
          <form onSubmit={saveEdit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Level</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                  {["Ringan", "Sedang", "Tinggi"].map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {["pending", "diproses", "selesai"].map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div><Label>Alasan *</Label><Textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
            <div><Label>Catatan Konselor</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReferralManager;
