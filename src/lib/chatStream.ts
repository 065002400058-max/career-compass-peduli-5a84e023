import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export type StreamMsg = { role: "user" | "assistant"; content: string };

/**
 * Streaming chat: token AI ditampilkan begitu tiba (tidak menunggu jawaban penuh).
 * Mengembalikan teks final. Bila server tidak mengirim SSE, otomatis fallback JSON.
 */
export async function streamChatAi(
  messages: StreamMsg[],
  mode: string,
  onDelta: (fullText: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  const res = await fetch(FUNCTIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken ?? ANON_KEY}`,
    },
    body: JSON.stringify({ messages, mode, stream: true }),
    signal,
  });

  if (!res.ok) throw new Error("Layanan AI sedang sibuk. Coba lagi sebentar.");

  const contentType = res.headers.get("Content-Type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    const json = await res.json();
    if (json?.error) throw new Error(json.error);
    const reply = json?.reply ?? "";
    onDelta(reply);
    return reply;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const chunk = JSON.parse(payload);
        if (chunk?.error) throw new Error(chunk.error?.message ?? "Gagal memproses jawaban AI");
        const delta = chunk?.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          full += delta;
          onDelta(full);
        }
      } catch {
        // Potongan JSON belum lengkap — abaikan, akan dilengkapi chunk berikutnya.
      }
    }
  }

  if (!full) throw new Error("Tidak ada jawaban dari AI. Coba lagi.");
  return full;
}
