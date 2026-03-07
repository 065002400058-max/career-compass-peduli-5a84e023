import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Beranda", path: "/" },
  { label: "Dashboard", path: "/dashboard" },
  { label: "Lowongan", path: "/jobs" },
  { label: "Alumni", path: "/alumni" },
  { label: "Mitra", path: "/partners" },
  { label: "Event", path: "/events" },
  { label: "Admin", path: "/admin" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="nav-glass sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg gradient-bg flex items-center justify-center">
            <span className="text-primary-foreground font-heading font-bold text-sm">SC</span>
          </div>
          <span className="font-heading font-bold text-foreground hidden sm:block">Career Center <span className="text-primary">PEDULI</span></span>
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
          <Button variant="outline" size="sm">Masuk</Button>
          <Button size="sm">Daftar</Button>
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
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <Button variant="outline" size="sm" className="flex-1">Masuk</Button>
              <Button size="sm" className="flex-1">Daftar</Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
