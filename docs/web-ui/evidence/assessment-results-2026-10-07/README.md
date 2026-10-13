# Evidence — Web UI đợt3

> Artifact retirement 2026-10-13: raw UI screenshots/trace/JSON/log/gallery đã được dọn theo yêu cầu người dùng. Nội dung bên dưới là báo cáo lịch sử; raw visual receipts không còn trong checkout. [Phạm vi và cách tái kiểm tra](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

Baseline `80710f5`, cộng đợt2 và backend work chưa commit. [Báo cáo và phạm vi](../../assessment-results-implementation-2026-10-07.md).

- [Đã thu hồi — Manifest](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): source/build hashes, controller preservation và kết quả quan sát.
- [Đã thu hồi — Root tests](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):217 PASS =94 API +37 tooling +86 Web; API gồm Assessment work song song. [Đã thu hồi — Lần đầu](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) lưu lỗi policy trước khi backend được cập nhật.
- [Đã thu hồi — Browser log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — browser JSON](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):20 Chromium cases PASS, không automatic retries. Hai ca mới đi qua đủ ba loại câu, keyboard/mark/submit/review và tables/privacy.
- [Đã thu hồi — Visual checks](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — capture log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):17 states ×5 widths =85 probes,34 axe scans,0 serious/critical/overflow/page errors/external requests. Room reduced-motion không running animation; CSS zoom200% không tràn ngang.
- [Đã thu hồi — Demo build](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — live build](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — typecheck](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — lint/quality/contracts](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).
- [Đã thu hồi — Manual refresh RED](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): test tái hiện thiếu thao tác kiểm tra lại; test cuối GREEN. Regression review403 kiểm tra xóa keys/giải thích khỏi DOM/cache.

Ảnh chính: [Đã thu hồi — room desktop](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — room mobile](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — result](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — review](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — failed status](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — history](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — leaderboard](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi). Tất cả dữ liệu là fixture tổng hợp, không phải dữ liệu vận hành.

Tái lập từ repo root với preview demo4173/live4174 đang chạy:

```sh
npm run web:build:demo
npm run web:build
npm run web:typecheck
npm test
npm run lint
node docs/web-ui/evidence/assessment-results-2026-10-07/capture.mjs
```

Chạy từ `apps/web`: `WEB_EVIDENCE_DIR=../../docs/web-ui/evidence/assessment-results-2026-10-07 npm run test:e2e`. [Đã thu hồi — Capture script](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) dùng synthetic fixtures và không ghi live credentials. Sau browser run, sao chép `apps/web/playwright-report/results.json` thành `browser.json`.

Chưa nghiệm thu live Assessment/Reporting UI, full WCAG/CWV, Firefox/WebKit, AWS hoặc production. Identity HTTPS là bộ riêng không chạy lại trong increment này.
