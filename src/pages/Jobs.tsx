import { Search, MapPin, Clock, Building2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const jobTypes = ["Semua", "Full-time", "Part-time", "Internship", "Remote"];
const locations = ["Semua", "Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Remote"];

const Jobs = () => {
  const [search, setSearch] = useState("");
  const [selType, setSelType] = useState("Semua");
  const [selLoc, setSelLoc] = useState("Semua");

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = jobs.filter((j) => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase());
    const matchType = selType === "Semua" || j.type === selType;
    const matchLoc = selLoc === "Semua" || j.location === selLoc;
    return matchSearch && matchType && matchLoc;
  });

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Portal Lowongan Kerja</h1>
          <p className="text-muted-foreground mt-1">Temukan peluang karier terbaik untuk Anda</p>
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
            {filtered.map((job) => (
              <div key={job.id} className="glass-card-hover rounded-xl p-5 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-semibold text-lg text-foreground">{job.title}</h3>
                      <Badge variant="secondary" className="text-xs">{job.type}</Badge>
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
                    <Button size="sm">Lamar Sekarang</Button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tidak ada lowongan yang sesuai filter.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Jobs;
