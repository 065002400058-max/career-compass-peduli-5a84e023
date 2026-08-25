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
import { Eye, EyeOff, Info, Loader2, MailX, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Logo gabungan resmi enam institusi/mitra (file: public/logo-gabungan.png)
const logo = "/logo-gabungan.png";

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

  // Setelah autentikasi berhasil & akses diizinkan backend → arahkan sesuai role database
  useEffect(() => {
    if (authLoading || !user || accessDenied) return;
    navigate(roles.includes("admin") ? "/admin" : "/dashboard", { replace: true });
  }, [authLoading, user, accessDenied, roles, navigate]);

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

  const deniedTitle =
    accessDenied === "rate_limited"
      ? "Terlalu Banyak Percobaan"
      : accessDenied === "error"
        ? "Terjadi Kesalahan"
        : accessDenied === "inactive"
          ? "Akses Dinonaktifkan"
          : accessDenied === "expired"
            ? "Akses Kedaluwarsa"
            : "Akun Belum Terdaftar";

  const deniedText =
    accessDenied === "rate_limited"
      ? "Terlalu banyak percobaan login. Silakan tunggu beberapa saat lalu coba lagi."
      : accessDenied === "error"
        ? "Terjadi kesalahan saat memeriksa akses Anda. Silakan coba lagi."
        : accessDenied === "inactive"
          ? "Akses akun Anda saat ini dinonaktifkan oleh administrator. Silakan hubungi administrator."
          : accessDenied === "expired"
            ? "Masa akses akun Anda sudah berakhir. Silakan hubungi administrator."
            : "Akun Anda belum terdaftar pada Smart Career Center PEDULI. Silakan hubungi administrator.";

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
          <h1 className="text-2xl font-heading font-bold text-foreground">Selamat Datang</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Masuk ke Smart Career Center PEDULI
          </p>
        </div>

        {/* Satu-satunya jalur login: Google — email harus sudah didaftarkan admin */}
        <Button type="button" variant="outline" className="w-full h-11" onClick={handleGoogle} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <GoogleIcon />}
          Masuk dengan Google
        </Button>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Gunakan akun Google dengan email yang telah didaftarkan oleh administrator.
        </p>

        {/* Jalur khusus Admin: email + password (tersembunyi secara default) */}
        <div className="mt-5">
          {!showAdmin ? (
            <button
              type="button"
              onClick={() => setShowAdmin(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Login Admin
            </button>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-3">
              <p className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Login Administrator
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="admin-email" className="text-[11px]">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-password" className="text-[11px]">Password</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 h-10" disabled={adminLoading}>
                  {adminLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Masuk
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10"
                  onClick={() => setShowAdmin(false)}
                  disabled={adminLoading}
                >
                  Tutup
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Sistem tertutup: pendaftaran publik ditutup. Login Google hanya
              memverifikasi identitas — izin akses ditentukan oleh daftar akses
              yang dikelola administrator.
            </p>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Belum punya akses? Hubungi administrator pesantren.
          </p>
          <p className="text-xs text-center">
            <Link to="/" className="text-primary hover:underline">← Kembali ke Beranda</Link>
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
            <AlertDialogTitle className="text-center text-lg">{deniedTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-center leading-relaxed">
              {deniedText}
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
