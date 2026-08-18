import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileJson, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

export type UnivType = "dalam_negeri" | "luar_negeri" | "kedinasan";

export const TYPE_LABELS: Record<UnivType, string> = {
  dalam_negeri: "Dalam Negeri",
  luar_negeri: "Luar Negeri",
  kedinasan: "Kedinasan",
};

const CATEGORY_ALIASES: Record<string, UnivType> = {
  dalam_negeri: "dalam_negeri",
  "dalam negeri": "dalam_negeri",
  dalamnegeri: "dalam_negeri",
  dn: "dalam_negeri",
  luar_negeri: "luar_negeri",
  "luar negeri": "luar_negeri",
  luarnegeri: "luar_negeri",
  ln: "luar_negeri",
  kedinasan: "kedinasan",
  "sekolah kedinasan": "kedinasan",
};

type Row = {
  no: number;
  name: string;
  categoryRaw: string;
  type: UnivType | null;
  city: string;
  country: string;
  website: string;
  description: string | null;
  status: "valid" | "duplicate" | "invalid";
  reason?: string;
};

type Preview = { fileName: string; rows: Row[] };

const SAMPLE = {
  campuses: [
    {
      name: "Akademi Kepolisian",
      category: "Kedinasan",
      city: "Semarang",
      country: "Indonesia",
      website: "https://www.akpol.ac.id",
      description: "Lembaga pendidikan perwira Polri.",
    },
    {
      name: "Institut Pertanian Bogor",
      category: "Dalam Negeri",
      city: "Bogor",
      country: "Indonesia",
      website: "https://www.ipb.ac.id",
      description: "Perguruan tinggi negeri bidang pertanian.",
    },
    {
      name: "Al-Azhar University",
      category: "Luar Negeri",
      city: "Cairo",
      country: "Mesir",
      website: "https://www.azhar.edu.eg",
      description: "Universitas Islam tertua di dunia.",
    },
  ],
};

const normalizeUrl = (u: string) => {
  const v = String(u ?? "").trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v.replace(/^\/+/, "")}`;
};

const dupKey = (name: string, city: string, country: string) =>
  [name, city, country].map((s) => String(s ?? "").trim().toLowerCase()).join("|");

export default function UniversitiesJsonImport({
  existing,
}: {
  existing: { id: string; name: string; city: string | null; country: string }[];
}) {
  const qc = useQueryClient();
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [dupMode, setDupMode] = useState<"skip" | "update" | "insert">("skip");
  const [busy, setBusy] = useState(false);

  const existingMap = useMemo(() => {
    const m = new Map<string, string>();
    existing.forEach((e) => m.set(dupKey(e.name, e.city ?? "", e.country), e.id));
    return m;
  }, [existing]);

  const stats = useMemo(() => {
    const rows = preview?.rows ?? [];
    return {
      total: rows.length,
      valid: rows.filter((r) => r.status === "valid").length,
      duplicate: rows.filter((r) => r.status === "duplicate").length,
      invalid: rows.filter((r) => r.status === "invalid").length,
    };
  }, [preview]);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") {
      return toast.error("File harus berformat .json");
    }
    let json: any;
    try {
      json = JSON.parse(await file.text());
    } catch {
      return toast.error("File JSON tidak valid / rusak");
    }
    const list = Array.isArray(json) ? json : json?.campuses ?? json?.universities ?? json?.data;
    if (!Array.isArray(list) || list.length === 0) {
      return toast.error('Struktur JSON tidak sesuai — gunakan array pada key "campuses"');
    }

    const seen = new Set<string>();
    const rows: Row[] = list.map((raw: any, i: number) => {
      const name = String(raw?.name ?? raw?.nama ?? "").trim();
      const categoryRaw = String(raw?.category ?? raw?.kategori ?? raw?.type ?? raw?.jenis ?? "").trim();
      const type = CATEGORY_ALIASES[categoryRaw.toLowerCase()] ?? null;
      const city = String(raw?.city ?? raw?.kota ?? "").trim();
      const country = String(raw?.country ?? raw?.negara ?? "").trim();
      const website = normalizeUrl(raw?.website ?? raw?.website_url ?? raw?.url ?? "");
      const description = String(raw?.description ?? raw?.deskripsi ?? "").trim() || null;

      const base = { no: i + 1, name, categoryRaw, type, city, country, website, description };
      if (!name) return { ...base, status: "invalid" as const, reason: "Nama kampus wajib diisi" };
      if (!type)
        return {
          ...base,
          status: "invalid" as const,
          reason: `Kategori tidak terdaftar${categoryRaw ? ` (${categoryRaw})` : ""}`,
        };
      if (!city) return { ...base, status: "invalid" as const, reason: "Kota wajib diisi" };
      if (!country) return { ...base, status: "invalid" as const, reason: "Negara wajib diisi" };
      if (!website) return { ...base, status: "invalid" as const, reason: "Website wajib diisi" };

      const key = dupKey(name, city, country);
      if (existingMap.has(key) || seen.has(key)) {
        return { ...base, status: "duplicate" as const, reason: "Sudah ada" };
      }
      seen.add(key);
      return { ...base, status: "valid" as const };
    });

    setPreview({ fileName: file.name, rows });
  };

  const doImport = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const toRow = (r: Row) => ({
        name: r.name,
        category: r.type as UnivType,
        country: r.country,
        city: r.city || null,
        website: r.website,
        description: r.description,
      });

      const news = preview.rows.filter((r) => r.status === "valid").map(toRow);
      const dups = preview.rows.filter((r) => r.status === "duplicate");

      let inserted = 0;
      let updated = 0;
      let skipped = dups.length;

      if (dupMode === "insert") {
        news.push(...dups.map(toRow));
        skipped = 0;
      }

      if (news.length) {
        const { error } = await supabase.from("universities").insert(news);
        if (error) throw error;
        inserted = news.length;
      }

      if (dupMode === "update") {
        skipped = 0;
        for (const d of dups) {
          const id = existingMap.get(dupKey(d.name, d.city, d.country));
          if (!id) continue;
          const { error } = await supabase.from("universities").update(toRow(d)).eq("id", id);
          if (error) throw error;
          updated++;
        }
      }

      toast.success(
        `Import berhasil — total ${stats.total}, berhasil ${inserted}${updated ? `, diperbarui ${updated}` : ""}${
          skipped ? `, duplikat dilewati ${skipped}` : ""
        }${stats.invalid ? `, tidak valid ${stats.invalid}` : ""}`
      );
      setPreview(null);
      if (ref.current) ref.current.value = "";
      qc.invalidateQueries({ queryKey: ["admin-universities"] });
      qc.invalidateQueries({ queryKey: ["universities-public"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal mengimpor data");
    } finally {
      setBusy(false);
    }
  };

  const downloadSample = () => {
    const blob = new Blob([JSON.stringify(SAMPLE, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "contoh-kampus.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importCount =
    dupMode === "insert" ? stats.valid + stats.duplicate : dupMode === "update" ? stats.valid + stats.duplicate : stats.valid;

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <Button variant="outline" size="sm" onClick={() => ref.current?.click()}>
        <FileJson className="h-4 w-4 mr-1" /> Import JSON
      </Button>
      <Button variant="ghost" size="sm" onClick={downloadSample}>
        <Download className="h-4 w-4 mr-1" /> Contoh JSON
      </Button>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview Import Kampus</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">{preview.fileName}</Badge>
                <Badge variant="outline">Total: {stats.total}</Badge>
                <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Valid: {stats.valid}</Badge>
                <Badge variant="outline">Sudah ada: {stats.duplicate}</Badge>
                {stats.invalid > 0 && <Badge variant="destructive">Tidak valid: {stats.invalid}</Badge>}
              </div>

              <div>
                <Label className="text-xs">Perlakuan data duplikat</Label>
                <Select value={dupMode} onValueChange={(v) => setDupMode(v as typeof dupMode)}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Lewati duplikat (default)</SelectItem>
                    <SelectItem value="update">Update data lama</SelectItem>
                    <SelectItem value="insert">Import sebagai data baru</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="max-h-72 overflow-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">No</th>
                      <th className="p-2 text-left">Nama Kampus</th>
                      <th className="p-2 text-left">Kategori</th>
                      <th className="p-2 text-left">Kota</th>
                      <th className="p-2 text-left">Negara</th>
                      <th className="p-2 text-left">Website</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r) => (
                      <tr key={r.no} className="border-t">
                        <td className="p-2">{r.no}</td>
                        <td className="p-2 font-medium">{r.name || "-"}</td>
                        <td className="p-2">{r.type ? TYPE_LABELS[r.type] : r.categoryRaw || "-"}</td>
                        <td className="p-2">{r.city || "-"}</td>
                        <td className="p-2">{r.country || "-"}</td>
                        <td className="p-2 max-w-[160px] truncate">{r.website || "-"}</td>
                        <td className="p-2">
                          {r.status === "valid" ? (
                            <span className="text-primary font-medium">Valid</span>
                          ) : r.status === "duplicate" ? (
                            <span className="text-amber-600 font-medium">Sudah Ada</span>
                          ) : (
                            <span className="text-destructive font-medium">{r.reason}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground">
                Data lama tidak dihapus. Baris tidak valid otomatis dilewati — perbaiki file JSON lalu import ulang.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPreview(null)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={doImport} disabled={busy || importCount === 0}>
              {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Import Data ({importCount})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
