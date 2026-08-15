import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, User, ChevronDown } from "lucide-react";
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
import duLogo from "@/assets/du-logo-t.png.asset.json";
import yayasanLogo from "@/assets/yayasan-logo-t.png.asset.json";
import trisaktiLogo from "@/assets/trisakti-logo-t.png.asset.json";
import diktiLogo from "@/assets/dikti-logo-t.png.asset.json";

const logos = [
  { src: duLogo.url, alt: "Pesantren Daarul 'Uluum Lido" },
  { src: yayasanLogo.url, alt: "Yayasan Salsabila Lido" },
  { src: trisaktiLogo.url, alt: "Universitas Trisakti" },
  { src: diktiLogo.url, alt: "Diktisaintek Berdampak" },
];

type Item = { label: string; path: string; show?: boolean };
type Group = { label: string; items: Item[] };

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
      items: [
        { label: "Lowongan Kerja", path: "/jobs" },
        { label: "Beasiswa", path: "/beasiswa" },
        { label: "Event Karier", path: "/events" },
      ],
    },
    {
      label: "Layanan",
      items: [
        { label: "Tes CBT", path: "/cbt" },
        { label: "Konseling", path: "/psikotes" },
        { label: "Jelajahi Kampus", path: "/universities" },
        ...(user ? [{ label: "Dashboard", path: "/dashboard" }] : []),
      ],
    },
    {
      label: "Jejaring",
      items: [
        { label: "Alumni", path: "/alumni" },
        { label: "Mitra Perusahaan", path: "/partners" },
        ...(user ? [{ label: "Tracer Study", path: "/tracer" }] : []),
      ],
    },
    {
      label: "Tentang",
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

  const roleVariant = roles.includes("admin")
    ? "destructive"
    : roles.includes("mitra")
    ? "secondary"
    : "default";

  const linkCls = (active: boolean) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  return (
    <nav className="nav-glass sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4 gap-2">
        <Link to="/" className="flex items-center gap-1.5 min-w-0">
          {logos.map((l) => (
            <img
              key={l.alt}
              src={l.src}
              alt={l.alt}
              className="h-9 w-9 md:h-11 md:w-11 object-contain shrink-0"
            />
          ))}
          <span className="font-heading font-bold text-foreground text-[11px] leading-tight sm:text-sm md:text-base truncate">
            Career Center <span className="text-primary">PEDULI</span>
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden lg:flex items-center gap-0.5">
          <Link to="/" className={linkCls(location.pathname === "/")}>
            Beranda
          </Link>
          {groups.map((g) => {
            const active = g.items.some((i) => location.pathname === i.path.split("#")[0]);
            return (
              <DropdownMenu key={g.label}>
                <DropdownMenuTrigger className={`${linkCls(active)} flex items-center gap-1 outline-none`}>
                  {g.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-popover z-50">
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
            <Link key={i.path} to={i.path} className={linkCls(location.pathname === i.path)}>
              {i.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          {!loading &&
            (user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground max-w-[120px] truncate">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                  <Badge variant={roleVariant as any} className="text-[10px] px-1.5 py-0">
                    {roleLabel}
                  </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-1" />
                  Keluar
                </Button>
              </div>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                  Masuk
                </Button>
                <Button size="sm" onClick={() => navigate("/auth")}>
                  Daftar
                </Button>
              </>
            ))}
        </div>

        {/* Mobile toggle */}
        <button className="lg:hidden p-2 text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden nav-glass border-t border-border/50 animate-fade-up max-h-[80vh] overflow-y-auto">
          <div className="container mx-auto py-4 px-4 flex flex-col gap-1">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium ${linkCls(location.pathname === "/")}`}
            >
              Beranda
            </Link>
            {groups.map((g) => (
              <div key={g.label} className="mt-1">
                <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                  {g.label}
                </p>
                {g.items.map((i) => (
                  <Link
                    key={i.path}
                    to={i.path}
                    onClick={() => setOpen(false)}
                    className={`block px-6 py-2 rounded-lg text-sm ${linkCls(
                      location.pathname === i.path.split("#")[0]
                    )}`}
                  >
                    {i.label}
                  </Link>
                ))}
              </div>
            ))}
            {extraLinks.length > 0 && (
              <div className="mt-1">
                <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                  Akun
                </p>
                {extraLinks.map((i) => (
                  <Link
                    key={i.path}
                    to={i.path}
                    onClick={() => setOpen(false)}
                    className={`block px-6 py-2 rounded-lg text-sm ${linkCls(location.pathname === i.path)}`}
                  >
                    {i.label}
                  </Link>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border">
              {user ? (
                <>
                  <div className="flex items-center gap-1.5 px-3 py-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate">
                      {user.user_metadata?.full_name || user.email}
                    </span>
                    <Badge variant={roleVariant as any} className="text-[10px] px-1.5 py-0">
                      {roleLabel}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      handleSignOut();
                      setOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Keluar
                  </Button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      navigate("/auth");
                      setOpen(false);
                    }}
                  >
                    Masuk
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      navigate("/auth");
                      setOpen(false);
                    }}
                  >
                    Daftar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
