import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock, MailCheck, ShieldAlert, ShieldCheck,
} from "lucide-react";

type Invite = { email: string; full_name: string | null; role: "santri" | "alumni" | "admin" };
type State = "loading" | "ready" | "invalid" | "expired" | "used" | "revoked";

const ROLE_LABEL: Record<Invite["role"], string> = {
  santri: "Santri",
  alumni: "Alumni",
  admin: "Admin",
};

const ROLE_ROUTE: Record<Invite["role"], string> = {
  santri: "/dashboard",
  alumni: "/dashboard",
  admin: "/admin",
};

const MESSAGE: Record<Exclude<State, "loading" | "ready">, string> = {
  invalid: "Link undangan tidak valid.",
  expired: "Link undangan telah kedaluwarsa. Silakan hubungi Admin untuk meminta undangan baru.",
  used: "Undangan ini sudah digunakan. Silakan masuk menggunakan akun Anda.",
  revoked: "Link undangan tidak valid.",
};

const Activate = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();

  const [state, setState] = useState<State>("loading");
  const [invite, setInvite] = useState<Invite | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const verify = async () => {
      if (!token) return setState("invalid");
      const { data } = await supabase.functions.invoke("activate-invitation", {
        body: { action: "verify", token },
      });
      if (!active) return;
      const res = (data ?? {}) as { code?: string; invitation?: Invite };
      if (res.code === "ok" && res.invitation) {
        setInvite(res.invitation);
        setState("ready");
      } else if (res.code === "expired" || res.code === "used" || res.code === "revoked") {
        setState(res.code as State);
      } else {
        setState("invalid");
      }
    };
    verify();
    return () => {
      active = false;
    };
  }, [token]);

  const rules = [
    { ok: password.length >= 8, text: "Minimal 8 karakter" },
    { ok: /[A-Za-z]/.test(password), text: "Mengandung huruf" },
    { ok: /[0-9]/.test(password), text: "Mengandung angka" },
    { ok: password.length > 0 && password === confirm, text: "Konfirmasi password sama" },
  ];
  const valid = rules.every((r) => r.ok);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !valid || !invite) return;
    setSubmitting(true);
    setError(null);

    const { data } = await supabase.functions.invoke("activate-invitation", {
      body: { action: "activate", token, password },
    });
    const res = (data ?? {}) as { code?: string; role?: Invite["role"] };

    if (res.code !== "ok") {
      if (res.code === "expired" || res.code === "used" || res.code === "invalid" || res.code === "revoked") {
        setState(res.code as State);
      } else if (res.code === "weak_password") {
        setError("Password belum memenuhi persyaratan.");
      } else {
        setError("Aktivasi gagal. Silakan coba kembali atau hubungi Admin.");
      }
      setSubmitting(false);
      return;
    }

    // Buat session otomatis dengan password yang baru dibuat
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: invite.email,
      password,
    });

    if (signInError) {
      toast.success("Akun Anda berhasil diaktifkan. Silakan masuk menggunakan password yang baru dibuat.");
      navigate("/auth", { replace: true, state: { email: invite.email } });
      return;
    }

    // Peran resmi dibaca dari database, bukan dari frontend
    const { data: sessionUser } = await supabase.auth.getUser();
    let role: Invite["role"] | null = null;
    if (sessionUser.user) {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sessionUser.user.id);
      const roles = (roleRows ?? []).map((r) => r.role as string);
      role = (["admin", "alumni", "santri"] as const).find((r) => roles.includes(r)) ?? null;
    }

    toast.success("Akun berhasil diaktifkan. Selamat datang di Career Center PEDULI!");
    navigate(role ? ROLE_ROUTE[role] : "/profil", { replace: true });
  };

  if (state === "loading") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memverifikasi undangan...
      </div>
    );
  }

  if (state !== "ready" || !invite) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
        <div className="glass-card rounded-2xl p-8 w-full max-w-md text-center">
          <div className="h-14 w-14 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="font-heading text-xl font-bold text-foreground">Undangan Tidak Dapat Diproses</h1>
          <p className="text-sm text-muted-foreground mt-2">{MESSAGE[state as Exclude<State, "loading" | "ready">]}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild>
              <Link to="/auth">Kembali ke Halaman Masuk</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/tentang">Hubungi Admin</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] gradient-bg-subtle flex items-center justify-center px-4 py-10">
      <div className="glass-card rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="h-14 w-14 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <MailCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Aktifkan Akun Anda</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Undangan Anda telah berhasil diverifikasi. Buat password untuk mengaktifkan akun Career Center PEDULI.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm space-y-1 mb-5">
          <p className="flex justify-between gap-3">
            <span className="text-muted-foreground">Nama</span>
            <span className="font-medium text-foreground text-right">{invite.full_name || "-"}</span>
          </p>
          <p className="flex justify-between gap-3">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium text-foreground text-right break-all">{invite.email}</span>
          </p>
          <p className="flex justify-between gap-3">
            <span className="text-muted-foreground">Peran</span>
            <span className="font-medium text-foreground">{ROLE_LABEL[invite.role]}</span>
          </p>
          <p className="text-[11px] text-muted-foreground pt-1">
            Email dan peran ditetapkan oleh Admin dan tidak dapat diubah.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Password Baru *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                placeholder="Password baru"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Konfirmasi Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="pl-10"
                placeholder="Ulangi password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          <ul className="space-y-1">
            {rules.map((r) => (
              <li
                key={r.text}
                className={`flex items-center gap-1.5 text-[11px] ${r.ok ? "text-primary" : "text-muted-foreground"}`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {r.text}
              </li>
            ))}
          </ul>

          {error && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting || !valid}>
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mengaktifkan...</>
            ) : (
              <><ShieldCheck className="h-4 w-4 mr-2" /> Aktifkan dan Masuk</>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/auth" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Halaman Masuk
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Activate;
