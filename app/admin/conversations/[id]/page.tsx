import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ExtractLeadButton } from "@/components/admin/extract-lead-button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { cn, formatDateTime } from "@/lib/utils";
import { getConversation } from "@/lib/conversations-admin";
import { getLead, extractAndSaveLead, type Lead, type LeadQuality } from "@/lib/leads-admin";

// Giống trang danh sách: luôn đọc thẳng từ Supabase, không cache tĩnh.
export const dynamic = "force-dynamic";

const qualityMeta: Record<LeadQuality, { label: string; tone: "green" | "yellow" | "red" }> = {
  good: { label: "Tốt", tone: "green" },
  ok: { label: "Tạm ổn", tone: "yellow" },
  spam: { label: "Spam", tone: "red" },
};

function wantsConsultationLabel(value: boolean | null) {
  if (value === null) return "Chưa rõ";
  return value ? "Có" : "Không";
}

function LeadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

export default async function AdminConversationDetailPage(props: PageProps<"/admin/conversations/[id]">) {
  const { id } = await props.params;
  const conversation = await getConversation(id);
  if (!conversation) notFound();

  let lead: Lead | null = await getLead(id);
  let autoExtractError: string | null = null;
  // Chưa từng trích xuất lead cho hội thoại này: tự trích xuất lần đầu xem trang.
  // Lần sau chỉ đọc lại từ Supabase, admin bấm "Trích xuất lại" khi muốn cập nhật.
  if (!lead && conversation.messages.length > 0) {
    try {
      lead = await extractAndSaveLead(id);
    } catch (err) {
      autoExtractError = err instanceof Error ? err.message : "Không trích xuất được lead.";
    }
  }

  const fields: { label: string; value: string }[] = [
    { label: "Họ tên", value: lead?.fullName ?? "" },
    { label: "Email", value: lead?.email ?? "" },
    { label: "Số điện thoại", value: lead?.phone ?? "" },
    { label: "Quốc gia muốn du học", value: lead?.country ?? "" },
    { label: "Bậc học", value: lead?.educationLevel ?? "" },
    { label: "Ngành quan tâm", value: lead?.major ?? "" },
    { label: "Thời gian rảnh tư vấn", value: lead?.availability ?? "" },
    { label: "Muốn đặt lịch tư vấn", value: wantsConsultationLabel(lead?.wantsConsultation ?? null) },
  ];

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

      <Card className="mb-6 p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Thông tin lead</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Trích xuất tự động từ hội thoại bằng Gemini 3.1 Flash Lite.
            </p>
          </div>
          <ExtractLeadButton conversationId={conversation.id} />
        </div>

        {!lead ? (
          <p className="text-sm text-muted-foreground">
            {autoExtractError
              ? `Không trích xuất được lead: ${autoExtractError}`
              : "Hội thoại chưa có tin nhắn nào để trích xuất."}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge tone={qualityMeta[lead.quality].tone} label={qualityMeta[lead.quality].label} />
              <p className="text-xs text-muted-foreground">
                Trích xuất lúc {formatDateTime(lead.extractedAt)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              {fields.map((f) => (
                <LeadField key={f.label} label={f.label} value={f.value} />
              ))}
            </div>

            {lead.note && (
              <div>
                <p className="text-xs text-muted-foreground">Ghi chú</p>
                <p className="text-sm">{lead.note}</p>
              </div>
            )}
          </div>
        )}
      </Card>

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
