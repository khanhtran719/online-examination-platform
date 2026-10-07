# Evidence — nền tảng Web UI đợt1, 2026-10-07

Scope: [kế hoạch/review](../../foundation-implementation-2026-10-07.md), triển khai trên `main` sau merge tại `e9606f0`. Shared primitives/Brand/Navigation và Candidate/Admin WorkspaceFrame trong `apps/web`; không đổi API/DTO/scoring/quyền/session coordinator hoặc schema. Không runtime dependency mới.

## Kết quả

Final PASS:202 root cases (89 API/37 tooling/76 Web),16 browser cases,10 Identity HTTPS, live/demo TypeScript/build và root lint/quality/contracts46 operations/425 examples. `git diff --check` PASS.16 màn ×5 widths =80 checks,0 overflow; axe32 desktop/mobile +9 menu mở không serious/critical;0 page errors,0 external requests. Reduced-motion0s/none và CSS zoom200% PASS. Logs cuối: `root-tests.log`, `browser-regression.log`, `identity-https.log`, `build-live.log`, `build-demo.log`, `root-lint.log`, `quality.log`, `visual.log`. `manifest.json` lưu SHA-256 source/artifacts.

Các log trước đó và reproduction giữ riêng:

- `menu-red.log`: Escape không đóng menu Public trước sửa.
- `fields-red.log`: supplied ID/helper, textarea error và disabled password toggle đều fail trước sửa.
- `menu-history-red.log`: Back làm menu cũ mở lại; sửa bằng reset Navigation theo router location key.
- `browser-regression-first.log`:15 PASS,1 FAIL do test dùng native popup arrows trên macOS headless.
- `keyboard-probe.log`: các native popup arrow sequences không đổi select; typeahead `t` đổi sangTOEIC bằng keyboard event thật. Test cuối dùng typeahead. Không thay select bằng control tự chế để làm test pass.
- `foundation-green.log` là checkpoint trước sửa ca select, không được dùng làm final PASS evidence.

`visual-checks.json` lưu widths, axe serious/critical, menu mở, zoom/reduced-motion và page errors/external requests. Screenshot là UI thật của build demo; dữ liệu mẫu có banner. `live-login-1440.png` riêng cho shell/form live. Không lưu screenshot/trace/cookie/credential từ suite Identity HTTPS thật.

## Ảnh

[Candidate desktop](screenshots/catalog-1440.png), [Candidate mobile/menu](screenshots/catalog-menu-390.png), [Admin desktop](screenshots/admin-exams-1440.png), [Admin mobile/menu](screenshots/admin-exams-menu-390.png), [Controls desktop](screenshots/controls-1440.png), [Controls mobile](screenshots/controls-390.png), [Login mobile](screenshots/login-390.png), [Zoom200%](screenshots/controls-zoom-200.png).

`regression/` và `public-experience/` chứa ảnh cuối của existing browser suites. `first-regression-images/` giữ ảnh lần chạy đầu; ảnh lịch sử ở evidence “Vào nhịp thi” được giữ byte-identical theo merge baseline. `WEB_EVIDENCE_DIR` chỉ đổi nơi lưu ảnh, không đổi assertion.

## Tái lập

Từ repository root, với dependencies từ lockfiles và previews demo4173/live4174 đang chạy:

```sh
npm run web:build:demo
npm run web:build
npm test
npm run lint
node docs/web-ui/evidence/foundation-2026-10-07/capture.mjs
```

Từ `apps/web`:

```sh
WEB_EVIDENCE_DIR=../../docs/web-ui/evidence/foundation-2026-10-07 npm run test:e2e
```

HTTPS regression từ root: `npm run test:identity:https`, theo [runbook](../../../runbooks/identity-https.md). Dedicated Compose, ephemeral DB/certs và immutable Web build snapshot tự cleanup; runner kiểm tra auth thật, không chứng nhận public PKI. Chromium launch/localhost/Docker cần quyền local trong môi trường này.

## Giới hạn

Browser tự động là Chromium; chưa xác nhận Firefox/WebKit/thiết bị thật/native popup UI của macOS. Zoom dùng CSS200% tại viewport1440px, không là browser zoom hoặc chứng nhận WCAG. Không đo FPS/Core Web Vitals/conversion/capacity/AWS cost. Candidate/Assessment/Admin samples không chứng minh các API live đã triển khai. FE-05/06 full acceptance còn các primitive/route/state khác; đợt1 chỉ đóng scope nền tảng đã được yêu cầu. Các bộ ảnh24 màn đề xuất vẫn là mục tiêu của các đợt sau.
