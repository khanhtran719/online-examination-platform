# Kế hoạch triển khai theo Stitch

Ngày 2026-10-08. Active scope theo yêu cầu người dùng: dùng UI Stitch làm chuẩn, nối chức năng có sẵn, yêu cầu bổ sung các mẫu thiếu, tăng chiều sâu 2D/3D của illustration.

**Cập nhật yêu cầu mới nhất:** dừng sửa code, ưu tiên bổ sung và chốt UI trên Stitch. Các diff Home/dashboard/exam đã làm giữ tại local; không port thêm cho đến khi người dùng xác nhận chốt thiết kế. [Bộ prompt tiếp theo](stitch-next-pages-prompts-2026-10-08.md) là đầu ra hiện tại.

## Nguồn và ranh giới

- Visual source: dự án `11777231516922865355`, ba màn gốc và design system `assets/fc11c9370fdb41e5b12e4b4ed727d8b3`; [review](stitch-review-2026-10-08.md) và [prompts](stitch-completion-prompts-2026-10-08.md).
- Chủ sở hữu: frontend Public/Identity/Catalog/Assessment/Reporting presentation. Controllers/API/client coordinator giữ các contract hiện tại.
- Read: data qua PlatformApi và server query adapters hiện có; title/sections từ frozen memory khi đúng version. Write: handlers đăng nhập/start/save/submit/admin hiện có, không tạo transaction hoặc mutation path mới chỉ để khớp artwork.
- Invariants: saved sau ACK, deadline máy chủ, draft không bị mất do stale response, không lộ answer keys trước quyền, current permissions quyết định Admin, score exact match integer, accepted replay chưa completed.
- Không đổi backend, SQL/migrations, auth/scoring engine, queues hay production gates. Có nhiều thay đổi song song trong workspace; chỉ edit phạm vi UI của increment và giữ diff người dùng hiện có.

## Các bước và evidence

- [x] Tìm đúng dự án qua MCP và xác nhận canvas Chrome; đối chiếu 32 loại trang. Evidence và giới hạn nằm trong report.
- [x] Viết Prompt nền + A–H cho 29 mẫu thiếu, mobile, error/permission/save states; giữ art direction Stitch.
- [x] Tạo bốn mẫu Identity; IDs được xác nhận trong inventory. Route resend của mẫu login cần sửa về `/check-email`; chưa đánh dấu các mẫu mới đã được duyệt UI/state.
- [x] Trích presentation references ba mẫu gốc; đã chỉnh local Home/dashboard/exam và shell/tokens liên quan trước khi người dùng đổi ưu tiên. [Report phạm vi](stitch-port-2026-10-08.md); chưa duyệt UI cuối cùng.
- [x] Nối controls trong ba trang local vào handlers hiện có; catalog read tối đa bốn đề, không thêm write flow/backend.
- [x] Chạy validation phạm vi đã sửa: 96 unit tests, 24 Chromium cases, lint và TypeScript/Vite demo/live PASS; screenshot/keyboard/axe/reduced-motion theo report.
- [x] Kiểm tra inventory sau generation: 25 mẫu desktop + một prototype, còn thiếu bảy mẫu giám sát/báo cáo và mobile/state handoff. Request Admin nội dung trả lỗi dịch vụ nhưng inventory đã có cả bảy mẫu; không gửi lặp.
- [x] Viết sáu prompt tiếp theo cho bảy trang còn thiếu, mobile, states, đồng bộ hình ảnh và coverage để người dùng duyệt.
- [ ] Người dùng chốt UI desktop/mobile/states và flow trên Stitch.
- [ ] Tiếp tục port các màn được chốt — chờ xác nhận UI theo yêu cầu người dùng, không sửa code tiếp ở giai đoạn thiết kế.

## Xác nhận khi cần

Yêu cầu mới nhất của người dùng đặt thứ tự: chốt UI trên Stitch rồi mới tiếp tục sửa code. Không coi duyệt hướng visual trước đó là duyệt toàn bộ mẫu bổ sung. Nếu cần mua gói/quota, đổi quyền/nghiệp vụ, thêm offline storage/proctoring/media/loại câu khác, deploy hoặc đưa dữ liệu nhạy cảm vào dịch vụ mới thì trình bày hành động cụ thể trước. Prompt thiết kế không kèm keys hoặc dữ liệu thi thật.
