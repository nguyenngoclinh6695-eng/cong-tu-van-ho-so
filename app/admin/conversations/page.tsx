import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listConversations } from "@/lib/conversations-admin";
import { formatDateTime } from "@/lib/utils";

// Dữ liệu đổi liên tục (hội thoại/tin nhắn mới), không cache tĩnh ở build time —
// luôn đọc thẳng từ Supabase mỗi lần tải trang.
export const dynamic = "force-dynamic";

export default async function AdminConversationsPage() {
  const conversations = await listConversations();

  return (
    <>
      <AdminPageHeader
        title="Hội thoại"
        description="Lịch sử hội thoại của khách với chatbot hỏi đáp trên trang chủ."
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã hội thoại</TableHead>
              <TableHead>Kênh</TableHead>
              <TableHead>Số tin nhắn</TableHead>
              <TableHead>Thời gian bắt đầu</TableHead>
              <TableHead>Tin nhắn gần nhất</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversations.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="whitespace-normal text-center text-muted-foreground">
                  Chưa có hội thoại nào được ghi nhận.
                </TableCell>
              </TableRow>
            )}
            {conversations.map((conv) => (
              <TableRow key={conv.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`/admin/conversations/${conv.id}`} className="hover:underline">
                    {conv.id.slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell>{conv.channel}</TableCell>
                <TableCell>{conv.messageCount} tin nhắn</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(conv.startedAt)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(conv.lastMessageAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
