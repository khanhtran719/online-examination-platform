# Evidence giao diện web — 2026-10-07

**Bằng chứng dưới đây là lần bàn giao trước review.** [Review độc lập cùng ngày](review-2026-10-07/README.md) chạy lại bốn browser smoke đạt nhưng thêm bốn ca contract FAIL; FE-15/32 đã mở lại. Không dùng số PASS bên dưới để đóng findings trong [report](../review-2026-10-07.md). Lần sửa sau review nằm ở [fix evidence](fix-2026-10-07/README.md) và không viết đè artifact RED.

Môi trường: macOS, Node theo `apps/web` (`>=24 <25`), Playwright 1.63.0, Chromium 153.0.8010.12. Preview demo `http://127.0.0.1:4173`, live `http://127.0.0.1:4174`. Không có backend Identity trong lần live này. Không đo LCP/CLS. Không phải p75 production.

## Lệnh và kết quả

| Lệnh | Kết quả |
| --- | --- |
| `npm --prefix apps/web run typecheck` | PASS, nằm trong `web:build` |
| `npm --prefix apps/web run lint` | PASS |
| `npm --prefix apps/web test` | PASS, 8 file, 32 test |
| `npm --prefix apps/web run build` | PASS, ra `apps/web/dist` |
| `npm --prefix apps/web run build:demo` | PASS, ra `apps/web/dist-demo` |
| `playwright test` trong `apps/web` | PASS, 4 test Chromium |
| Root quality/build | NOT RUN trong phiên này |
| HTTPS Identity | BLOCKED, không có TLS |

Bốn test trình duyệt chạy trên bản đã có đủ hành vi. Lần build sau đó chỉ là Prettier; không chạy lại Playwright sau lần format cuối.

1. Trang công khai ở 320, 390, 768, 1024, 1440; login sai; mật khẩu đăng ký ngắn; 404. Axe trang chủ 320 và 1440 không có vi phạm serious/critical.
2. Đăng nhập demo, mở đề tiêu đề dài, bắt đầu, thấy “Đã lưu”, xung đột rồi chọn bản máy chủ, phiếu câu hỏi ở 320, lượt phiên bản cũ hiện UI-GAP-02, kết quả 5/6 và 83.33%. Axe phòng thi 1440 không có vi phạm serious/critical.
3. Thí sinh bị chặn khỏi quản trị; preset quản trị xem đề, số liệu thiếu và nhật ký; reviewer không vào ngân hàng câu.
4. Live không có “Dữ liệu mẫu”. `/admin` khi API không trả hồ sơ hiện “Không kết nối được phiên” và “Về trang chủ”, không rơi về demo. Login live không vào bảng làm việc.

`localStorage` và `sessionStorage` sau login demo đều rỗng. Mã nguồn `apps/web/src` không gọi hai API đó.

## Bundle live

Đo bằng gzip level 9 trên artifact vừa build:

| Hạng mục | Số đo | Ngưỡng đề xuất |
| --- | --- | --- |
| JS ban đầu (`index` + `layout.module` + `mount`) | 119722 byte gzip | 250 KiB |
| CSS | 3070 byte gzip | 40 KiB |
| Font woff2 đã phát | 100600 byte | 150 KiB |
| Chunk admin, không nằm trong JS ban đầu | 11688 byte gzip | tách riêng |
| Chunk phòng thi | 7871 byte gzip | tách riêng |

`rg` trên `apps/web/dist` không thấy “Dữ liệu mẫu”, `candidate@example.test`, `fixture-password`. Root `dist` còn 8 file SQL sau khi build web. `npm audit` trong `apps/web`: 9 high, 0 critical. Không chạy `audit fix --force`.

## Ảnh

Thư mục `screenshots/` gồm trang chủ năm bề rộng, login 401, đăng ký sai, 404, dashboard, đề dài, phòng thi đã lưu, xung đột, phiếu 320, lượt cũ, kết quả 83.33%, admin bị từ chối, bảng đề, metrics thiếu, nhật ký, reviewer bị từ chối, live home, live phiên lỗi, live login lỗi.

## Chưa chứng minh

Cookie `Secure`/`HttpOnly` trên HTTPS, Origin thật khớp `PUBLIC_ORIGIN`, hai tab refresh trên trình duyệt, nộp bài, polling, import, soạn câu, phát hành đề, đề 500 câu, zoom 200%, Firefox/WebKit, screen reader. Xem [UI-GAP](../ui-gap.md).
