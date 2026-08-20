import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import GraduateStatusCard from "@/components/shared/GraduateStatusCard";
import AlumniEducationManager from "@/components/shared/AlumniEducationManager";
import { useQuery } from "@tanstack/react-query";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Camera, Loader2, Save, Trash2, User as UserIcon, Lock, Mail, GraduationCap } from "lucide-react";

type ProfileForm = {
  full_name: string;
  phone: string;
  gender: string;
  birth_date: string;
  origin: string;
  address: string;
  school_origin: string;
  education_level: string;
  major: string;
  university: string;
  graduation_year: string;
  position: string;
  company: string;
  bio: string;
};

const EMPTY: ProfileForm = {
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
  bio: "",
};

const Profile = () => {
  const { user, roles, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const set = (k: keyof ProfileForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setNewEmail(user.email ?? "");
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) toast.error(`Gagal memuat profil: ${error.message}`);
      if (data) {
        setForm({
          full_name: data.full_name ?? "",
          phone: data.phone ?? "",
          gender: data.gender ?? "Laki-laki",
          birth_date: data.birth_date ?? "",
          origin: data.origin ?? "",
          address: data.address ?? "",
          school_origin: data.school_origin ?? "",
          education_level: data.education_level ?? "SMA/MA",
          major: data.major ?? "",
          university: data.university ?? "",
          graduation_year: data.graduation_year ? String(data.graduation_year) : "",
          position: data.position ?? "",
          company: data.company ?? "",
          bio: data.bio ?? "",
        });
        setAvatarPath(data.avatar_url ?? null);
      }
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!avatarPath) {
      setAvatarUrl(null);
      return;
    }
    (async () => {
      const { data } = await supabase.storage
        .from("avatars")
        .createSignedUrl(avatarPath, 60 * 60);
      setAvatarUrl(data?.signedUrl ?? null);
    })();
  }, [avatarPath]);

  const saveProfile = async () => {
    if (!user) return;
    if (!form.full_name.trim()) {
      toast.error("Nama lengkap wajib diisi");
      return;
    }
    setSaving(true);
    const payload = {
      id: user.id,
      full_name: form.full_name.trim(),
      phone: form.phone || null,
      gender: form.gender || null,
      birth_date: form.birth_date || null,
      origin: form.origin || null,
      address: form.address || null,
      school_origin: form.school_origin || null,
      education_level: form.education_level || null,
      major: form.major || null,
      university: form.university || null,
      graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
      position: form.position || null,
      company: form.company || null,
      bio: form.bio || null,
      avatar_url: avatarPath,
    };
    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });
    setSaving(false);
    if (error) toast.error(`Gagal menyimpan: ${error.message}`);
    else toast.success("Profil berhasil diperbarui");
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 3MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (upErr) {
      setUploading(false);
      toast.error(`Gagal unggah foto: ${upErr.message}`);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", user.id);
    setUploading(false);
    if (error) {
      toast.error(`Gagal simpan foto: ${error.message}`);
      return;
    }
    if (avatarPath) await supabase.storage.from("avatars").remove([avatarPath]);
    setAvatarPath(path);
    toast.success("Foto profil diperbarui");
  };

  const removeAvatar = async () => {
    if (!user || !avatarPath) return;
    await supabase.storage.from("avatars").remove([avatarPath]);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);
    if (error) return toast.error(error.message);
    setAvatarPath(null);
    toast.success("Foto profil dihapus");
  };

  const updateEmail = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || email === user?.email) return toast.error("Masukkan email baru");
    const { error } = await supabase.auth.updateUser({ email });
    if (error) toast.error(`Gagal ubah email: ${error.message}`);
    else toast.success("Email berhasil diperbarui");
  };

  const updatePassword = async () => {
    if (newPassword.length < 6) return toast.error("Password minimal 6 karakter");
    if (newPassword !== confirmPassword) return toast.error("Konfirmasi password tidak sama");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(`Gagal ubah password: ${error.message}`);
    else {
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password berhasil diperbarui");
    }
  };

  const deleteAccount = async () => {
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) return toast.error(`Gagal menghapus akun: ${error.message}`);
    toast.success("Akun Anda telah dihapus");
    await signOut();
    navigate("/");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen gradient-bg-subtle flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const initials = (form.full_name || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <div className="container mx-auto section-padding max-w-4xl">
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center border border-border">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Foto profil" className="h-full w-full object-cover" />
              ) : (
                <span className="font-heading font-bold text-primary text-xl">{initials}</span>
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full gradient-bg flex items-center justify-center cursor-pointer shadow">
              {uploading ? (
                <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
              ) : (
                <Camera className="h-4 w-4 text-primary-foreground" />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
              />
            </label>
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="font-heading text-2xl font-bold">{form.full_name || "Profil Saya"}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="flex gap-1.5 justify-center sm:justify-start mt-1.5">
              {roles.map((r) => (
                <Badge key={r} variant="secondary" className="capitalize text-[10px]">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
          {avatarUrl && (
            <Button variant="outline" size="sm" onClick={removeAvatar}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Hapus Foto
            </Button>
          )}
        </div>

        <Tabs defaultValue="data">
          <TabsList className="glass-card mb-4 flex-wrap h-auto">
            <TabsTrigger value="data">
              <UserIcon className="h-4 w-4 mr-1.5" /> Data Diri
            </TabsTrigger>
            {!roles.includes("admin") && (
              <TabsTrigger value="status">
                <UserIcon className="h-4 w-4 mr-1.5" /> Status Lulus
              </TabsTrigger>
            )}
            {!roles.includes("admin") && (
              <TabsTrigger value="pendidikan">
                <GraduationCap className="h-4 w-4 mr-1.5" /> Pendidikan
              </TabsTrigger>
            )}
            <TabsTrigger value="akun">
              <Lock className="h-4 w-4 mr-1.5" /> Keamanan Akun
            </TabsTrigger>
          </TabsList>

          {!roles.includes("admin") && (
            <TabsContent value="status">
              <GraduateStatusCard />
            </TabsContent>
          )}

          {!roles.includes("admin") && (
            <TabsContent value="pendidikan">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Riwayat Pendidikan</CardTitle>
                  <CardDescription>
                    Lengkapi jenjang, perguruan tinggi, program studi, lokasi, tahun, dan status studi Anda.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {myAlumniId ? (
                    <AlumniEducationManager alumniId={myAlumniId} canEdit />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Riwayat pendidikan tersedia setelah Anda memperbarui status kelulusan pada tab <strong>Status Lulus</strong>.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}


          <TabsContent value="data">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Data Diri</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nama Lengkap *</Label>
                  <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>No. HP / WhatsApp</Label>
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Jenis Kelamin</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.gender}
                    onChange={(e) => set("gender", e.target.value)}
                  >
                    <option>Laki-laki</option>
                    <option>Perempuan</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tanggal Lahir</Label>
                  <Input
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => set("birth_date", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Daerah Asal</Label>
                  <Input value={form.origin} onChange={(e) => set("origin", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Alamat</Label>
                  <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Asal Sekolah</Label>
                  <Input
                    value={form.school_origin}
                    onChange={(e) => set("school_origin", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Jenjang Pendidikan</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.education_level}
                    onChange={(e) => set("education_level", e.target.value)}
                  >
                    <option>SMP/MTs</option>
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
                  <Label>Tahun Lulus</Label>
                  <Input
                    type="number"
                    value={form.graduation_year}
                    onChange={(e) => set("graduation_year", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Pekerjaan / Posisi</Label>
                  <Input value={form.position} onChange={(e) => set("position", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Perusahaan / Instansi</Label>
                  <Input value={form.company} onChange={(e) => set("company", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Bio Singkat</Label>
                  <Input value={form.bio} onChange={(e) => set("bio", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-auto">
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Simpan Perubahan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="akun" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" /> Ubah Email
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@contoh.com"
                />
                <Button variant="outline" onClick={updateEmail}>
                  Perbarui Email
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" /> Ubah Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password baru (min. 6 karakter)"
                />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Konfirmasi password baru"
                />
                <Button variant="outline" onClick={updatePassword}>
                  Perbarui Password
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base text-destructive">Hapus Akun</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Menghapus akun akan menghilangkan seluruh data profil, riwayat tes, dan lamaran Anda
                  secara permanen.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Hapus Akun Saya
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus akun permanen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Semua data Anda akan dihapus.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteAccount}>Ya, Hapus</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
