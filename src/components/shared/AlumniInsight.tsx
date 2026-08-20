import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { alumniSummary, cleanVal } from "@/lib/alumniStatus";
import { useAlumniRealtime } from "@/hooks/useAlumniRealtime";

const COLORS = ["#059669", "#0ea5e9", "#8b5cf6", "#f59e0b", "#94a3b8"];

/** Grafik agregat alumni (dipakai di dashboard santri & alumni). */
const AlumniInsight = () => {
  useAlumniRealtime();
  const { data: rows = [] } = useQuery({
    queryKey: ["alumni-dashboard-agg"],
    queryFn: async () => (await supabase.rpc("alumni_directory")).data ?? [],
  });

  const s = alumniSummary(rows as any[]);

  const byYear = Object.entries(
    (rows as any[]).reduce<Record<string, number>>((acc, r) => {
      const y = cleanVal(r.graduation_year) ?? "-";
      if (y !== "-") acc[y] = (acc[y] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .slice(-8)
    .map(([name, value]) => ({ name, value }));

  const byUniv = Object.entries(
    (rows as any[]).reduce<Record<string, number>>((acc, r) => {
      const u = cleanVal(r.university);
      if (u) acc[u] = (acc[u] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  const kpi = [
    { label: "Total Alumni", value: s.total, color: "text-foreground" },
    { label: "Bekerja / Wirausaha", value: s.bekerja, color: "text-emerald-600" },
    { label: "Melanjutkan Studi", value: s.lanjut, color: "text-blue-600" },
    { label: "Belum Mengisi Tracer", value: s.belumMengisi, color: "text-amber-600" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-[15px] font-semibold text-foreground">Statistik Alumni</h3>
        <span className="text-[11px] text-muted-foreground">
          Partisipasi tracer {s.tracerRate}%
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpi.map((k) => (
          <div key={k.label} className="rounded-[10px] border border-border p-3">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <p className={`mt-1 font-heading text-lg font-bold ${k.color}`}>
              {k.value.toLocaleString("id-ID")}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-3">
        <div>
          <p className="mb-2 text-[12px] font-semibold text-foreground">Status Alumni</p>
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={s.chart} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62}>
                  {s.chart.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[12px] font-semibold text-foreground">Alumni per Angkatan</p>
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byYear}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[12px] font-semibold text-foreground">Top Kampus Alma Mater</p>
          <div className="space-y-2 pt-1">
            {byUniv.length ? (
              byUniv.map((u) => (
                <div key={u.name}>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-foreground/80">{u.name}</span>
                    <span className="shrink-0 font-semibold text-foreground">{u.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(u.value / byUniv[0].value) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[12px] text-muted-foreground">Belum ada data kampus.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlumniInsight;
