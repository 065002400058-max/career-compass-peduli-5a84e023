import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Briefcase, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const empty = {
  title: "",
  company: "",
  location: "Jakarta",
  type: "Full-time",
  salary: "",
  description: "",
  status: "approved",
};

const JobsManager = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-jobs"] });
    qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).includes("jobs") });
    qc.invalidateQueries({ queryKey: ["home-stats"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  useEffect(() => {
    if (!open) return;
    setForm(editing ? { ...empty, ...editing } : empty);
  }, [open, editing]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.company.trim() || !form.location.trim())
      return toast.error("Judul, perusahaan, dan lokasi wajib diisi");
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      company: form.company.trim(),
      location: form.location.trim(),
      type: form.type || "Full-time",
      salary: form.salary?.trim() || null,
      description: form.description?.trim() || null,
      status: form.status || "approved",
    };
    const { error } = editing
      ? await supabase.from("jobs").update(payload).eq("id", editing.id)
      : await supabase.from("jobs").insert({ ...payload, posted_by: user?.id ?? null });
    setBusy(false);
    if (error) return toast.error(`Gagal menyimpan: ${error.message}`);
    toast.success(editing ? "Lowongan diperbarui" : "Lowongan ditambahkan");
    setOpen(false);
    setEditing(null);
    refresh();
  };

  const del = async (j: any) => {
    if (!confirm(`Hapus lowongan "${j.title}"? Lamaran terkait juga akan hilang.`)) return;
    await supabase.from("job_applications").delete().eq("job_id", j.id);
    const { error } = await supabase.from("jobs").delete().eq("id", j.id);
    if (error) return toast.error(`Gagal menghapus: ${error.message}`);
    toast.success("Lowongan dihapus");
    refresh();
  };

  const setStatus = async (j: any, status: string) => {
    const { error } = await supabase.from("jobs").update({ status }).eq("id", j.id);
    if (error) return toast.error(error.message);
    toast.success(`Status: ${status}`);
    refresh();
  };

  const filtered = data.filter(
    (j: any) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase()) ||
      (j.location ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <Input
          placeholder="Cari lowongan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Tambah Lowongan
        </Button>
      </div>

      <div className="glass-card rounded-xl divide-y divide-border">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Belum ada lowongan.</p>
          </div>
        ) : (
          filtered.map((j: any) => (
            <div key={j.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-sm truncate">{j.title}</h4>
                  <Badge variant={j.status === "approved" ? "default" : "outline"} className="text-[10px]">{j.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{j.company} · {j.location} · {j.type}{j.salary ? ` · ${j.salary}` : ""}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {j.status !== "approved" && (
                  <Button size="icon" variant="ghost" title="Setujui" onClick={() => setStatus(j, "approved")}>
                    <Check className="h-4 w-4 text-primary" />
                  </Button>
                )}
                {j.status !== "rejected" && (
                  <Button size="icon" variant="ghost" title="Tolak" onClick={() => setStatus(j, "rejected")}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => { setEditing(j); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(j)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Lowongan" : "Lowongan Baru"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Posisi *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Perusahaan *</Label><Input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
              <div><Label>Lokasi *</Label><Input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div>
                <Label>Tipe</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {["Full-time", "Part-time", "Internship", "Remote"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div><Label>Gaji</Label><Input value={form.salary ?? ""} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></div>
              <div className="col-span-2">
                <Label>Status</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {["approved", "pending", "rejected"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div><Label>Deskripsi</Label><Textarea rows={4} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobsManager;
