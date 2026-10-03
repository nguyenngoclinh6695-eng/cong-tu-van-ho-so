// Bộ QnA dùng làm nguồn kiến thức duy nhất cho chatbot. Gemini chỉ được trả lời dựa trên nội dung này.
// Khi thêm/sửa thông tin, chỉnh ở đây; route /api/chat sẽ tự đưa vào systemInstruction.

export const qnaItems: { q: string; a: string; featured?: boolean }[] = [
  {
    q: "Dịch vụ này gồm những gì?",
    a: "Có 2 gói: gói Cơ bản chỉ hỗ trợ chuẩn bị và nộp hồ sơ, gói Toàn diện thêm cả tư vấn xin học bổng và phỏng vấn.",
    featured: true,
  },
  {
    q: "Mất bao lâu để có kết quả?",
    a: "Sau khi nộp đủ hồ sơ, hệ thống đối chiếu và báo kết quả sơ bộ trong vài phút. Kết quả chính thức từ trường thường mất 2-6 tuần tùy trường.",
    featured: true,
  },
  {
    q: "Cần chuẩn bị giấy tờ gì?",
    a: "3 loại: bảng điểm học tập (định dạng PDF), ảnh chứng chỉ IELTS, và ảnh CMND/CCCD hoặc hộ chiếu.",
    featured: true,
  },
  {
    q: "Chi phí dịch vụ là bao nhiêu?",
    a: "Tùy gói và bậc học, xem báo giá ngay trên trang chủ sau khi điền form, không mất phí xem báo giá.",
    featured: true,
  },
  {
    q: "Tôi chưa có bằng IELTS thì có đăng ký được không?",
    a: "Vẫn đăng ký được, nhưng cần bổ sung chứng chỉ IELTS trước khi nộp hồ sơ chính thức cho trường.",
  },
  {
    q: "Làm sao biết mình đủ điều kiện vào trường nào?",
    a: "Sau khi nộp đủ hồ sơ trong cổng hồ sơ, hệ thống tự so sánh điểm học tập và điểm IELTS với điểm chuẩn từng trường, báo ngay trường nào đủ điều kiện.",
  },
  {
    q: "Sau khi điền form báo giá, bước tiếp theo là gì?",
    a: "Đội ngũ tư vấn sẽ xem xét và duyệt yêu cầu, sau đó gửi email mời bạn vào cổng hồ sơ để nộp giấy tờ.",
  },
  {
    q: "Hồ sơ của tôi có được bảo mật không?",
    a: "Có, hồ sơ chỉ hiển thị cho bạn và đội ngũ tư vấn sau khi đăng nhập, không công khai.",
  },
  {
    q: "Tôi cần liên hệ ai nếu có thắc mắc khác?",
    a: "Bạn có thể để lại câu hỏi ngay trong khung chat này, hoặc để lại email/số điện thoại trong form báo giá, đội ngũ sẽ liên hệ lại.",
  },
];

// Các câu gợi ý nhanh trong khung chat, lấy từ bộ QnA để hai nơi luôn khớp nhau.
export const quickQuestions = qnaItems.filter((item) => item.featured).map((item) => item.q);

const systemRules = [
  "Bạn là trợ lý tư vấn du học của DuHoc24, trả lời khách hàng bằng tiếng Việt, ngắn gọn, lịch sự.",
  "CHỈ trả lời dựa trên BỘ QnA bên dưới. Không tự thêm thông tin nào khác ngoài phạm vi bộ QnA.",
  "Nếu câu hỏi nằm ngoài phạm vi bộ QnA, hãy bắt đầu câu trả lời bằng đúng dòng [NGOAI_PHAM_VI], rồi nói rõ là chưa có thông tin trong phần hỗ trợ này và gợi ý khách điền form báo giá ở trang chủ để đội ngũ tư vấn liên hệ lại. Không suy đoán.",
  "Nếu câu hỏi nằm trong phạm vi bộ QnA, KHÔNG được thêm dòng [NGOAI_PHAM_VI].",
].join("\n");

// Dấu hiệu model gắn khi câu hỏi nằm ngoài bộ QnA. Route sẽ bỏ dấu này trước khi trả về client.
export const OUT_OF_SCOPE_MARKER = "[NGOAI_PHAM_VI]";

export const systemInstruction = [
  systemRules,
  "",
  "BỘ QnA:",
  ...qnaItems.map((item, i) => `${i + 1}. Hỏi: ${item.q}\n   Đáp: ${item.a}`),
].join("\n");
