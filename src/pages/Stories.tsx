import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Plus, MessageCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Stories = () => {
  const { user, hasRole } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "Pengalaman" });

  const { data = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data } = await supabase.from("alumni_stories").select("*").eq("is_published", true).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Login dulu");
    setSaving(true);
    const author = user.user_metadata?.full_name || user.email || "Alumni";
    const { error } = await supabase.from("alumni_stories").insert({ ...form, user_id: user.id, author_name: author });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Pengalaman dibagikan ✨");
    setForm({ title: "", content: "", category: "Pengalaman" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["stories"] });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("alumni_stories").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["stories"] });
  };

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl gradient-bg flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold">Berbagi Pengalaman Alumni</h1>
              <p className="text-sm text-muted-foreground">Inspirasi dari jejak alumni untuk adik-adik santri.</p>
            </div>
          </div>
          {user && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Bagikan</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Bagikan Pengalaman</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div><Label>Judul</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div><Label>Kategori</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Pengalaman / Tips / Karier" /></div>
                  <div><Label>Cerita</Label><Textarea required rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
                  <Button type="submit" disabled={saving} className="w-full">
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Publikasikan
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {data.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center">
            <Heart className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Belum ada cerita. Jadi yang pertama berbagi!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {data.map((s: any) => (
              <article key={s.id} className="glass-card rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary">{s.category}</Badge>
                  {(user?.id === s.user_id || hasRole("admin")) && (
                    <button onClick={() => handleDelete(s.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <h2 className="font-heading text-lg font-bold mb-1">{s.title}</h2>
                <p className="text-xs text-muted-foreground mb-3">oleh {s.author_name} · {new Date(s.created_at).toLocaleDateString("id-ID")}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">{s.content}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Stories;
