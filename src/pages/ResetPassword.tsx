import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [show, setShow] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery event from URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    if (type === "recovery") {
      setIsRecovery(true);
    }

    // Also listen for auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Password tidak cocok!", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "Password minimal 6 karakter.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Password berhasil diubah! Silakan login." });
      navigate("/auth");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-bg-subtle flex items-center justify-center px-4">
      <div className="glass-card rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Reset Password</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isRecovery ? "Masukkan password baru Anda." : "Link reset tidak valid atau sudah kedaluwarsa."}
          </p>
        </div>

        {isRecovery ? (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={show ? "text" : "password"}
                placeholder="Password Baru"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Sembunyikan password" : "Tampilkan password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={show ? "text" : "password"}
                placeholder="Konfirmasi Password Baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Sembunyikan password" : "Tampilkan password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memproses..." : "Ubah Password"}
            </Button>
          </form>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Silakan minta link reset password baru dari halaman login.
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/auth" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
