import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Mail, Lock, ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";

const Auth = () => {
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });

    if (error) {
      const msg = error.message.toLowerCase();
      toast({
        title: "Login Gagal",
        description: msg.includes("invalid login")
          ? "Email atau password salah. Akun hanya dapat digunakan setelah diundang admin."
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Login Berhasil", description: "Selamat datang kembali!" });
      navigate("/", { replace: true });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email Terkirim", description: "Link reset password telah dikirim ke email Anda." });
    }
    setLoading(false);
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-screen gradient-bg-subtle flex items-center justify-center px-4">
        <div className="glass-card rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="h-14 w-14 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Lupa Password</h1>
            <p className="text-muted-foreground text-sm mt-1">Masukkan email Anda untuk menerima link reset password.</p>
          </div>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Mengirim..." : "Kirim Link Reset"}</Button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setIsForgotPassword(false)} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg-subtle flex items-center justify-center px-4 py-10">
      <div className="glass-card rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="h-14 w-14 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-heading font-bold text-lg">SC</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Masuk ke Akun</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Masuk untuk mengakses Smart Career Center PEDULI
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs text-primary hover:underline">
              Lupa password?
            </button>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Memproses..." : (<><LogIn className="h-4 w-4 mr-2" />Masuk</>)}
          </Button>
        </form>

        <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5 font-medium text-foreground mb-1">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Akun berbasis undangan
          </p>
          Pendaftaran publik ditutup. Hanya email yang telah didaftarkan admin yang dapat mengaktifkan akun.
          Silakan hubungi admin Career Center PEDULI untuk mendapatkan undangan, lalu buat password melalui link
          aktivasi yang dikirim ke email Anda.
        </div>
      </div>
    </div>
  );
};

export default Auth;
