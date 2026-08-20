import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HeartPulse, Plus, Pencil, Trash2, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const STATUS = ["dijadwalkan", "berlangsung", "selesai", "dibatalkan"];

const emptyForm = {
  alumni_id: "",
  counselor_name: "",
  topic: "",
  schedule: "",
  status: "dijadwalkan",
  notes: "",
};

const CounselingManager = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [personQuery, setPersonQuery] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-counseling"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counseling")
        .select("*, alumni:alumni_id(full_name, name)")
        .order("schedule", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: people = [] } = useQuery({
    queryKey: ["counseling-people"],
    queryFn: async () => {
      const { data } = await supabase.from("alumni").select("id, full_name, name").order("full_name").limit(500);
      return data ?? [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-counseling"] });
    qc.invalidateQueries({ queryKey: ["admin-santri-center"] });
  };

  useEffect(() => {
    if (!open) return;
    setPersonQuery("");
    setForm(
      editing
        ? {
            alumni_id: editing.alumni_id ?? "",
            counselor_name: editing.counselor_name ?? "",
            topic: editing.topic ?? "",
            schedule: editing.schedule ? new Date(editing.schedule).toISOString().slice(0, 16) : "",
            status: editing.status ?? "dijadwalkan",
            notes: editing.notes ?? "",
          }
        : emptyForm,
    );
  }, [open, editing]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.topic.trim()) return toast.error("Topik konseling wajib diisi");
    setBusy(true);
    const payload = {
      alumni_id: form.alumni_id || null,
      counselor_name: form.counselor_name.trim() || null,
      topic: form.topic.trim(),
      schedule: form.schedule ? new Date(form.schedule).toISOString() : null,
      status: form.status,
      notes: form.notes?.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("counseling").update(payload).eq("id", editing.id)
      : await supabase.from("counseling").insert(payload);
    setBusy(false);
    if (error) return toast.error(`Gagal menyimpan: ${error.message}`);
    toast.success(editing ? "Sesi konseling diperbarui" : "Sesi konseling ditambahkan");
    setOpen(false);
    setEditing(null);
    refresh();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("counseling").update({ status }).eq("id", id);
    if (error) return toast.error(`Gagal memperbarui: ${error.message}`);
    toast.success("Status diperbarui");
    refresh();
  };

  const del = async (row: any) => {
    if (!confirm(`Hapus sesi konseling "${row.topic}"?`)) return;
    const { error } = await supabase.from("counseling").delete().eq("id", row.id);
    if (error) return toast.error(`Gagal menghapus: ${error.message}`);
    toast.success("Sesi konseling dihapus");
    refresh();
  };

  const nameOf = (r: any) => r.alumni?.full_name || r.alumni?.name || "Tanpa nama";

  const filtered = data.filter((r: any) => {
    const s = search.toLowerCase();
    const match =
      nameOf(r).toLowerCase().includes(s) ||
      (r.topic ?? "").toLowerCase().includes(s) ||
      (r.counselor_name ?? "").toLowerCase().includes(s);
    return match && (statusFilter === "semua" || r.status === statusFilter);
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <Input placeholder="Cari nama / topik / konselor..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {["semua", ...STATUS].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button className="sm:ml-auto" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Sesi Konseling
        </Button>
      </div>

      <div className="glass-card rounded-xl divide-y divide-border">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <HeartPulse className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Belum ada sesi konseling.</p>
          </div>
        ) : (
          filtered.map((r: any) => (
            <div key={r.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="font-semibold text-sm">{r.topic}</h4>
                  <Badge variant={r.status === "selesai" ? "secondary" : r.status === "berlangsung" ? "default" : "outline"}>{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {nameOf(r)}{r.counselor_name ? ` • Konselor: ${r.counselor_name}` : ""}
                </p>
                {r.notes && <p className="text-xs text-foreground/70 mt-1">Catatan: {r.notes}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {r.schedule ? new Date(r.schedule).toLocaleString("id-ID") : "Jadwal belum ditentukan"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {r.status === "dijadwalkan" && (
                  <Button size="sm" onClick={() => setStatus(r.id, "berlangsung")}><Clock className="h-3.5 w-3.5 mr-1" />Mulai</Button>
                )}
                {r.status !== "selesai" && (
                  <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "selesai")}><CheckCircle className="h-3.5 w-3.5 mr-1" />Selesai</Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(r)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Sesi Konseling" : "Tambah Sesi Konseling"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div>
              <Label>Peserta (Santri/Alumni)</Label>
              <Input
                className="mb-2"
                placeholder="Ketik nama peserta untuk mencari..."
                value={personQuery}
                onChange={(e) => setPersonQuery(e.target.value)}
              />
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.alumni_id}
                onChange={(e) => setForm({ ...form, alumni_id: e.target.value })}
              >
                <option value="">— Tidak dikaitkan —</option>
                {people
                  .filter((p: any) =>
                    (p.full_name || p.name || "").toLowerCase().includes(personQuery.toLowerCase()),
                  )
                  .slice(0, 100)
                  .map((p: any) => (
                    <option key={p.id} value={p.id}>{p.full_name || p.name}</option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Nama Konselor</Label><Input value={form.counselor_name} onChange={(e) => setForm({ ...form, counselor_name: e.target.value })} /></div>
              <div><Label>Jadwal</Label><Input type="datetime-local" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} /></div>
            </div>
            <div><Label>Topik *</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><Label>Catatan</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CounselingManager;
