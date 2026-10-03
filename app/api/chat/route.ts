import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { OUT_OF_SCOPE_MARKER, systemInstruction } from "@/lib/qna";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const TEMPERATURE = 0.2;
const MAX_MESSAGES = 20;
const MAX_CHARS = 1000;

interface IncomingMessage {
  from: "bot" | "user";
  text: string;
}

function isValidMessage(m: unknown): m is IncomingMessage {
  if (typeof m !== "object" || m === null) return false;
  const { from, text } = m as Record<string, unknown>;
  return (from === "bot" || from === "user") && typeof text === "string" && text.trim().length > 0 && text.length <= MAX_CHARS;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Chưa cấu hình GEMINI_API_KEY trên server." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { messages?: unknown } | null;
  if (!body || !Array.isArray(body.messages) || !body.messages.every(isValidMessage)) {
    return NextResponse.json({ error: "Dữ liệu tin nhắn không hợp lệ." }, { status: 400 });
  }

  const history = body.messages.slice(-MAX_MESSAGES);
  if (history.at(-1)?.from !== "user") {
    return NextResponse.json({ error: "Tin nhắn cuối phải là của người dùng." }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: history.map((m) => ({
      role: m.from === "user" ? "user" : "model",
      parts: [{ text: m.text }],
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
  // Log ra console của server (terminal khi chạy dev), không lưu vào file hay database.
  const isOutOfScope = raw.startsWith(OUT_OF_SCOPE_MARKER);
  if (isOutOfScope) {
    const question = history.at(-1)?.text ?? "";
    console.info("[chat:ngoai-pham-vi]", JSON.stringify({ at: new Date().toISOString(), question }));
  }

  const reply = raw.replace(OUT_OF_SCOPE_MARKER, "").trim();
  return NextResponse.json({ reply });
}
