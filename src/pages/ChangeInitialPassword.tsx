import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, Lock, Eye, EyeOff, ShieldCheck, Check, X } from "lucide-react";

const rules = [
  { label: "Minimal 8 karakter", test: (v: string) => v.length >= 8 },
  { label: "Ada huruf besar", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Ada huruf kecil", test: (v: string) => /[a-z]/.test(v) },
  { label: "Ada angka", test: (v: string) => /\d/.test(v) },
];

const ChangeInitialPassword = () => {
  const { user, loading, mustChangePassword, roles, refreshProfileFlags } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">
        Memuat...
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!mustChangePassword) return <Navigate to="/" replace />;

  const allValid = rules.every((r) => r.test(password));
  const matched = password.length > 0 && password === confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) return toast.error("Password belum memenuhi seluruh syarat keamanan.");
    if (!matched) return toast.error("Konfirmasi password tidak sama.");

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSaving(false);
      return toast.error(`Gagal mengganti password: ${error.message}`);
    }

    const { error: rpcError } = await supabase.rpc("clear_must_change_password");
    if (rpcError) {
      setSaving(false);
      return toast.error(`Password diganti, namun status akun gagal diperbarui: ${rpcError.message}`);
    }

    await refreshProfileFlags();
    toast.success("Password berhasil diganti. Selamat menggunakan Career Center PEDULI!");
    navigate(roles.includes("admin") ? "/admin" : "/dashboard", { replace: true });
    setSaving(false);
  };

  return (
    <div className="min-h-screen gradient-bg-subtle flex items-center justify-center px-4 py-10">
      <div className="glass-card rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="h-14 w-14 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <KeyRound className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Ganti Password Awal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Untuk keamanan akun, buat password baru Anda sebelum menggunakan fitur lainnya.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Password Baru *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={show ? "text" : "password"}
                placeholder="Password baru"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Konfirmasi Password Baru *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={show ? "text" : "password"}
                placeholder="Ulangi password baru"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <ul className="space-y-1.5 rounded-xl border border-border bg-muted/40 p-3">
            {rules.map((r) => {
              const ok = r.test(password);
              return (
                <li key={r.label} className={`flex items-center gap-2 text-xs ${ok ? "text-primary" : "text-muted-foreground"}`}>
                  {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  {r.label}
                </li>
              );
            })}
            <li className={`flex items-center gap-2 text-xs ${matched ? "text-primary" : "text-muted-foreground"}`}>
              {matched ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              Konfirmasi password sama
            </li>
          </ul>

          <Button type="submit" className="w-full" disabled={saving || !allValid || !matched}>
            {saving ? "Menyimpan..." : "Simpan Password Baru"}
          </Button>
        </form>

        <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5 font-medium text-foreground mb-1">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Password sementara hanya sekali pakai
          </p>
          Setelah diganti, password sementara dari email tidak dapat digunakan lagi. Jangan membagikan password Anda
          kepada siapa pun.
        </div>
      </div>
    </div>
  );
};

export default ChangeInitialPassword;
