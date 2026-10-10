import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Đọc dữ liệu hội thoại/tin nhắn cho trang /admin/conversations.
// Chỉ gọi từ Server Component hoặc route handler — dùng secret key, không bao giờ
// để lọt xuống trình duyệt (xem lib/supabase-admin.ts).

export interface ConversationListItem {
  id: string;
  channel: string;
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
}

export interface ConversationMessage {
  id: string;
  sender: "bot" | "user";
  content: string;
  createdAt: string;
}

export interface ConversationDetail {
  id: string;
  channel: string;
  startedAt: string;
  lastMessageAt: string;
  messages: ConversationMessage[];
}

export async function listConversations(): Promise<ConversationListItem[]> {
  const supabase = getSupabaseAdmin();

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, channel, started_at, last_message_at")
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  if (!conversations || conversations.length === 0) return [];

  const ids = conversations.map((c) => c.id);
  const { data: messageRows, error: countError } = await supabase
    .from("messages")
    .select("conversation_id")
    .in("conversation_id", ids);
  if (countError) throw countError;

  const countByConversation = new Map<string, number>();
  for (const row of messageRows ?? []) {
    countByConversation.set(row.conversation_id, (countByConversation.get(row.conversation_id) ?? 0) + 1);
  }

  return conversations.map((c) => ({
    id: c.id,
    channel: c.channel,
    startedAt: c.started_at,
    lastMessageAt: c.last_message_at,
    messageCount: countByConversation.get(c.id) ?? 0,
  }));
}

export async function getConversation(id: string): Promise<ConversationDetail | null> {
  const supabase = getSupabaseAdmin();

  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id, channel, started_at, last_message_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!conversation) return null;

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, sender, content, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });
  if (messagesError) throw messagesError;

  return {
    id: conversation.id,
    channel: conversation.channel,
    startedAt: conversation.started_at,
    lastMessageAt: conversation.last_message_at,
    messages: (messages ?? []).map((m) => ({
      id: m.id,
      sender: m.sender as "bot" | "user",
      content: m.content,
      createdAt: m.created_at,
    })),
  };
}
