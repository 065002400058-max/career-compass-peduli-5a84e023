import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import DeleteAllButton from "./DeleteAllButton";


const empty = {
  title: "",
  type: "Workshop",
  date: "",
  location: "",
  description: "",
  organizer: "",
  capacity: "",
  image_url: "",
};

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EventsManager = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").order("date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-events"] });
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? { ...empty, ...editing, date: editing.date ? toLocalInput(editing.date) : "", capacity: editing.capacity ?? "" }
        : empty,
    );
  }, [open, editing]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.location.trim() || !form.date)
      return toast.error("Judul, lokasi, dan tanggal wajib diisi");
    if (form.capacity && Number(form.capacity) <= 0) return toast.error("Kapasitas harus angka positif");
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      type: form.type || "Workshop",
      date: new Date(form.date).toISOString(),
      location: form.location.trim(),
      description: form.description?.trim() || null,
      organizer: form.organizer?.trim() || null,
      capacity: form.capacity ? Number(form.capacity) : null,
      image_url: form.image_url?.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("events").update(payload).eq("id", editing.id)
      : await supabase.from("events").insert(payload);
    setBusy(false);
    if (error) return toast.error(`Gagal menyimpan: ${error.message}`);
    toast.success(editing ? "Event diperbarui" : "Event ditambahkan");
    setOpen(false);
    setEditing(null);
    refresh();
  };

  const del = async (ev: any) => {
    if (!confirm(`Hapus event "${ev.title}"?`)) return;
    const { error } = await supabase.from("events").delete().eq("id", ev.id);
    if (error) return toast.error(`Gagal menghapus: ${error.message}`);
    toast.success("Event dihapus");
    refresh();
  };

  const filtered = data.filter(
    (ev: any) =>
      ev.title.toLowerCase().includes(search.toLowerCase()) ||
      (ev.location ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (ev.type ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const delAll = async () => {
    const { error } = await supabase.from("events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw error;
    refresh();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <Input placeholder="Cari event..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
        <div className="flex items-center gap-2">
          <DeleteAllButton label="event" count={data.length} onDelete={delAll} />
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />Tambah Event
          </Button>
        </div>
      </div>


      <div className="glass-card rounded-xl divide-y divide-border">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Belum ada event.</p>
          </div>
        ) : (
          filtered.map((ev: any) => (
            <div key={ev.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-semibold text-sm truncate">{ev.title}</h4>
                <p className="text-xs text-muted-foreground truncate">
                  {ev.type} · {new Date(ev.date).toLocaleString("id-ID")} · {ev.location}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(ev); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(ev)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Event" : "Event Baru"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Judul *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipe</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {["Career Fair", "Workshop", "Seminar", "Company Talk"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div><Label>Tanggal & Jam *</Label><Input type="datetime-local" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Lokasi *</Label><Input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>Penyelenggara</Label><Input value={form.organizer ?? ""} onChange={(e) => setForm({ ...form, organizer: e.target.value })} /></div>
              <div><Label>Kapasitas</Label><Input type="number" min={1} value={form.capacity ?? ""} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
            </div>
            <div><Label>Deskripsi</Label><Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>URL Gambar (opsional)</Label><Input type="url" placeholder="https://..." value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsManager;
