import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Award, Pencil } from "lucide-react";
import { toast } from "sonner";

const empty = { name: "", provider: "", type: "S1", country: "Indonesia", amount: "", deadline: "", description: "", requirements: "", url: "", image_url: "" };

const ScholarshipManager = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [busy, setBusy] = useState(false);

  const { data = [] } = useQuery({
    queryKey: ["admin-scholarships"],
    queryFn: async () => {
      const { data, error } = await supabase.from("scholarships").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-scholarships"] });
    qc.invalidateQueries({ queryKey: ["scholarships"] });
    qc.invalidateQueries({ queryKey: ["home-stats"] });
  };

  useEffect(() => {
    if (!open) return;
    setForm(editing ? { ...empty, ...editing, deadline: editing.deadline ?? "" } : empty);
  }, [open, editing]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.provider.trim()) return toast.error("Nama & provider wajib diisi");
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      provider: form.provider.trim(),
      type: form.type || "S1",
      country: form.country || null,
      amount: form.amount || null,
      deadline: form.deadline || null,
      description: form.description || null,
      requirements: form.requirements || null,
      url: form.url || null,
      image_url: form.image_url?.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("scholarships").update(payload).eq("id", editing.id)
      : await supabase.from("scholarships").insert({ ...payload, is_active: true });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Beasiswa diperbarui" : "Beasiswa ditambah");
    setOpen(false);
    setEditing(null);
    setForm(empty);
    refresh();
  };

  const del = async (s: any) => {
    if (!confirm(`Hapus beasiswa "${s.name}"?`)) return;
    const { error } = await supabase.from("scholarships").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Dihapus");
    refresh();
  };

  const toggle = async (s: any) => {
    const { error } = await supabase.from("scholarships").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3 gap-2">
        <div className="text-sm text-muted-foreground">{data.length} beasiswa terdaftar</div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Tambah Beasiswa</Button>
      </div>

      <div className="glass-card rounded-xl divide-y divide-border">
        {data.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground"><Award className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>Belum ada beasiswa.</p></div>
        ) : data.map((s: any) => (
          <div key={s.id} className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h4 className="font-semibold text-sm truncate">{s.name}</h4>
              <p className="text-xs text-muted-foreground truncate">{s.provider} · {s.type} · {s.country} {s.deadline && `· ⏰ ${s.deadline}`}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Switch checked={!!s.is_active} onCheckedChange={() => toggle(s)} />
              <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(s)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Beasiswa" : "Beasiswa Baru"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Nama *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Provider *</Label><Input required value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></div>
              <div><Label>Tipe</Label><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></div>
              <div><Label>Negara</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
              <div><Label>Nilai</Label><Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
              <div><Label>URL</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
            </div>
            <div><Label>Deskripsi</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Persyaratan</Label><Textarea value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} /></div>
            <div><Label>URL Gambar (opsional)</Label><Input type="url" placeholder="https://..." value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScholarshipManager;
