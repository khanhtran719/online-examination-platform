# EP-19 — Danh sách đề Admin, bản điều chỉnh

**Trạng thái hiện hành:** người dùng đã tạm chốt ảnh điều chỉnh này làm main visual reference desktop Loaded, cho phép chỉnh thêm sau. [Quyết định](../selection.md). Findings khi port còn mở; các nhãn chờ chọn trong nội dung dưới đây giữ snapshot trước lựa chọn.

Ngày 2026-10-12. Route `/admin/exams`; actor có quyền `catalog.manage`.
Đây là đề xuất ảnh desktop đã điều chỉnh, chưa được người dùng chọn làm main
template, chưa port vào ứng dụng. Chỉ sửa nhóm ảnh này; giữ nguyên PNG gốc.

## Nguồn và mục tiêu

- [Đã thu hồi — Ảnh gốc](../../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): edit target.
- [Review 05A](../../../stitch-05a-review-2026-10-08.md): 05A-02, 05A-07.
- [Style tham chiếu](../../codex-desktop-v1/images/preflight-ready-v1.png) và
  [quy định chung](../../codex-desktop-v1/design-contract.md).
- [Tokens](../../dashboard-v2/tokens.json).
- [OpenAPI](../../../../contracts/openapi.yaml): listAdminExams/AdminExam.
- [Source hiện tại](../../../../../apps/web/src/features/admin/exam-list-page.tsx).

Giữ bảng năm cột và sáu đề gốc; làm gọn padding, để `Sửa đề` và `Bản sửa N`
đọc trên một dòng. Cột tên đủ chỗ tối đa hai dòng tự nhiên; không thu font để
ép dữ liệu. Cobalt–Apricot, canvas #F3F6FC, ink #1B2540, bề mặt trắng; logo
phiếu thi/check, wordmark ExamPlatform. Rail khoảng 72px, header 68px logical.

## Fixture bất biến

| Đề | Danh mục | Phút | Lịch UTC+7 | Trạng thái | Publication | Bản sửa |
| --- | --- | --- | --- | --- | --- | --- |
| TOEIC Reading — Luyện tập 01 | TOEIC | 75 | 14/11/2026 08:00–12:00 | Đang phát hành | Có phiên bản đã phát hành | 7 |
| Nền tảng điện toán đám mây — Bài ôn tập 01 | IT Certification | 90 | 15/11/2026 08:00–12:00 | Bản nháp | Chưa có phiên bản phát hành | 4 |
| Python cơ bản — Vòng tuyển dụng | Tuyển dụng | 60 | 16/11/2026 09:00–11:00 | Bản nháp | Chưa có phiên bản phát hành | 2 |
| Cơ sở dữ liệu — Kiểm tra giữa kỳ | Đại học | 45 | 17/11/2026 13:30–16:00 | Đang phát hành | Có phiên bản đã phát hành | 6 |
| An toàn thông tin nội bộ — Đợt 01 | Nội bộ | 30 | 01/10/2026 08:00–17:00 | Đã lưu trữ | Không suy thêm publication | 5 |
| IELTS Reading — Bộ luyện tập 02 | IELTS | 60 | 18/11/2026 08:00–12:00 | Bản nháp | Có phiên bản từng phát hành | 8 |

Omit cả sáu placeholder EXM IDs: không cần cho tác vụ list và khác ID editor.
Bản sửa chỉ metadata; không gọi là version 4/8 hoặc tự tạo semantic version.

## Bố cục, chức năng và giới hạn

Breadcrumb Quản trị / Đề thi; title Đề thi, helper quản lý bản nháp/lịch/phiên
bản. Làm mới secondary; Tạo bản nháp primary. Một card chính: toolbar search
`Tìm trong các đề đã tải`, status/category filter và helper phạm vi cục bộ. Bảng
có cột Đề thi, Thời lượng, Lịch thi, Trạng thái, Thao tác. Phân bổ khoảng
33% / 9% / 23% / 23% / 12%, ưu tiên chữ đọc được; status metadata xuống tối đa
hai dòng có chủ đích, revision ở dòng riêng. Action + overflow luôn đủ vùng bấm.

Lịch giữ ngày/giờ và Giờ Việt Nam UTC+7. Footer Đã tải 6 đề + Tải thêm đề khi
còn cursor; không tổng hệ thống hoặc số trang giả. Notice chỉnh bản nháp không
đổi lượt đã bắt đầu, phát hành riêng. Hàng archived không đồng nghĩa deleted;
menu đóng, chưa mutation. Khi port: actions theo quyền/trạng thái, confirm cho
publish/unpublish/archive; refresh/load error/permission khác empty, không xác
nhận từ ảnh. Không global search, bulk delete, AI, proctor, autosave/timestamp.

Source hiện tại có sáu cột khác mẫu, chưa có local toolbar trong component;
đây là hướng điều chỉnh thiết kế đã nêu ở 05A, không claim chức năng đã code.
OpenAPI đã có title/category/duration/openAt/closeAt/timezone/publication/
revision/archived và cursor. Không thay API hoặc thêm resource theo ảnh.
Hàng archived vẫn giữ link Sửa đề theo ảnh/source gốc, nhưng save persistence
không nhận mutation cho archived record. Khi port phải phân biệt mở xem với sửa
có thể lưu, và disable/giải thích thao tác theo trạng thái; ảnh không hứa có thể
mutate bản nháp archived.

## Tiêu chí review

- [x] Đúng sáu hàng, category, phút, lịch, trạng thái và bản sửa.
- [x] Action và revision một dòng; không nhầm revision/publication.
- [x] Logo phiếu thi/check, palette chung, rail gọn, header đọc rõ.
- [x] Search/filter phạm vi đã tải, footer 6 không tổng bịa.
- [x] Không capability/claim tự thêm, không unsupported timestamp/ID.
- [x] Đã xem output, lưu dimensions/hash/prompt/provenance và findings.
- [ ] Port polish: đặt revision dòng riêng dưới publication; v1 hiện đặt cạnh
  metadata hai dòng, vẫn đọc rõ và không bị wrap ba dòng như gốc.

Rasters có thể resample; không cam kết pixel-identical nền hoặc viewport/runtime
đã test. Font/keyboard/mobile/accessibility cần kiểm riêng lúc port.
