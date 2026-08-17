import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SantriDashboard from "@/components/santri/SantriDashboard";

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
  if (hasRole("admin")) return <Navigate to="/admin" replace />;

  return <SantriDashboard />;
};

export default Dashboard;
