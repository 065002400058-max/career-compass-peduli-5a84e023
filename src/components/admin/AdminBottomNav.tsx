import { Home, Users, LayoutGrid, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AdminBottomNavProps {
  active: "beranda" | "santri" | "layanan" | "profil";
  onSantri: () => void;
  onLayanan: () => void;
}

const AdminBottomNav = ({ active, onSantri, onLayanan }: AdminBottomNavProps) => {
  const navigate = useNavigate();

  const items = [
    { key: "beranda", label: "Beranda", icon: Home, action: () => navigate("/") },
    { key: "santri", label: "Santri", icon: Users, action: onSantri },
    { key: "layanan", label: "Layanan", icon: LayoutGrid, action: onLayanan },
    { key: "profil", label: "Profil", icon: User, action: () => navigate("/dashboard") },
  ] as const;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-[0_-2px_12px_-6px_hsl(var(--foreground)/0.15)]">
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const isActive = active === item.key;
          return (
            <li key={item.key}>
              <button
                onClick={item.action}
                className={`w-full flex flex-col items-center gap-1 py-2.5 transition-colors duration-200 active:scale-95 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 1.8} />
                <span className={`text-[11px] ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default AdminBottomNav;
