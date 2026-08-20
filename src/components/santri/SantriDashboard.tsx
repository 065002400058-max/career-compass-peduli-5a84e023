import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Brain,
  ClipboardList,
  Puzzle,
  HeartPulse,
  CalendarDays,
  School,
  User as UserIcon,
  GraduationCap,
  ArrowRight,
  Users,
  Clock,
  Building2,
  Quote,
} from "lucide-react";
import { detectScreeningKind, type ScreeningKind } from "@/lib/psikotesScoring";
import AlumniInsight from "@/components/shared/AlumniInsight";
import GraduateStatusCard from "@/components/shared/GraduateStatusCard";
import useMyResultsRealtime from "@/hooks/useMyResultsRealtime";


/* ---------------- helpers ---------------- */

const fmtDate = (v?: string | null) =>
  v
    ? new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "-";
const fmtTime = (v?: string | null) =>
  v ? new Date(v).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";

type Tone = "green" | "blue" | "purple" | "coral" | "amber" | "slate";

const toneIcon: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-violet-50 text-violet-600",
  coral: "bg-rose-50 text-rose-500",
  amber: "bg-amber-50 text-amber-600",
  slate: "bg-slate-100 text-slate-500",
};

const toneBadge: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  purple: "bg-violet-50 text-violet-700 border-violet-100",
  coral: "bg-rose-50 text-rose-600 border-rose-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
};

const Badge = ({ tone, children }: { tone: Tone; children: React.ReactNode }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${toneBadge[tone]}`}
  >
    {children}
  </span>
);

const IconBox = ({
  tone,
  icon: Icon,
  size = "md",
}: {
  tone: Tone;
  icon: typeof Brain;
  size?: "sm" | "md";
}) => (
  <span
    className={`inline-flex items-center justify-center rounded-lg ${toneIcon[tone]} ${
      size === "sm" ? "h-8 w-8" : "h-9 w-9"
    }`}
  >
    <Icon className={size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]"} strokeWidth={1.8} />
  </span>
);

const Card = ({ className = "", children }: { className?: string; children: React.ReactNode }) => (
  <div
    className={`rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}
  >
    {children}
  </div>
);

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-2 border-b border-border/60 py-2 last:border-0">
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <span className="text-[12px] font-medium text-foreground text-right">{value}</span>
  </div>
);

const levelTone = (level?: string | null): Tone => {
  const s = (level ?? "").toLowerCase();
  if (s.includes("tinggi") || s.includes("berat")) return "coral";
  if (s.includes("sedang")) return "amber";
  if (s.includes("rendah") || s.includes("sesuai") || s.includes("normal")) return "green";
  return "slate";
};

const SCREENING_META: Record<ScreeningKind, { label: string }> = {
  pss10: { label: "PSS (Stress)" },
  brs: { label: "BRS (Resiliensi)" },
  srq20: { label: "SRQ-20" },
};

/* ---------------- component ---------------- */

const SantriDashboard = () => {
  const { user, roles } = useAuth();
  const uid = user?.id;
  useMyResultsRealtime(uid);

  const { data: profile, isLoading: loadProfile, isError: errProfile } = useQuery({
    queryKey: ["me-profile", uid],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!uid,
  });

  const { data: psikotes, isLoading: loadPsi, isError: errPsi } = useQuery({
    queryKey: ["me-psikotes", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("psikotes_attempts")
        .select("*, psikotes_tests(title, psikotes_categories(name))")
        .eq("user_id", uid!)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!uid,
  });

  const { data: cbt, isLoading: loadCbt, isError: errCbt } = useQuery({
    queryKey: ["me-cbt", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cbt_attempts")
        .select("*, cbt_tests(title)")
        .eq("user_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!uid,
  });

  const { data: referrals, isLoading: loadRef, isError: errRef } = useQuery({
    queryKey: ["me-referrals", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counseling_referrals")
        .select("id, status, level, reason, created_at")
        .eq("user_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!uid,
  });

  const isLoading = loadProfile || loadPsi || loadCbt || loadRef;
  const isError = errProfile || errPsi || errCbt || errRef;


  const roleLabel = roles.includes("alumni") ? "Alumni" : "Santri";
  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.email || "Pengguna";
  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  /* screening: ambil hasil terbaru per instrumen */
  const screening: Partial<
    Record<ScreeningKind, { score: string; level: string | null; date: string | null }>
  > = {};
  (psikotes ?? []).forEach((a: any) => {
    const kind = detectScreeningKind(
      a.psikotes_tests?.title,
      a.psikotes_tests?.psikotes_categories?.name
    );
    if (kind && !screening[kind]) {
      screening[kind] = {
        score: String(a.total_score),
        level: a.level,
        date: a.completed_at,
      };
    }
  });
  const lastScreening = (psikotes ?? []).find((a: any) =>
    detectScreeningKind(a.psikotes_tests?.title, a.psikotes_tests?.psikotes_categories?.name)
  );
  const lastPsikotes = (psikotes ?? []).find(
    (a: any) =>
      !detectScreeningKind(a.psikotes_tests?.title, a.psikotes_tests?.psikotes_categories?.name)
  );
  const lastCbt = (cbt ?? [])[0] as any;
  const lastReferral = (referrals ?? [])[0] as any;

  const summary = [
    {
      label: "Skrining Mental",
      icon: Brain,
      tone: "green" as Tone,
      status: lastScreening ? "Selesai" : "Belum dikerjakan",
      date: lastScreening ? fmtDate(lastScreening.completed_at) : null,
      done: !!lastScreening,
    },
    {
      label: "Tes CBT",
      icon: ClipboardList,
      tone: "blue" as Tone,
      status: lastCbt ? "Selesai" : "Belum dikerjakan",
      date: lastCbt ? fmtDate(lastCbt.completed_at ?? lastCbt.created_at) : null,
      done: !!lastCbt,
    },
    {
      label: "Psikotes",
      icon: Puzzle,
      tone: "purple" as Tone,
      status: lastPsikotes ? "Selesai" : "Belum dikerjakan",
      date: lastPsikotes ? fmtDate(lastPsikotes.completed_at) : null,
      done: !!lastPsikotes,
    },
    {
      label: "Konseling",
      icon: HeartPulse,
      tone: "coral" as Tone,
      status: lastReferral ? (lastReferral.status === "pending" ? "Menunggu" : "Ditindaklanjuti") : "Belum ada",
      date: lastReferral ? fmtDate(lastReferral.created_at) : null,
      done: !!lastReferral,
    },
  ];

  const activities = [
    lastScreening && {
      label: "Skrining Mental",
      sub: "Selesai",
      tone: "green" as Tone,
      icon: Brain,
      date: fmtDate(lastScreening.completed_at),
      time: fmtTime(lastScreening.completed_at),
    },
    lastCbt && {
      label: "Tes CBT",
      sub: `Selesai - Skor ${Math.round(Number(lastCbt.percentage ?? 0))}%`,
      tone: "blue" as Tone,
      icon: ClipboardList,
      date: fmtDate(lastCbt.completed_at ?? lastCbt.created_at),
      time: fmtTime(lastCbt.completed_at ?? lastCbt.created_at),
    },
    lastReferral && {
      label: "Konseling",
      sub: lastReferral.status === "pending" ? "Menunggu tindak lanjut" : "Ditindaklanjuti",
      tone: "coral" as Tone,
      icon: HeartPulse,
      date: fmtDate(lastReferral.created_at),
      time: fmtTime(lastReferral.created_at),
    },
    {
      label: "Psikotes",
      sub: lastPsikotes ? "Selesai" : "Belum dikerjakan",
      tone: "purple" as Tone,
      icon: Puzzle,
      date: lastPsikotes ? fmtDate(lastPsikotes.completed_at) : "-",
      time: lastPsikotes ? fmtTime(lastPsikotes.completed_at) : "",
    },
  ].filter(Boolean) as {
    label: string;
    sub: string;
    tone: Tone;
    icon: typeof Brain;
    date: string;
    time: string;
  }[];

  const profileDetails = [
    profile?.graduation_year && { icon: CalendarDays, text: `Angkatan ${profile.graduation_year}` },
    profile?.school_origin && { icon: School, text: profile.school_origin },
    profile?.gender && { icon: UserIcon, text: profile.gender },
    profile?.education_level && { icon: GraduationCap, text: profile.education_level },
  ].filter(Boolean) as { icon: typeof School; text: string }[];

  /* ---- skeleton / error state ---- */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--muted))]/40">
        <div className="mx-auto w-full max-w-[1600px] animate-pulse px-4 py-6 md:px-7 md:py-7">
          <div className="mb-5 h-7 w-56 rounded-md bg-muted" />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="h-40 rounded-xl border border-border bg-card" />
                <div className="h-40 rounded-xl border border-border bg-card" />
              </div>
              <div className="h-64 rounded-xl border border-border bg-card" />
              <div className="h-48 rounded-xl border border-border bg-card" />
            </div>
            <div className="h-72 rounded-xl border border-border bg-card" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[hsl(var(--muted))]/40">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-10 md:px-7">
          <Card className="mx-auto max-w-md p-6 text-center">
            <h2 className="font-heading text-base font-semibold text-foreground">
              Gagal memuat data dashboard
            </h2>
            <p className="mt-1.5 text-[12.5px] text-muted-foreground">
              Periksa koneksi Anda lalu coba muat ulang halaman.
            </p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Muat Ulang
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-[hsl(var(--muted))]/40">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-7 md:py-7">
        {/* Header */}
        <header className="mb-5">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-[26px]">
            Dashboard {roleLabel}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground md:text-[13px]">
            Pantau aktivitas, hasil layanan, dan perkembangan Anda.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_330px]">
          {/* -------- Left column -------- */}
          <div className="space-y-5">
            {/* Profile + Ringkasan */}
            <div className="grid gap-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <Card className="p-5">
                <div className="flex items-center gap-4">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={fullName}
                      className="h-[92px] w-[92px] shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-heading text-lg font-bold text-foreground">
                        {fullName}
                      </h2>
                      <Badge tone="green">{roleLabel} Aktif</Badge>
                    </div>
                    <ul className="mt-2.5 space-y-1.5">
                      {profileDetails.length ? (
                        profileDetails.map((d) => (
                          <li
                            key={d.text}
                            className="flex items-center gap-2 text-[12.5px] text-foreground/80"
                          >
                            <d.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
                            <span className="truncate">{d.text}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-[12px] text-muted-foreground">
                          Lengkapi data profil Anda.
                        </li>
                      )}
                    </ul>
                    <Link
                      to="/profil"
                      className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
                    >
                      Kelola Profil <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 font-heading text-[15px] font-semibold text-foreground">
                  Ringkasan Layanan
                </h3>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {summary.map((s) => (
                    <div key={s.label} className="rounded-[10px] border border-border p-3">
                      <div className="flex items-start gap-2">
                        <IconBox tone={s.tone} icon={s.icon} size="sm" />
                        <p className="text-[11.5px] font-medium leading-tight text-foreground">
                          {s.label}
                        </p>
                      </div>
                      <p
                        className={`mt-2.5 text-[12px] font-semibold ${
                          s.done ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {s.status}
                      </p>
                      {s.date && <p className="text-[11px] text-muted-foreground">{s.date}</p>}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Panggilan Konseling & Notifikasi */}
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <IconBox tone="coral" icon={HeartPulse} size="sm" />
                <h3 className="font-heading text-[15px] font-semibold text-foreground">
                  Panggilan Konseling & Notifikasi
                </h3>
                {unreadCount > 0 && <Badge tone="coral">{unreadCount} baru</Badge>}
              </div>

              {calls.length === 0 && (notifications ?? []).length === 0 ? (
                <p className="text-[12px] text-muted-foreground">
                  Belum ada panggilan konseling atau notifikasi untuk Anda.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {calls.map((c: any) => (
                    <div
                      key={c.id}
                      className="rounded-[10px] border border-rose-100 bg-rose-50/60 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[12.5px] font-semibold text-foreground">
                          Anda dipanggil untuk sesi konseling
                        </p>
                        <Badge tone={levelTone(c.level)}>Level: {c.level}</Badge>
                        <Badge tone="amber">{c.status}</Badge>
                      </div>
                      <p className="mt-1 text-[11.5px] text-muted-foreground">{c.reason}</p>
                      {c.notes && (
                        <p className="mt-1 text-[11.5px] text-foreground/80">Pesan konselor: {c.notes}</p>
                      )}
                      <p className="mt-1 text-[10.5px] text-muted-foreground">
                        {fmtDate(c.created_at)} • {fmtTime(c.created_at)}
                      </p>
                    </div>
                  ))}
                  {(notifications ?? []).map((n: any) => (
                    <div
                      key={n.id}
                      className={`rounded-[10px] border p-3 ${
                        n.read ? "border-border" : "border-primary/30 bg-primary/5"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Bell className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.8} />
                        <p className="text-[12.5px] font-semibold text-foreground">{n.title}</p>
                      </div>
                      {n.message && (
                        <p className="mt-1 text-[11.5px] text-muted-foreground">{n.message}</p>
                      )}
                      <p className="mt-1 text-[10.5px] text-muted-foreground">
                        {fmtDate(n.created_at)} • {fmtTime(n.created_at)}
                      </p>
                    </div>
                  ))}
                  {unreadCount > 0 && (
                    <Button size="sm" variant="outline" onClick={markAllRead}>
                      Tandai semua sudah dibaca
                    </Button>
                  )}
                </div>
              )}
            </Card>

            {/* Layanan Saya */}

            <Card className="p-5">
              <h3 className="mb-4 font-heading text-[15px] font-semibold text-foreground">
                Layanan Saya
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {/* Skrining Mental */}
                <div className="flex flex-col rounded-[10px] border border-border p-4">
                  <div className="flex items-center gap-2.5">
                    <IconBox tone="green" icon={Brain} />
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">Skrining Mental</p>
                      <p className="text-[11px] text-muted-foreground">
                        {lastScreening
                          ? `Terakhir dikerjakan: ${fmtDate(lastScreening.completed_at)}`
                          : "Belum mengerjakan"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex-1">
                    {(Object.keys(SCREENING_META) as ScreeningKind[]).map((k) => {
                      const r = screening[k];
                      return (
                        <div key={k} className="mb-2 last:mb-0">
                          <p className="text-[11.5px] font-semibold text-foreground">
                            {SCREENING_META[k].label}
                          </p>
                          <div className="flex items-center justify-between gap-2 border-b border-border/60 py-1.5">
                            <span className="text-[11px] text-muted-foreground">Skor</span>
                            <span className="flex items-center gap-2">
                              <span className="text-[12px] font-semibold text-foreground">
                                {r ? r.score : "-"}
                              </span>
                              <Badge tone={r ? levelTone(r.level) : "slate"}>
                                {r?.level ?? "Belum"}
                              </Badge>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full text-[12px]">
                    <Link to="/psikotes">{lastScreening ? "Lihat Hasil" : "Mulai Skrining"}</Link>
                  </Button>
                </div>

                {/* Tes CBT */}
                <div className="flex flex-col rounded-[10px] border border-border p-4">
                  <div className="flex items-center gap-2.5">
                    <IconBox tone="blue" icon={ClipboardList} />
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">Tes CBT</p>
                      <p className="text-[11px] text-muted-foreground">
                        {lastCbt
                          ? `Terakhir dikerjakan: ${fmtDate(lastCbt.completed_at ?? lastCbt.created_at)}`
                          : "Belum dikerjakan"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex-1">
                    {lastCbt ? (
                      <>
                        <Row label="Nama Tes" value={lastCbt.cbt_tests?.title ?? "-"} />
                        <Row
                          label="Skor"
                          value={`${lastCbt.total_score} / ${lastCbt.max_score}`}
                        />
                        <Row
                          label="Persentase"
                          value={`${Math.round(Number(lastCbt.percentage ?? 0))}%`}
                        />
                        <Row
                          label="Status"
                          value={
                            <Badge tone={lastCbt.passed ? "green" : "coral"}>
                              {lastCbt.passed ? "Lulus" : "Belum Lulus"}
                            </Badge>
                          }
                        />
                      </>
                    ) : (
                      <p className="py-6 text-center text-[12px] text-muted-foreground">
                        Tes CBT belum dikerjakan.
                      </p>
                    )}
                  </div>
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full text-[12px]">
                    <Link to="/cbt">{lastCbt ? "Lihat Hasil" : "Mulai Tes"}</Link>
                  </Button>
                </div>

                {/* Psikotes */}
                <div className="flex flex-col rounded-[10px] border border-border p-4">
                  <div className="flex items-center gap-2.5">
                    <IconBox tone="purple" icon={Puzzle} />
                    <p className="text-[13px] font-semibold text-foreground">Psikotes</p>
                  </div>
                  <div className="mt-3 flex-1">
                    <Row
                      label="Status"
                      value={
                        <Badge tone={lastPsikotes ? "green" : "amber"}>
                          {lastPsikotes ? "Selesai" : "Belum Dikerjakan"}
                        </Badge>
                      }
                    />
                    {lastPsikotes ? (
                      <>
                        <Row label="Tanggal" value={fmtDate(lastPsikotes.completed_at)} />
                        <Row label="Hasil" value={lastPsikotes.level ?? "-"} />
                      </>
                    ) : (
                      <p className="py-6 text-center text-[12px] text-muted-foreground">
                        Psikotes belum dikerjakan.
                      </p>
                    )}
                  </div>
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full text-[12px]">
                    <Link to="/psikotes">{lastPsikotes ? "Lihat Hasil" : "Mulai Psikotes"}</Link>
                  </Button>
                </div>

                {/* Konseling */}
                <div className="flex flex-col rounded-[10px] border border-border p-4">
                  <div className="flex items-center gap-2.5">
                    <IconBox tone="coral" icon={HeartPulse} />
                    <p className="text-[13px] font-semibold text-foreground">Konseling</p>
                  </div>
                  <div className="mt-3 flex-1">
                    {lastReferral ? (
                      <>
                        <Row
                          label="Status"
                          value={
                            <Badge tone={lastReferral.status === "pending" ? "blue" : "green"}>
                              {lastReferral.status === "pending" ? "Menunggu" : "Ditindaklanjuti"}
                            </Badge>
                          }
                        />
                        <Row label="Diajukan" value={fmtDate(lastReferral.created_at)} />
                        <Row label="Pukul" value={fmtTime(lastReferral.created_at)} />
                        <Row label="Tingkat" value={lastReferral.level ?? "-"} />
                      </>
                    ) : (
                      <p className="py-6 text-center text-[12px] text-muted-foreground">
                        Belum ada jadwal konseling.
                      </p>
                    )}
                  </div>
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full text-[12px]">
                    <Link to="/psikotes">{lastReferral ? "Lihat Detail" : "Ajukan Konseling"}</Link>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Catatan & Rekomendasi */}
            {/* Status setelah lulus + grafik alumni */}
            <GraduateStatusCard />
            <AlumniInsight />

            {/* Catatan & Rekomendasi */}
            <Card className="p-5">
              <h3 className="mb-3 font-heading text-[15px] font-semibold text-foreground">
                Catatan &amp; Rekomendasi
              </h3>
              <div className="rounded-[10px] border-l-4 border-primary bg-primary/5 p-4">
                <div className="flex gap-3">
                  <Quote className="h-4 w-4 shrink-0 text-primary/60" />
                  <div className="text-[12.5px] leading-relaxed text-foreground/80">
                    <p>
                      Terus tingkatkan perkembangan dirimu. Manfaatkan layanan yang tersedia untuk
                      meraih masa depan yang lebih baik.
                    </p>
                    <p className="mt-2 text-[12px] text-muted-foreground">– Career Center PEDULI</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* -------- Right column -------- */}
          <div className="space-y-5">
            <Card className="p-5">
              <h3 className="mb-2 font-heading text-[15px] font-semibold text-foreground">
                Aktivitas Terbaru
              </h3>
              <div className="rounded-[10px] border border-border">
                {activities.map((a, i) => (
                  <div
                    key={`${a.label}-${i}`}
                    className="flex items-center gap-3 border-b border-border/70 px-3 py-2.5 last:border-0"
                  >
                    <IconBox tone={a.tone} icon={a.icon} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-foreground">{a.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{a.sub}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-muted-foreground">{a.date}</p>
                      <p className="text-[11px] text-muted-foreground">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to="/psikotes"
                className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-medium text-primary hover:underline"
              >
                Lihat Semua Aktivitas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Card>

            <Card className="p-5">
              <h3 className="font-heading text-[15px] font-semibold text-foreground">
                Jelajahi Alumni
              </h3>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                Temukan informasi alumni untuk inspirasi masa depanmu.
              </p>
              <div className="mt-3 space-y-2.5">
                {[
                  { icon: Users, title: "Lihat Alumni", desc: "Lihat profil alumni", to: "/alumni" },
                  {
                    icon: Clock,
                    title: "Tracer Study",
                    desc: "Lihat perjalanan karier alumni",
                    to: "/tracer",
                  },
                  {
                    icon: Building2,
                    title: "Universitas",
                    desc: "Lihat universitas alumni",
                    to: "/universities",
                  },
                ].map((s) => (
                  <Link
                    key={s.to}
                    to={s.to}
                    className="flex items-center gap-3 rounded-[10px] px-1 py-1.5 transition-colors hover:bg-muted/60"
                  >
                    <IconBox tone="green" icon={s.icon} size="sm" />
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-foreground">{s.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{s.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
              <Button asChild className="mt-4 w-full">
                <Link to="/alumni">Jelajahi Sekarang</Link>
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SantriDashboard;
