# Evidence — Web UI đợt3

Baseline `80710f5`, cộng đợt2 và backend work chưa commit. [Báo cáo và phạm vi](../../assessment-results-implementation-2026-10-07.md).

- [Manifest](manifest.json): source/build hashes, controller preservation và kết quả quan sát.
- [Root tests](tests-final.log):217 PASS =94 API +37 tooling +86 Web; API gồm Assessment work song song. [Lần đầu](tests.log) lưu lỗi policy trước khi backend được cập nhật.
- [Browser log](browser.log), [browser JSON](browser.json):20 Chromium cases PASS, không automatic retries. Hai ca mới đi qua đủ ba loại câu, keyboard/mark/submit/review và tables/privacy.
- [Visual checks](visual-checks.json), [capture log](capture.log):17 states ×5 widths =85 probes,34 axe scans,0 serious/critical/overflow/page errors/external requests. Room reduced-motion không running animation; CSS zoom200% không tràn ngang.
- [Demo build](build-demo.log), [live build](build-live.log), [typecheck](typecheck.log), [lint/quality/contracts](lint.log).
- [Manual refresh RED](status-refresh-red.log): test tái hiện thiếu thao tác kiểm tra lại; test cuối GREEN. Regression review403 kiểm tra xóa keys/giải thích khỏi DOM/cache.

Ảnh chính: [room desktop](screenshots/room-selected-1440.png), [room mobile](screenshots/room-multiple-390.png), [result](screenshots/result-1440.png), [review](screenshots/review-390.png), [failed status](screenshots/status-failed-390.png), [history](screenshots/history-1440.png), [leaderboard](screenshots/leaderboard-1440.png). Tất cả dữ liệu là fixture tổng hợp, không phải dữ liệu vận hành.

Tái lập từ repo root với preview demo4173/live4174 đang chạy:

```sh
npm run web:build:demo
npm run web:build
npm run web:typecheck
npm test
npm run lint
node docs/web-ui/evidence/assessment-results-2026-10-07/capture.mjs
```

Chạy từ `apps/web`: `WEB_EVIDENCE_DIR=../../docs/web-ui/evidence/assessment-results-2026-10-07 npm run test:e2e`. [Capture script](capture.mjs) dùng synthetic fixtures và không ghi live credentials. Sau browser run, sao chép `apps/web/playwright-report/results.json` thành `browser.json`.

Chưa nghiệm thu live Assessment/Reporting UI, full WCAG/CWV, Firefox/WebKit, AWS hoặc production. Identity HTTPS là bộ riêng không chạy lại trong increment này.
