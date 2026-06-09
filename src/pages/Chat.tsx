import { useState, useRef, useEffect } from "react";
import { Send, Plus, Trash2, Bot, User as UserIcon, Loader2, Briefcase, GraduationCap, Building, Heart, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };
type Thread = { id: string; title: string; mode: string; messages: Msg[] };

const MODES = [
  { id: "umum", label: "Umum", icon: Sparkles },
  { id: "kerja", label: "Kerja", icon: Briefcase },
  { id: "kuliah", label: "Kuliah", icon: GraduationCap },
  { id: "perguruan_tinggi", label: "PT & Kedinasan", icon: Building },
  { id: "psikotes", label: "Konseling Mental", icon: Heart },
  { id: "minat_bakat", label: "Minat Bakat", icon: Sparkles },
  { id: "alumni", label: "Data Alumni", icon: Users },
];

const newThread = (mode = "umum"): Thread => ({
  id: crypto.randomUUID(),
  title: "Percakapan Baru",
  mode,
  messages: [],
});

const Chat = () => {
  const [threads, setThreads] = useState<Thread[]>([newThread()]);
  const [activeId, setActiveId] = useState<string>(threads[0].id);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const active = threads.find((t) => t.id === activeId) ?? threads[0];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active.messages, sending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeId]);

  const updateActive = (updater: (t: Thread) => Thread) =>
    setThreads((prev) => prev.map((t) => (t.id === activeId ? updater(t) : t)));

  const handleNew = () => {
    const t = newThread(active.mode);
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
  };

  const handleDelete = (id: string) => {
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        const fresh = newThread();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  const setMode = (mode: string) => updateActive((t) => ({ ...t, mode }));

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg: Msg = { role: "user", content: text };
    const isFirst = active.messages.length === 0;
    updateActive((t) => ({
      ...t,
      title: isFirst ? text.slice(0, 40) : t.title,
      messages: [...t.messages, userMsg],
    }));
    setInput("");
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat-ai", {
        body: { messages: [...active.messages, userMsg], mode: active.mode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      updateActive((t) => ({
        ...t,
        messages: [...t.messages, { role: "assistant", content: data.reply }],
      }));
    } catch (e: any) {
      toast.error(e.message || "Gagal mengirim pesan");
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memuat...</div>;

  return (
    <div className="min-h-[calc(100vh-4rem)] gradient-bg-subtle">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-7rem)]">
          {/* Sidebar */}
          <aside className="glass-card rounded-xl p-3 flex flex-col">
            <Button onClick={handleNew} className="w-full mb-3">
              <Plus className="h-4 w-4 mr-2" /> Percakapan Baru
            </Button>
            <ScrollArea className="flex-1 -mx-1 px-1">
              <div className="space-y-1">
                {threads.map((t) => (
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
              </div>
            </ScrollArea>
          </aside>

          {/* Chat area */}
          <main className="glass-card rounded-xl flex flex-col overflow-hidden">
            {/* Mode selector */}
            <div className="p-3 border-b border-border flex flex-wrap gap-2">
              {MODES.map((m) => {
                const Icon = m.icon;
                const isActive = active.mode === m.id;
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

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {active.messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
                  <div className="h-16 w-16 rounded-2xl gradient-bg flex items-center justify-center mb-4">
                    <Bot className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h2 className="font-heading text-2xl font-bold mb-2">Assalamu'alaikum 👋</h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    Saya asisten AI Career Center PEDULI. Pilih kategori di atas lalu ajukan pertanyaan tentang karier, kuliah, atau konseling.
                  </p>
                  <Badge variant="secondary">Mode: {MODES.find((m) => m.id === active.mode)?.label}</Badge>
                </div>
              )}
              {active.messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                  {m.role === "assistant" && (
                    <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
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

            {/* Composer */}
            <div className="p-3 border-t border-border">
              <div className="flex gap-2 items-end">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
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
