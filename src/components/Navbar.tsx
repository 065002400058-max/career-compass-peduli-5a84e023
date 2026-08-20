import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  LogOut,
  User,
  ChevronDown,
  Home,
  Briefcase,
  LayoutGrid,
  Users,
  Info,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import duLogo from "@/assets/du-logo-t.png.asset.json";
import yayasanLogo from "@/assets/yayasan-logo-t.png.asset.json";
import trisaktiLogo from "@/assets/trisakti-logo-t.png.asset.json";
import diktiLogo from "@/assets/dikti-logo-t.png.asset.json";
import tutwuriLogo from "@/assets/tutwuri-logo-t.png.asset.json";
import bimaAsset from "@/assets/bima-logo-full.png.asset.json";
import { assetUrl } from "@/lib/assetUrl";

const logos = [
  { src: assetUrl(duLogo.url), alt: "Pesantren Daarul 'Uluum Lido" },
  { src: assetUrl(yayasanLogo.url), alt: "Yayasan Salsabila Lido" },
  { src: assetUrl(trisaktiLogo.url), alt: "Universitas Trisakti" },
  { src: assetUrl(diktiLogo.url), alt: "Diktisaintek Berdampak" },
  {
    src: assetUrl(bimaAsset.url),
    alt: "BiMA",
    className: "h-8 w-auto lg:h-10",
    compactClassName: "h-7 w-auto sm:h-8",
  },

  { src: assetUrl(tutwuriLogo.url), alt: "Tut Wuri Handayani" },
];

type Item = { label: string; path: string; show?: boolean };
type Group = { label: string; items: Item[]; icon: typeof Home };

/* ---------- Logo strip (shared) ---------- */
const LogoStrip = ({ compact = false }: { compact?: boolean }) => (
  <div
    className={`flex items-center justify-center flex-wrap ${
      compact ? "gap-1.5 sm:gap-2" : "gap-2 lg:gap-3"
    }`}
  >
    {logos.map((l) => {
      const sizeClass = compact
        ? l.compactClassName || l.className || "h-7 w-7 sm:h-8 sm:w-8"
        : l.className || "h-8 w-8 lg:h-10 lg:w-10";
      return (
        <img
          key={l.alt}
          src={l.src}
          alt={l.alt}
          loading="lazy"
          className={`object-contain shrink-0 ${sizeClass}`}
        />
      );
    })}
  </div>
);


const BrandText = ({ compact = false }: { compact?: boolean }) => (
  <div className={compact ? "text-center" : "text-left"}>
    <p
      className={`font-heading font-bold leading-tight text-foreground ${
        compact ? "text-base" : "text-lg lg:text-xl"
      }`}
    >
      Career Center <span className="text-primary">PEDULI</span>
    </p>
  </div>
);

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, loading, hasRole, roles } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isAdmin = hasRole("admin");

  const publicGroups: Group[] = [
    {
      label: "Karier",
      icon: Briefcase,
      items: [
        { label: "Lowongan Kerja", path: "/jobs" },
        { label: "Beasiswa", path: "/beasiswa" },
        { label: "Event Karier", path: "/events" },
      ],
    },
    {
      label: "Layanan",
      icon: LayoutGrid,
      items: [
        { label: "Tes CBT", path: "/cbt" },
        { label: "Konseling", path: "/psikotes" },
        { label: "Jelajahi Kampus", path: "/universities" },
        
      ],
    },
    {
      label: "Jejaring",
      icon: Users,
      items: [
        { label: "Alumni", path: "/alumni" },
        { label: "Mitra Perusahaan", path: "/partners" },
        ...(user ? [{ label: "Tracer Study", path: "/tracer" }] : []),
      ],
    },
    {
      label: "Tentang",
      icon: Info,
      items: [
        { label: "Tentang Career Center", path: "/tentang" },
        { label: "FAQ", path: "/tentang#faq" },
        { label: "Kontak", path: "/tentang#kontak" },
      ],
    },
  ];

  // Admin mengelola semua modul dari Dashboard, jadi menu publik disederhanakan.
  const groups: Group[] = isAdmin ? [] : publicGroups;

  const extraLinks: Item[] = [
    { label: "Dashboard", path: "/admin", show: isAdmin },
    { label: "Dashboard", path: "/dashboard", show: !!user && !isAdmin },
  ].filter((i) => i.show);


  const roleLabel = roles.includes("admin")
    ? "Admin"
    : roles.includes("alumni")
    ? "Alumni"
    : roles.includes("mitra")
    ? "Mitra"
    : roles.includes("santri")
    ? "Santri"
    : "User";

  const navItemCls = (active: boolean) =>
    `relative px-3 py-2 text-sm font-medium transition-colors outline-none ${
      active ? "text-primary" : "text-foreground/80 hover:text-primary"
    }`;

  const AuthActions = ({ full = false }: { full?: boolean }) =>
    loading ? null : user ? (
      <Button
        variant="outline"
        size="sm"
        className={full ? "w-full" : ""}
        onClick={() => {
          handleSignOut();
          setOpen(false);
        }}
      >
        <LogOut className="h-4 w-4 mr-1.5" />
        Keluar
      </Button>
    ) : (
      <div className={`flex gap-2 ${full ? "w-full" : ""}`}>
        <Button
          variant="outline"
          size="sm"
          className={full ? "flex-1" : ""}
          onClick={() => {
            navigate("/auth");
            setOpen(false);
          }}
        >
          Masuk
        </Button>
      </div>
    );

  return (
    <header className="sticky top-0 z-50">
      {/* ---------- Row 1: Branding ---------- */}
      <div className="bg-background/95 backdrop-blur-xl">
        {/* Desktop / tablet */}
        <div className="hidden md:grid container mx-auto grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 lg:gap-4 px-4 py-3 overflow-hidden">
          <div className="flex items-center min-w-0">
            {!loading && user && (
              <Link to="/profil" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted min-w-0 hover:bg-accent transition-colors">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs lg:text-sm text-foreground/80 truncate max-w-[100px] lg:max-w-[160px]">
                  {user.user_metadata?.full_name || user.email}
                </span>
                <Badge className="text-[10px] px-2 py-0 shrink-0">{roleLabel}</Badge>
              </Link>
            )}
          </div>

          <Link
            to="/"
            className="flex items-center justify-center gap-3 lg:gap-5 min-w-0 flex-wrap"
          >
            <BrandText />
          </Link>



          <div className="flex items-center justify-end gap-2">
            {!loading && user && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/profil">
                  <User className="h-4 w-4 mr-1.5" />
                  Profil
                </Link>
              </Button>
            )}
            <AuthActions />
          </div>
        </div>

        {/* Mobile compact header */}
        <div className="md:hidden h-[56px] px-3 flex items-center gap-2 border-b border-border/60">
          <button
            aria-label="Buka menu"
            className="h-9 w-9 -ml-1 flex items-center justify-center text-foreground shrink-0"
            onClick={() => setOpen(true)}
          >
            <Menu size={22} />
          </button>
          <Link to="/" className="flex items-center gap-2 min-w-0 flex-1">
            <img src={assetUrl(duLogo.url)} alt="Career Center PEDULI" className="h-8 w-8 object-contain shrink-0" loading="lazy" />
            <span className="font-heading font-bold text-[15px] leading-tight text-foreground truncate">
              Career Center <span className="text-primary">PEDULI</span>
            </span>
          </Link>
          {!loading && user ? (
            <Link to="/profil" aria-label="Profil Saya" className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-muted-foreground" />
            </Link>
          ) : (
            <Button size="sm" className="shrink-0" onClick={() => navigate("/auth")}>Masuk</Button>
          )}
        </div>
      </div>

      {/* ---------- Row 2: Navigation (desktop/tablet) ---------- */}
      <nav className="hidden md:block bg-background border-t border-border/60">
        <div className="container mx-auto flex items-center justify-center gap-1 lg:gap-6 px-4">
          <Link to="/" className={navItemCls(location.pathname === "/")}>
            Beranda
            {location.pathname === "/" && (
              <span className="absolute left-3 right-3 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </Link>
          {groups.map((g) => {
            const active = g.items.some(
              (i) => location.pathname === i.path.split("#")[0]
            );
            return (
              <DropdownMenu key={g.label}>
                <DropdownMenuTrigger className={`${navItemCls(active)} flex items-center gap-1`}>
                  {g.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                  {active && (
                    <span className="absolute left-3 right-3 -bottom-px h-0.5 rounded-full bg-primary" />
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="bg-popover z-50">
                  {g.items.map((i) => (
                    <DropdownMenuItem key={i.path} asChild>
                      <Link to={i.path} className="cursor-pointer w-full">
                        {i.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
          {extraLinks.map((i) => (
            <Link
              key={i.path}
              to={i.path}
              className={navItemCls(location.pathname === i.path)}
            >
              {i.label}
              {location.pathname === i.path && (
                <span className="absolute left-3 right-3 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* ---------- Mobile drawer ---------- */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="md:hidden p-0 w-[86vw] max-w-[320px] flex flex-col">
          <div className="h-[56px] px-4 border-b border-border flex items-center gap-2.5 shrink-0">
            <img src={assetUrl(duLogo.url)} alt="Career Center PEDULI" className="h-8 w-8 object-contain shrink-0" />
            <div className="leading-tight min-w-0">
              <p className="font-heading text-[14px] font-bold text-foreground truncate">
                Career Center <span className="text-primary">PEDULI</span>
              </p>
              {!loading && user && (
                <p className="text-[11px] text-muted-foreground truncate">
                  {user.user_metadata?.full_name || user.email} &middot; {roleLabel}
                </p>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-3">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                location.pathname === "/" ? "text-primary bg-accent/60" : "text-foreground"
              }`}
            >
              <Home className={`h-4 w-4 ${location.pathname === "/" ? "text-primary" : "text-muted-foreground"}`} />
              Beranda
            </Link>
            {extraLinks.map((i) => (
              <Link
                key={i.path}
                to={i.path}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  location.pathname === i.path ? "text-primary bg-accent/60" : "text-foreground"
                }`}
              >
                <LayoutGrid className={`h-4 w-4 ${location.pathname === i.path ? "text-primary" : "text-muted-foreground"}`} />
                {i.label}
              </Link>
            ))}
            {groups.map((g) => {
              const Icon = g.icon;
              const groupActive = g.items.some((i) => location.pathname === i.path.split("#")[0]);
              return (
                <Collapsible key={g.label} defaultOpen={groupActive}>
                  <CollapsibleTrigger className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground [&[data-state=open]>svg:last-child]:rotate-180">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-left">{g.label}</span>
                    <ChevronDown className="h-4 w-4 transition-transform" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {g.items.map((i) => (
                      <Link
                        key={i.path}
                        to={i.path}
                        onClick={() => setOpen(false)}
                        className={`block pl-10 pr-3 py-2 rounded-lg text-sm ${
                          location.pathname === i.path.split("#")[0]
                            ? "text-primary bg-accent/60 font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {i.label}
                      </Link>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>

          <div className="border-t border-border p-3 space-y-2 shrink-0">
            {!loading && user && (
              <Link
                to="/profil"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  location.pathname === "/profil" ? "text-primary bg-accent/60" : "text-foreground"
                }`}
              >
                <User className="h-4 w-4 text-muted-foreground" />
                Profil Saya
              </Link>
            )}
            <AuthActions full />
          </div>
        </SheetContent>
      </Sheet>

      {/* ---------- Pattern strip ---------- */}
      <div
        className="islamic-pattern-bg w-full h-6 md:h-9 border-b border-border/40"
        style={{ backgroundColor: "hsl(158 64% 32%)" }}
        aria-hidden="true"
      />
    </header>
  );
};

export default Navbar;
