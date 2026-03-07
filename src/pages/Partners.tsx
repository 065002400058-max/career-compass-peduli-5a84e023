import { Building2, Users, Briefcase, CalendarDays, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const partners = [
  { id: 1, name: "PT Digital Nusantara", industry: "Teknologi", jobs: 15, hires: 42, features: ["Job Posting", "Campus Hiring"] },
  { id: 2, name: "Bank Syariah Indonesia", industry: "Keuangan", jobs: 8, hires: 28, features: ["Job Posting", "Career Fair"] },
  { id: 3, name: "Tokopedia", industry: "E-commerce", jobs: 22, hires: 56, features: ["Job Posting", "Campus Hiring", "Career Fair"] },
  { id: 4, name: "Telkom Indonesia", industry: "Telekomunikasi", jobs: 12, hires: 35, features: ["Job Posting", "Campus Hiring"] },
  { id: 5, name: "RS Islam Jakarta", industry: "Kesehatan", jobs: 6, hires: 18, features: ["Job Posting"] },
  { id: 6, name: "Kemendikbud", industry: "Pemerintahan", jobs: 10, hires: 24, features: ["Job Posting", "Career Fair"] },
];

const Partners = () => (
  <div className="min-h-screen gradient-bg-subtle">
    <div className="container mx-auto section-padding">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Perusahaan Mitra</h1>
          <p className="text-muted-foreground mt-1">Jaringan mitra perusahaan Career Center PEDULI</p>
        </div>
        <Button>Daftar Sebagai Mitra</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="glass-card rounded-xl p-5 text-center">
          <Building2 className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-heading font-bold text-foreground">850+</p>
          <p className="text-xs text-muted-foreground">Perusahaan</p>
        </div>
        <div className="glass-card rounded-xl p-5 text-center">
          <Briefcase className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-heading font-bold text-foreground">3,200+</p>
          <p className="text-xs text-muted-foreground">Lowongan Dibuka</p>
        </div>
        <div className="glass-card rounded-xl p-5 text-center">
          <Users className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-heading font-bold text-foreground">5,600+</p>
          <p className="text-xs text-muted-foreground">Alumni Ditempatkan</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners.map((p) => (
          <div key={p.id} className="glass-card-hover rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground font-heading font-bold text-sm">
                {p.name.split(" ").pop()?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">{p.name}</h3>
                <p className="text-xs text-muted-foreground">{p.industry}</p>
              </div>
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{p.jobs} lowongan</span>
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{p.hires} hire</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {p.features.map((f) => <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default Partners;
