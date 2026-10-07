# Evidence: “Vào nhịp thi” — 2026-10-07

Scope: React homepage3D và public three-question experience trong cả build live/demo. [Implementation review](../../vao-nhip-thi-implementation-2026-10-07.md) ghi contract, quyết định và giới hạn.

## Checks

- [Lint](lint.log), [TypeScript](typecheck.log), [full frontend unit run](unit.log): PASS;73 tests/16 files.
- [Live build](build-live.log), [demo build](build-demo.log): PASS; scene chunk520.18kB raw/132.21kB gzip, lazy-load.
- [Browser result JSON](browser-results.json):12 passed,0 failed,0 skipped; Chromium. Software WebGL dùng cho kiểm tra graphics, không phải đo FPS thiết bị thật.
- [Contract checks](contracts.log): PASS,46 operations/425 examples. [Quality](quality.log): lượt cuối báo3 link thiếu ở tài liệu Identity HTTPS đang thay đổi song song; lượt trước đã PASS. Không ghi PASS cho lượt cuối hoặc thay evidence của công việc đó.
- [Browser trước khi chỉnh kỳ vọng cũ](browser-before-legacy-alignment.json):8 checks mới đã pass;2 regression còn kỳ vọng mã nội bộ/nhấn nav không có quyền. Báo cáo final bên trên đã pass sau khi test kiểm tra đúng invariant hiện có.

## Visual evidence

| View      | Live                         | Demo                         |
| --------- | ---------------------------- | ---------------------------- |
| Home1024  | [Image](live-home-1024.png)  | [Image](demo-home-1024.png)  |
| Home320   | [Image](live-home-320.png)   | [Image](demo-home-320.png)   |
| Sample390 | [Image](live-sample-390.png) | [Image](demo-sample-390.png) |
| Result390 | [Image](live-result-390.png) | [Image](demo-result-390.png) |

`regression/` lưu ảnh của các luồng public/auth, phòng thi, kết quả và Admin trong browser suite hiện có. Ảnh tại `../screenshots/` thuộc báo cáo trước được giữ nguyên. Browser suite kiểm tra overflow ở320/390/768/1024/1440, axe trên các màn public mới, keyboard/focus, pause/reduced-motion, fallback/context restore/disposal và route guard. Đây là evidence local; không thay nghiệm thu HTTPS thật, AWS hoặc production.
