import { useState, useRef, useEffect } from "react";
import { Send, Plus, Trash2, Bot, User as UserIcon, Loader2, Briefcase, GraduationCap, Building, Heart, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Msg = { role: "user" | "assistant"; content: string };

const MODES = [
  { id: "umum", label: "Umum", icon: Sparkles },
  { id: "kerja", label: "Kerja", icon: Briefcase },
  { id: "kuliah", label: "Kuliah", icon: GraduationCap },
  { id: "perguruan_tinggi", label: "PT & Kedinasan", icon: Building },
  { id: "psikotes", label: "Konseling Mental", icon: Heart },
  { id: "minat_bakat", label: "Minat Bakat", icon: Sparkles },
  { id: "alumni", label: "Data Alumni", icon: Users },
];

const Chat = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [guestMode, setGuestMode] = useState<string>("umum");
  const [guestMessages, setGuestMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: threads = [] } = useQuery({
    queryKey: ["chat-threads", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("chat_threads").select("*").order("updated_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages", activeId],
    queryFn: async () => {
      if (!activeId) return [];
      const { data } = await supabase.from("chat_messages").select("*").eq("thread_id", activeId).order("created_at");
      return data ?? [];
    },
    enabled: !!activeId,
  });

  const active = threads.find((t) => t.id === activeId);

  useEffect(() => {
    if (!activeId && threads.length > 0) setActiveId(threads[0].id);
  }, [threads, activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => { inputRef.current?.focus(); }, [activeId]);

  const handleNew = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("chat_threads").insert({ user_id: user.id, mode: active?.mode ?? "umum" }).select().single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["chat-threads"] });
    setActiveId(data.id);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("chat_threads").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["chat-threads"] });
    if (id === activeId) setActiveId(null);
  };

  const setMode = async (mode: string) => {
    if (!user) { setGuestMode(mode); return; }
    if (!activeId) return;
    await supabase.from("chat_threads").update({ mode }).eq("id", activeId);
    qc.invalidateQueries({ queryKey: ["chat-threads"] });
  };

  const displayMessages: any[] = user ? messages : guestMessages.map((m, i) => ({ id: `g-${i}`, ...m }));
  const displayMode = user ? (active?.mode ?? "umum") : guestMode;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    // Guest mode: no DB, just call edge function
    if (!user) {
      const newMsgs: Msg[] = [...guestMessages, { role: "user", content: text }];
      setGuestMessages(newMsgs);
      setInput("");
      setSending(true);
      try {
        const { data, error } = await supabase.functions.invoke("chat-ai", {
          body: { messages: newMsgs, mode: guestMode },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setGuestMessages([...newMsgs, { role: "assistant", content: data.reply }]);
      } catch (e: any) {
        toast.error(e.message || "Gagal mengirim pesan");
      } finally {
        setSending(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }

    let threadId = activeId;
    let threadMode = active?.mode ?? "umum";
    const isFirst = messages.length === 0;

    if (!threadId) {
      const { data } = await supabase.from("chat_threads").insert({ user_id: user.id, mode: threadMode, title: text.slice(0, 40) }).select().single();
      if (!data) return;
      threadId = data.id;
      setActiveId(threadId);
    } else if (isFirst) {
      await supabase.from("chat_threads").update({ title: text.slice(0, 40) }).eq("id", threadId);
    }

    await supabase.from("chat_messages").insert({ thread_id: threadId, user_id: user.id, role: "user", content: text });
    qc.invalidateQueries({ queryKey: ["chat-messages", threadId] });
    qc.invalidateQueries({ queryKey: ["chat-threads"] });
    setInput("");
    setSending(true);

    try {
      const historyForAI: Msg[] = [...messages.map((m: any) => ({ role: m.role, content: m.content })), { role: "user", content: text }];
      const { data, error } = await supabase.functions.invoke("chat-ai", {
        body: { messages: historyForAI, mode: threadMode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await supabase.from("chat_messages").insert({ thread_id: threadId, user_id: user.id, role: "assistant", content: data.reply });
      await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
      qc.invalidateQueries({ queryKey: ["chat-messages", threadId] });
      qc.invalidateQueries({ queryKey: ["chat-threads"] });
    } catch (e: any) {
      toast.error(e.message || "Gagal mengirim pesan");
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memuat...</div>;

  return (
    <div className="min-h-[calc(100vh-4rem)] gradient-bg-subtle">
      <div className="w-full max-w-[1600px] mx-auto px-2 sm:px-4 py-2 md:py-5">
        <div className={`grid grid-cols-1 ${user ? "lg:grid-cols-[240px_1fr]" : ""} gap-3 h-[calc(100dvh-5rem)] md:h-[calc(100vh-6rem)]`}>

          {user && (
            <aside className="glass-card rounded-xl p-3 flex flex-col">
              <Button onClick={handleNew} className="w-full mb-3">
                <Plus className="h-4 w-4 mr-2" /> Percakapan Baru
              </Button>
              <ScrollArea className="flex-1 -mx-1 px-1">
                <div className="space-y-1">
                  {threads.map((t: any) => (
                    <div
                      key={t.id}
                      className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        t.id === activeId ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                      }`}
                      onClick={() => setActiveId(t.id)}
                    >
                      <Bot className="h-4 w-4 shrink-0 opacity-60" />
                      <span className="text-sm truncate flex-1">{t.title}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {threads.length === 0 && <p className="text-xs text-muted-foreground p-3">Belum ada percakapan. Mulai chat untuk membuat.</p>}
                </div>
              </ScrollArea>
            </aside>
          )}

          <main className="glass-card rounded-xl flex flex-col overflow-hidden">
            {!user && (
              <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">Mode tamu — riwayat tidak disimpan.</span>
                <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => navigate("/auth")}>Login untuk menyimpan</Button>
              </div>
            )}
            <div className="p-3 border-b border-border flex flex-wrap gap-2">
              {MODES.map((m) => {
                const Icon = m.icon;
                const isActive = displayMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isActive ? "gradient-bg text-primary-foreground shadow-md" : "bg-muted hover:bg-accent text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {displayMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
                  <div className="h-16 w-16 rounded-2xl gradient-bg flex items-center justify-center mb-4">
                    <Bot className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h2 className="font-heading text-2xl font-bold mb-2">Assalamu'alaikum 👋</h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    Saya asisten AI Career Center PEDULI. Pilih kategori di atas lalu ajukan pertanyaan.
                  </p>
                  <Badge variant="secondary">Mode: {MODES.find((m) => m.id === displayMode)?.label}</Badge>
                </div>
              )}
              {displayMessages.map((m: any) => (
                <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                  {m.role === "assistant" && (
                    <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-2.5 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                  {m.role === "user" && (
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <UserIcon className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {sending && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Sedang berpikir...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border">
              <div className="flex gap-2 items-end">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  placeholder="Tulis pertanyaan kamu..."
                  className="min-h-[44px] max-h-32 resize-none"
                  disabled={sending}
                />
                <Button onClick={handleSend} disabled={sending || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Chat;
