# Evidence sửa Web UI sau review — 2026-10-07

Bằng chứng này đứng cạnh [review RED](../review-2026-10-07/README.md). Artifact review không bị sửa để thành xanh. Không phải production acceptance, không phải proof HTTPS, và không đóng Catalog/Assessment/Reporting live.

Môi trường: macOS, Node theo `apps/web` (`>=24 <25`), Playwright 1.63.0, Chromium. Preview demo `http://127.0.0.1:4173`, live `http://127.0.0.1:4174`. Live preview là HTTP fixture, không có backend TLS.

## Lệnh đã chạy

| Lệnh | Kết quả |
| --- | --- |
| `eslint src` và `vitest run` trong `apps/web` | PASS, 60 test. Gồm room-tick và autosave |
| `npm run build` và `npm run build:demo` trong `apps/web` | PASS trước lần đo bundle bên dưới. `tsc` nằm trong Vite build |
| Playwright config tạm `/tmp/web-ui-fix-20261007/playwright.config.mjs` | 7 PASS, 2 FAIL. Không chạy config review gốc vì output của nó ghi đè artifact RED |
| Script trình duyệt `/tmp/web-ui-fix-20261007/browser-regressions.mjs` | PASS. Kết quả [browser.json](browser.json) |
| Probe CSRF/Retry-After, bản `/tmp` | [state-probes.json](state-probes.json): lastStatus 200, delay 10000 ms |
| Root `npm run quality` | PASS: link/anchor/boundary/test placement, rồi 46 operations và 425 examples. Lỗi placement persistence không xuất hiện |

## Review Playwright trên preview đã build

PASS: trang công khai ở năm bề rộng; live không rơi về dữ liệu mẫu; W-14 không ghép answer theo page index; W-06 giữ lựa chọn chưa lưu và hiện “Đăng nhập lại”; W-16 một POST submit sau save bị giữ; FE-23 save câu thứ hai không báo lệch revision; W-18 lời giải biến mất sau 403.

FAIL có chủ đích, không nới assertion và không sửa spec đã lưu:

- `existing.spec.ts:120` tìm chữ `UI-GAP-02`. Copy sản phẩm không còn mã kỹ thuật đó.
- `existing.spec.ts:135` bấm liên kết “Quản trị” của preset thí sinh. Menu demo chỉ hiện khi preset có quyền quản trị. Trang từ chối vẫn mở được bằng URL `/admin`.

W-16 đạt trên bundle phòng thi trước lần rebuild chỉ đổi brand. Artifact hiện tại là `exam-room-DBcsmOlB.js`. Brand nằm ở header, không nằm trên đường deadline; ca W-16 chưa được chạy lại sau hash đó.

## Probe state

`state-probes.json` là một realm Node cộng Web Lock `exam-platform-csrf`, không phải hai tab trình duyệt và không phải cookie HTTPS. Bản `/tmp` của script truyền một answer version 0 tường minh vì ingest danh sách rỗng không còn tạo dòng đã tải. Script và JSON RED trong thư mục review không bị sửa.

## Trình duyệt bổ sung

[browser.json](browser.json) ghi PASS cho:

- Trang chủ không tràn ngang ở 320, 390, 768, 1024, 1440. Có “Exam Platform”, “Minh họa” và “Ba bước”.
- Phòng thi 320 không tràn ngang. Ô radio đang focus không nằm dưới dock.
- Bàn phím chọn radio, mở phiếu bằng tên “Phiếu câu hỏi” và Escape đóng dialog.
- Layout viewport 720 và 384, tương đương 1440 và 768 ở zoom 200%, không tràn ngang.
- Đề live 500 câu: trang đầu 0 radio, 24 lần “Tải thêm câu”, 500 ô phiếu, 2 radio, 2221 ms. Viewport 1280×800 nên phiếu nhìn thấy. Sau đó 2,5 giây không có PUT khi phòng còn sạch.

Ảnh: [screenshots](screenshots). `exam-zoom-200-320.png` là CSS `zoom: 2` trên viewport 320 cố định; dock bị cắt. Đó không phải browser zoom reflow và không được tính là lỗi sản phẩm của ca layout 320 không zoom. `exam-layout-384.png` là ca layout viewport.

Đăng nhập bằng bàn phím: Tab đầu tiên dừng ở “Kịch bản mẫu” của bản demo, rồi script focus ô email. Đây không phải thứ tự Tab thuần từ đầu trang.

## Bundle gzip level 9 trên artifact đang có

JS ban đầu của live home, năm file `index`, `memory`, `format`, `layout.module`, `mount`: 129916 byte gzip. CSS `index` + `layout`: 3370 byte gzip. Toàn bộ font woff2 đã phát: 100600 byte raw. Năm font mà trang chủ live đã yêu cầu: 55920 byte raw. Chunk phòng thi `exam-room-DBcsmOlB.js`: 8948 byte gzip, không nằm trong JS ban đầu.

Ngưỡng đề xuất trong task: JS 250 KiB, CSS 40 KiB, font 150 KiB. Các số trên nằm trong ngưỡng đó. Không phải p75, LCP hay CLS.

`apps/web/dist` không chứa “Kịch bản mẫu”, `candidate@example.test` hay `UI-GAP`. `apps/web/dist-demo` có chrome demo, gồm “Kịch bản mẫu”.

## Còn mở

| Hạng mục | Trạng thái |
| --- | --- |
| Identity HTTPS, cookie Secure trên TLS | BLOCKED |
| Catalog, Assessment, Reporting live | BLOCKED |
| Hai tab trình duyệt thật cho CSRF | NOT RUN |
| HAR lịch autosave khi đang dirty | NOT RUN |
| Nộp bài thủ công trên browser | NOT RUN |
| Firefox, WebKit, screen reader, axe của lần sửa này | NOT RUN |
| LCP, CLS | NOT RUN |
| WEB-01–10 và production acceptance | Không tick |
