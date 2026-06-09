import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const AlumniAddDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    graduation_year: new Date().getFullYear().toString(),
    company: "",
    position: "",
    location: "",
    status: "Bekerja",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.graduation_year) {
      toast.error("Nama dan tahun lulus wajib diisi");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("alumni").insert({
      name: form.name,
      graduation_year: parseInt(form.graduation_year, 10),
      company: form.company || null,
      position: form.position || null,
      location: form.location || null,
      status: form.status || "Bekerja",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Alumni berhasil ditambahkan");
    qc.invalidateQueries({ queryKey: ["alumni"] });
    qc.invalidateQueries({ queryKey: ["admin-recent-alumni"] });
    qc.invalidateQueries({ queryKey: ["admin-counts"] });
    setForm({ name: "", graduation_year: new Date().getFullYear().toString(), company: "", position: "", location: "", status: "Bekerja" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus className="h-4 w-4 mr-1.5" /> Tambah Alumni
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Data Alumni</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nama *</Label>
            <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="year">Tahun Lulus *</Label>
              <Input id="year" type="number" value={form.graduation_year} onChange={(e) => set("graduation_year", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option>Bekerja</option>
                <option>Kuliah</option>
                <option>Wirausaha</option>
                <option>Lainnya</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company">Perusahaan / Kampus</Label>
            <Input id="company" value={form.company} onChange={(e) => set("company", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="position">Posisi / Jurusan</Label>
            <Input id="position" value={form.position} onChange={(e) => set("position", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Lokasi</Label>
            <Input id="location" value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AlumniAddDialog;
