# EP-28 — Bài đã nộp

## Mục đích và phạm vi

Trang /admin/exams/:examId/submissions dùng ledger Reporting gồm mọi retained attempt lifecycle, kể cả CREATED/IN_PROGRESS chưa nộp. Vì tên trang lịch sử là Bài đã nộp, target có helper “Danh sách lượt của đề; có thể gồm lượt chưa nộp.” để không hứa filter chưa có. Chỉ filter publishedVersionId được server hỗ trợ; không status/date/score/search/export.

Fields: candidateId, attemptId, publishedVersionId, submittedAt nullable, status, expired, earned/possible nullable. Chỉ COMPLETED có score bền vững; null là Chưa có điểm. submittedAt null là Chưa có giờ nộp. FAILED không tự thành đạt/trượt hoặc 0. expired là cờ riêng; fixture EXPIRED có nhãn Nộp khi hết giờ, FAILED không có cờ đó.

## Cấu trúc và style

Header68/rail72 Giám sát active. H1 gọn, tên Cloud đầy đủ, Bản sửa4 lấy Catalog riêng. Link về Giám sát và Tải lại. Filter trắng gọn chứa text UUID đầy đủ f001, label Lọc theo phiên bản đã phát hành, nút Áp dụng bộ lọc và helper đang lọc mã rút gọn. Không dropdown numeric version bịa. Metadata Tải lúc là client success time vì submissions metadata không có asOf.

Bảng full width bảy cột Mã thí sinh / Mã lượt / Trạng thái / Phiên bản / Nộp lúc / Điểm / Chi tiết. Sáu hàng c006→c001 theo startedAt giảm dần. c006 COMPLETED90/100, c005 SUBMITTED null, c004 PROCESSING null, c003 EXPIRED null, c002 FAILED null, c001 COMPLETED70/100. Tất cả version f001, ngày 15/11/2026. Status có chữ/icon nhỏ, tint nhẹ; không row bão hòa. Cobalt–Apricot, Be Vietnam Pro, mã và score monospace chọn lọc, body 16px/helper 14px, không sidebar.

## Hành vi và state cần triển khai

Apply kiểm UUIDv7 theo Web hiện tại. Sai định dạng ghi Mã phiên bản không đúng định dạng; giữ ý định và dữ liệu đã tải. Blank+Apply bỏ filter và mở query mới từ đầu. UUID hợp lệ nhưng version không thuộc exam phải hiện resource error, không empty giả. Cursor bind exam/version/actor/pageSize; đổi filter không dùng lại cursor trước. State/score fresh theo mỗi page, không multi-page frozen snapshot. Fixture next null nên footer đã hết, không tổng số hoặc nút tải thêm active.

Loading, empty scope, error, stale retry và mất quyền là yêu cầu code riêng; không trộn vào ảnh thành công. Mất reporting.read phải ẩn dữ liệu. Xem lượt là navigation theo quyền hiện tại, không replay trực tiếp, sửa điểm/answer hoặc force submit. Hai score hoàn tất là90/100 và 70/100; bốn null phải viết đủ Chưa có điểm.

## Nguồn và giới hạn

- Web: submissions-page.tsx, shared/format.ts, shared/api/uuid.ts.
- API DTO: reporting/application/dto/submissions.dto.ts.
- Source: postgres-submissions.query.ts, submissions.controller.ts.
- OpenAPI: /v1/admin/exams/{examId}/submissions, AdminSubmission.
- Test: apps/api/tests/integration/admin-submissions.spec.ts.
- Target thêm attemptId, refresh, context/source labels từ các field có thật; không claim Web live integration đã có.
