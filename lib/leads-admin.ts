import "server-only";
import { GoogleGenAI } from "@google/genai";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getConversation } from "@/lib/conversations-admin";

// Trích xuất thông tin lead từ một hội thoại bằng Gemini, lưu vào bảng `leads` trên
// Supabase. Chỉ chạy phía server (route handler / server action) — dùng secret key.

const MODEL = process.env.GEMINI_LEAD_MODEL || "gemini-3.1-flash-lite";

export type LeadQuality = "good" | "ok" | "spam";

export interface Lead {
  id: string;
  conversationId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  educationLevel: string | null;
  major: string | null;
  availability: string | null;
  wantsConsultation: boolean | null;
  note: string | null;
  quality: LeadQuality;
  extractedAt: string;
}

function isLeadQuality(v: unknown): v is LeadQuality {
  return v === "good" || v === "ok" || v === "spam";
}

// Schema JSON yêu cầu Gemini trả về đúng cấu trúc này (structured output).
const leadJsonSchema = {
  type: "object",
  properties: {
    fullName: { type: ["string", "null"], description: "Họ tên đầy đủ của khách, null nếu chưa đề cập." },
    email: { type: ["string", "null"], description: "Email liên hệ của khách, null nếu chưa đề cập." },
    phone: { type: ["string", "null"], description: "Số điện thoại của khách, null nếu chưa đề cập." },
    country: { type: ["string", "null"], description: "Quốc gia khách muốn du học, null nếu chưa đề cập." },
    educationLevel: { type: ["string", "null"], description: "Bậc học: THPT, Đại học, Thạc sĩ... null nếu chưa đề cập." },
    major: { type: ["string", "null"], description: "Ngành học khách quan tâm, null nếu chưa đề cập." },
    availability: {
      type: ["string", "null"],
      description: "Thời gian khách rảnh / thuận tiện để được tư vấn, null nếu chưa đề cập.",
    },
    wantsConsultation: {
      type: ["boolean", "null"],
      description: "Khách có đồng ý đặt lịch tư vấn miễn phí không. null nếu chưa rõ/chưa được hỏi tới.",
    },
    note: { type: ["string", "null"], description: "Ghi chú ngắn gọn các thông tin quan trọng khác, nếu có." },
    quality: {
      type: "string",
      enum: ["good", "ok", "spam"],
      description:
        "good: khách cho được ít nhất một cách liên hệ (email hoặc SĐT) và có nhu cầu du học rõ ràng. " +
        "ok: khách có quan tâm nhưng chưa cho thông tin liên hệ hoặc còn mơ hồ. " +
        "spam: nội dung không liên quan đến du học, test linh tinh, hoặc rác.",
    },
  },
  required: [
    "fullName",
    "email",
    "phone",
    "country",
    "educationLevel",
    "major",
    "availability",
    "wantsConsultation",
    "note",
    "quality",
  ],
};

interface ExtractedFields {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  educationLevel: string | null;
  major: string | null;
  availability: string | null;
  wantsConsultation: boolean | null;
  note: string | null;
  quality: LeadQuality;
}

function mapRow(row: {
  id: string;
  conversation_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  education_level: string | null;
  major: string | null;
  availability: string | null;
  wants_consultation: boolean | null;
  note: string | null;
  quality: string;
  extracted_at: string;
}): Lead {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    educationLevel: row.education_level,
    major: row.major,
    availability: row.availability,
    wantsConsultation: row.wants_consultation,
    note: row.note,
    quality: isLeadQuality(row.quality) ? row.quality : "ok",
    extractedAt: row.extracted_at,
  };
}

// Đọc lead đã lưu của một conversation, null nếu chưa từng trích xuất.
export async function getLead(conversationId: string): Promise<Lead | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("conversation_id", conversationId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

async function callGemini(transcript: string): Promise<ExtractedFields> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Thiếu GEMINI_API_KEY trên server.");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "Bạn là hệ thống trích xuất thông tin lead từ một cuộc hội thoại tư vấn du học.\n" +
              "Đọc đoạn hội thoại dưới đây (Khách / Bot) và trích xuất đúng các trường theo schema.\n" +
              "Chỉ dùng thông tin khách THỰC SỰ đã cung cấp trong hội thoại — không suy đoán, không tự bịa.\n" +
              "Nếu một trường không có thông tin, để null.\n\n" +
              `Hội thoại:\n${transcript}`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: leadJsonSchema,
      temperature: 0,
    },
  });

  const raw = response.text?.trim();
  if (!raw) throw new Error("Gemini không trả về nội dung trích xuất.");

  const parsed = JSON.parse(raw) as Partial<ExtractedFields>;
  if (!isLeadQuality(parsed.quality)) throw new Error("Gemini trả về quality không hợp lệ.");

  return {
    fullName: parsed.fullName ?? null,
    email: parsed.email ?? null,
    phone: parsed.phone ?? null,
    country: parsed.country ?? null,
    educationLevel: parsed.educationLevel ?? null,
    major: parsed.major ?? null,
    availability: parsed.availability ?? null,
    wantsConsultation: parsed.wantsConsultation ?? null,
    note: parsed.note ?? null,
    quality: parsed.quality,
  };
}

// Trích xuất lại từ toàn bộ tin nhắn hiện có và ghi đè lead của conversation này
// (upsert theo conversation_id, vẫn giữ đúng 1 lead / 1 conversation).
export async function extractAndSaveLead(conversationId: string): Promise<Lead> {
  const conversation = await getConversation(conversationId);
  if (!conversation) throw new Error("Không tìm thấy hội thoại.");
  if (conversation.messages.length === 0) throw new Error("Hội thoại chưa có tin nhắn nào để trích xuất.");

  const transcript = conversation.messages
    .map((m) => `${m.sender === "user" ? "Khách" : "Bot"}: ${m.content}`)
    .join("\n");

  const fields = await callGemini(transcript);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("leads")
    .upsert(
      {
        conversation_id: conversationId,
        full_name: fields.fullName,
        email: fields.email,
        phone: fields.phone,
        country: fields.country,
        education_level: fields.educationLevel,
        major: fields.major,
        availability: fields.availability,
        wants_consultation: fields.wantsConsultation,
        note: fields.note,
        quality: fields.quality,
        extracted_at: new Date().toISOString(),
      },
      { onConflict: "conversation_id" },
    )
    .select("*")
    .single();
  if (error) throw error;

  return mapRow(data);
}
