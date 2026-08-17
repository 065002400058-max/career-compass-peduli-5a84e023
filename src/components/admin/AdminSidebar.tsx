import { PanelLeftClose } from "lucide-react";
import duLogo from "@/assets/du-logo-t.png.asset.json";
import { assetUrl } from "@/lib/assetUrl";

export interface AdminNavItem {
  key: string;
  label: string;
  icon: any;
  badge?: number;
}

export interface AdminNavGroup {
  label?: string;
  items: AdminNavItem[];
}

interface Props {
  groups: AdminNavGroup[];
  active: string;
  onSelect: (key: string) => void;
  onCollapse?: () => void;
}

const AdminSidebar = ({ groups, active, onSelect, onCollapse }: Props) => (
  <div className="h-full flex flex-col bg-card">
    {/* Brand */}
    <div className="h-[60px] px-4 border-b border-border flex items-center gap-2.5">
      <img src={assetUrl(duLogo.url)} alt="Career Center PEDULI" className="h-8 w-8 object-contain shrink-0" />
      <div className="leading-tight">
        <p className="text-[11px] text-muted-foreground">Career Center</p>
        <p className="font-heading text-[15px] font-bold text-primary leading-none">PEDULI</p>
      </div>
    </div>

    <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3.5">
      {groups.map((g, gi) => (
        <div key={g.label ?? gi}>
          {g.label && (
            <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {g.label}
            </p>
          )}
          <div className="space-y-0.5">
            {g.items.map((item) => {
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onSelect(item.key)}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors ${
                    isActive
                      ? "bg-accent/70 text-primary font-medium"
                      : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <item.icon className={`h-[17px] w-[17px] shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.7} />
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {!!item.badge && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>

    <button
      onClick={onCollapse}
      className="h-11 border-t border-border flex items-center gap-2 px-4 text-[12px] text-muted-foreground hover:text-foreground"
    >
      <PanelLeftClose className="h-4 w-4" /> Collapse Menu
    </button>
  </div>
);

export default AdminSidebar;
