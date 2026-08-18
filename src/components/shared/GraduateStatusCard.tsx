import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Briefcase, Loader2 } from "lucide-react";
import { alumniStatus, hasTracer } from "@/lib/alumniStatus";
import { ALUMNI_QUERY_KEYS } from "@/hooks/useAlumniRealtime";

const STATUS = ["bekerja", "wirausaha", "melanjutkan studi", "mencari kerja"] as const;

/** Kartu update status setelah lulus — tersimpan ke data alumni sehingga
 *  dashboard admin & alumni langsung ter-update. */
const GraduateStatusCard = () => {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    status: "melanjutkan studi",
    position: "",
    company: "",
    job_field: "",
    university: "",
    major: "",
    graduation_year: new Date().getFullYear(),
  });

  const { data: profile } = useQuery({
    queryKey: ["me-profile", uid],
    queryFn: async () =>
      (await supabase.from("profiles").select("*").eq("id", uid!).maybeSingle()).data,
    enabled: !!uid,
  });

  const { data: mine } = useQuery({
    queryKey: ["me-alumni", uid],
    queryFn: async () =>
      (await supabase.from("alumni").select("*").eq("user_id", uid!).maybeSingle()).data,
    enabled: !!uid,
  });

  useEffect(() => {
    if (mine) {
      setForm({
        status: mine.status ?? "melanjutkan studi",
        position: mine.position ?? "",
        company: mine.company ?? "",
        job_field: mine.job_field ?? "",
        university: mine.university ?? "",
        major: mine.major ?? "",
        graduation_year: mine.graduation_year ?? new Date().getFullYear(),
      });
    }
  }, [mine]);

  const working = form.status === "bekerja" || form.status === "wirausaha";
  const studying = form.status === "melanjutkan studi";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setSaving(true);
    const payload: any = {
      user_id: uid,
      name: profile?.full_name || user?.email || "Alumni",
      gender: profile?.gender ?? null,
      origin: profile?.origin ?? null,
      education_level: profile?.education_level ?? null,
      graduation_year: Number(form.graduation_year) || new Date().getFullYear(),
      graduation_status: form.status,
      employment_status: form.status,
      status: form.status,
      position: working ? form.position || null : null,
      company: working ? form.company || null : null,
      job_field: working ? form.job_field || null : null,
      university: studying ? form.university || null : mine?.university ?? null,
      major: studying ? form.major || null : mine?.major ?? null,
      tracer_filled_at: new Date().toISOString(),
    };
    const { error } = mine
      ? await supabase.from("alumni").update(payload).eq("id", mine.id)
      : await supabase.from("alumni").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Status berhasil diperbarui — data admin & alumni ikut ter-update ✨");
    ALUMNI_QUERY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Briefcase className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
        <div>
          <h3 className="font-heading text-[15px] font-semibold text-foreground">
            Status Setelah Lulus
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {mine && hasTracer(mine)
              ? `Status terkini: ${alumniStatus(mine)}`
              : "Belum mengisi — perbarui bila sudah lulus."}
          </p>
        </div>
      </div>

      <form onSubmit={save} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-[12px]">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="h-9 text-[12.5px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[12px]">Angkatan / Tahun Lulus</Label>
            <Input
              type="number"
              className="h-9 text-[12.5px]"
              value={form.graduation_year}
              onChange={(e) => setForm({ ...form, graduation_year: e.target.value })}
            />
          </div>

          {working && (
            <>
              <div>
                <Label className="text-[12px]">Posisi / Pekerjaan</Label>
                <Input
                  className="h-9 text-[12.5px]"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-[12px]">Perusahaan / Instansi</Label>
                <Input
                  className="h-9 text-[12.5px]"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[12px]">Bidang Pekerjaan</Label>
                <Input
                  className="h-9 text-[12.5px]"
                  placeholder="Pendidikan, Teknologi Informasi, ..."
                  value={form.job_field}
                  onChange={(e) => setForm({ ...form, job_field: e.target.value })}
                />
              </div>
            </>
          )}

          {studying && (
            <>
              <div>
                <Label className="text-[12px]">Universitas / Institusi</Label>
                <Input
                  className="h-9 text-[12.5px]"
                  value={form.university}
                  onChange={(e) => setForm({ ...form, university: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-[12px]">Jurusan</Label>
                <Input
                  className="h-9 text-[12.5px]"
                  value={form.major}
                  onChange={(e) => setForm({ ...form, major: e.target.value })}
                />
              </div>
            </>
          )}
        </div>

        <Button type="submit" size="sm" className="w-full sm:w-auto" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          {mine ? "Perbarui Status" : "Simpan Status"}
        </Button>
      </form>
    </div>
  );
};

export default GraduateStatusCard;
