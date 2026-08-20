import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Search, User as UserIcon, MessageSquare, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

const MODES = ["umum", "kerja", "kuliah", "perguruan_tinggi", "psikotes", "minat_bakat", "alumni"];

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-";

const AiHistoryViewer = () => {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("all");
  const [role, setRole] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-ai-threads"],
    queryFn: async () => {
      const { data: threads, error } = await supabase
        .from("chat_threads")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const ids = [...new Set((threads ?? []).map((t: any) => t.user_id))];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email, role").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      return (threads ?? []).map((t: any) => ({ ...t, profile: map.get(t.user_id) ?? null }));
    },
  });

  const threads = data ?? [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return threads.filter((t: any) => {
      if (mode !== "all" && t.mode !== mode) return false;
      if (role !== "all" && (t.profile?.role ?? "santri") !== role) return false;
      if (!term) return true;
      return [t.title, t.profile?.full_name, t.profile?.email]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(term));
    });
  }, [threads, q, mode, role]);

  const active = filtered.find((t: any) => t.id === activeId) ?? null;

  const { data: messages = [], isLoading: loadingMsg } = useQuery({
    queryKey: ["admin-ai-messages", activeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("thread_id", activeId as string)
        .order("created_at");
      if (error) throw error;

      // Jejak audit: siapa admin yang membuka percakapan siapa, kapan
      const { data: me } = await supabase.auth.getUser();
      if (me?.user) {
        await supabase.from("ai_access_audit").insert({
          admin_id: me.user.id,
          thread_id: activeId as string,
          target_user_id: (active as any)?.user_id ?? null,
          action: "view_thread",
        });
      }

      return data ?? [];
    },
    enabled: !!activeId,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-3 md:p-4 flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama, email, atau judul percakapan..."
            className="pl-9 h-9"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-9 rounded-md border border-border bg-card px-2 text-xs text-foreground"
          aria-label="Filter peran"
        >
          <option value="all">Semua Peran</option>
          <option value="santri">Santri</option>
          <option value="alumni">Alumni</option>
          <option value="mitra">Mitra</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="h-9 rounded-md border border-border bg-card px-2 text-xs text-foreground"
          aria-label="Filter mode"
        >
          <option value="all">Semua Mode</option>
          {MODES.map((m) => (
            <option key={m} value={m}>{m.replace("_", " ")}</option>
          ))}
        </select>
        <Button variant="outline" size="sm" className="h-9" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} /> Muat Ulang
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-3 py-2 text-xs font-semibold bg-muted/40 text-foreground">
            Percakapan ({filtered.length})
          </div>
          <ScrollArea className="h-[420px] lg:h-[560px]">
            <div className="divide-y divide-border">
              {isLoading && (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              )}
              {isError && <p className="p-4 text-sm text-destructive">Gagal memuat histori AI.</p>}
              {!isLoading && !isError && filtered.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">Belum ada percakapan yang cocok.</p>
              )}
              {filtered.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={`w-full text-left px-3 py-2.5 transition-colors ${
                    t.id === activeId ? "bg-accent" : "hover:bg-muted/60"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-[13px] font-medium text-foreground truncate flex-1">{t.title || "Tanpa judul"}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground truncate max-w-[170px]">
                      {t.profile?.full_name ?? t.profile?.email ?? "Pengguna"}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t.profile?.role ?? "santri"}</Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{String(t.mode).replace("_", " ")}</Badge>
                  </span>
                  <span className="block text-[10px] text-muted-foreground mt-1">{fmt(t.updated_at)}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="rounded-lg border border-border bg-card flex flex-col overflow-hidden">
          {!active ? (
            <div className="h-[420px] lg:h-[560px] flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
              <Bot className="h-8 w-8 opacity-40" />
              <p className="text-sm">Pilih percakapan untuk melihat isi histori AI.</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border">
                <h3 className="font-heading text-sm font-semibold text-foreground truncate">{active.title || "Tanpa judul"}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <UserIcon className="h-3 w-3" />
                  {active.profile?.full_name ?? "Pengguna"} · {active.profile?.email ?? "-"} · dibuat {fmt(active.created_at)}
                </p>
              </div>
              <ScrollArea className="h-[360px] lg:h-[500px]">
                <div className="p-4 space-y-3">
                  {loadingMsg && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-2/3" />)}
                  {!loadingMsg && messages.length === 0 && (
                    <p className="text-sm text-muted-foreground">Percakapan ini belum memiliki pesan.</p>
                  )}
                  {messages.map((m: any) => (
                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}
                      >
                        <div className="prose prose-sm max-w-none dark:prose-invert [&_*]:!text-inherit">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                        <p className="text-[10px] opacity-70 mt-1">{fmt(m.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiHistoryViewer;
