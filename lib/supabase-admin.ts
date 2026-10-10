import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase-types";

// Client Supabase CHỈ dùng phía server (route handler, server action, v.v.).
// Dùng secret key nên có toàn quyền đọc/ghi, bỏ qua RLS — tuyệt đối không import
// file này vào component client ("use client") hay gửi secret key xuống trình duyệt.
// `server-only` ở trên sẽ làm build lỗi ngay nếu lỡ import nhầm vào bundle client.

let client: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdmin() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Thiếu SUPABASE_URL hoặc SUPABASE_SECRET_KEY trên server.");
  }

  client = createClient<Database>(url, secretKey, {
    auth: { persistSession: false },
  });
  return client;
}
