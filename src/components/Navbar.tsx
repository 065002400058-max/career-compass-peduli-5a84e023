import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, loading, hasRole, roles } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navItems = [
    { label: "Beranda", path: "/", show: true },
    { label: "Dashboard", path: "/dashboard", show: !!user },
    { label: "Lowongan", path: "/jobs", show: true },
    { label: "Alumni", path: "/alumni", show: true },
    { label: "Mitra", path: "/partners", show: true },
    { label: "Event", path: "/events", show: true },
    { label: "Tes CBT", path: "/cbt", show: true },
    { label: "Psikotes", path: "/psikotes", show: true },
    { label: "Kampus", path: "/universities", show: true },
    { label: "Beasiswa", path: "/beasiswa", show: true },
    { label: "Tracer Study", path: "/tracer", show: !!user },
    { label: "Admin", path: "/admin", show: hasRole("admin") },
  ].filter((item) => item.show);

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

  return (
    <nav className="nav-glass sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg gradient-bg flex items-center justify-center">
            <span className="text-primary-foreground font-heading font-bold text-sm">SC</span>
          </div>
          <span className="font-heading font-bold text-foreground hidden sm:block">
            Career Center <span className="text-primary">PEDULI</span>
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {item.label}
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
        <div className="lg:hidden nav-glass border-t border-border/50 animate-fade-up">
          <div className="container mx-auto py-4 px-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {item.label}
              </Link>
            ))}
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
