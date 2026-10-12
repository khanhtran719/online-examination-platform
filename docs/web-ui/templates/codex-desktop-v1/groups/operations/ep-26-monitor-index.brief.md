# EP-26 — Chọn đề để giám sát

## Mục đích và phạm vi

Trang /admin/monitor là bước chọn một đề trước khi xem lượt đang làm hoặc bài nộp. Cần reporting.read để vào và catalog.manage để lấy danh sách Catalog. Người chỉ có reporting.read vẫn có thể mở đường dẫn giám sát đã biết; không được hỏi listAdminExams khi thiếu catalog.manage. Hình chính dùng actor mẫu có cả hai quyền.

GET /v1/admin/exams và AdminExam cung cấp tên, category, revision, published, archived, durationSeconds, openAt, closeAt, displayTimezone. “Bản sửa 4” là revision, không phải numeric published version. Danh sách không có số lượt active theo đề, total count, category/status/search server filter. Không bịa các controls hoặc số đó.

## Cấu trúc và style

Shell header trắng 68px, rail icon-only 72px, Giám sát active. H1 “Chọn đề để giám sát”, helper ngắn, Tải lại bên phải. Metadata “Tải lúc” là thời điểm client nhận dữ liệu; Catalog list không có asOf backend. Bảng trắng full width với năm cột Đề thi / Trạng thái / Bản sửa / Lịch mở đề / Theo dõi. Không sidebar analytics hoặc hero. Mã rút gọn monospace; tên dài wrap; row divider nhẹ; body 16px. Cobalt–Apricot và Be Vietnam Pro theo hợp đồng chung.

Ba hàng cố định: Cloud revision 4/Đang phát hành/90 phút, Nhập môn cơ sở dữ liệu revision 2/Bản nháp/60 phút, An toàn thông tin revision 5/Đã lưu trữ/45 phút. Mỗi hàng có lịch cố định UTC+7 và CTA Mở giám sát. Đề nháp/lưu trữ không tự bị disable vì backend Reporting có thể đọc lịch sử qua các phiên bản. Không thay CTA thành mutation Phát hành, Khôi phục hoặc Xóa.

## Hành vi và state cần triển khai

Tải lại đọc lại Catalog list; next null trong fixture nên footer Đã hết danh sách đã tải, không nút Tải thêm active hoặc số trang. Khi next có giá trị mới hiện Tải thêm và chặn gửi lặp lúc pending. Không diễn giải ba hàng là tổng toàn hệ thống.

Loading skeleton khác empty Chưa có đề và lỗi Không tải được danh sách. Refresh lỗi có thể giữ dữ liệu trước khi quyền còn. Thiếu catalog.manage hiển thị Không liệt kê đề; không fake empty. Mất reporting.read ẩn dữ liệu bảo vệ. Cursor lỗi yêu cầu đọc lại từ đầu, không hứa multi-page frozen snapshot. Những variant là yêu cầu, chưa phải ảnh đã tạo.

## Nguồn và giới hạn

- Web: monitor-index-page.tsx hiện dùng listAdminExams, reporting.read + catalog.manage, PageEnd; target bổ sung các cột từ AdminExam đã có và refresh.
- DTO: apps/web/src/shared/api/dto.ts AdminExam.
- OpenAPI: GET /v1/admin/exams và AdminExamListEnvelope.
- Test: apps/web/src/features/admin/__tests__/admin-workflows.unit.spec.ts.
- Tên, lịch và mã là fixture; Tải lúc không phải source freshness. Không claim runtime/mobile/production.
