import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Pencil,
  ExternalLink,
  GraduationCap,
  Search,
  FileDown,
  FileSpreadsheet,
  FileText,
  Eye,
  MapPin,
  Globe2,
} from "lucide-react";
import { toast } from "sonner";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import UniversitiesJsonImport, { TYPE_LABELS, type UnivType } from "./UniversitiesJsonImport";

type Univ = {
  id: string;
  name: string;
  country: string;
  type: UnivType;
  website_url: string;
  description: string | null;
  city: string | null;
  logo_url: string | null;
};

export default function UniversitiesManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Univ | null>(null);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Univ | null>(null);
  const [deleting, setDeleting] = useState<Univ | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | UnivType>("all");

  const { data: items } = useQuery({
    queryKey: ["admin-universities"],
    queryFn: async () =>
      ((await supabase.from("universities").select("*").order("type").order("name")).data ?? []) as Univ[],
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-universities"] });
    qc.invalidateQueries({ queryKey: ["universities-public"] });
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (items ?? [])
      .filter((u) => (tab === "all" ? true : u.type === tab))
      .filter((u) =>
        !term
          ? true
          : [u.name, u.city, u.country, TYPE_LABELS[u.type], u.description]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(term)
      );
  }, [items, q, tab]);

  const exportRows = filtered.map((u, i) => ({
    No: i + 1,
    "Nama Kampus": u.name,
    Kategori: TYPE_LABELS[u.type],
    Kota: u.city ?? "",
    Negara: u.country,
    Website: u.website_url,
    Deskripsi: u.description ?? "",
  }));

  const exportJson = () => {
    if (!filtered.length) return toast.info("Tidak ada data untuk diekspor");
    const payload = {
      campuses: filtered.map((u) => ({
        name: u.name,
        category: TYPE_LABELS[u.type],
        city: u.city ?? "",
        country: u.country,
        website: u.website_url,
        description: u.description ?? "",
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kampus-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`${filtered.length} kampus diekspor ke JSON`);
  };

  const doDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("universities").delete().eq("id", deleting.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`${deleting.name} dihapus`);
      refresh();
    }
    setDeleting(null);
  };

  const doDeleteAll = async () => {
    const { error } = await supabase
      .from("universities")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) toast.error(error.message);
    else {
      toast.success("Semua kampus dihapus");
      refresh();
    }
    setDeleteAllOpen(false);
    setConfirmText("");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center shrink-0">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-heading font-bold">Kelola Data Kampus</h3>
            <p className="text-xs text-muted-foreground">
              {items?.length ?? 0} kampus tersimpan — dalam/luar negeri & sekolah kedinasan
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Tambah Kampus
          </Button>
          <UniversitiesJsonImport
            existing={(items ?? []).map((u) => ({ id: u.id, name: u.name, city: u.city, country: u.country }))}
          />
          <Button size="sm" variant="outline" onClick={exportJson} disabled={!filtered.length}>
            <FileDown className="h-4 w-4 mr-1" /> Export JSON
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportToExcel(exportRows, "data-kampus", "Kampus")}
            disabled={!exportRows.length}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportToPDF(exportRows, "data-kampus", "Data Kampus — Career Center PEDULI")}
            disabled={!exportRows.length}
          >
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari kampus, kota, atau negara..."
            className="pl-9"
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="glass-card flex-wrap h-auto">
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="dalam_negeri">Dalam Negeri</TabsTrigger>
            <TabsTrigger value="luar_negeri">Luar Negeri</TabsTrigger>
            <TabsTrigger value="kedinasan">Kedinasan</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <p className="text-xs text-muted-foreground">Menampilkan {filtered.length} kampus</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((u) => (
          <Card key={u.id} className="glass-card">
            <CardContent className="p-4 flex flex-col h-full">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-sm line-clamp-2">{u.name}</p>
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    {TYPE_LABELS[u.type]}
                  </Badge>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 mt-3">
                <p className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" /> {u.city ? `${u.city}, ` : ""}
                  {u.country}
                </p>
                <a
                  href={u.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-primary truncate hover:underline"
                >
                  <Globe2 className="h-3 w-3 shrink-0" /> {u.website_url.replace(/^https?:\/\//, "")}
                </a>
              </div>
              {u.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{u.description}</p>}
              <div className="flex flex-wrap gap-1 mt-auto pt-3">
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setViewing(u)}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> Lihat
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => {
                    setEditing(u);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleting(u)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-sm text-muted-foreground py-10">Tidak ada kampus ditemukan.</p>
        )}
      </div>

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="font-heading font-semibold text-sm text-destructive">Zona Berbahaya</p>
          <p className="text-xs text-muted-foreground">Hapus seluruh data kampus dari database secara permanen.</p>
        </div>
        <Button
          variant="outline"
          className="text-destructive border-destructive/40 hover:bg-destructive/10"
          disabled={!items?.length}
          onClick={() => {
            setConfirmText("");
            setDeleteAllOpen(true);
          }}
        >
          <Trash2 className="h-4 w-4 mr-1" /> Hapus Semua
        </Button>
      </div>

      {/* Detail */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewing?.name}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Kategori: </span>
                {TYPE_LABELS[viewing.type]}
              </p>
              <p>
                <span className="text-muted-foreground">Lokasi: </span>
                {viewing.city ? `${viewing.city}, ` : ""}
                {viewing.country}
              </p>
              <p className="break-all">
                <span className="text-muted-foreground">Website: </span>
                <a href={viewing.website_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {viewing.website_url}
                </a>
              </p>
              <p>
                <span className="text-muted-foreground">Deskripsi: </span>
                {viewing.description || "-"}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" asChild>
              <a href={viewing?.website_url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" /> Kunjungi Website
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete single */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kampus ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} akan dihapus permanen. Data kampus yang dihapus tidak akan tampil lagi di halaman
              Jelajahi Kampus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete all */}
      <AlertDialog
        open={deleteAllOpen}
        onOpenChange={(o) => {
          setDeleteAllOpen(o);
          if (!o) setConfirmText("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus SEMUA {items?.length ?? 0} kampus?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Halaman Jelajahi Kampus akan kosong. Ketik <b>HAPUS SEMUA</b> untuk
              melanjutkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="HAPUS SEMUA"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== "HAPUS SEMUA"}
              onClick={doDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UnivDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={refresh} />
    </div>
  );
}

function UnivDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Univ | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("Indonesia");
  const [type, setType] = useState<UnivType>("dalam_negeri");
  const [website, setWebsite] = useState("");
  const [desc, setDesc] = useState("");
  const [city, setCity] = useState("");
  const [logo, setLogo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setCountry(editing.country);
      setType(editing.type);
      setWebsite(editing.website_url);
      setDesc(editing.description ?? "");
      setCity(editing.city ?? "");
      setLogo(editing.logo_url ?? "");
    } else {
      setName("");
      setCountry("Indonesia");
      setType("dalam_negeri");
      setWebsite("");
      setDesc("");
      setCity("");
      setLogo("");
    }
  }, [open, editing]);

  const save = async () => {
    if (!name.trim() || !city.trim() || !country.trim() || !website.trim()) {
      toast.error("Nama, kota, negara & website wajib diisi");
      return;
    }
    setBusy(true);
    const url = /^https?:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`;
    const payload = {
      name: name.trim(),
      country: country.trim(),
      type,
      website_url: url,
      description: desc.trim() || null,
      city: city.trim() || null,
      logo_url: logo.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("universities").update(payload).eq("id", editing.id)
      : await supabase.from("universities").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Kampus diperbarui" : "Kampus ditambahkan");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Kampus" : "Tambah Kampus"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nama Kampus *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="cth: Universitas Indonesia" />
          </div>
          <div>
            <Label>Kategori *</Label>
            <Select value={type} onValueChange={(v) => setType(v as UnivType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dalam_negeri">Dalam Negeri</SelectItem>
                <SelectItem value="luar_negeri">Luar Negeri</SelectItem>
                <SelectItem value="kedinasan">Kedinasan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label>Lokasi / Kota *</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="cth: Bogor" />
            </div>
            <div>
              <Label>Negara *</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Website *</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>Deskripsi</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Logo / Icon (URL, opsional)</Label>
            <Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://.../logo.png" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Batal
          </Button>
          <Button onClick={save} disabled={busy}>
            {editing ? "Simpan Perubahan" : "Simpan Kampus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
