import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, UserPlus, Mail, Lock, User, ArrowLeft, Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"santri" | "alumni">("santri");
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    gender: "Laki-laki",
    birth_date: "",
    origin: "",
    address: "",
    school_origin: "",
    education_level: "SMA/MA",
    major: "",
    university: "",
    graduation_year: "",
    position: "",
    company: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });
      if (error) {
        toast({ title: "Login Gagal", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Login Berhasil", description: "Selamat datang kembali!" });
        navigate("/dashboard");
      }
    } else {
      const meta: Record<string, string> = { full_name: form.full_name, role };
      Object.entries(form).forEach(([k, v]) => {
        if (k !== "full_name" && v && v.toString().trim() !== "") meta[k] = v.toString().trim();
      });
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
        options: {
          data: meta,
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already exists") || (error as { code?: string }).code === "user_already_exists") {
          // Email sudah ada — coba langsung masuk dengan password yang diisi
          const { error: loginErr } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: normalizedPassword,
          });
          if (!loginErr) {
            toast({ title: "Anda sudah terdaftar", description: "Berhasil masuk ke akun Anda." });
            navigate("/dashboard");
          } else {
            toast({
              title: "Email sudah terdaftar",
              description: "Silakan masuk. Jika lupa password, gunakan menu \"Lupa password?\".",
              variant: "destructive",
            });
            setIsLogin(true);
          }
        } else {
          toast({ title: "Registrasi Gagal", description: error.message, variant: "destructive" });
        }
      } else if (data.session) {
        toast({ title: "Registrasi Berhasil", description: "Akun aktif, selamat datang!" });
        navigate("/dashboard");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: normalizedPassword,
        });
        if (signInError) {
          toast({ title: "Registrasi Berhasil", description: "Silakan masuk dengan akun Anda." });
          setIsLogin(true);
        } else {
          toast({ title: "Registrasi Berhasil", description: "Akun aktif, selamat datang!" });
          navigate("/dashboard");
        }
      }

    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
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
      <div className="glass-card rounded-2xl p-8 w-full max-w-2xl">
        <div className="text-center mb-6">
          <div className="h-14 w-14 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-heading font-bold text-lg">SC</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {isLogin ? "Masuk ke Akun" : "Buat Akun Baru"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLogin ? "Masuk untuk mengakses Career Center PEDULI" : "Lengkapi data diri untuk memulai karier Anda"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">Daftar sebagai</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["santri", "alumni"] as const).map((r) => (
                    <button key={r} type="button" onClick={() => setRole(r)}
                      className={`px-4 py-2.5 rounded-lg border text-sm font-medium capitalize transition-all ${
                        role === r ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-muted text-muted-foreground"
                      }`}>{r}</button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nama Lengkap *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Nama lengkap" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>No. HP / WhatsApp</Label>
                  <Input placeholder="08xxx" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Jenis Kelamin</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                    <option>Laki-laki</option>
                    <option>Perempuan</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tanggal Lahir</Label>
                  <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Daerah Asal</Label>
                  <Input placeholder="Kota / Kabupaten" value={form.origin} onChange={(e) => set("origin", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Alamat</Label>
                  <Input placeholder="Alamat lengkap" value={form.address} onChange={(e) => set("address", e.target.value)} />
                </div>

                {role === "santri" ? (
                  <></>
                ) : (

                  <>
                    <div className="space-y-1.5">
                      <Label>Tahun Lulus</Label>
                      <Input type="number" placeholder="2024" value={form.graduation_year} onChange={(e) => set("graduation_year", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Jenjang Pendidikan</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.education_level} onChange={(e) => set("education_level", e.target.value)}>
                        <option>SMA/MA</option>
                        <option>D3</option>
                        <option>D4</option>
                        <option>S1</option>
                        <option>S2</option>
                        <option>S3</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Jurusan</Label>
                      <Input value={form.major} onChange={(e) => set("major", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Universitas</Label>
                      <Input value={form.university} onChange={(e) => set("university", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Pekerjaan / Posisi</Label>
                      <Input value={form.position} onChange={(e) => set("position", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Perusahaan / Instansi</Label>
                      <Input value={form.company} onChange={(e) => set("company", e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
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
                <Input type="password" placeholder="Min. 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={6} />
              </div>
            </div>
          </div>

          {isLogin && (
            <div className="text-right">
              <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs text-primary hover:underline">Lupa password?</button>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Memproses..." : isLogin ? (
              <><LogIn className="h-4 w-4 mr-2" />Masuk</>
            ) : (
              <><UserPlus className="h-4 w-4 mr-2" />Daftar</>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline">
            {isLogin ? "Belum punya akun? Daftar sekarang" : "Sudah punya akun? Masuk"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
