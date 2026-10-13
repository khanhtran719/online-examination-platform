# Evidence — Stitch port 2026-10-08

> Artifact retirement 2026-10-13: raw UI screenshots/trace/JSON/log/gallery đã được dọn theo yêu cầu người dùng. Nội dung bên dưới là báo cáo lịch sử; raw visual receipts không còn trong checkout. [Phạm vi và cách tái kiểm tra](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

Phạm vi và giới hạn trong [report](../../stitch-port-2026-10-08.md). Bản build demo `127.0.0.1:4173`, live `127.0.0.1:4174`; synthetic fixture, Chromium local. Không phải evidence backend/AWS/production.

- [Đã thu hồi — E2E summary](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): 24 expected, 0 unexpected/skipped/flaky; xuất từ report lần chạy cuối.
- Unit: 24 files/96 tests PASS; lint và TypeScript/Vite demo/live PASS.
- Screenshot được tạo lại sau khi sửa tương phản eyebrow và minh họa dashboard. Các ảnh public WebGL dùng SwiftShader của browser test; không chứng minh hiệu năng GPU thực tế.

| Trang/trạng thái                                  | Ảnh                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Home desktop, gồm toàn trang                      | [Đã thu hồi — 1440px](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)                                                               |
| Home mobile                                       | [Đã thu hồi — 320px](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — 390px](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)                               |
| Dashboard với fallback version thật trong fixture | [Đã thu hồi — 1440px](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)                                                          |
| Phòng thi sau ACK lưu                             | [Đã thu hồi — 1440px](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)                                                    |
| Xung đột đáp án                                   | [Đã thu hồi — 1440px](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)                                                      |
| Phiếu câu hỏi mobile                              | [Đã thu hồi — 320px](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)                                                           |
| Thiếu frozen metadata                             | [Đã thu hồi — 1024px](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)                                                 |
| Mẫu công khai / kết quả mẫu                       | [Đã thu hồi — 390px](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — kết quả](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) |
| Live không fallback khi phiên unavailable         | [Đã thu hồi — 1440px](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)                                           |

Các ảnh khác trong thư mục là regression Auth/Admin/results hiện có, không được tính như đã port các trang đó theo mẫu Stitch mới.
