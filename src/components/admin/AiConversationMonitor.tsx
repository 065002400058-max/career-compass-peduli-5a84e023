import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Bot, Eye, MessageSquare, RefreshCw, Search, ShieldCheck, User } from "lucide-react";

type Thread = {
  thread_id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  user_role: string;
  title: string;
  mode: string;
  message_count: number;
  created_at: string;
  last_message_at: string;
};

type Message = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

type AuditRow = {
  id: string;
  admin_name: string;
  target_name: string;
  thread_id: string | null;
  action: string;
  created_at: string;
};

const fmt = (d: string) =>
  new Date(d).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

/**
 * Kontrol pengawasan admin: meninjau isi percakapan Asisten AI.
 * Semua pembukaan percakapan dicatat otomatis pada audit akses AI.
 */
const AiConversationMonitor = () => {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [openThread, setOpenThread] = useState<Thread | null>(null);

  const threads = useQuery({
    queryKey: ["admin-ai-threads", query],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ai_admin_threads", {
        _search: query || null,
        _limit: 200,
      });
      if (error) throw error;
      return (data ?? []) as Thread[];
    },
  });

  const messages = useQuery({
    queryKey: ["admin-ai-thread-messages", openThread?.thread_id],
    enabled: !!openThread,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ai_admin_thread_messages", {
        _thread_id: openThread!.thread_id,
      });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  const audit = useQuery({
    queryKey: ["admin-ai-access-audit"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ai_admin_access_audit", { _limit: 50 });
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const rows = threads.data ?? [];

  return (
    <div className="space-y-4 min-w-0">
      <Card className="min-w-0">
        <CardHeader className="pb-2 flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> Percakapan Asisten AI
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              threads.refetch();
              audit.refetch();
            }}
            disabled={threads.isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${threads.isFetching ? "animate-spin" : ""}`} />
            Muat Ulang
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search.trim());
            }}
          >
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, email, atau judul percakapan"
                className="pl-8 h-10"
              />
            </div>
            <Button type="submit" className="h-10">Cari</Button>
          </form>

          {threads.isError && (
            <p className="text-sm text-destructive">Gagal memuat daftar percakapan.</p>
          )}

          {threads.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada percakapan.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((t) => (
                <button
                  key={t.thread_id}
                  onClick={() => setOpenThread(t)}
                  className="w-full text-left rounded-lg border border-border bg-card p-3 hover:bg-muted/60 transition-colors min-w-0"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {t.user_name}
                        {t.user_email && (
                          <span className="text-muted-foreground font-normal"> · {t.user_email}</span>
                        )}
                      </p>
                      <p className="text-[12px] text-muted-foreground truncate">{t.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-[10px] capitalize">{t.user_role}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {t.mode.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {t.message_count} pesan · {fmt(t.last_message_at)}
                        </span>
                      </div>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Audit Akses Admin
          </CardTitle>
        </CardHeader>
        <CardContent>
          {audit.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (audit.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada aktivitas peninjauan.</p>
          ) : (
            <div className="divide-y divide-border">
              {(audit.data ?? []).map((a) => (
                <div key={a.id} className="py-2 text-[12px] min-w-0">
                  <p className="text-foreground truncate">
                    <span className="font-medium">{a.admin_name}</span> meninjau percakapan{" "}
                    <span className="font-medium">{a.target_name}</span>
                  </p>
                  <p className="text-muted-foreground text-[11px]">{fmt(a.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!openThread} onOpenChange={(o) => !o && setOpenThread(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base truncate">{openThread?.title}</DialogTitle>
            <DialogDescription className="text-[12px]">
              {openThread?.user_name}
              {openThread?.user_email ? ` · ${openThread.user_email}` : ""} · mode{" "}
              {openThread?.mode.replace(/_/g, " ")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
            {messages.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : messages.isError ? (
              <p className="text-sm text-destructive">Gagal memuat isi percakapan.</p>
            ) : (messages.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Percakapan kosong.</p>
            ) : (
              (messages.data ?? []).map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl p-3 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
                    m.role === "user"
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted/60 border border-border"
                  }`}
                >
                  <p className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                    {m.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                    {m.role === "user" ? "Pengguna" : "AI PEDULI"} · {fmt(m.created_at)}
                  </p>
                  {m.content}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AiConversationMonitor;
