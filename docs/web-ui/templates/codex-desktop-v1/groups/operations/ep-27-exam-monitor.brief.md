# EP-27 — Giám sát đề thi

## Mục đích và phạm vi

Trang /admin/exams/:examId/monitor đọc các retained IN_PROGRESS của đúng exam, có startedAt <= metadata.asOf và deadline > metadata.asOf. Phạm vi **qua các phiên bản đóng băng**, kể cả đề chưa phát hành/lưu trữ. Đây là lifecycle lượt, không phải browser presence. API chỉ có candidateId, attemptId, status, startedAt, deadline và metadata; không có version từng hàng, điểm, tên người, IP hoặc total count. Không thêm version filter, online dot hoặc force submit.

Actor cần reporting.read. Fixture có thêm catalog.manage để tải ngữ cảnh tên đề từ Catalog, không để suy rằng quyền Catalog luôn cần cho monitor. Với actor chỉ có reporting.read, target phải dùng examId an toàn nếu không lấy được title; không gọi Catalog vượt quyền.

## Cấu trúc và style

Shell thống nhất header 68px/rail 72px, Giám sát active, tên Cloud đầy đủ và dòng Bản sửa4/90 phút là metadata Catalog riêng. H1 gọn “Giám sát đề thi”, nút Tải lại và Bài đã nộp bên phải. Scope “Lượt đang làm qua các phiên bản của đề.”, mốc backend 15/11/2026 10:00 UTC+7 và helper tự tải khi trang hiện. Không gán mốc này thành heartbeat.

Bảng trắng full width có Mã thí sinh / Mã lượt / Trạng thái / Bắt đầu / Hạn nộp / Chi tiết. Bốn hàng theo startedAt giảm dần: c010 08:50–10:20, c009 08:45–10:15, c008 08:40–10:10, c007 08:35–10:05; cùng ngày 15/11. Status Đang làm bài có icon tài liệu/đồng hồ và nền tint, không chấm xanh. Hai loại mã tách rõ, CTA Xem lượt. Cobalt–Apricot, Be Vietnam Pro, helper 14px, card radius 20–24px, bảng không bị sidebar bó hẹp.

## Hành vi và state cần triển khai

Polling chỉ khi trang hiển thị, không chồng request; Tải lại disabled khi pending. Submit/expire làm row biến mất ở lần đọc tiếp. Fixture next null nên không Tải thêm hoặc tổng số online. Multi-page view sống, state fresh mỗi page, không frozen snapshot. Cursor active hết hạn 60 giây cần tải lại đầu.

Initial skeleton, empty Không có lượt đang làm, error/thử lại và stale giữ row khi quyền còn được mô tả riêng. Mất quyền ẩn row và ngừng polling. Missing resource khác empty. Xem lượt chỉ navigation; trang chi tiết tiếp tục kiểm quyền, không hứa review đáp án từ reporting.read.

## Nguồn và giới hạn

- Web: monitor-exam-page.tsx, assessment/polling.ts, admin-ui.tsx PageEnd/adminId.
- API DTO: reporting/application/dto/active-candidates.dto.ts.
- Source: postgres-active-candidates.query.ts, active-candidates.controller.ts.
- OpenAPI: /v1/admin/exams/{examId}/active-candidates, ActiveCandidateMetadata.
- Test: apps/api/tests/integration/admin-monitor.spec.ts.
- Target bổ sung cột attemptId/startedAt và source asOf; Web hiện dùng dataUpdatedAt cho lần tải, parser chung chưa nối metadata.asOf. Không claim phần bổ sung đã implement.
