import { Link } from "react-router-dom";
import { Users, Briefcase, Building2, GraduationCap, ArrowRight, Search, Calendar, BarChart3, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import mosqueImg from "@/assets/mosque-silhouette.png";
import ornamentImg from "@/assets/islamic-ornament-top.png";

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

const Index = () => {
  const { user, hasRole, loading } = useAuth();

  const getHeroContent = () => {
    if (!user) {
      return {
        badge: "بسم الله الرحمن الرحيم",
        subtitle: "Masa Depan Karier Santri Dimulai Disini. Menghubungkan alumni, mahasiswa, dan perusahaan mitra dalam satu ekosistem karier terpadu berbasis nilai-nilai Islam.",
        cta: (
          <div className="flex flex-wrap gap-3 mt-8 animate-fade-up-delay-2">
            <Button size="lg" asChild className="gradient-bg border-0 hover:opacity-90">
              <Link to="/auth">Daftar Sekarang <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="border-primary/50 hover:bg-accent">
              <Link to="/jobs">Lihat Lowongan</Link>
            </Button>
          </div>
        ),
      };
    }
    if (hasRole("admin")) {
      return {
        badge: "Assalamu'alaikum, Admin",
        subtitle: "Kelola data alumni, validasi lowongan, dan pantau perkembangan Career Center secara real-time.",
        cta: (
          <div className="flex flex-wrap gap-3 mt-8 animate-fade-up-delay-2">
            <Button size="lg" asChild className="gradient-bg border-0"><Link to="/admin">Buka Admin Panel <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button variant="outline" size="lg" asChild className="border-primary/50"><Link to="/dashboard">Lihat Dashboard</Link></Button>
          </div>
        ),
      };
    }
    if (hasRole("alumni")) {
      return {
        badge: "Assalamu'alaikum, Alumni!",
        subtitle: "Temukan peluang karier terbaik, ikuti event eksklusif, dan bangun jejaring profesional Anda.",
        cta: (
          <div className="flex flex-wrap gap-3 mt-8 animate-fade-up-delay-2">
            <Button size="lg" asChild className="gradient-bg border-0"><Link to="/jobs">Cari Lowongan <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button variant="outline" size="lg" asChild className="border-primary/50"><Link to="/events">Lihat Event</Link></Button>
          </div>
        ),
      };
    }
    if (hasRole("mitra")) {
      return {
        badge: "Assalamu'alaikum, Mitra!",
        subtitle: "Posting lowongan kerja, temukan talenta terbaik dari alumni kami, dan kelola data perusahaan Anda.",
        cta: (
          <div className="flex flex-wrap gap-3 mt-8 animate-fade-up-delay-2">
            <Button size="lg" asChild className="gradient-bg border-0"><Link to="/jobs">Posting Lowongan <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button variant="outline" size="lg" asChild className="border-primary/50"><Link to="/alumni">Cari Alumni</Link></Button>
          </div>
        ),
      };
    }
    return {
      badge: "Assalamu'alaikum!",
      subtitle: "Jelajahi lowongan kerja, data alumni, dan event karier yang tersedia untuk Anda.",
      cta: (
        <div className="flex flex-wrap gap-3 mt-8 animate-fade-up-delay-2">
          <Button size="lg" asChild className="gradient-bg border-0"><Link to="/jobs">Cari Lowongan <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          <Button variant="outline" size="lg" asChild className="border-primary/50"><Link to="/dashboard">Lihat Dashboard</Link></Button>
        </div>
      ),
    };
  };

  const heroContent = getHeroContent();
  const userName = user?.user_metadata?.full_name;

  return (
    <div className="min-h-screen islamic-pattern-bg">
      {/* Islamic Ornament Border */}
      <div className="w-full overflow-hidden">
        <img src={ornamentImg} alt="" className="w-full h-auto opacity-80" aria-hidden="true" />
      </div>

      {/* Hero */}
      <section className="gradient-bg-subtle section-padding overflow-hidden relative">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground text-sm font-medium px-4 py-1.5 rounded-full mb-6 animate-fade-up border border-primary/20">
                <Star className="h-3.5 w-3.5 text-secondary fill-secondary" />
                <span className="font-arabic">{heroContent.badge}</span>
              </div>
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight animate-fade-up">
                {userName ? (
                  <>
                    Halo, {userName.split(" ")[0]}! 👋
                    <br />
                    <span className="gradient-text text-3xl md:text-4xl lg:text-5xl">Career Center PEDULI</span>
                  </>
                ) : (
                  <>
                    Smart Career Center{" "}
                    <span className="gradient-text">PEDULI</span>
                  </>
                )}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-lg animate-fade-up-delay leading-relaxed">
                {heroContent.subtitle}
              </p>
              {heroContent.cta}
            </div>
            <div className="flex justify-center animate-float">
              <img src={mosqueImg} alt="Islamic mosque illustration" className="w-full max-w-sm drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Bismillah Quote */}
      <section className="py-10 relative">
        <div className="container mx-auto text-center">
          <p className="font-arabic text-2xl md:text-3xl text-primary/80 animate-shimmer">
            ﷽
          </p>
          <p className="text-muted-foreground text-sm mt-2 italic">
            "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lain." — HR. Ahmad
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="section-padding">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {stats.map((s) => (
              <div key={s.label} className="glass-card-hover rounded-xl p-5 md:p-6 text-center border-primary/10">
                <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-3 border border-primary/20">
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
      <section className="section-padding relative">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Fitur Unggulan</h2>
            <p className="text-muted-foreground mt-3">Semua yang Anda butuhkan untuk membangun karier yang sukses dan berkah.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="glass-card-hover rounded-xl p-6 border-primary/10">
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
      {!user ? (
        <section className="section-padding">
          <div className="container mx-auto">
            <div className="gradient-bg rounded-2xl p-8 md:p-16 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.3' fill-rule='evenodd'%3E%3Cpath d='M20 18v-2h-2v2h-2v2h2v2h2v-2h2v-2h-2z'/%3E%3C/g%3E%3C/svg%3E\")"
              }} />
              <div className="relative z-10">
                <p className="font-arabic text-xl text-primary-foreground/70 mb-4">وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ</p>
                <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground">
                  Siap Memulai Karier yang Berkah?
                </h2>
                <p className="text-primary-foreground/80 mt-4 max-w-xl mx-auto">
                  Bergabung sekarang dan akses ribuan peluang kerja, beasiswa, dan event karier eksklusif untuk santri dan alumni.
                </p>
                <div className="flex flex-wrap gap-3 justify-center mt-8">
                  <Button size="lg" variant="secondary" asChild>
                    <Link to="/auth">Daftar Sekarang</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                    <Link to="/jobs">Lihat Lowongan</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="section-padding">
          <div className="container mx-auto">
            <div className="gradient-bg rounded-2xl p-8 md:p-16 text-center relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground">
                  {hasRole("mitra") ? "Temukan Talenta Terbaik" : "Jelajahi Lebih Banyak"}
                </h2>
                <p className="text-primary-foreground/80 mt-4 max-w-xl mx-auto">
                  {hasRole("mitra")
                    ? "Posting lowongan dan temukan kandidat alumni berkualitas untuk perusahaan Anda."
                    : "Temukan lowongan, event, dan peluang yang sesuai dengan profil karier Anda."}
                </p>
                <div className="flex flex-wrap gap-3 justify-center mt-8">
                  <Button size="lg" variant="secondary" asChild>
                    <Link to={hasRole("mitra") ? "/jobs" : "/events"}>
                      {hasRole("mitra") ? "Posting Lowongan" : "Lihat Event"}
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                    <Link to={hasRole("admin") ? "/admin" : "/dashboard"}>
                      {hasRole("admin") ? "Admin Panel" : "Dashboard"}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Bottom ornament */}
      <div className="w-full overflow-hidden rotate-180">
        <img src={ornamentImg} alt="" className="w-full h-auto opacity-60" aria-hidden="true" />
      </div>
    </div>
  );
};

export default Index;
