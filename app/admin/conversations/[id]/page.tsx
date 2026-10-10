import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { cn, formatDateTime } from "@/lib/utils";
import { getConversation } from "@/lib/conversations-admin";

// Giống trang danh sách: luôn đọc thẳng từ Supabase, không cache tĩnh.
export const dynamic = "force-dynamic";

export default async function AdminConversationDetailPage(props: PageProps<"/admin/conversations/[id]">) {
  const { id } = await props.params;
  const conversation = await getConversation(id);
  if (!conversation) notFound();

  return (
    <>
      <Link
        href="/admin/conversations"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách hội thoại
      </Link>

      <AdminPageHeader
        title={`Hội thoại ${conversation.id.slice(0, 8)}`}
        description={`Kênh ${conversation.channel} · Bắt đầu lúc ${formatDateTime(conversation.startedAt)} · ${conversation.messages.length} tin nhắn`}
      />

      <Card className="p-6">
        {conversation.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Hội thoại này chưa có tin nhắn nào.</p>
        ) : (
          <div className="space-y-4">
            {conversation.messages.map((m) => (
              <div key={m.id} className={cn("flex", m.sender === "user" ? "justify-end" : "justify-start")}>
                <div className="max-w-[75%] space-y-1">
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm",
                      m.sender === "user"
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted text-foreground",
                    )}
                  >
                    {m.content}
                  </div>
                  <p
                    className={cn(
                      "text-xs text-muted-foreground",
                      m.sender === "user" ? "text-right" : "text-left",
                    )}
                  >
                    {m.sender === "user" ? "Khách" : "Bot"} · {formatDateTime(m.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
