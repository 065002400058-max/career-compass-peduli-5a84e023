import { Search, MapPin, Clock, Building2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const jobTypes = ["Semua", "Full-time", "Part-time", "Internship", "Remote"];
const locations = ["Semua", "Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Remote"];

const jobs = [
  { id: 1, title: "Frontend Developer", company: "PT Digital Nusantara", location: "Jakarta", type: "Full-time", salary: "Rp 8-12 jt", posted: "2 hari lalu", desc: "Mengembangkan antarmuka web modern menggunakan React dan TypeScript." },
  { id: 2, title: "Data Analyst", company: "CV Analitika Indonesia", location: "Bandung", type: "Full-time", salary: "Rp 7-10 jt", posted: "3 hari lalu", desc: "Menganalisis data bisnis dan membuat laporan insight." },
  { id: 3, title: "UI/UX Designer", company: "Kreativa Studio", location: "Remote", type: "Remote", salary: "Rp 6-9 jt", posted: "1 hari lalu", desc: "Merancang pengalaman pengguna yang intuitif." },
  { id: 4, title: "Marketing Intern", company: "PT Maju Bersama", location: "Surabaya", type: "Internship", salary: "Rp 2-3 jt", posted: "5 hari lalu", desc: "Program magang di divisi marketing digital." },
  { id: 5, title: "Backend Engineer", company: "TechCorp Indonesia", location: "Yogyakarta", type: "Full-time", salary: "Rp 10-15 jt", posted: "1 hari lalu", desc: "Membangun API dan infrastruktur backend." },
  { id: 6, title: "Content Writer", company: "Media Cerdas", location: "Remote", type: "Part-time", salary: "Rp 3-5 jt", posted: "4 hari lalu", desc: "Menulis konten SEO-friendly untuk berbagai platform." },
];

const Jobs = () => {
  const [search, setSearch] = useState("");
  const [selType, setSelType] = useState("Semua");
  const [selLoc, setSelLoc] = useState("Semua");

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

        {/* Search & Filters */}
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

        {/* Results */}
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
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{job.posted}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">{job.desc}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="font-heading font-semibold text-foreground">{job.salary}</span>
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
      </div>
    </div>
  );
};

export default Jobs;
