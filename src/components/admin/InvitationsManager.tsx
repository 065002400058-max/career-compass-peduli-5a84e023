import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Copy,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Upload,
  UserPlus,
  XCircle,
} from "lucide-react";

type Role = "santri" | "alumni" | "admin";

type Invitation = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  status: string;
  notes: string | null;
  identity_number: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  last_sent_at: string | null;
  created_at: string;
};

const ROLES: Role[] = ["santri", "alumni", "admin"];
const ROLE_LABEL: Record<Role, string> = { santri: "Santri", alumni: "Alumni", admin: "Admin" };
const STATUS_LABEL: Record<string, string> = {
  menunggu: "Menunggu",
  terkirim: "Terkirim",
  aktif: "Aktif",
  dibatalkan: "Dibatalkan",
  kedaluwarsa: "Kedaluwarsa",
};

const EMPTY = { email: "", full_name: "", identity_number: "", role: "santri" as Role, notes: "" };

// Baca pesan asli dari Edge Function (invoke hanya melaporkan "non-2xx").
const readFnError = async (error: unknown): Promise<{ message: string; payload: Record<string, unknown> }> => {
  const ctx = (error as { context?: { text?: () => Promise<string> } })?.context;
  if (ctx?.text) {
    try {
      const raw = await ctx.text();
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return { message: String(parsed.error ?? raw), payload: parsed };
    } catch {
      // fallthrough
    }
  }
  return { message: (error as Error)?.message ?? "Terjadi kesalahan", payload: {} };
};

const InvitationsManager = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [fRole, setFRole] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invitation[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (fRole !== "all" && r.role !== fRole) return false;
      if (fStatus !== "all" && r.status !== fStatus) return false;
      if (!q) return true;
      return (
        r.email.toLowerCase().includes(q) ||
        (r.full_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, fRole, fStatus]);

  const counts = useMemo(
    () => ({
      total: rows.length,
      aktif: rows.filter((r) => r.status === "aktif").length,
      terkirim: rows.filter((r) => r.status === "terkirim").length,
      menunggu: rows.filter((r) => r.status === "menunggu").length,
    }),
    [rows],
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-invitations"] });

  const sendInvite = async (email: string, full_name: string, role: Role, notes?: string, identity_number?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = full_name.trim();
    if (!cleanName) {
      toast.error("Nama lengkap wajib diisi");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Format email tidak valid");
      return false;
    }

    setSending(true);
    setLastLink(null);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: cleanEmail, full_name: cleanName, role },
      });

      if (error) {
        const { message, payload } = await readFnError(error);
        if (payload.already_registered) toast.info(message);
        else if (payload.cooldown) toast.warning(message);
        else toast.error(message);
        return false;
      }
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);

      const res = data as {
        email_sent?: boolean;
        temp_password?: string | null;
        warning?: string | null;
        reused?: boolean;
      };
      const extra: Record<string, string> = {};
      if (notes) extra.notes = notes;
      if (identity_number) extra.identity_number = identity_number;
      if (Object.keys(extra).length) {
        await supabase.from("invitations").update(extra).eq("email", cleanEmail);
      }
      if (res.email_sent) {
        toast.success(`Akun dibuat, email berisi password sementara terkirim ke ${cleanEmail}`);
      } else {
        setLastLink(res.temp_password ?? null);
        toast.warning(
          res.warning ??
            "Akun dibuat, namun email gagal terkirim. Sampaikan password sementara di bawah secara aman.",
        );
      }
      invalidate();
      return true;
    } catch (e) {
      toast.error(`Gagal mengirim undangan: ${(e as Error).message}`);
      return false;
    } finally {
      setSending(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const ok = await sendInvite(form.email, form.full_name, form.role, form.notes, form.identity_number);
    if (ok) {
      setForm(EMPTY);
      setOpen(false);
    }
  };

  const cancelInvite = async (row: Invitation) => {
    const { error } = await supabase
      .from("invitations")
      .update({ status: "dibatalkan" })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Undangan dibatalkan");
    invalidate();
  };

  const removeInvite = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("invitations").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) return toast.error(error.message);
    toast.success("Undangan dihapus");
    invalidate();
  };

  // Import CSV: kolom email, nama_lengkap, peran, nomor_identitas, catatan
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
      const iIdent = idx("nomor_identitas", "nis", "nim", "identity_number");
      const iNotes = idx("catatan", "notes");

      let ok = 0;
      for (const line of lines.slice(1)) {
        const c = line.split(sep).map((v) => v.trim());
        const email = (c[iEmail] ?? "").toLowerCase();
        if (!email || !email.includes("@")) {
          log.push(`Dilewati (email tidak valid): ${line.slice(0, 40)}`);
          continue;
        }
        const roleRaw = (iRole >= 0 ? c[iRole] : "").toLowerCase() as Role;
        const role = (ROLES as string[]).includes(roleRaw) ? roleRaw : ("santri" as Role);
        const sent = await sendInvite(
          email,
          iName >= 0 ? c[iName] ?? "" : "",
          role,
          iNotes >= 0 ? c[iNotes] : undefined,
          iIdent >= 0 ? c[iIdent] : undefined,
        );
        if (sent) {
          ok += 1;
          log.push(`Berhasil: ${email} (${role})`);
        } else {
          log.push(`Gagal: ${email}`);
        }
      }
      toast.success(`Import selesai: ${ok} undangan diproses`);
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
            Pendaftaran publik ditutup. Akun hanya aktif setelah admin mengundang emailnya.
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Format CSV: <code>email, nama_lengkap, peran (santri/alumni/admin), nomor_identitas, catatan</code>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Muat Ulang
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
                aria-label="Import undangan dari CSV"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) importCsv(f);
                }}
              />
            </label>
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" /> Undang Pengguna
          </Button>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Undangan", value: counts.total },
          { label: "Sudah Aktif", value: counts.aktif },
          { label: "Terkirim", value: counts.terkirim },
          { label: "Menunggu", value: counts.menunggu },
        ].map((c) => (
          <Card key={c.label} className="rounded-2xl">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="font-heading text-2xl font-bold text-foreground">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {lastLink && (
        <Card className="rounded-2xl border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Password sementara (tampil sekali)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <code className="text-xs break-all flex-1 min-w-0 bg-muted rounded-lg p-2">{lastLink}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(lastLink);
                toast.success("Password sementara disalin");
              }}
            >
              <Copy className="h-4 w-4 mr-1.5" /> Salin
            </Button>
          </CardContent>
        </Card>
      )}

      {importLog.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Hasil Import CSV</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setImportLog([])}>Tutup</Button>
          </CardHeader>
          <CardContent className="max-h-48 overflow-y-auto space-y-1">
            {importLog.map((l, i) => (
              <p key={i} className="text-[11px] text-muted-foreground break-words">{l}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Cari undangan"
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
          {Object.keys(STATUS_LABEL).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {/* Daftar */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : isError ? (
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Gagal memuat data undangan.
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => refetch()}>Coba lagi</Button>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <Mail className="h-10 w-10 mx-auto mb-3 opacity-40" />
            Belum ada undangan. Klik "Undang Pengguna" untuk menambahkan email santri atau alumni.
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
                  <Badge variant="outline" className="text-[10px] rounded-full">{ROLE_LABEL[r.role] ?? r.role}</Badge>
                  <Badge
                    className="text-[10px] rounded-full"
                    variant={r.status === "aktif" ? "default" : "secondary"}
                  >
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                {r.identity_number && (
                  <p className="text-[11px] text-muted-foreground">No. Identitas: {r.identity_number}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Dibuat {new Date(r.created_at).toLocaleDateString("id-ID")}
                  {r.accepted_at && ` · Aktif ${new Date(r.accepted_at).toLocaleDateString("id-ID")}`}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {r.status !== "aktif" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sending}
                      onClick={() => sendInvite(r.email, r.full_name ?? "", r.role, undefined, r.identity_number ?? undefined)}
                    >
                      <Send className="h-4 w-4 mr-1.5" /> Kirim Ulang
                    </Button>
                    {r.status !== "dibatalkan" && (
                      <Button size="sm" variant="outline" onClick={() => cancelInvite(r)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30"
                  onClick={() => setDeleteId(r.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog undang */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Undang Pengguna</DialogTitle>
            <DialogDescription>
              Sistem membuat akun dan mengirim email berisi password sementara. Pengguna wajib mengganti password saat login pertama.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                aria-label="Email undangan"
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="nama@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nama Lengkap *</Label>
              <Input
                aria-label="Nama lengkap undangan"
                required
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="Nama lengkap"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor Identitas (NIS/NIM)</Label>
              <Input
                aria-label="Nomor identitas undangan"
                value={form.identity_number}
                onChange={(e) => set("identity_number", e.target.value)}
                placeholder="Opsional"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Peran</Label>
              <select
                aria-label="Peran undangan"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Input
                aria-label="Catatan undangan"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Opsional"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                Kirim Undangan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus undangan?</AlertDialogTitle>
            <AlertDialogDescription>
              Undangan akan dihapus. Akun yang sudah aktif tidak terpengaruh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={removeInvite}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InvitationsManager;
