import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SantriDashboard from "@/components/santri/SantriDashboard";
import AlumniDashboard from "@/components/alumni/AlumniDashboard";

const Dashboard = () => {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">
        Memuat dashboard...
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (hasRole("admin")) return (
    <div className="space-y-6">
      <SantriDashboard />
      <div className="container mx-auto px-4">
        <div className="h-px bg-border w-full" />
      </div>
      <AlumniDashboard />
    </div>
  );
  if (hasRole("alumni")) return <AlumniDashboard />;


  return <SantriDashboard />;
};

export default Dashboard;
