# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Tổng quan

DuHoc24 — website mẫu "Cổng Tiếp Nhận Hồ Sơ Du Học" cho khoá lập trình 6 tuần (xem lộ trình đầy đủ trong [README.md](README.md)). **Bản hiện tại là Tuần 1: chỉ có UI tĩnh, toàn bộ dữ liệu là mock viết cứng**, chưa có API, database hay xác thực. Các tuần sau sẽ thêm Gemini (chatbot, đọc giấy tờ), Supabase (database + auth), Make.com và trang `/login`. Nội dung giao diện và comment viết bằng tiếng Việt — giữ nguyên ngôn ngữ này khi sửa/thêm UI.

## Lệnh thường dùng

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint    # eslint (flat config: eslint.config.mjs, dùng eslint-config-next)
```

Repo chưa có test runner. Không cần biến môi trường để chạy `dev` (xem `.env.example` cho Supabase/site URL sẽ dùng từ Tuần 3+).

## Stack

Next.js 16.3 (App Router) + React 19 + TypeScript strict + Tailwind CSS v4 (cấu hình trong `app/globals.css`, không có `tailwind.config`). Alias import `@/*` trỏ về gốc repo. Thư viện UI: shadcn/ui style `base-nova` trên nền **Base UI** (`@base-ui/react`, không phải Radix) — khi thêm component dùng `npx shadcn add <tên>`; registry bổ sung `@tailark-oss` được khai báo trong `components.json`. Animation dùng `motion`, icon dùng `lucide-react`, font Be Vietnam Pro (biến `--font-sans`).

Lưu ý: `AGENTS.md` cảnh báo đây là phiên bản Next.js có breaking change so với kiến thức cũ; hướng dẫn nằm trong `node_modules/next/dist/docs/` (chỉ có sau `npm install`) — đọc trước khi viết code liên quan đến API của Next. Ví dụ đã dùng trong repo: kiểu toàn cục `LayoutProps<"/">` ở `app/layout.tsx`.

## Kiến trúc

- **Nguồn dữ liệu duy nhất: [lib/mock-data.ts](lib/mock-data.ts).** Chứa các kiểu domain (`School`, `AdmissionRequest`, `StudentProfile`, `Conversation`, `ServiceOption`), union trạng thái (`DocStatus`: `chua_nop | dang_xu_ly | hop_le | can_nop_lai`; `RequestStatus`: `cho_duyet | da_duyet | tu_choi`; `ServicePackage`: `co_ban | toan_dien`) và dữ liệu giả; `currentStudent` là học viên đăng nhập demo của `/portal`. Các trang đều là server component import thẳng từ file này; khi nối Supabase, giữ nguyên các kiểu này làm hình dạng dữ liệu và thay nguồn.
- **Ba khu vực route** (mỗi khu có layout riêng):
  - `/` — landing page ghép từ `components/landing/*` (hero, `quote-form`, highlights) cùng `ChatWidget`. Chatbot hiện là client component với câu trả lời **viết sẵn** (`cannedAnswers`), chưa gọi LLM; form báo giá chưa lưu đâu cả.
  - `/portal` — cổng học viên, ghép từ `components/portal/*` (upload giấy tờ, thông tin trích xuất, đối chiếu điểm chuẩn). Nút Đăng xuất/Nộp hồ sơ chỉ là UI.
  - `/admin/*` — `app/admin/layout.tsx` bọc sidebar (`components/admin/sidebar.tsx`, có bản mobile nav). `/admin` redirect sang `/admin/requests`; các trang con: `requests`, `schools`, `profiles`, `conversations`. Trang `/login` chưa tồn tại (làm ở Tuần 6) và chưa có route guard nào.
- **Component dùng chung:** `components/status-badge.tsx` ánh xạ `DocStatus`/`RequestStatus` sang tone màu (gray/yellow/green/red); `components/ui/*` là primitive shadcn; `cn()` ở `lib/utils.ts`.
- Ảnh từ xa chỉ được phép từ `images.unsplash.com` (`next.config.ts`).

## Quy tắc Git

- Luôn hỏi xác nhận trước khi push lên Github
- Không bao giờ commit file .env hoặc bất kỳ file chứa API key
