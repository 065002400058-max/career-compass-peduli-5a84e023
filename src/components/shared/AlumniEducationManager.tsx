import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { GraduationCap, Plus, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";

export const EDU_LEVELS = [
  { value: "d3", label: "D3" },
  { value: "d4", label: "D4" },
  { value: "s1", label: "S1" },
  { value: "s2", label: "S2" },
  { value: "s3", label: "S3" },
  { value: "lainnya", label: "Lainnya" },
];

export const EDU_UNI_TYPES = [
  { value: "ptn", label: "PTN" },
  { value: "pts", label: "PTS" },
  { value: "kedinasan", label: "Kedinasan" },
  { value: "luar_negeri", label: "Luar Negeri" },
];

export const EDU_STATUSES = [
  { value: "aktif", label: "Aktif" },
  { value: "lulus", label: "Lulus" },
  { value: "cuti", label: "Cuti" },
  { value: "tidak_aktif", label: "Tidak Aktif" },
];

export const eduLabel = (list: { value: string; label: string }[], v?: string | null) =>
  list.find((x) => x.value === String(v ?? "").toLowerCase())?.label ?? "-";

export type EducationRow = Record<string, any>;

const STATUS_TONE: Record<string, string> = {
  aktif: "bg-primary/10 text-primary border-primary/20",
  lulus: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  cuti: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  tidak_aktif: "bg-muted text-muted-foreground border-border",
};

const emptyForm = {
  id: null as string | null,
  level: "s1",
  university_name: "",
  university_type: "ptn",
  major: "",
  city: "",
  province: "",
  start_year: "",
  end_year: "",
  status: "aktif",
};

type Props = { alumniId?: string | null; canEdit?: boolean; title?: string };

const AlumniEducationManager = ({ alumniId, canEdit = true, title = "Riwayat Pendidikan" }: Props) => {
  const qc = useQueryClient();
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: rows = [], isLoading, isError, error } = useQuery({
    queryKey: ["alumni-education", alumniId],
    enabled: !!alumniId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alumni_education")
        .select("*")
        .eq("alumni_id", alumniId!)
        .order("start_year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EducationRow[];
    },
  });

  // Realtime: perubahan admin/alumni langsung tersinkron tanpa reload
  useEffect(() => {
    if (!alumniId) return;
    const channel = supabase
      .channel(`alumni-education-${alumniId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alumni_education", filter: `alumni_id=eq.${alumniId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["alumni-education", alumniId] });
          qc.invalidateQueries({ queryKey: ["admin-alumni-education"] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [alumniId, qc]);

  const startAdd = () => { setForm(emptyForm); setOpen(true); };
  const startEdit = (r: EducationRow) => {
    setForm({
      id: r.id,
      level: String(r.level ?? r.degree ?? "s1").toLowerCase(),
      university_name: r.university_name ?? "",
      university_type: String(r.university_type ?? "ptn").toLowerCase(),
      major: r.major ?? "",
      city: r.city ?? "",
      province: r.province ?? "",
      start_year: r.start_year ? String(r.start_year) : "",
      end_year: r.end_year ? String(r.end_year) : "",
      status: String(r.status ?? "aktif").toLowerCase(),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!alumniId) return toast.error("Data alumni belum tersedia");
    if (saving) return; // cegah duplikat saat klik ganda
    if (!form.university_name.trim()) return toast.error("Nama perguruan tinggi wajib diisi");
    const payload = {
      alumni_id: alumniId,
      level: form.level,
      degree: form.level,
      university_name: form.university_name.trim(),
      university_type: form.university_type,
      major: form.major.trim() || null,
      city: form.city.trim() || null,
      province: form.province.trim() || null,
      start_year: form.start_year ? parseInt(form.start_year, 10) : null,
      end_year: form.end_year ? parseInt(form.end_year, 10) : null,
      status: form.status,
    };
    setSaving(true);
    // update by primary key bila edit, insert bila baru
    const { error } = form.id
      ? await supabase.from("alumni_education").update(payload).eq("id", form.id)
      : await supabase.from("alumni_education").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Data pendidikan diperbarui" : "Data pendidikan ditambahkan");
    setOpen(false);
    setForm(emptyForm);
    qc.invalidateQueries({ queryKey: ["alumni-education", alumniId] });
    qc.invalidateQueries({ queryKey: ["admin-alumni-education"] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("alumni_education").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Data pendidikan dihapus");
    qc.invalidateQueries({ queryKey: ["alumni-education", alumniId] });
    qc.invalidateQueries({ queryKey: ["admin-alumni-education"] });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5 text-primary" /> {title}
        </h4>
        {canEdit && !open && (
          <Button size="sm" variant="outline" className="rounded-xl h-8" onClick={startAdd} disabled={!alumniId}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Tambah
          </Button>
        )}
      </div>

      {open && canEdit && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Jenjang</Label>
            <Select value={form.level} onValueChange={(v) => setForm((p) => ({ ...p, level: v }))}>
              <SelectTrigger className="rounded-xl h-9 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EDU_LEVELS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Jenis Kampus</Label>
            <Select value={form.university_type} onValueChange={(v) => setForm((p) => ({ ...p, university_type: v }))}>
              <SelectTrigger className="rounded-xl h-9 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EDU_UNI_TYPES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Nama Perguruan Tinggi</Label>
            <Input className="rounded-xl h-9 bg-card" value={form.university_name}
              onChange={(e) => setForm((p) => ({ ...p, university_name: e.target.value }))}
              placeholder="Contoh: UIN Syarif Hidayatullah Jakarta" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Program Studi</Label>
            <Input className="rounded-xl h-9 bg-card" value={form.major}
              onChange={(e) => setForm((p) => ({ ...p, major: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status Studi</Label>
            <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
              <SelectTrigger className="rounded-xl h-9 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EDU_STATUSES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Kota Kampus</Label>
            <Input className="rounded-xl h-9 bg-card" value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Provinsi / Negara</Label>
            <Input className="rounded-xl h-9 bg-card" value={form.province}
              onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tahun Masuk</Label>
            <Input type="number" className="rounded-xl h-9 bg-card" value={form.start_year}
              onChange={(e) => setForm((p) => ({ ...p, start_year: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tahun Lulus</Label>
            <Input type="number" className="rounded-xl h-9 bg-card" value={form.end_year}
              onChange={(e) => setForm((p) => ({ ...p, end_year: e.target.value }))} />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button size="sm" className="rounded-xl" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {form.id ? "Simpan Perubahan" : "Simpan"}
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setOpen(false); setForm(emptyForm); }}>
              Batal
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Gagal memuat riwayat pendidikan{(error as any)?.message ? `: ${(error as any).message}` : ""}.</span>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-border p-3">
          Belum ada data pendidikan{canEdit ? " — klik Tambah untuk mengisi." : "."}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const st = String(r.status ?? "aktif").toLowerCase();
            return (
              <li key={r.id} className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
                <span className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <GraduationCap className="h-4 w-4 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {r.university_name ?? "-"}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-5">{eduLabel(EDU_LEVELS, r.level ?? r.degree)}</Badge>
                    <Badge variant="outline" className="text-[10px] h-5">{eduLabel(EDU_UNI_TYPES, r.university_type)}</Badge>
                    <Badge variant="outline" className={`text-[10px] h-5 ${STATUS_TONE[st] ?? ""}`}>
                      {eduLabel(EDU_STATUSES, st)}
                    </Badge>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5 truncate">
                    {[r.major, [r.city, r.province].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "-"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.start_year ?? "-"} – {r.end_year ?? "sekarang"}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(r)} aria-label="Edit pendidikan">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label="Hapus pendidikan">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus data pendidikan?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Riwayat pendidikan <strong>{r.university_name}</strong> akan dihapus permanen.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(r.id)}>Hapus</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default AlumniEducationManager;
