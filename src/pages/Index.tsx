import { Link } from "react-router-dom";
import { Users, Briefcase, Building2, GraduationCap, ArrowRight, Search, Calendar, BarChart3, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-illustration.png";

const stats = [
  { icon: Users, value: "12,500+", label: "Total Alumni" },
  { icon: Briefcase, value: "3,200+", label: "Lowongan Kerja" },
  { icon: Building2, value: "850+", label: "Perusahaan Mitra" },
  { icon: GraduationCap, value: "150+", label: "Program Beasiswa" },
];

const features = [
  { icon: Search, title: "Portal Lowongan", desc: "Cari dan lamar pekerjaan dari perusahaan mitra terpercaya." },
  { icon: BarChart3, title: "Tracer Study", desc: "Lacak perkembangan karier alumni secara real-time." },
  { icon: Calendar, title: "Event Karier", desc: "Ikuti seminar, workshop, dan job fair eksklusif." },
  { icon: Shield, title: "Validasi Data", desc: "Data alumni dan lowongan terverifikasi dan terpercaya." },
];

const Index = () => (
  <div className="min-h-screen">
    {/* Hero */}
    <section className="gradient-bg-subtle section-padding overflow-hidden">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground text-sm font-medium px-4 py-1.5 rounded-full mb-6 animate-fade-up">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Platform Karier #1 untuk Santri
            </div>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight animate-fade-up">
              Smart Career Center{" "}
              <span className="gradient-text">PEDULI</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-lg animate-fade-up-delay">
              Masa Depan Karier Santri Dimulai Disini. Menghubungkan alumni, mahasiswa, dan perusahaan mitra dalam satu ekosistem karier terpadu.
            </p>
            <div className="flex flex-wrap gap-3 mt-8 animate-fade-up-delay-2">
              <Button size="lg" asChild>
                <Link to="/jobs">Cari Lowongan <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/dashboard">Lihat Dashboard</Link>
              </Button>
            </div>
          </div>
          <div className="flex justify-center animate-float">
            <img src={heroImg} alt="Career growth 3D illustration" className="w-full max-w-md" />
          </div>
        </div>
      </div>
    </section>

    {/* Stats */}
    <section className="section-padding">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((s) => (
            <div key={s.label} className="glass-card-hover rounded-xl p-5 md:p-6 text-center">
              <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-3">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <p className="text-2xl md:text-3xl font-heading font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Features */}
    <section className="section-padding bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Fitur Unggulan</h2>
          <p className="text-muted-foreground mt-3">Semua yang Anda butuhkan untuk membangun karier yang sukses.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="glass-card-hover rounded-xl p-6">
              <div className="h-12 w-12 rounded-xl gradient-bg flex items-center justify-center mb-4">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-heading font-semibold text-foreground text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="section-padding">
      <div className="container mx-auto">
        <div className="gradient-bg rounded-2xl p-8 md:p-16 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground">Siap Memulai Karier Anda?</h2>
          <p className="text-primary-foreground/80 mt-4 max-w-xl mx-auto">Bergabung sekarang dan akses ribuan peluang kerja, beasiswa, dan event karier eksklusif.</p>
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/jobs">Jelajahi Lowongan</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/partners">Jadi Mitra</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  </div>
);

export default Index;
