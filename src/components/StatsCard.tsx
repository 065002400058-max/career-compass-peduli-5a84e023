import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  trend?: string;
  onClick?: () => void;
}

const StatsCard = ({ icon: Icon, value, label, trend, onClick }: StatsCardProps) => {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`glass-card-hover rounded-xl p-6 text-left w-full ${onClick ? "cursor-pointer hover:-translate-y-0.5 transition-transform" : ""}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        {trend && (
          <span className="text-xs font-medium text-primary bg-accent px-2 py-1 rounded-full">{trend}</span>
        )}
      </div>
      <p className="text-3xl font-heading font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </Comp>
  );
};

export default StatsCard;
