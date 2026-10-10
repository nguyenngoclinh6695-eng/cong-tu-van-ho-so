import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { OUT_OF_SCOPE_MARKER, systemInstruction } from "@/lib/qna";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const TEMPERATURE = 0.2;
const MAX_MESSAGES = 20;
const MAX_CHARS = 1000;
const SESSION_ID_RE = /^[a-zA-Z0-9-]{8,100}$/;

type Sender = "bot" | "user";
interface Row {
  sender: Sender;
  content: string;
}

function isValidSessionId(v: unknown): v is string {
  return typeof v === "string" && SESSION_ID_RE.test(v);
}

// Lấy conversation của session này, tạo mới nếu chưa có. Mỗi khách (session_id) chỉ có
// một conversation duy nhất, mọi tin nhắn của họ dồn vào đó.
async function getOrCreateConversation(sessionId: string) {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: selectError } = await supabase
    .from("conversations")
    .select("id")
    .eq("session_id", sessionId)
    .limit(1)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id as string;

  const { data: created, error: insertError } = await supabase
    .from("conversations")
    .insert({ session_id: sessionId, channel: "Web" })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return created.id as string;
}

async function insertMessage(conversationId: string, sender: Sender, content: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender, content });
  if (error) throw error;
  await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
}

async function loadHistory(conversationId: string, limit: number): Promise<Row[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("messages")
    .select("sender, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).reverse() as Row[];
}

// GET /api/chat?sessionId=... — nạp lại lịch sử hội thoại đã lưu trong Supabase,
// dùng khi khách mở lại khung chat (kể cả sau khi tắt trình duyệt, miễn sessionId
// trong localStorage vẫn còn).
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ error: "sessionId không hợp lệ." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("session_id", sessionId)
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "Không đọc được dữ liệu hội thoại." }, { status: 500 });
  }
  if (!conversation) {
    return NextResponse.json({ messages: [] });
  }

  const rows = await loadHistory(conversation.id as string, MAX_MESSAGES);
  return NextResponse.json({ messages: rows.map((r) => ({ from: r.sender, text: r.content })) });
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Chưa cấu hình GEMINI_API_KEY trên server." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { sessionId?: unknown; text?: unknown } | null;
  if (!body || !isValidSessionId(body.sessionId)) {
    return NextResponse.json({ error: "sessionId không hợp lệ." }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_CHARS) {
    return NextResponse.json({ error: "Nội dung tin nhắn không hợp lệ." }, { status: 400 });
  }

  let conversationId: string;
  try {
    conversationId = await getOrCreateConversation(body.sessionId);
    await insertMessage(conversationId, "user", text);
  } catch {
    return NextResponse.json({ error: "Không lưu được tin nhắn vào database." }, { status: 500 });
  }

  let history: Row[];
  try {
    history = await loadHistory(conversationId, MAX_MESSAGES);
  } catch {
    return NextResponse.json({ error: "Không đọc được lịch sử hội thoại." }, { status: 500 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: history.map((m) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
    config: {
      systemInstruction,
      temperature: TEMPERATURE,
    },
  });

  const raw = response.text?.trim();
  if (!raw) {
    return NextResponse.json({ error: "Gemini không trả về nội dung." }, { status: 502 });
  }

  // Ghi log câu hỏi bot không trả lời được để xem lại và bổ sung vào bộ QnA.
  const isOutOfScope = raw.startsWith(OUT_OF_SCOPE_MARKER);
  if (isOutOfScope) {
    console.info("[chat:ngoai-pham-vi]", JSON.stringify({ at: new Date().toISOString(), question: text }));
  }

  const reply = raw.replace(OUT_OF_SCOPE_MARKER, "").trim();

  try {
    await insertMessage(conversationId, "bot", reply);
  } catch {
    // Trả lời vẫn hiện cho khách dù lưu thất bại — không chặn trải nghiệm vì lỗi ghi log.
  }

  return NextResponse.json({ reply });
}
