"use client";

import React from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { quickQuestions } from "@/lib/chat-config";

interface Message {
  from: "bot" | "user";
  text: string;
}

const copy = {
  title: "Hỏi đáp nhanh",
  subtitle: "Thường trả lời trong vài phút",
  greeting: "Chào bạn! Mình là trợ lý tư vấn du học, rất vui được đồng hành cùng bạn. Bạn cần mình hỗ trợ gì hôm nay?",
  placeholder: "Nhập câu hỏi của bạn...",
  thinking: "Đang trả lời...",
  errorPrefix: "Xin lỗi, mình chưa trả lời được lúc này",
  errorSuffix: "Bạn thử lại sau nhé.",
  fallbackError: "Không nhận được phản hồi.",
  unknownError: "Lỗi không xác định.",
};

const initialMessages: Message[] = [{ from: "bot", text: copy.greeting }];

// Id ẩn danh để gộp các tin nhắn của cùng một khách vào một hội thoại trong Supabase.
// Không phải thông tin nhạy cảm (chỉ là id ngẫu nhiên), lưu trong localStorage nên
// còn nguyên cả khi khách tắt trình duyệt rồi quay lại trên cùng máy/trình duyệt đó.
const SESSION_STORAGE_KEY = "duhoc24_chat_session_id";

function getOrCreateSessionId(): string {
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const created = window.crypto.randomUUID();
    window.localStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    // Trình duyệt chặn localStorage (chế độ ẩn danh, v.v.): vẫn tạo được id để dùng
    // trong phiên này, chỉ là không nhớ được giữa các lần tải trang.
    return window.crypto.randomUUID();
  }
}

export function ChatWidget() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  // Tính ngay trong lần render đầu tiên ở trình duyệt (window tồn tại) thay vì trong effect,
  // để tránh setState đồng bộ trong effect. Khi render trên server, window chưa có nên trả về
  // null — client sẽ tự tính lại id thật ngay lần render đầu của nó, không gây lệch hydrate
  // vì id không được dùng để vẽ giao diện.
  const [sessionId] = React.useState<string | null>(() =>
    typeof window === "undefined" ? null : getOrCreateSessionId(),
  );
  const scrollEndRef = React.useRef<HTMLDivElement>(null);

  // Nạp lại lịch sử hội thoại đã lưu trong Supabase ngay khi có sessionId, thay vì chỉ
  // dựa vào bộ nhớ tạm trong component. Nếu khách chưa từng chat, giữ nguyên lời chào.
  React.useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const res = await fetch(`/api/chat?sessionId=${encodeURIComponent(sessionId)}`);
        const data = (await res.json()) as { messages?: Message[] };
        if (res.ok && data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      } catch {
        // Không nạp được lịch sử cũ: vẫn để khách chat bình thường với lời chào mặc định.
      }
    })();
  }, [sessionId]);

  // Tự động trượt xuống cuối khung chat mỗi khi có tin nhắn mới hoặc bot đang trả lời,
  // để người dùng luôn thấy câu hỏi/trả lời gần nhất mà không cần tự cuộn.
  React.useEffect(() => {
    if (!open) return;
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [open, messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading || !sessionId) return;

    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, text: trimmed }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        throw new Error(data.error ?? copy.fallbackError);
      }
      setMessages((prev) => [...prev, { from: "bot", text: data.reply! }]);
    } catch (err) {
      const reason = err instanceof Error ? err.message : copy.unknownError;
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: `${copy.errorPrefix} (${reason}). ${copy.errorSuffix}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border bg-card shadow-xl shadow-black/10 ring-1 ring-foreground/6.5 sm:w-96">
          <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
            <div>
              <p className="text-sm font-medium">{copy.title}</p>
              <p className="text-xs opacity-80">{copy.subtitle}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Đóng khung chat"
              className="flex size-7 items-center justify-center rounded-full hover:bg-white/10"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                    m.from === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2 text-sm text-muted-foreground">
                  {copy.thinking}
                </div>
              </div>
            )}
            <div ref={scrollEndRef} />
          </div>

          <div className="border-t p-3">
            <div className="flex flex-wrap gap-1.5 pb-2">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground duration-150 hover:border-primary hover:text-primary"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={copy.placeholder}
                className="h-9 flex-1 rounded-full border border-input bg-transparent px-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button type="submit" size="icon" className="shrink-0" aria-label="Gửi" disabled={loading}>
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Đóng khung chat" : "Mở khung chat hỏi đáp"}
        className="ml-auto flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/20 duration-150 hover:brightness-105 active:scale-95"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>
    </div>
  );
}
