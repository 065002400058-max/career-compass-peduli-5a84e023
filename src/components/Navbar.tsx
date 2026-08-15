import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
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
import tutwuriLogo from "@/assets/tutwuri-logo.png.asset.json";
import bimaLogo from "@/assets/bima-logo-icon.png";

const logos = [
  { src: duLogo.url, alt: "Pesantren Daarul 'Uluum Lido" },
  { src: yayasanLogo.url, alt: "Yayasan Salsabila Lido" },
  { src: trisaktiLogo.url, alt: "Universitas Trisakti" },
  { src: diktiLogo.url, alt: "Diktisaintek Berdampak" },
  { src: bimaLogo, alt: "BiMA" },
  { src: tutwuriLogo.url, alt: "Tut Wuri Handayani" },
];

type Item = { label: string; path: string; show?: boolean };
type Group = { label: string; items: Item[]; icon: typeof Home };

/* ---------- Logo strip (shared) ---------- */
const LogoStrip = ({ compact = false }: { compact?: boolean }) => (
  <div
    className={`flex items-center justify-center ${
      compact ? "gap-1.5 sm:gap-2" : "gap-3 lg:gap-4"
    }`}
  >
    {logos.map((l) => (
      <img
        key={l.alt}
        src={l.src}
        alt={l.alt}
        loading="lazy"
        className={`object-contain shrink-0 ${
          compact ? "h-7 w-7 sm:h-8 sm:w-8" : "h-9 w-9 lg:h-11 lg:w-11"
        }`}
      />
    ))}
  </div>
);

const BrandText = ({ compact = false }: { compact?: boolean }) => (
  <div className={compact ? "text-center" : "text-left"}>
    <p
      className={`font-heading font-bold leading-tight text-foreground ${
        compact ? "text-base" : "text-lg lg:text-xl"
      }`}
    >
      e Career Center <span className="text-primary">PEI</span>
    </p>
    <p
      className={`text-muted-foreground leading-tight ${
        compact ? "text-[11px]" : "text-xs lg:text-sm"
      }`}
    >
      Pusat Ekosistem Inovasi
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

  const groups: Group[] = [
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
        ...(user ? [{ label: "Dashboard", path: "/dashboard" }] : []),
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

  const extraLinks: Item[] = [
    { label: "Admin", path: "/admin", show: hasRole("admin") },
  ].filter((i) => i.show);

  const roleLabel = roles.includes("admin")
    ? "Admin"
    : roles.includes("alumni")
    ? "Alumni"
    : roles.includes("mitra")
    ? "Mitra"
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
        <Button
          size="sm"
          className={full ? "flex-1" : ""}
          onClick={() => {
            navigate("/auth");
            setOpen(false);
          }}
        >
          Daftar
        </Button>
      </div>
    );

  return (
    <header className="sticky top-0 z-50">
      {/* ---------- Row 1: Branding ---------- */}
      <div className="bg-background/95 backdrop-blur-xl">
        {/* Desktop / tablet */}
        <div className="hidden md:grid container mx-auto grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3">
          <div className="flex items-center min-w-0">
            {!loading && user && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted min-w-0">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs lg:text-sm text-foreground/80 truncate max-w-[120px] lg:max-w-[160px]">
                  {user.user_metadata?.full_name || user.email}
                </span>
                <Badge className="text-[10px] px-2 py-0 shrink-0">{roleLabel}</Badge>
              </div>
            )}
          </div>

          <Link
            to="/"
            className="flex items-center justify-center gap-4 lg:gap-6 min-w-0"
          >
            <LogoStrip />
            <BrandText />
          </Link>

          <div className="flex items-center justify-end">
            <AuthActions />
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden px-3 pt-2 pb-2">
          <div className="flex items-center gap-2">
            <button
              aria-label={open ? "Tutup menu" : "Buka menu"}
              className="p-2 text-foreground shrink-0"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
            <Link to="/" className="flex-1 min-w-0">
              <LogoStrip compact />
            </Link>
            <div className="shrink-0">
              {!loading && user ? (
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Keluar</span>
                </Button>
              ) : (
                <Button size="sm" onClick={() => navigate("/auth")}>
                  Masuk
                </Button>
              )}
            </div>
          </div>
          <Link to="/" className="block mt-1.5">
            <BrandText compact />
          </Link>
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
      {open && (
        <div className="md:hidden bg-background border-t border-border/60 max-h-[75vh] overflow-y-auto animate-fade-up">
          <div className="container mx-auto px-3 py-2 flex flex-col">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                location.pathname === "/" ? "text-primary bg-accent" : "text-foreground"
              }`}
            >
              <Home className="h-4 w-4" />
              Beranda
            </Link>
            {groups.map((g) => {
              const Icon = g.icon;
              return (
                <Collapsible key={g.label}>
                  <CollapsibleTrigger className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground [&[data-state=open]>svg:last-child]:rotate-180">
                    <Icon className="h-4 w-4" />
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
                            ? "text-primary"
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
            {extraLinks.map((i) => (
              <Link
                key={i.path}
                to={i.path}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground"
              >
                <LayoutGrid className="h-4 w-4" />
                {i.label}
              </Link>
            ))}
            <div className="mt-2 pt-2 border-t border-border">
              {!loading && user && (
                <div className="flex items-center gap-2 px-3 pb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                  <Badge className="text-[10px] px-2 py-0">{roleLabel}</Badge>
                </div>
              )}
              <AuthActions full />
            </div>
          </div>
        </div>
      )}

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
