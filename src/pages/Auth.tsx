import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, EyeOff, Info, Loader2, Lock, LogIn, Mail, MailX, ShieldX } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
// Logo gabungan resmi enam institusi/mitra (file: public/logo-gabungan.png)
const logo = "/logo-gabungan.png";

const emailSchema = z.string().trim().email("Format email tidak valid");
const passwordSchema = z.string().min(6, "Password minimal 6 karakter");

const LOCK_KEY = "login_lock";
const LOCK_THRESHOLD = 5;
const LOCK_MS = 5 * 60 * 1000;

type LockState = { fails: number; until: number | null };

const readLock = (email: string): LockState => {
  try {
    const raw = localStorage.getItem(`${LOCK_KEY}:${email}`);
    if (!raw) return { fails: 0, until: null };
    const parsed = JSON.parse(raw) as LockState;
    if (parsed.until && parsed.until < Date.now()) return { fails: 0, until: null };
    return parsed;
  } catch {
    return { fails: 0, until: null };
  }
};

const writeLock = (email: string, state: LockState) =>
  localStorage.setItem(`${LOCK_KEY}:${email}`, JSON.stringify(state));

const clearLock = (email: string) => localStorage.removeItem(`${LOCK_KEY}:${email}`);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, roles, accessDenied, clearAccessDenied } = useAuth();
  const [loading, setLoading] = useState(false);
  const [lockLeft, setLockLeft] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  // Setelah autentikasi berhasil & akses diizinkan backend → arahkan sesuai role database
  useEffect(() => {
    if (authLoading || !user || accessDenied) return;
    navigate(roles.includes("admin") ? "/admin" : "/dashboard", { replace: true });
  }, [authLoading, user, accessDenied, roles, navigate]);

  useEffect(() => {
    if (lockLeft <= 0) return;
    const t = setTimeout(() => setLockLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockLeft]);

  // Bersihkan parameter OAuth sensitif dari URL setelah callback diproses
  useEffect(() => {
    if (authLoading) return;
    const url = new URL(window.location.href);
    const sensitive = ["code", "state", "error", "error_description", "error_code", "provider_token", "provider_refresh_token"];
    let dirty = false;
    for (const key of sensitive) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        dirty = true;
      }
    }
    const hashDirty = /access_token|refresh_token|error=/.test(window.location.hash);
    if (dirty || hashDirty) {
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, [authLoading]);

  const handleGoogle = async () => {
    // Preview editor berjalan di dalam iframe. Google menolak halaman OAuth
    // dimuat di dalam iframe (X-Frame-Options: DENY → ERR_BLOCKED_BY_RESPONSE),
    // jadi dari dalam iframe alur login dibuka di tab top-level baru.
    if (window.self !== window.top) {
      const win = window.open(`${window.location.origin}/auth`, "_blank", "noopener,noreferrer");
      toast({
        title: "Login dibuka di tab baru",
        description: win
          ? "Silakan lanjutkan \"Masuk dengan Google\" di tab yang baru terbuka."
          : "Pop-up diblokir browser. Izinkan pop-up untuk situs ini, lalu coba lagi.",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (result.redirected) return; // full-page redirect menuju Google
      if (result.error) throw result.error;
      setLoading(false);
    } catch {
      // Popup gagal/diblokir → fallback: full-page redirect resmi provider Google
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth` },
      });
      if (error) {
        toast({
          title: "Login Google Gagal",
          description: "Pop-up diblokir dan pengalihan gagal. Izinkan pop-up lalu coba lagi.",
          variant: "destructive",
        });
        setLoading(false);
      }
      // Tanpa error → browser redirect penuh ke Google; tombol dibiarkan loading
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = formData.email.trim().toLowerCase();

    const lock = readLock(email);
    if (lock.until && lock.until > Date.now()) {
      setLockLeft(Math.ceil((lock.until - Date.now()) / 1000));
      toast({
        title: "Terlalu banyak percobaan",
        description: "Silakan coba lagi beberapa menit lagi.",
        variant: "destructive",
      });
      return;
    }

    try {
      emailSchema.parse(email);
      passwordSchema.parse(formData.password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Validasi Gagal", description: error.errors[0].message, variant: "destructive" });
        return;
      }
    }

    setLoading(true);

    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password: formData.password,
    });

    if (error) {
      const fails = lock.fails + 1;
      const until = fails >= LOCK_THRESHOLD ? Date.now() + LOCK_MS : null;
      writeLock(email, { fails, until });
      if (until) setLockLeft(Math.ceil(LOCK_MS / 1000));

      toast({
        title: "Login Gagal",
        description: until
          ? "Terlalu banyak percobaan gagal. Akun dikunci 5 menit."
          : "Email atau password salah.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    clearLock(email);

    // Legacy: akun undangan lama yang wajib ganti password
    const metaFlag = Boolean(signInData.user?.user_metadata?.must_change_password);
    let profileFlag = false;
    if (signInData.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", signInData.user.id)
        .maybeSingle();
      profileFlag = Boolean(profile?.must_change_password);
    }
    if (metaFlag || profileFlag) {
      toast({
        title: "Ganti password dulu",
        description: "Demi keamanan, ganti password sementara Anda sebelum melanjutkan.",
      });
      setLoading(false);
      navigate("/ganti-password", { replace: true });
      return;
    }

    toast({ title: "Login Berhasil", description: "Selamat datang kembali!" });
    // Pengalihan sesuai role ditangani useEffect di atas setelah pemeriksaan akses backend selesai
  };

  const lockSecondsLeft = lockLeft;

  return (
    <div className="min-h-screen gradient-bg-subtle flex items-center justify-center px-4 py-10">
      <div className="glass-card rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={logo}
            alt="Smart Career Center PEDULI — Pesantren Daarul 'Uluum Lido, Yayasan Salsabila, Universitas Trisakti, Diktisaintek Berdampak, BiMA, Tut Wuri Handayani"
            className="h-11 w-auto max-w-full mx-auto mb-4 object-contain"
            loading="lazy"
          />
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Selamat Datang
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Masuk ke Smart Career Center PEDULI
          </p>
        </div>

        {/* Login utama: Google — email harus sudah didaftarkan admin */}
        <Button type="button" variant="outline" className="w-full h-11" onClick={handleGoogle} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <GoogleIcon />}
          Masuk dengan Google
        </Button>
        <p className="text-[11px] text-muted-foreground text-center mt-2 mb-4">
          Gunakan akun Google dengan email yang telah didaftarkan oleh administrator.
        </p>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="bg-card px-2 text-muted-foreground">atau masuk dengan email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                className="pl-9"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-9 pr-10"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || lockSecondsLeft > 0}>
            {loading ? (
              "Memproses..."
            ) : lockSecondsLeft > 0 ? (
              `Tunggu ${lockSecondsLeft}s`
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                Masuk
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Pendaftaran publik ditutup. Hanya email yang telah didaftarkan
              administrator yang dapat masuk.
            </p>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Belum punya akses? Hubungi administrator pesantren.
          </p>
          <p className="text-xs text-center">
            <Link to="/" className="text-primary hover:underline">
              ← Kembali ke Beranda
            </Link>
          </p>
        </div>
      </div>

      {/* Dialog penolakan akses — setelah autentikasi Google, email dicek di backend */}
      <AlertDialog open={!!accessDenied} onOpenChange={(o) => !o && clearAccessDenied()}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
              {accessDenied === "not_registered"
                ? <MailX className="h-7 w-7 text-destructive" />
                : <ShieldX className="h-7 w-7 text-destructive" />}
            </div>
            <AlertDialogTitle className="text-center text-lg">
              {accessDenied === "not_registered" ? "Maaf, Email Belum Terdaftar" : "Akses Tidak Aktif"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center leading-relaxed">
              {accessDenied === "not_registered"
                ? "Email Google yang Anda gunakan belum terdaftar pada Smart Career Center PEDULI. Silakan hubungi administrator untuk mendapatkan akses."
                : accessDenied === "rate_limited"
                  ? "Terlalu banyak percobaan login. Silakan tunggu beberapa saat lalu coba lagi."
                  : accessDenied === "error"
                    ? "Terjadi kesalahan saat memeriksa akses Anda. Silakan coba lagi."
                    : "Akses akun Anda sedang tidak aktif atau telah berakhir. Silakan hubungi administrator Smart Career Center PEDULI."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="w-full" onClick={clearAccessDenied}>
              Kembali ke Halaman Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Auth;
