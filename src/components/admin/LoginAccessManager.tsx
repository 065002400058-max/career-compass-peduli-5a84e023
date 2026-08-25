import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  KeyRound, Loader2, Pencil, Plus, RefreshCw, Search, ShieldCheck, ShieldX, Trash2,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type Row = Database["public"]["Tables"]["allowed_login_emails"]["Row"];
type AuditRow = Database["public"]["Tables"]["login_access_audit"]["Row"];

const ROLE_LABEL: Record<AppRole, string> = { santri: "Santri", alumni: "Alumni", mitra: "Mitra", admin: "Admin" };

const ACTION_LABEL: Record<string, string> = {
  email_added: "Ditambahkan",
  email_removed: "Dihapus",
  role_changed: "Role diubah",
  updated: "Data diubah",
  activated: "Diaktifkan",
  deactivated: "Dinonaktifkan",
  login_check: "Pemeriksaan login",
  login_allowed: "Login diizinkan",
  login_denied_unregistered: "Login ditolak (belum terdaftar)",
  login_denied_inactive: "Login ditolak (nonaktif)",
  login_denied_expired: "Login ditolak (kedaluwarsa)",
  login_denied_rate_limited: "Login ditolak (rate limit)",
};

type Form = { email: string; full_name: string; role: AppRole; status: "active" | "inactive"; expires_at: string };
const EMPTY: Form = { email: "", full_name: "", role: "santri", status: "active", expires_at: "" };

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (v: string | null) =>
  v ? new Date(v).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const LoginAccessManager = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: rows, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["allowed-login-emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allowed_login_emails")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: audits } = useQuery({
    queryKey: ["login-access-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_access_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (roleFilter !== "all" && r.role !== roleFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return r.email.toLowerCase().includes(q) || (r.full_name ?? "").toLowerCase().includes(q);
    });
  }, [rows, search, roleFilter, statusFilter]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({
      email: r.email,
      full_name: r.full_name ?? "",
      role: r.role,
      status: r.status === "active" ? "active" : "inactive",
      expires_at: r.expires_at ? r.expires_at.slice(0, 10) : "",
    });
    setOpen(true);
  };

  const save = async () => {
    const email = form.email.trim().toLowerCase();
    if (!email || !email.includes("@")) { toast.error("Masukkan alamat email yang valid"); return; }
    if (!form.full_name.trim()) { toast.error("Nama lengkap wajib diisi"); return; }
    if (form.role === "admin" && editing?.role !== "admin") {
      toast.error("Peran Admin tidak dapat dibuat dari panel ini");
      return;
    }
    if (form.role === "mitra") { toast.error("Peran Mitra tidak digunakan lagi"); return; }
    setSaving(true);
    const payload = {
      email,
      full_name: form.full_name.trim(),
      role: form.role,
      status: form.status,
      expires_at: form.expires_at ? new Date(`${form.expires_at}T23:59:59`).toISOString() : null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("allowed_login_emails").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("allowed_login_emails").insert({ ...payload, created_by: user?.id ?? null }));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Akses diperbarui" : "Email ditambahkan ke daftar akses");
    setOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["allowed-login-emails"] });
    void queryClient.invalidateQueries({ queryKey: ["login-access-audit"] });
  };

  const toggleStatus = async (r: Row) => {
    const next = r.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("allowed_login_emails").update({ status: next }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(next === "active" ? "Akses diaktifkan" : "Akses dinonaktifkan");
    void queryClient.invalidateQueries({ queryKey: ["allowed-login-emails"] });
    void queryClient.invalidateQueries({ queryKey: ["login-access-audit"] });
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("allowed_login_emails").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Email dihapus dari daftar akses");
    setDeleteTarget(null);
    void queryClient.invalidateQueries({ queryKey: ["allowed-login-emails"] });
    void queryClient.invalidateQueries({ queryKey: ["login-access-audit"] });
  };

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Manajemen Akses Pengguna
          </h2>
          <p className="text-sm text-muted-foreground">
            Hanya email di daftar ini yang dapat masuk melalui Google. Role diambil dari database.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
            Muat Ulang
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> Tambah Email
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari email atau nama..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "all" | AppRole)}
          className="h-10 rounded-md border border-border bg-card px-2 text-xs text-foreground"
          aria-label="Filter peran"
        >
          <option value="all">Semua Peran</option>
          <option value="santri">Santri</option>
          <option value="alumni">Alumni</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          className="h-10 rounded-md border border-border bg-card px-2 text-xs text-foreground"
          aria-label="Filter status"
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Memuat daftar akses...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Belum ada email yang terdaftar.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Login Terakhir</th>
                    <th className="px-4 py-3 font-medium">Kedaluwarsa</th>
                    <th className="px-4 py-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const expired = r.expires_at ? new Date(r.expires_at) < new Date() : false;
                    return (
                      <tr key={r.id} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-2.5 font-medium text-foreground">{r.email}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{r.full_name ?? "—"}</td>
                        <td className="px-4 py-2.5"><Badge variant="secondary">{ROLE_LABEL[r.role]}</Badge></td>
                        <td className="px-4 py-2.5">
                          <Badge variant={r.status === "active" && !expired ? "default" : "destructive"}>
                            {r.status !== "active" ? "Nonaktif" : expired ? "Kedaluwarsa" : "Aktif"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                          {r.last_login_at ? fmtDateTime(r.last_login_at) : "Belum pernah"}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(r.expires_at)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" title={r.status === "active" ? "Nonaktifkan" : "Aktifkan"} onClick={() => toggleStatus(r)}>
                              {r.status === "active" ? <ShieldX className="h-4 w-4 text-destructive" /> : <ShieldCheck className="h-4 w-4 text-primary" />}
                            </Button>
                            <Button variant="ghost" size="icon" title="Ubah" onClick={() => openEdit(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Hapus" onClick={() => setDeleteTarget(r)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Log Audit Akses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(audits ?? []).length === 0 ? (
            <div className="px-4 pb-4 text-sm text-muted-foreground">Belum ada aktivitas.</div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Waktu</th>
                    <th className="px-4 py-2 font-medium">Email</th>
                    <th className="px-4 py-2 font-medium">Aktivitas</th>
                    <th className="px-4 py-2 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {(audits ?? []).map((a: AuditRow) => (
                    <tr key={a.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmtDateTime(a.created_at)}</td>
                      <td className="px-4 py-2">{a.target_email ?? "—"}</td>
                      <td className="px-4 py-2">
                        <Badge variant={a.action.includes("denied") ? "destructive" : "outline"}>
                          {ACTION_LABEL[a.action] ?? a.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {a.old_role && a.new_role && a.old_role !== a.new_role
                          ? `${ROLE_LABEL[a.old_role as AppRole] ?? a.old_role} → ${ROLE_LABEL[a.new_role as AppRole] ?? a.new_role}`
                          : a.old_status && a.new_status && a.old_status !== a.new_status
                            ? `${a.old_status} → ${a.new_status}`
                            : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog tambah/ubah */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Ubah Akses Email" : "Tambah Email ke Daftar Akses"}</DialogTitle>
            <DialogDescription>
              Email ini akan diizinkan masuk menggunakan akun Google yang sesuai.
              Peran Admin tidak dapat dibuat dari panel ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Alamat Email</Label>
              <Input type="email" placeholder="nama@gmail.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} />
            </div>
            <div className="space-y-1.5">
              <Label>Nama Lengkap</Label>
              <Input placeholder="Nama pengguna" value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="santri">Santri</SelectItem>
                    <SelectItem value="alumni">Alumni</SelectItem>
                    {editing?.role === "admin" && <SelectItem value="admin">Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "active" | "inactive" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Kedaluwarsa (opsional)</Label>
              <Input type="date" value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akses {deleteTarget?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              Email ini tidak akan bisa masuk lagi. Sistem menolak penghapusan jika ini adalah admin terakhir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LoginAccessManager;
