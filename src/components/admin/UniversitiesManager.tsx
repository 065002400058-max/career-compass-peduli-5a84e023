import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, ExternalLink, GraduationCap } from "lucide-react";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, string> = {
  dalam_negeri: "Dalam Negeri",
  luar_negeri: "Luar Negeri",
  kedinasan: "Sekolah Kedinasan",
};

type Univ = {
  id: string;
  name: string;
  country: string;
  type: "dalam_negeri" | "luar_negeri" | "kedinasan";
  website_url: string;
  description: string | null;
  city: string | null;
  logo_url: string | null;
};

export default function UniversitiesManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Univ | null>(null);
  const [open, setOpen] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["admin-universities"],
    queryFn: async () =>
      ((await supabase.from("universities").select("*").order("type").order("name")).data ?? []) as Univ[],
  });

  const grouped = (items ?? []).reduce<Record<string, Univ[]>>((acc, u) => {
    (acc[u.type] ??= []).push(u);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-heading font-bold">Perguruan Tinggi & Kedinasan</h3>
            <p className="text-xs text-muted-foreground">Kelola daftar kampus dalam/luar negeri & sekolah kedinasan</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Kampus
        </Button>
      </div>

      {["dalam_negeri", "luar_negeri", "kedinasan"].map((tp) => (
        <section key={tp}>
          <h4 className="font-heading font-semibold mb-2 text-sm">
            {TYPE_LABELS[tp]} <Badge variant="secondary" className="ml-1">{grouped[tp]?.length ?? 0}</Badge>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(grouped[tp] ?? []).map((u) => (
              <Card key={u.id} className="glass-card">
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-semibold text-sm truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.city ? `${u.city}, ` : ""}{u.country}</p>
                    {u.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{u.description}</p>}
                    <a href={u.website_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 mt-2 hover:underline">
                      <ExternalLink className="h-3 w-3" /> {u.website_url.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(u); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={async () => {
                      if (!confirm(`Hapus ${u.name}?`)) return;
                      const { error } = await supabase.from("universities").delete().eq("id", u.id);
                      if (error) toast.error(error.message);
                      else { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["admin-universities"] }); qc.invalidateQueries({ queryKey: ["universities-public"] }); }
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(grouped[tp] ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground col-span-full">Belum ada data.</p>
            )}
          </div>
        </section>
      ))}

      <UnivDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin-universities"] });
          qc.invalidateQueries({ queryKey: ["universities-public"] });
        }}
      />
    </div>
  );
}

function UnivDialog({ open, onOpenChange, editing, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; editing: Univ | null; onSaved: () => void; }) {
  const [name, setName] = useState(""); const [country, setCountry] = useState("Indonesia");
  const [type, setType] = useState<Univ["type"]>("dalam_negeri");
  const [website, setWebsite] = useState(""); const [desc, setDesc] = useState(""); const [city, setCity] = useState("");

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name); setCountry(editing.country); setType(editing.type);
        setWebsite(editing.website_url); setDesc(editing.description ?? ""); setCity(editing.city ?? "");
      } else {
        setName(""); setCountry("Indonesia"); setType("dalam_negeri"); setWebsite(""); setDesc(""); setCity("");
      }
    }
  }, [open, editing]);

  const save = async () => {
    if (!name.trim() || !website.trim()) { toast.error("Nama & website wajib diisi"); return; }
    const payload = { name, country, type, website_url: website, description: desc || null, city: city || null };
    const { error } = editing
      ? await supabase.from("universities").update(payload).eq("id", editing.id)
      : await supabase.from("universities").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Diperbarui" : "Ditambahkan");
    onOpenChange(false); onSaved();
    setName(""); setCountry("Indonesia"); setType("dalam_negeri"); setWebsite(""); setDesc(""); setCity("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      onOpenChange(v);
      if (!v) { setName(""); setCountry("Indonesia"); setType("dalam_negeri"); setWebsite(""); setDesc(""); setCity(""); }
    }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit Kampus" : "Tambah Kampus"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nama Kampus *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="cth: Universitas Indonesia" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Negara</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} /></div>
            <div><Label>Kota</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
          </div>
          <div><Label>Jenis</Label>
            <Select value={type} onValueChange={(v) => setType(v as Univ["type"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dalam_negeri">Dalam Negeri</SelectItem>
                <SelectItem value="luar_negeri">Luar Negeri</SelectItem>
                <SelectItem value="kedinasan">Sekolah Kedinasan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Website / Link Resmi *</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." /></div>
          <div><Label>Deskripsi</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} /></div>
        </div>
        <DialogFooter><Button onClick={save}>{editing ? "Simpan Perubahan" : "Tambah"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
