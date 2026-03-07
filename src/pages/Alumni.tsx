import { Search, GraduationCap, Building2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const alumni = [
  { id: 1, name: "Ahmad Fauzi", year: 2022, company: "PT Digital Nusantara", position: "Software Engineer", location: "Jakarta", status: "Bekerja" },
  { id: 2, name: "Siti Aisyah", year: 2021, company: "Bank Syariah Indonesia", position: "Financial Analyst", location: "Bandung", status: "Bekerja" },
  { id: 3, name: "Muhammad Rizki", year: 2023, company: "Tokopedia", position: "Product Manager", location: "Jakarta", status: "Bekerja" },
  { id: 4, name: "Fatimah Zahra", year: 2022, company: "RS Islam Jakarta", position: "Apoteker", location: "Jakarta", status: "Bekerja" },
  { id: 5, name: "Umar Abdullah", year: 2020, company: "Universitas Gadjah Mada", position: "Dosen", location: "Yogyakarta", status: "Bekerja" },
  { id: 6, name: "Khadijah Putri", year: 2023, company: "-", position: "-", location: "Surabaya", status: "Mencari Kerja" },
  { id: 7, name: "Bilal Hakim", year: 2021, company: "Telkom Indonesia", position: "Network Engineer", location: "Bandung", status: "Bekerja" },
  { id: 8, name: "Nurul Hidayah", year: 2022, company: "Kemendikbud", position: "Guru", location: "Semarang", status: "Bekerja" },
];

const Alumni = () => {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("Semua");
  const years = ["Semua", "2023", "2022", "2021", "2020"];

  const filtered = alumni.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.company.toLowerCase().includes(search.toLowerCase());
    const matchYear = yearFilter === "Semua" || a.year.toString() === yearFilter;
    return matchSearch && matchYear;
  });

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Database Alumni</h1>
          <p className="text-muted-foreground mt-1">Data alumni dan tracer study</p>
        </div>

        <div className="glass-card rounded-xl p-4 md:p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nama atau perusahaan..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              {years.map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((a) => (
            <div key={a.id} className="glass-card-hover rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-heading font-bold">
                  {a.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground text-sm">{a.name}</h3>
                  <Badge variant={a.status === "Bekerja" ? "default" : "secondary"} className="text-xs mt-1">{a.status}</Badge>
                </div>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><GraduationCap className="h-3.5 w-3.5" />Lulus {a.year}</p>
                <p className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" />{a.company}</p>
                <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{a.location}</p>
              </div>
              <p className="text-xs text-foreground font-medium mt-3">{a.position}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Alumni;
