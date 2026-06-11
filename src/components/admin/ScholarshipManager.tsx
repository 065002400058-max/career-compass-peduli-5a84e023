import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Award } from "lucide-react";
import { toast } from "sonner";

const ScholarshipManager = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", provider: "", type: "S1", country: "Indonesia", amount: "", deadline: "", description: "", url: "" });

  const { data = [] } = useQuery({
    queryKey: ["admin-scholarships"],
    queryFn: async () => (await supabase.from("scholarships").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, deadline: form.deadline || null };
    const { error } = await supabase.from("scholarships").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Beasiswa ditambah");
    setOpen(false);
    setForm({ name: "", provider: "", type: "S1", country: "Indonesia", amount: "", deadline: "", description: "", url: "" });
    qc.invalidateQueries({ queryKey: ["admin-scholarships"] });
    qc.invalidateQueries({ queryKey: ["scholarships"] });
  };

  const del = async (id: string) => {
    await supabase.from("scholarships").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-scholarships"] });
    qc.invalidateQueries({ queryKey: ["scholarships"] });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-muted-foreground">{data.length} beasiswa terdaftar</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Tambah Beasiswa</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Beasiswa Baru</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div><Label>Nama *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Provider *</Label><Input required value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></div>
                <div><Label>Tipe</Label><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></div>
                <div><Label>Negara</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
                <div><Label>Nilai</Label><Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
                <div><Label>URL</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
              </div>
              <div><Label>Deskripsi</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button type="submit" className="w-full">Simpan</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="glass-card rounded-xl divide-y divide-border">
        {data.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground"><Award className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>Belum ada beasiswa.</p></div>
        ) : data.map((s: any) => (
          <div key={s.id} className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h4 className="font-semibold text-sm truncate">{s.name}</h4>
              <p className="text-xs text-muted-foreground truncate">{s.provider} · {s.type} · {s.country} {s.deadline && `· ⏰ ${s.deadline}`}</p>
            </div>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(s.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScholarshipManager;
