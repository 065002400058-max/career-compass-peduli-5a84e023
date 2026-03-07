import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  trend?: string;
}

const StatsCard = ({ icon: Icon, value, label, trend }: StatsCardProps) => (
  <div className="glass-card-hover rounded-xl p-6">
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
  </div>
);

export default StatsCard;
