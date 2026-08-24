import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Copy,
  Info,
  Link2,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldX,
  Upload,
  UserPlus,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type BaseRow = Database["public"]["Tables"]["allowed_login_emails"]["Row"];
// Kolom pelacakan baru (invited_at, first_login_at, dst.) ditambahkan via migrasi;
// digabung manual agar aman terhadap regenerasi tipe otomatis.
type AccessRow = BaseRow & {
  invited_at?: string | null;
  invited_by?: string | null;
  first_login_at?: string | null;
  last_login_at?: string | null;
  email_notice_status?: string | null;
};

type InviteRole = "santri" | "alumni" | "admin";
const ROLES: InviteRole[] = ["santri", "alumni", "admin"];
const ROLE_LABEL: Record<InviteRole, string> = { santri: "Santri", alumni: "Alumni", admin: "Admin" };

const LOGIN_URL = "https://pedulismartcareer-daarululuumlido.com/auth";

const NOTICE_LABEL: Record<string, string> = {
  email_queued: "Email: dalam antrean pengiriman",
  email_sent: "Email: terkirim",
  email_failed: "Email: gagal terkirim",
};

// Status nyata dari log pengiriman (email_send_log) — lebih dipercaya daripada catatan lokal.
const LOG_LABEL: Record<string, string> = {
  sent: "Email: terkirim",
  pending: "Email: dalam antrean pengiriman",
  failed: "Email: gagal terkirim — domain pengirim email belum aktif",
  dlq: "Email: gagal terkirim (batas percobaan habis) — domain pengirim email belum aktif",
  suppressed: "Email: diblokir (alamat masuk daftar blokir)",
};


const fmtDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : null;
const fmtDateTime = (v: string | null | undefined) =>
  v
    ? new Date(v).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

// Baca pesan asli dari Edge Function (invoke hanya melaporkan "non-2xx").
const readFnError = async (error: unknown): Promise<string> => {
  const ctx = (error as { context?: { text?: () => Promise<string> } })?.context;
  if (ctx?.text) {
    try {
      const raw = await ctx.text();
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return String(parsed.error ?? raw);
    } catch {
      // fallthrough
    }
  }
  return (error as Error)?.message ?? "Terjadi kesalahan";
};

type RegisterResult = {
  ok: boolean;
  reused?: boolean;
  email_status?: string;
  message?: string;
};

/** Panggil backend pendaftaran akses (allowlist Login Google). */
const callRegisterAccess = async (
  email: string,
  fullName: string,
  role: InviteRole,
  sendNotice: boolean,
): Promise<RegisterResult> => {
  try {
    const { data, error } = await supabase.functions.invoke("register-access", {
      body: { email, full_name: fullName, role, send_notice: sendNotice },
    });
    if (error) return { ok: false, message: await readFnError(error) };
    const res = data as { error?: string; reused?: boolean; email_status?: string } | null;
    if (res?.error) return { ok: false, message: res.error };
    return { ok: true, reused: res?.reused, email_status: res?.email_status };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
};

const EMPTY_FORM = { email: "", full_name: "", role: "santri" as InviteRole, send_notice: false };

const InvitationsManager = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [fRole, setFRole] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);

  const { data: rows = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-access-invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allowed_login_emails")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AccessRow[];
    },
  });

  // Status pengiriman email sebenarnya, per alamat email (log terbaru menang).
  const { data: emailStatus = {} } = useQuery({
    queryKey: ["admin-access-email-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_send_log")
        .select("recipient_email,status,created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const map: Record<string, { status: string; created_at: string }> = {};
      for (const r of data ?? []) {
        const key = (r.recipient_email ?? "").toLowerCase();
        if (key && !map[key]) map[key] = { status: r.status, created_at: r.created_at };
      }
      return map;
    },
    refetchInterval: 30_000,
  });

  const noticeText = (r: AccessRow) => {
    const log = emailStatus[r.email.toLowerCase()];
    if (log) {
      // Antrean yang tidak bergerak lebih dari 10 menit dianggap gagal (domain pengirim belum aktif).
      if (log.status === "pending" && Date.now() - new Date(log.created_at).getTime() > 10 * 60 * 1000) {
        return LOG_LABEL.failed;
      }
      return LOG_LABEL[log.status] ?? `Email: ${log.status}`;
    }
    if (!r.email_notice_status || r.email_notice_status === "none") return null;
    return NOTICE_LABEL[r.email_notice_status] ?? r.email_notice_status;
  };


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (fRole !== "all" && r.role !== fRole) return false;
      if (fStatus === "active" && r.status !== "active") return false;
      if (fStatus === "inactive" && r.status === "active") return false;
      if (fStatus === "logged" && !r.last_login_at) return false;
      if (fStatus === "never" && r.last_login_at) return false;
      if (!q) return true;
      return r.email.toLowerCase().includes(q) || (r.full_name ?? "").toLowerCase().includes(q);
    });
  }, [rows, search, fRole, fStatus]);

  const counts = useMemo(
    () => ({
      total: rows.length,
      aktif: rows.filter((r) => r.status === "active").length,
      sudahLogin: rows.filter((r) => r.last_login_at).length,
      belumLogin: rows.filter((r) => !r.last_login_at).length,
    }),
    [rows],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-access-invites"] });
    qc.invalidateQueries({ queryKey: ["allowed-login-emails"] });
    qc.invalidateQueries({ queryKey: ["login-access-audit"] });
  };

  const copyLoginLink = async () => {
    try {
      await navigator.clipboard.writeText(LOGIN_URL);
      toast.success("Tautan login disalin. Bagikan kepada pengguna melalui WhatsApp atau media lain.");
    } catch {
      toast.error(`Gagal menyalin. Salin manual: ${LOGIN_URL}`);
    }
  };

  const shareWhatsApp = (row?: AccessRow) => {
    const text = row
      ? `Assalamu'alaikum, ${row.full_name || row.email}.\n\nAkses Smart Career Center PEDULI telah didaftarkan untuk email ${row.email} sebagai ${ROLE_LABEL[row.role as InviteRole] ?? row.role}. Silakan masuk dengan akun Google menggunakan email tersebut melalui:\n${LOGIN_URL}`
      : `Silakan masuk ke Smart Career Center PEDULI dengan akun Google Anda melalui:\n${LOGIN_URL}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const cleanEmail = form.email.trim().toLowerCase();
    const cleanName = form.full_name.trim();
    if (!cleanName) return toast.error("Nama lengkap wajib diisi");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return toast.error("Format email tidak valid");

    setSending(true);
    const res = await callRegisterAccess(cleanEmail, cleanName, form.role, form.send_notice);
    setSending(false);

    if (!res.ok) return toast.error(res.message ?? "Gagal mendaftarkan akses");

    if (res.reused) {
      toast.info("Email sudah terdaftar — data akses diperbarui dan diaktifkan kembali.");
    } else {
      toast.success(
        "Akses berhasil didaftarkan. Pengguna sekarang dapat masuk menggunakan akun Google dengan alamat email tersebut.",
      );
    }
    if (res.email_status === "email_failed") {
      toast.warning(
        "Akses berhasil didaftarkan, tetapi email pemberitahuan belum terkirim. Silakan bagikan tautan login secara manual.",
      );
    } else if (res.email_status === "email_queued") {
      toast.info("Email pemberitahuan masuk antrean pengiriman.");
    }

    setForm(EMPTY_FORM);
    setOpen(false);
    invalidate();
  };

  const toggleStatus = async (r: AccessRow) => {
    const next = r.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("allowed_login_emails").update({ status: next }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(
      next === "active"
        ? `${r.email} diaktifkan — sekarang dapat login dengan Google.`
        : `${r.email} dinonaktifkan — tidak dapat login.`,
    );
    invalidate();
  };

  // Import CSV: kolom email, nama_lengkap, peran
  const importCsv = async (file: File) => {
    setImporting(true);
    setImportLog([]);
    const log: string[] = [];
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
      if (!lines.length) throw new Error("File kosong");

      const sep = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
      const head = lines[0].toLowerCase().split(sep).map((h) => h.trim());
      const idx = (...names: string[]) => head.findIndex((h) => names.includes(h));
      const iEmail = idx("email");
      if (iEmail < 0) throw new Error("Kolom 'email' tidak ditemukan pada header CSV");
      const iName = idx("nama_lengkap", "nama", "full_name");
      const iRole = idx("peran", "role");

      let ok = 0;
      for (const line of lines.slice(1)) {
        const c = line.split(sep).map((v) => v.trim());
        const email = (c[iEmail] ?? "").toLowerCase();
        if (!email || !email.includes("@")) {
          log.push(`Dilewati (email tidak valid): ${line.slice(0, 40)}`);
          continue;
        }
        const roleRaw = (iRole >= 0 ? c[iRole] : "").toLowerCase() as InviteRole;
        const role = (ROLES as string[]).includes(roleRaw) ? roleRaw : ("santri" as InviteRole);
        const name = iName >= 0 ? c[iName] ?? "" : "";
        if (!name) {
          log.push(`Dilewati (nama kosong): ${email}`);
          continue;
        }
        const res = await callRegisterAccess(email, name, role, false);
        if (res.ok) {
          ok += 1;
          log.push(`Berhasil: ${email} (${ROLE_LABEL[role]})`);
        } else {
          log.push(`Gagal: ${email} — ${res.message}`);
        }
        // Jeda kecil agar tidak memicu rate limit backend
        await new Promise((r) => setTimeout(r, 250));
      }
      toast.success(`Import selesai: ${ok} email didaftarkan ke daftar akses`);
      invalidate();
    } catch (e) {
      toast.error(`Import gagal: ${(e as Error).message}`);
    } finally {
      setImportLog(log);
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-bold text-foreground">Undangan Akun</h2>
          <p className="text-sm text-muted-foreground">
            Daftarkan email agar pengguna dapat masuk dengan akun Google. Tanpa password sementara.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            Muat Ulang
          </Button>
          <Button size="sm" variant="outline" asChild disabled={importing}>
            <label className="cursor-pointer">
              {importing ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1.5" />
              )}
              Import CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                aria-label="Import daftar akses dari CSV"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) importCsv(f);
                }}
              />
            </label>
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" /> Daftarkan Akses
          </Button>
        </div>
      </div>

      {/* Alur singkat */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 flex gap-2">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Email yang didaftarkan langsung masuk daftar akses Login Google dan berstatus{" "}
          <strong>Aktif</strong>. Setelah itu bagikan tautan login di bawah kepada pengguna —
          mereka masuk dengan akun Google sesuai email tersebut. Email pemberitahuan hanya
          notifikasi tambahan dan bukan syarat login.
        </p>
      </div>

      {/* Tautan login untuk dibagikan */}
      <Card className="rounded-2xl border-primary/30">
        <CardContent className="p-4 flex flex-wrap items-center gap-2">
          <Link2 className="h-4 w-4 text-primary shrink-0" />
          <code className="text-xs break-all flex-1 min-w-0 bg-muted rounded-lg p-2">{LOGIN_URL}</code>
          <Button size="sm" variant="outline" onClick={copyLoginLink}>
            <Copy className="h-4 w-4 mr-1.5" /> Salin Tautan Login
          </Button>
          <Button size="sm" variant="outline" onClick={() => shareWhatsApp()}>
            <MessageCircle className="h-4 w-4 mr-1.5" /> Bagikan via WhatsApp
          </Button>
        </CardContent>
      </Card>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Terdaftar", value: counts.total },
          { label: "Aktif", value: counts.aktif },
          { label: "Sudah Login", value: counts.sudahLogin },
          { label: "Belum Login", value: counts.belumLogin },
        ].map((c) => (
          <Card key={c.label} className="rounded-2xl">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="font-heading text-2xl font-bold text-foreground">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {importLog.length > 0 && (
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Hasil Import CSV</p>
              <Button size="sm" variant="ghost" onClick={() => setImportLog([])}>Tutup</Button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {importLog.map((l, i) => (
                <p key={i} className="text-[11px] text-muted-foreground break-words">{l}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Cari akses"
            placeholder="Cari email atau nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          aria-label="Filter peran"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={fRole}
          onChange={(e) => setFRole(e.target.value)}
        >
          <option value="all">Semua Peran</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
        <select
          aria-label="Filter status"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value)}
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
          <option value="logged">Sudah Login</option>
          <option value="never">Belum Login</option>
        </select>
      </div>

      {/* Daftar akses */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : isError ? (
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Gagal memuat daftar akses.
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => refetch()}>Coba lagi</Button>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Belum ada email yang cocok. Klik "Daftarkan Akses" untuk menambahkan email santri, alumni, atau admin.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center gap-3"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-heading font-semibold text-sm text-foreground truncate">
                    {r.full_name || r.email}
                  </h4>
                  <Badge variant="outline" className="text-[10px] rounded-full">
                    {ROLE_LABEL[r.role as InviteRole] ?? r.role}
                  </Badge>
                  {r.status === "active" ? (
                    <Badge className="text-[10px] rounded-full">Aktif</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px] rounded-full">Nonaktif</Badge>
                  )}
                  {r.last_login_at ? (
                    <Badge variant="secondary" className="text-[10px] rounded-full">Sudah Login</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] rounded-full">Belum Login</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                <p className="text-[11px] text-muted-foreground">
                  {fmtDate(r.invited_at ?? r.created_at) && `Didaftarkan ${fmtDate(r.invited_at ?? r.created_at)}`}
                  {fmtDateTime(r.last_login_at) && ` · Login terakhir ${fmtDateTime(r.last_login_at)}`}
                </p>
                {r.email_notice_status && r.email_notice_status !== "none" && (
                  <p className="text-[11px] text-muted-foreground">
                    {NOTICE_LABEL[r.email_notice_status] ?? r.email_notice_status}
                  </p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  title="Bagikan tautan login via WhatsApp"
                  onClick={() => shareWhatsApp(r)}
                >
                  <MessageCircle className="h-4 w-4 text-primary" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  title={r.status === "active" ? "Nonaktifkan akses" : "Aktifkan akses"}
                  onClick={() => toggleStatus(r)}
                >
                  {r.status === "active" ? (
                    <ShieldX className="h-4 w-4 text-destructive" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog pendaftaran akses */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Daftarkan Akses</DialogTitle>
            <DialogDescription>
              Email ini langsung dapat masuk menggunakan akun Google yang sesuai. Role diambil dari
              pengaturan di sini, bukan dari Google.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Alamat Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="nama@gmail.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Nama Lengkap</Label>
              <Input
                id="invite-name"
                placeholder="Nama pengguna"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as InviteRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-start gap-2.5 rounded-xl border border-border p-3 cursor-pointer">
              <Checkbox
                checked={form.send_notice}
                onCheckedChange={(v) => setForm({ ...form, send_notice: v === true })}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Kirim email pemberitahuan (opsional)</span>
                <br />
                Hanya notifikasi tambahan — bukan syarat login. Jika pengiriman gagal, akses tetap
                berlaku dan Anda dapat membagikan tautan login secara manual.
              </span>
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={sending}>
                {sending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Daftarkan Akses
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvitationsManager;
