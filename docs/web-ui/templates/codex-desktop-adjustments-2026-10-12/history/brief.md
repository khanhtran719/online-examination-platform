# EP-14 — Lịch sử thi — Bản điều chỉnh desktop

**Trạng thái hiện hành:** người dùng đã tạm chốt ảnh điều chỉnh này làm main visual reference desktop Loaded, cho phép chỉnh thêm sau. [Quyết định](../selection.md). Findings khi port còn mở; các nhãn chờ chọn trong nội dung dưới đây giữ snapshot trước lựa chọn.

Ngày 2026-10-12. Phạm vi: chỉnh ảnh từ template Stitch đã review, không sửa Web/API/schema, không tạo mobile hoặc state khác. Đây là đề xuất thị giác đang chờ người dùng chọn, không xác nhận interaction/viewport/production.

## Nguồn, mục tiêu và giới hạn dữ liệu

- Edit target: [History V4](../../../evidence/stitch-03b-review-2026-10-08/history-desktop-v4-34514bb3.png).
- Style reference: [Preflight retained](../../codex-desktop-v1/images/preflight-ready-v1.png); chỉ lấy shell/palette/typography, không lấy nội dung Admin.
- [Design contract](../../codex-desktop-v1/design-contract.md), [tokens](../../dashboard-v2/tokens.json), [review03B](../../../stitch-03b-review-2026-10-08.md), [prompt gốc](../../../stitch-page-prompts-v3/03b-history-ranking-desktop.md).
- Đã đọc `apps/web/src/features/results/history-page.tsx`, `apps/web/src/shared/api/dto.ts`, `apps/web/src/shared/format.ts` và schema HistoryItem trong `docs/contracts/openapi.yaml`.

Route `/history`, Candidate đã đăng nhập. Mục tiêu là tìm lượt đang làm, theo dõi xử lý, mở kết quả. PostgreSQL/backend là nguồn lifecycle/điểm; frontend không đổi FAILED thành COMPLETED hoặc null thành 0. HistoryItem có IDs, startedAt, status, expired, earned/possible; không cung cấp title/version label/total. Tên/version trong ảnh là fixture thị giác từ template cũ; khi port chỉ dùng metadata đúng frozen version đã biết, nếu thiếu hiển thị fallback phiên bản/mã lượt, không join publication hiện hành hoặc N+1. Thứ tự 6 hàng giữ theo mẫu cũ, không tự sort ngày.

## Bố cục và phong cách

Giữ Soft Bento/Tactile Cobalt–Apricot: nền #F3F6FC, trắng, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540, muted #58627A. Header trắng khoảng 68px logic, rail trắng icon-only 72px. Wordmark ExamPlatform với phiếu thi/check, Candidate avatar LN/Lan Nguyen. Bỏ Assessment Suite, trạng thái sẵn sàng, mã thí sinh, dữ liệu xác thực và hỗ trợ 24/7 không có nguồn. Active rail Lịch sử. Typography Be Vietnam Pro, mono chọn lọc ở điểm/giờ/mã.

Main gutter 24–32px. Header “Lịch sử thi”, helper “Xem lại các lượt thi và tiếp tục bài đang làm”, nút Làm mới. Một card trắng radius 20–24px chứa đúng 5 cột: Đề thi & phiên bản; Bắt đầu với Giờ Việt Nam UTC+7; Trạng thái; Điểm; Hành động. Tên ưu tiên 40–45% vùng bảng, không ellipsis; cột ngày/điểm/action gọn, action 150–180px. Nhãn table sentence case, không uppercase mono dày. Badge hoàn thành/đang làm/lỗi một dòng khi có thể; trạng thái xử lý có thể chủ động hai dòng nhưng không từng từ xuống dòng. Rows cao theo nội dung, không padding quá dư. CTA kết quả/tiếp tục cùng chiều cao, status secondary. Row 4 có badge phụ Apricot “Nộp khi hết giờ”. Footer chỉ “Đã tải 6 lượt thi” và “Tải thêm”.

## Fixture cố định

| Hàng | Tên và version/mã hiển thị | Bắt đầu UTC+7 | Trạng thái | Điểm | Hành động |
| --- | --- | --- | --- | --- | --- |
|1|AWS Certified Solutions Architect Associate SAA-C03; v2.3; #ATT-9842|15/11/2024 21:30|COMPLETED; Đã hoàn thành|772/1000|Xem kết quả|
|2|TOEIC Full Practice Test – Format 2024 (Đề số 04); v1.0; #ATT-9904|16/11/2024 14:15|IN_PROGRESS; Đang làm|null/null → Chưa có điểm|Tiếp tục|
|3|Kiểm tra kiến thức Cơ sở Dữ liệu SQL & NoSQL Cao cấp; v1.2; #ATT-9861|16/11/2024 10:05|PROCESSING; Đang xử lý kết quả|null/null → Chưa có điểm|Xem trạng thái|
|4|Khảo sát Năng lực Giải tích & Đại số Tuyến tính Sinh viên Kỹ thuật; v2.0; #ATT-9712|14/11/2024 08:30|COMPLETED + expired=true; Đã hoàn thành; Nộp khi hết giờ|640/1000|Xem kết quả|
|5|Đánh giá năng lực Tư duy Logic & Phân tích Dữ liệu Tuyển dụng (Aptitude Test); v1.4; #ATT-9620|12/11/2024 16:20|FAILED; Xử lý thất bại|null/null → Chưa có điểm|Xem trạng thái|
|6|Chương trình Đánh giá Toàn diện Kiến thức Mạng Máy tính, Hệ điều hành và Giao thức Bảo mật Tầng Ứng dụng Phân tán Doanh nghiệp; v1.1; #ATT-9401|05/11/2024 09:00|COMPLETED; Đã hoàn thành|810/1000|Xem kết quả|

Các mã là fixture được giữ từ ảnh, không UUID thật. Không đẩy chú thích resume vào action làm cột rộng; ý nghĩa “tiếp tục cùng lượt, không dùng lượt mới” thuộc brief/handoff, không phải dòng văn dài trong mỗi row. Không countdown khi chưa có deadline authoritative. Không replay Admin cho Candidate.

## Checklist

- [x] Đọc nguồn và review; xem cả edit target/style reference.
- [x] Chuẩn bị fixture và prompt độc lập 1000–1500 từ.
- [x] Root review preflight trước generation.
- [x] Tạo PNG qua công cụ tích hợp; lưu prompt/request/provenance chính xác.
- [x] Xem trực tiếp final; kiểm tra 6 hàng/điểm/null/lifecycle/shell/wrap; findings nhỏ trong [review](review.md).
- [x] Người dùng tạm chốt mẫu, có thể chỉnh thêm sau; chỉ scope desktop Loaded.

Mobile, loading/empty/error, accessibility, keyboard/focus, cursor/refresh, ownership và runtime integration vẫn là việc khi triển khai, không hoàn thành từ ảnh.
