import { ChevronDown } from "lucide-react";
import duLogo from "@/assets/du-logo-t.png.asset.json";
import { assetUrl } from "@/lib/assetUrl";

export interface AdminNavItem {
  key: string;
  label: string;
  icon: any;
}

interface Props {
  main: AdminNavItem[];
  tools: AdminNavItem[];
  active: string;
  onSelect: (key: string) => void;
  toolsOpen: boolean;
  onToggleTools: () => void;
}

const AdminSidebar = ({ main, tools, active, onSelect, toolsOpen, onToggleTools }: Props) => {
  const Item = ({ item, trailing, onClick }: { item: AdminNavItem; trailing?: React.ReactNode; onClick?: () => void }) => {
    const isActive = active === item.key;
    return (
      <button
        onClick={onClick ?? (() => onSelect(item.key))}
        className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
          isActive ? "bg-accent text-primary font-medium" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        }`}
      >
        <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} strokeWidth={1.8} />
        <span className="truncate flex-1 text-left">{item.label}</span>
        {trailing}
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="px-4 py-4 border-b border-border flex items-center gap-2.5">
        <img src={assetUrl(duLogo.url)} alt="Career Center PEDULI" className="h-9 w-9 object-contain shrink-0" />
        <div className="leading-tight">
          <p className="text-[10px] tracking-wide text-muted-foreground font-medium">CAREER CENTER</p>
          <p className="font-heading text-base font-bold text-primary leading-none">PEDULI</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        <div>
          <p className="px-2.5 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/80">Administrasi</p>
          <div className="space-y-0.5">
            {main.map((i) => (
              <Item key={i.key} item={i} />
            ))}
            <Item
              item={{ key: "__tools", label: "Lainnya", icon: tools[0]?.icon }}
              onClick={onToggleTools}
              trailing={<ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${toolsOpen ? "rotate-180" : ""}`} />}
            />
          </div>
        </div>

        {toolsOpen && (
          <div>
            <p className="px-2.5 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/80">Lainnya</p>
            <div className="space-y-0.5">
              {tools.map((i) => (
                <Item key={i.key} item={i} />
              ))}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};

export default AdminSidebar;
