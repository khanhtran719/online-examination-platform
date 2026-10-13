# Evidence: “Vào nhịp thi” — 2026-10-07

> Artifact retirement 2026-10-13: raw UI screenshots/trace/JSON/log/gallery đã được dọn theo yêu cầu người dùng. Nội dung bên dưới là báo cáo lịch sử; raw visual receipts không còn trong checkout. [Phạm vi và cách tái kiểm tra](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

Scope: React homepage3D và public three-question experience trong cả build live/demo. [Implementation review](../../vao-nhip-thi-implementation-2026-10-07.md) ghi contract, quyết định và giới hạn.

## Checks

- [Đã thu hồi — Lint](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — TypeScript](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — full frontend unit run](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): PASS;73 tests/16 files.
- [Đã thu hồi — Live build](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — demo build](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): PASS; scene chunk520.18kB raw/132.21kB gzip, lazy-load.
- [Đã thu hồi — Browser result JSON](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):12 passed,0 failed,0 skipped; Chromium. Software WebGL dùng cho kiểm tra graphics, không phải đo FPS thiết bị thật.
- [Đã thu hồi — Contract checks](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): PASS,46 operations/425 examples. [Đã thu hồi — Quality](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): lượt cuối báo3 link thiếu ở tài liệu Identity HTTPS đang thay đổi song song; lượt trước đã PASS. Không ghi PASS cho lượt cuối hoặc thay evidence của công việc đó.
- [Đã thu hồi — Browser trước khi chỉnh kỳ vọng cũ](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):8 checks mới đã pass;2 regression còn kỳ vọng mã nội bộ/nhấn nav không có quyền. Báo cáo final bên trên đã pass sau khi test kiểm tra đúng invariant hiện có.

## Visual evidence

| View      | Live                         | Demo                         |
| --------- | ---------------------------- | ---------------------------- |
| Home1024  | [Đã thu hồi — Image](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)  | [Đã thu hồi — Image](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)  |
| Home320   | [Đã thu hồi — Image](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)   | [Đã thu hồi — Image](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)   |
| Sample390 | [Đã thu hồi — Image](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) | [Đã thu hồi — Image](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) |
| Result390 | [Đã thu hồi — Image](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) | [Đã thu hồi — Image](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) |

`regression/` lưu ảnh của các luồng public/auth, phòng thi, kết quả và Admin trong browser suite hiện có. Ảnh tại `../screenshots/` thuộc báo cáo trước được giữ nguyên. Browser suite kiểm tra overflow ở320/390/768/1024/1440, axe trên các màn public mới, keyboard/focus, pause/reduced-motion, fallback/context restore/disposal và route guard. Đây là evidence local; không thay nghiệm thu HTTPS thật, AWS hoặc production.
