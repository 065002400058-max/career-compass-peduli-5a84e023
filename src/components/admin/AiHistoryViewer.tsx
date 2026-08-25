import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Lock, MessageSquare, RefreshCw, Users } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

type Stats = {
  threads: number;
  messages: number;
  users: number;
  active_users_7d: number;
  messages_7d: number;
  by_role: Record<string, number>;
  by_mode: Record<string, number>;
  daily: { date: string; messages: number }[];
};

const COLORS = ["hsl(var(--primary))", "#2563eb", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

const fmtDay = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

/**
 * Statistik agregat pemakaian Asisten AI.
 * Isi percakapan pribadi santri/alumni TIDAK dapat dibuka oleh admin
 * (dibatasi oleh RLS: hanya pemilik percakapan yang bisa membacanya).
 */
const AiHistoryViewer = () => {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-ai-usage-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ai_usage_stats");
      if (error) throw error;
      return data as unknown as Stats;
    },
  });

  const roleData = Object.entries(data?.by_role ?? {}).map(([name, value]) => ({ name, value }));
  const modeData = Object.entries(data?.by_mode ?? {}).map(([name, value]) => ({
    name: name.replace(/_/g, " "),
    value,
  }));
  const daily = data?.daily ?? [];

  const summary = [
    { label: "Total Percakapan", value: data?.threads ?? 0, icon: MessageSquare },
    { label: "Total Pesan", value: data?.messages ?? 0, icon: Bot },
    { label: "Pengguna Memakai AI", value: data?.users ?? 0, icon: Users },
    { label: "Aktif 7 Hari", value: data?.active_users_7d ?? 0, icon: Users },
    { label: "Pesan 7 Hari", value: data?.messages_7d ?? 0, icon: Bot },
  ];

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> Statistik Asisten AI
          </h2>
          <p className="text-sm text-muted-foreground">
            Ringkasan pemakaian AI PEDULI berdasarkan peran dan mode layanan.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} /> Muat Ulang
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-3 flex gap-2">
        <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Admin dapat meninjau isi percakapan sebagai fungsi kontrol dan pengawasan.
          Setiap kali percakapan dibuka, aktivitas tercatat otomatis pada Audit Akses Admin.
        </p>
      </div>


      {isError && (
        <p className="text-sm text-destructive">Gagal memuat statistik AI.</p>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {summary.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4 min-w-0">
            <s.icon className="h-4 w-4 text-primary" />
            <p className="mt-2 font-heading text-xl font-bold text-foreground">
              {isLoading ? <Skeleton className="h-6 w-12" /> : s.value.toLocaleString("id-ID")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader className="pb-2"><CardTitle className="text-base">Pesan 30 Hari Terakhir</CardTitle></CardHeader>
          <CardContent className="h-[260px]">
            {isLoading ? <Skeleton className="h-full w-full" /> : daily.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada pemakaian AI.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtDay} fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip labelFormatter={(v) => fmtDay(String(v))} />
                  <Bar dataKey="messages" name="Pesan" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-2"><CardTitle className="text-base">Pemakaian per Peran</CardTitle></CardHeader>
          <CardContent className="h-[260px]">
            {isLoading ? <Skeleton className="h-full w-full" /> : roleData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                    {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0">
        <CardHeader className="pb-2"><CardTitle className="text-base">Percakapan per Mode Layanan</CardTitle></CardHeader>
        <CardContent className="h-[260px]">
          {isLoading ? <Skeleton className="h-full w-full" /> : modeData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modeData} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} fontSize={11} />
                <YAxis type="category" dataKey="name" fontSize={11} width={110} />
                <Tooltip />
                <Bar dataKey="value" name="Percakapan" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <AiConversationMonitor />
    </div>

  );
};

export default AiHistoryViewer;
