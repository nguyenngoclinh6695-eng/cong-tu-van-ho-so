"use server";

import { revalidatePath } from "next/cache";
import { extractAndSaveLead } from "@/lib/leads-admin";

export interface ExtractLeadState {
  error: string | null;
}

export async function extractLeadAction(
  _prevState: ExtractLeadState,
  formData: FormData,
): Promise<ExtractLeadState> {
  const conversationId = String(formData.get("conversationId") ?? "");
  if (!conversationId) return { error: "Thiếu mã hội thoại." };

  try {
    await extractAndSaveLead(conversationId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Trích xuất thất bại." };
  }

  revalidatePath(`/admin/conversations/${conversationId}`);
  return { error: null };
}
