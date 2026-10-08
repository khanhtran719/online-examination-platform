# Evidence — Stitch port 2026-10-08

Phạm vi và giới hạn trong [report](../../stitch-port-2026-10-08.md). Bản build demo `127.0.0.1:4173`, live `127.0.0.1:4174`; synthetic fixture, Chromium local. Không phải evidence backend/AWS/production.

- [E2E summary](validation-summary.json): 24 expected, 0 unexpected/skipped/flaky; xuất từ report lần chạy cuối.
- Unit: 24 files/96 tests PASS; lint và TypeScript/Vite demo/live PASS.
- Screenshot được tạo lại sau khi sửa tương phản eyebrow và minh họa dashboard. Các ảnh public WebGL dùng SwiftShader của browser test; không chứng minh hiệu năng GPU thực tế.

| Trang/trạng thái                                  | Ảnh                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Home desktop, gồm toàn trang                      | [1440px](regression/home-1440.png)                                                               |
| Home mobile                                       | [320px](regression/home-320.png), [390px](regression/home-390.png)                               |
| Dashboard với fallback version thật trong fixture | [1440px](regression/dashboard-1440.png)                                                          |
| Phòng thi sau ACK lưu                             | [1440px](regression/exam-room-saved-1440.png)                                                    |
| Xung đột đáp án                                   | [1440px](regression/exam-conflict-1440.png)                                                      |
| Phiếu câu hỏi mobile                              | [320px](regression/exam-sheet-320.png)                                                           |
| Thiếu frozen metadata                             | [1024px](regression/frozen-attempt-gap-1024.png)                                                 |
| Mẫu công khai / kết quả mẫu                       | [390px](public-experience/demo-sample-390.png), [kết quả](public-experience/demo-result-390.png) |
| Live không fallback khi phiên unavailable         | [1440px](regression/live-session-unavailable-1440.png)                                           |

Các ảnh khác trong thư mục là regression Auth/Admin/results hiện có, không được tính như đã port các trang đó theo mẫu Stitch mới.
