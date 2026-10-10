"use client";

import { useActionState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractLeadAction, type ExtractLeadState } from "@/app/admin/conversations/[id]/actions";

const initialState: ExtractLeadState = { error: null };

export function ExtractLeadButton({ conversationId }: { conversationId: string }) {
  const [state, formAction, pending] = useActionState(extractLeadAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1.5">
      <input type="hidden" name="conversationId" value={conversationId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        {pending ? "Đang trích xuất..." : "Trích xuất lại"}
      </Button>
      {state.error && <p className="max-w-56 text-right text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
