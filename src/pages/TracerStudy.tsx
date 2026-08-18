import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";

const TracerStudy = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    name: "", gender: "", graduation_year: new Date().getFullYear(),
    origin: "", education_level: "", major: "", university: "",
    position: "", company: "", location: "", status: "mencari kerja",
  });

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [loading, user, navigate]);

  const { data: existing } = useQuery({
    queryKey: ["my-alumni", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("alumni").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => { if (existing) setForm(existing); }, [existing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const payload = { 
      ...form, 
      user_id: user.id, 
      graduation_year: Number(form.graduation_year) || new Date().getFullYear(), 
      year_graduated: form.year_graduated ? Number(form.year_graduated) : null, 
      tracer_filled_at: new Date().toISOString(),
      graduation_status: form.status,
      employment_status: form.status
    };
    const { error } = existing
      ? await supabase.from("alumni").update(payload).eq("id", existing.id)
      : await supabase.from("alumni").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Data tracer study tersimpan ✨");
    qc.invalidateQueries({ queryKey: ["my-alumni"] });
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memuat...</div>;

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl gradient-bg flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Tracer Study Alumni</h1>
            <p className="text-sm text-muted-foreground">Update data pendidikan & karier kamu agar pesantren dapat melacak jejak alumni.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Nama Lengkap *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Jenis Kelamin</Label>
              <Select value={form.gender ?? ""} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent><SelectItem value="L">Laki-laki</SelectItem><SelectItem value="P">Perempuan</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Angkatan / Tahun Lulus *</Label><Input type="number" required value={form.graduation_year} onChange={(e) => setForm({ ...form, graduation_year: e.target.value })} /></div>
            <div><Label>Asal Daerah</Label><Input value={form.origin ?? ""} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></div>
            <div><Label>Jenjang Pendidikan</Label>
              <Select value={form.education_level ?? ""} onValueChange={(v) => setForm({ ...form, education_level: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMA/MA">SMA / MA</SelectItem>
                  <SelectItem value="D3">D3</SelectItem>
                  <SelectItem value="S1">S1</SelectItem>
                  <SelectItem value="S2">S2</SelectItem>
                  <SelectItem value="S3">S3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Jurusan</Label><Input value={form.major ?? ""} onChange={(e) => setForm({ ...form, major: e.target.value })} /></div>
            <div><Label>Universitas / Institusi</Label><Input value={form.university ?? ""} onChange={(e) => setForm({ ...form, university: e.target.value })} /></div>
            <div><Label>Status Karier</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bekerja">Bekerja</SelectItem>
                  <SelectItem value="kuliah">Kuliah</SelectItem>
                  <SelectItem value="wirausaha">Wirausaha</SelectItem>
                  <SelectItem value="mencari kerja">Mencari Kerja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tahun Lulus</Label><Input type="number" value={form.year_graduated ?? ""} onChange={(e) => setForm({ ...form, year_graduated: e.target.value })} /></div>
            <div><Label>Fakultas</Label><Input value={form.faculty ?? ""} onChange={(e) => setForm({ ...form, faculty: e.target.value })} /></div>
            <div><Label>Status Universitas</Label>
              <Select value={form.university_status ?? ""} onValueChange={(v) => setForm({ ...form, university_status: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dalam Negeri">Dalam Negeri</SelectItem>
                  <SelectItem value="Luar Negeri">Luar Negeri</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Bidang Pekerjaan</Label><Input placeholder="Pendidikan, Teknologi Informasi, ..." value={form.job_field ?? ""} onChange={(e) => setForm({ ...form, job_field: e.target.value })} /></div>
            <div><Label>Pekerjaan / Posisi</Label><Input value={form.position ?? ""} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
            <div><Label>Perusahaan / Instansi</Label><Input value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div><Label>Jenis Perusahaan / Instansi</Label>
              <Select value={form.company_type ?? ""} onValueChange={(v) => setForm({ ...form, company_type: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Swasta">Swasta</SelectItem>
                  <SelectItem value="Pemerintah">Pemerintah</SelectItem>
                  <SelectItem value="BUMN">BUMN</SelectItem>
                  <SelectItem value="Pendidikan">Pendidikan</SelectItem>
                  <SelectItem value="Organisasi">Organisasi</SelectItem>
                  <SelectItem value="Wirausaha">Wirausaha</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Kota Kerja</Label><Input value={form.work_city ?? ""} onChange={(e) => setForm({ ...form, work_city: e.target.value })} /></div>
            <div><Label>Provinsi Kerja</Label><Input value={form.work_province ?? ""} onChange={(e) => setForm({ ...form, work_province: e.target.value })} /></div>
            <div><Label>Negara Kerja</Label><Input value={form.work_country ?? ""} onChange={(e) => setForm({ ...form, work_country: e.target.value })} /></div>
            <div><Label>Pendidikan Lanjutan</Label><Input placeholder="S1 / S2 / ..." value={form.further_education ?? ""} onChange={(e) => setForm({ ...form, further_education: e.target.value })} /></div>
            <div><Label>Universitas Tujuan</Label><Input value={form.target_university ?? ""} onChange={(e) => setForm({ ...form, target_university: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Lokasi (bebas)</Label><Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {existing ? "Perbarui Data Tracer" : "Simpan Data Tracer"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default TracerStudy;
