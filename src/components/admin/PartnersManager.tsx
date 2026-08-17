import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Building2 } from "lucide-react";
import { toast } from "sonner";

const empty = {
  name: "",
  industry: "",
  location: "",
  description: "",
  website: "",
  contact_email: "",
  logo_url: "",
};

const PartnersManager = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-partners"] });
    qc.invalidateQueries({ queryKey: ["partners"] });
    qc.invalidateQueries({ queryKey: ["home-stats"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  useEffect(() => {
    if (!open) return;
    setForm(editing ? { ...empty, ...editing } : empty);
  }, [open, editing]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.industry.trim()) return toast.error("Nama & industri wajib diisi");
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email))
      return toast.error("Format email tidak valid");
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      industry: form.industry.trim(),
      location: form.location?.trim() || null,
      description: form.description?.trim() || null,
      website: form.website?.trim() || null,
      contact_email: form.contact_email?.trim() || null,
      logo_url: form.logo_url?.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("partners").update(payload).eq("id", editing.id)
      : await supabase.from("partners").insert(payload);
    setBusy(false);
    if (error) return toast.error(`Gagal menyimpan: ${error.message}`);
    toast.success(editing ? "Mitra diperbarui" : "Mitra ditambahkan");
    setOpen(false);
    setEditing(null);
    refresh();
  };

  const del = async (p: any) => {
    if (!confirm(`Hapus mitra "${p.name}"?`)) return;
    const { error } = await supabase.from("partners").delete().eq("id", p.id);
    if (error) return toast.error(`Gagal menghapus: ${error.message}`);
    toast.success("Mitra dihapus");
    refresh();
  };

  const filtered = data.filter(
    (p: any) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.industry ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.location ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const delAll = async () => {
    const { error } = await supabase.from("partners").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw error;
    refresh();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <Input placeholder="Cari mitra..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
        <div className="flex items-center gap-2">
          <DeleteAllButton label="mitra" count={data.length} onDelete={delAll} />
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />Tambah Mitra
          </Button>
        </div>
      </div>


      <div className="glass-card rounded-xl divide-y divide-border">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Belum ada mitra.</p>
          </div>
        ) : (
          filtered.map((p: any) => (
            <div key={p.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-semibold text-sm truncate">{p.name}</h4>
                <p className="text-xs text-muted-foreground truncate">
                  {p.industry}{p.location ? ` · ${p.location}` : ""}{p.contact_email ? ` · ${p.contact_email}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(p)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Mitra" : "Mitra Baru"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Nama *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Industri *</Label><Input required value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></div>
              <div><Label>Lokasi</Label><Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>Website</Label><Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
              <div><Label>Email Kontak</Label><Input type="email" value={form.contact_email ?? ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
            </div>
            <div><Label>Deskripsi</Label><Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnersManager;
