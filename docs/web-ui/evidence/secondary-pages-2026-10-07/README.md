# Secondary pages — visual review, 2026-10-07

[Review và mapping đầy đủ](../../secondary-pages-visual-review-2026-10-07.md). Scope: review ngoài homepage và bộ ảnh điều chỉnh, không sửa các trang nghiệp vụ trong `apps/web`.

## Hiện trạng

`current/` có29 route demo desktop và4 ảnh mobile; `live-login-1440.png` chụp login live riêng. Screenshot demo vẫn có nhãn synthetic data. `capture-current.mjs` đi qua public routes hoặc đăng nhập demo với return route; Admin chọn preset demo, không gọi API live hay ghi dữ liệu production. Import report chỉ đọc source, không thực hiện import để tạo report.

`current-capture.json` ghi lần kiểm tra lại6 route tải chậm: exam-room, result, review, status, history và leaderboard,0 page errors. Bộ29 route đầy đủ được chụp trước đó; filename/route mapping nằm trong script. Lượt chụp ban đầu bắt nhầm skeleton ở vài route lazy; các ảnh đó đã được chụp lại sau khi chờ nội dung thật. Đây là lỗi capture, không được báo là lỗi sản phẩm.

## Đề xuất

[Gallery HTML](proposals/index.html) gồm24 screens: register, login, mail, verify, dashboard, catalog, detail, history, leaderboard, profile, room, result, review, states, admin, editor, bank, question-editor, import, monitor, metrics, audit, how và help.

Ảnh desktop mang suffix `-1440.png`; register/catalog/room/result/editor có thêm `-390.png`. [Overview](proposals/gallery-overview.png) tập hợp24 mẫu; [Highlights](proposals/highlights.png) trình bày6 màn chính để xem nhanh. Tổng cộng24 ảnh desktop,5 mobile và2 ảnh gallery. Font subsets và licenses nằm trong `proposals/assets/`. Không có CDN/ảnh remote, analytics, API, auth token hoặc data storage. Các figure số liệu/câu hỏi đều là minh họa có nhãn.

Prototype dùng HTML/CSS và phối cảnh CSS cho vật liệu phiếu thi; đây là output code-native để giữ chính xác chữ, form và bố cục. Không dùng ImageGen để thay chữ UI bằng ảnh raster, không sửa PNG của app. Không thêm runtime dependency hoặc consumer trong app.

## Tái lập

Từ repository root, với preview demo4173/live4174 và dependencies `apps/web` đã có:

```text
node docs/web-ui/evidence/secondary-pages-2026-10-07/capture-current.mjs
python3 -m http.server 4175 --bind 127.0.0.1 --directory docs/web-ui/evidence/secondary-pages-2026-10-07/proposals
node docs/web-ui/evidence/secondary-pages-2026-10-07/render-proposals.mjs
```

Browser cần quyền launch Chromium ở môi trường local. `render-proposals.mjs` xuất24 ảnh desktop và5 mobile, kiểm tra120 widths và chạy axe trên từng màn desktop. [Check results](proposal-checks.json) ghi0 overflow,0 serious/critical,0 page errors và0 external requests. `manifest.json` ghi digests của source review và các artifacts hiện tại. `npm run quality` PASS: checks tài liệu/architecture/test placement và contracts46 operations/425 examples; log nằm ở `quality.log`. `git diff --check` PASS, chạy riêng.

Không chạy lại toàn bộ suite behavior/auth/security của app vì không đổi app source trong lượt này. Không chứng nhận WCAG, backend live, CSS animation, Safari/thiết bị thật, Core Web Vitals/FPS hay conversion. Tabs/editor/sheet/menu và button nghiệp vụ của prototype chưa nối đầy đủ; khi triển khai phải dùng state/permissions/ACK đã có. Các gate production giữ nguyên.
