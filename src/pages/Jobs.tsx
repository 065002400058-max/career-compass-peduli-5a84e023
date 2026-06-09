import { Search, MapPin, Clock, Building2, Filter, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const jobTypes = ["Semua", "Full-time", "Part-time", "Internship", "Remote"];
const locations = ["Semua", "Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Remote"];

const Jobs = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selType, setSelType] = useState("Semua");
  const [selLoc, setSelLoc] = useState("Semua");
  const [applyJob, setApplyJob] = useState<any>(null);
  const isAdmin = hasRole("admin");

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs", isAdmin],
    queryFn: async () => {
      const q = supabase.from("jobs").select("*").order("created_at", { ascending: false });
      // public list shows only approved jobs; admins see all
      const { data, error } = isAdmin ? await q : await q.eq("status", "approved");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: myApps = [] } = useQuery({
    queryKey: ["my-applications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("job_applications").select("job_id").eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user,
  });
  const appliedSet = new Set(myApps.map((a: any) => a.job_id));

  const filtered = jobs.filter((j: any) => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase());
    const matchType = selType === "Semua" || j.type === selType;
    const matchLoc = selLoc === "Semua" || j.location === selLoc;
    return matchSearch && matchType && matchLoc;
  });

  const handleApplyClick = (job: any) => {
    if (!user) { toast.info("Silakan login terlebih dahulu"); navigate("/auth"); return; }
    if (isAdmin) { toast.info("Admin tidak melamar lowongan — kelola lewat panel admin."); return; }
    if (appliedSet.has(job.id)) { toast.info("Anda sudah melamar lowongan ini"); return; }
    setApplyJob(job);
  };

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding">
        <div className="mb-8 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Portal Lowongan Kerja</h1>
            <p className="text-muted-foreground mt-1">Temukan peluang karier terbaik untuk Anda</p>
          </div>
          {isAdmin && (
            <Badge variant="destructive" className="gap-1"><Shield className="h-3 w-3" /> Mode Admin</Badge>
          )}
        </div>

        <div className="glass-card rounded-xl p-4 md:p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari posisi atau perusahaan..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={selLoc} onChange={(e) => setSelLoc(e.target.value)}>
                {locations.map((l) => <option key={l}>{l}</option>)}
              </select>
              <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={selType} onChange={(e) => setSelType(e.target.value)}>
                {jobTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Memuat data...</div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((job: any) => {
              const already = appliedSet.has(job.id);
              return (
                <div key={job.id} className="glass-card-hover rounded-xl p-5 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-heading font-semibold text-lg text-foreground">{job.title}</h3>
                        <Badge variant="secondary" className="text-xs">{job.type}</Badge>
                        {isAdmin && <Badge variant={job.status === "approved" ? "default" : "outline"} className="text-xs">{job.status}</Badge>}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{job.company}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: idLocale })}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3">{job.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {job.salary && <span className="font-heading font-semibold text-foreground">{job.salary}</span>}
                      {isAdmin ? (
                        <Button size="sm" variant="outline" disabled title="Admin mengelola, tidak melamar">
                          <Shield className="h-4 w-4 mr-1" /> Khusus Pelamar
                        </Button>
                      ) : already ? (
                        <Button size="sm" variant="outline" disabled>
                          <CheckCircle2 className="h-4 w-4 mr-1 text-primary" /> Sudah Dilamar
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => handleApplyClick(job)}>Lamar Sekarang</Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tidak ada lowongan yang sesuai filter.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <ApplyDialog
        job={applyJob}
        onClose={() => setApplyJob(null)}
        user={user}
        onApplied={() => qc.invalidateQueries({ queryKey: ["my-applications", user?.id] })}
      />
    </div>
  );
};

function ApplyDialog({ job, onClose, user, onApplied }: { job: any; onClose: () => void; user: any; onApplied: () => void }) {
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [letter, setLetter] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!fullName || !email) { toast.error("Nama & email wajib diisi"); return; }
    setSaving(true);
    const { error } = await supabase.from("job_applications").insert({
      job_id: job.id, user_id: user.id, full_name: fullName, email, phone: phone || null,
      cv_url: cvUrl || null, cover_letter: letter || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Lamaran terkirim!");
    onApplied(); onClose();
  };

  return (
    <Dialog open={!!job} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lamar — {job?.title}</DialogTitle>
          <p className="text-xs text-muted-foreground">{job?.company} · {job?.location}</p>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Nama Lengkap *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>No. HP</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
          <div><Label>Link CV (Google Drive / URL)</Label><Input value={cvUrl} onChange={(e) => setCvUrl(e.target.value)} placeholder="https://..." /></div>
          <div><Label>Surat Lamaran / Catatan</Label><Textarea rows={4} value={letter} onChange={(e) => setLetter(e.target.value)} placeholder="Ceritakan singkat tentang Anda..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Mengirim..." : "Kirim Lamaran"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Jobs;
