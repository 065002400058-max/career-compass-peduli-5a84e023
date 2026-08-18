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
    full_name: "",
    student_id: "",
    gender: "Laki-laki",
    graduation_year: new Date().getFullYear().toString(),
    origin: "",
    education_level: "S1",
    major: "",
    university: "",
    position: "",
  });


  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.graduation_year) {
      toast.error("Nama Lengkap dan angkatan wajib diisi");

      return;
    }
    setLoading(true);
    const { error } = await supabase.from("alumni").insert({
      full_name: form.full_name,
      name: form.full_name, // Sync old column for compatibility
      student_id: form.student_id || null,
      nim: form.student_id || null, // Sync old column
      gender: form.gender || null,
      graduation_year: parseInt(form.graduation_year, 10),
      origin: form.origin || null,
      education_level: form.education_level || null,
      major: form.major || null,
      university: form.university || null,
      position: form.position || null,
      status: "belum_mengisi_tracer",
      graduation_status: "belum_mengisi_tracer",
      employment_status: "belum_mengisi_tracer",
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
    setForm({ full_name: "", student_id: "", gender: "Laki-laki", graduation_year: new Date().getFullYear().toString(), origin: "", education_level: "S1", major: "", university: "", position: "" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus className="h-4 w-4 mr-1.5" /> Tambah Alumni
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Data Alumni</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nama Lengkap *</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="student_id">NIM / ID Santri</Label>
            <Input id="student_id" value={form.student_id} onChange={(e) => set("student_id", e.target.value)} />

          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gender">Jenis Kelamin</Label>
              <select
                id="gender"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
              >
                <option>Laki-laki</option>
                <option>Perempuan</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">Angkatan *</Label>
              <Input id="year" type="number" value={form.graduation_year} onChange={(e) => set("graduation_year", e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="origin">Asal</Label>
            <Input id="origin" placeholder="Kota/Daerah asal" value={form.origin} onChange={(e) => set("origin", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edu">Jenjang Pendidikan</Label>
              <select
                id="edu"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.education_level}
                onChange={(e) => set("education_level", e.target.value)}
              >
                <option>SMA/MA</option>
                <option>D3</option>
                <option>D4</option>
                <option>S1</option>
                <option>S2</option>
                <option>S3</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="major">Jurusan</Label>
              <Input id="major" value={form.major} onChange={(e) => set("major", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="university">Universitas</Label>
            <Input id="university" value={form.university} onChange={(e) => set("university", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="position">Pekerjaan</Label>
            <Input id="position" value={form.position} onChange={(e) => set("position", e.target.value)} />
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
