import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileJson, Loader2, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";

type UnivType = "dalam_negeri" | "luar_negeri" | "kedinasan";

const TYPE_LABELS: Record<UnivType, string> = {
  dalam_negeri: "Dalam Negeri",
  luar_negeri: "Luar Negeri",
  kedinasan: "Sekolah Kedinasan",
};

const TYPE_ALIASES: Record<string, UnivType> = {
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

type ParsedUniv = {
  name: string;
  country: string;
  type: UnivType;
  website_url: string;
  city: string | null;
  description: string | null;
  logo_url: string | null;
};

type Preview = {
  fileName: string;
  valid: ParsedUniv[];
  invalid: { row: number; name: string; reason: string }[];
  counts: Record<string, number>;
};

const SAMPLE = {
  universities: [
    {
      name: "Institut Teknologi Bandung",
      type: "dalam_negeri",
      country: "Indonesia",
      city: "Bandung",
      website_url: "https://www.itb.ac.id",
      description: "Perguruan tinggi teknik negeri terkemuka di Indonesia.",
      logo_url: "",
    },
    {
      name: "Al-Azhar University",
      type: "luar_negeri",
      country: "Mesir",
      city: "Cairo",
      website_url: "https://www.azhar.edu.eg",
      description: "Universitas Islam tertua dan paling bergengsi di dunia.",
    },
    {
      name: "Akademi Kepolisian",
      type: "kedinasan",
      country: "Indonesia",
      city: "Semarang",
      website_url: "https://www.akpol.ac.id",
      description: "Lembaga pendidikan perwira Polri.",
    },
  ],
};

const normalizeUrl = (u: string) => {
  const v = u.trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v.replace(/^\/+/, "")}`;
};

export default function UniversitiesJsonImport({ onImported }: { onImported: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

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
    const list = Array.isArray(json) ? json : json?.universities ?? json?.data;
    if (!Array.isArray(list) || list.length === 0) {
      return toast.error('Struktur JSON tidak sesuai — harus berupa array atau memiliki key "universities"');
    }

    const valid: ParsedUniv[] = [];
    const invalid: { row: number; name: string; reason: string }[] = [];

    list.forEach((raw: any, i: number) => {
      const row = i + 1;
      const name = String(raw?.name ?? raw?.nama ?? "").trim();
      const typeRaw = String(raw?.type ?? raw?.jenis ?? "").trim().toLowerCase();
      const type = TYPE_ALIASES[typeRaw];
      const website = normalizeUrl(String(raw?.website_url ?? raw?.website ?? raw?.url ?? ""));
      const country = String(raw?.country ?? raw?.negara ?? (type === "luar_negeri" ? "" : "Indonesia")).trim();

      if (!name) return invalid.push({ row, name: "-", reason: "Nama kampus wajib diisi" });
      if (!type)
        return invalid.push({
          row,
          name,
          reason: `Jenis tidak dikenal (${typeRaw || "kosong"}) — gunakan dalam_negeri / luar_negeri / kedinasan`,
        });
      if (!website) return invalid.push({ row, name, reason: "website_url wajib diisi" });
      if (!country) return invalid.push({ row, name, reason: "Negara wajib diisi" });

      valid.push({
        name,
        type,
        country,
        website_url: website,
        city: String(raw?.city ?? raw?.kota ?? "").trim() || null,
        description: String(raw?.description ?? raw?.deskripsi ?? "").trim() || null,
        logo_url: String(raw?.logo_url ?? raw?.logo ?? "").trim() || null,
      });
    });

    const counts: Record<string, number> = {};
    valid.forEach((v) => {
      counts[TYPE_LABELS[v.type]] = (counts[TYPE_LABELS[v.type]] ?? 0) + 1;
    });

    if (valid.length === 0) {
      toast.error("Tidak ada data kampus yang valid pada file ini");
    }
    setPreview({ fileName: file.name, valid, invalid, counts });
  };

  const doImport = async () => {
    if (!preview?.valid.length) return;
    setBusy(true);
    try {
      const { data: existing } = await supabase.from("universities").select("name");
      const existingNames = new Set((existing ?? []).map((e: any) => String(e.name).trim().toLowerCase()));

      const seen = new Set<string>();
      const rows = preview.valid.filter((v) => {
        const key = v.name.trim().toLowerCase();
        if (existingNames.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const skipped = preview.valid.length - rows.length;
      if (rows.length === 0) {
        toast.info("Semua kampus pada file sudah ada di database");
      } else {
        const { error } = await supabase.from("universities").insert(rows);
        if (error) throw error;
        toast.success(`${rows.length} kampus berhasil diimpor${skipped ? ` — ${skipped} duplikat dilewati` : ""}`);
      }
      setPreview(null);
      if (ref.current) ref.current.value = "";
      onImported();
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
      <Button variant="outline" onClick={() => ref.current?.click()}>
        <FileJson className="h-4 w-4 mr-1" /> Import JSON
      </Button>
      <Button variant="ghost" onClick={downloadSample}>
        <Download className="h-4 w-4 mr-1" /> Contoh JSON
      </Button>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview Import Kampus</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{preview.fileName}</Badge>
                <Badge>Valid: {preview.valid.length}</Badge>
                {preview.invalid.length > 0 && (
                  <Badge variant="destructive">Bermasalah: {preview.invalid.length}</Badge>
                )}
                {Object.entries(preview.counts).map(([k, v]) => (
                  <Badge key={k} variant="outline">
                    {k}: {v}
                  </Badge>
                ))}
              </div>

              <div className="max-h-72 overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">No</th>
                      <th className="p-2 text-left">Nama</th>
                      <th className="p-2 text-left">Jenis</th>
                      <th className="p-2 text-left">Lokasi</th>
                      <th className="p-2 text-left">Website</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.valid.map((u, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2 font-medium">{u.name}</td>
                        <td className="p-2">{TYPE_LABELS[u.type]}</td>
                        <td className="p-2">{[u.city, u.country].filter(Boolean).join(", ")}</td>
                        <td className="p-2 truncate max-w-[200px]">{u.website_url}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.invalid.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1 max-h-40 overflow-auto">
                  <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Baris yang dilewati
                  </p>
                  {preview.invalid.map((e, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      Baris {e.row} ({e.name}): {e.reason}
                    </p>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Kampus dengan nama yang sudah ada di database akan dilewati (data lama tidak dihapus).
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPreview(null)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={doImport} disabled={busy || !preview?.valid.length}>
              {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Import {preview?.valid.length ?? 0} Kampus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
