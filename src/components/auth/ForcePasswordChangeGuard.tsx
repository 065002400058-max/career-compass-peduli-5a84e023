import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/** Route yang tetap boleh diakses saat pengguna wajib mengganti password. */
const ALLOWED = ["/ganti-password-awal", "/reset-password", "/auth"];

const ForcePasswordChangeGuard = () => {
  const { user, loading, mustChangePassword } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user || !mustChangePassword) return;
    if (ALLOWED.includes(location.pathname)) return;
    navigate("/ganti-password-awal", { replace: true });
  }, [loading, user, mustChangePassword, location.pathname, navigate]);

  return null;
};

export default ForcePasswordChangeGuard;
