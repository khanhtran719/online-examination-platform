# EP-25 — Tổng quan quản trị

## Mục đích và phạm vi

Trang /admin giúp quản trị viên đọc snapshot nghiệp vụ và chọn công việc. Đây là **target design**, không mô tả Web đã tích hợp snapshot. AdminHomePage hiện chỉ có lời giới thiệu và bốn shortcut; backend Reporting đã có /v1/admin/business-metrics. Thiết kế dùng endpoint Reporting đó với reporting.read, không dùng DTO Metrics cũ hoặc endpoint kỹ thuật còn specification-only. Tất cả dữ liệu là mẫu công khai.

Snapshot là trạng thái hiện tại của **lượt bắt đầu** trong cửa sổ [from,to), không phải số người online, số sự kiện xảy ra trong cửa sổ hay chuỗi thời gian. Các ô Đang làm 4, Đã nộp 6, Hoàn tất 2, Xử lý thất bại 1 không cộng thành tổng; hai ô sau là tập con của Đã nộp. asOf máy chủ là 15/11/2026 10:00 UTC+7, cửa sổ 14/11 10:00 đến trước 15/11 10:00. Không trộn global backlog vào population này.

## Cấu trúc và style

Shell theo design-contract: header trắng 68px, rail icon-only 72px, Tổng quan active, avatar MA/Minh Anh. H1 gọn trên canvas #F3F6FC, nút Tải lại bên phải. Card snapshot trắng có bốn ô nhỏ và một helper nêu quan hệ Đã nộp; không funnel, chart, mũi tên trend hoặc KPI kỹ thuật. Cobalt #315CF4 chủ đạo, Apricot #FFB36B tiết chế, không tím. Be Vietnam Pro, số/mã chọn lọc JetBrains Mono; H1 28–32px, body 16px, helper 14px.

Bento công việc gồm Soạn và phát hành đề, Theo dõi các lượt thi, Ngân hàng câu hỏi, Nhập câu từ JSON. Hàng đầu gần 2:1, không hero. CTA đi đến route có thật. Không tạo link bài nộp toàn cục vì cần examId; người dùng chọn đề qua Giám sát. Navigation được lọc theo capability. Không illustration 3D hoặc analytics để lấp chỗ trống.

## Hành vi và state cần triển khai

Tải lại đọc lại snapshot, disabled khi pending. Initial loading dùng skeleton; zero-data hợp lệ mới có số 0. Lỗi/thiếu dữ liệu không tự thành 0. Refresh lỗi giữ dữ liệu cũ khi quyền còn, báo chưa cập nhật được và cho Thử lại. Mất quyền ẩn dữ liệu bảo vệ. Các state này là yêu cầu code và review sau, không vẽ đồng thời trong ảnh chính.

Fixture liên thông: 10 lượt bắt đầu; 4 active ở phiên bản f002, 6 submitted ở f001, 2 completed, 1 failed, 1 expired; mọi timestamp cùng ngày. Đề Cloud đã phát hành, khác canonical editor chưa phát hành, và khác biệt được ghi trong fixtures.json. Không PII hoặc telemetry thật.

## Nguồn và giới hạn

- Web: apps/web/src/features/admin/admin-layout.tsx (AdminHomePage, shortcuts, permission filter).
- Backend: reporting/domain/business-metrics.ts; application/services/business-metrics.service.ts; presentation/http/business-metrics.controller.ts.
- OpenAPI: /v1/admin/business-metrics và BusinessMetrics.
- Test tham chiếu: apps/api/tests/integration/admin-business-metrics.spec.ts.
- Chưa chứng minh live capability discovery, browser integration, polling, mobile hoặc production acceptance.
