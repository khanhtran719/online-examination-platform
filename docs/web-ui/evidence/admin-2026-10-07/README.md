# Evidence — Web UI đợt4 Admin

Named scope14 Admin page exports, final verification2026-10-08. Baseline `80710f5`, cộng các thay đổi UI/backend có sẵn chưa commit. [Báo cáo](../../admin-implementation-2026-10-07.md).

- [Manifest](manifest.json): source/build SHA,11 AST command/poll comparisons, source preservation và phạm vi.
- [Root tests](unit.log):224 PASS =94 API +37 tooling +93 Web. [Workflow GREEN](workflows-green.log):7 regression mới. [6 RED ban đầu](workflows-red.log) và [archive RED](archive-red.log) ghi lỗi trước implementation.
- [Browser log](browser.log), [JSON](browser.json):24 Chromium cases PASS,0 skipped/flaky;4 flows Admin mới đi qua editor/reorder/publication, native keys/type/archive, import và audit/replay/capabilities.
- [Visual checks](visual-checks.json), [capture log](visual.log):31 states ×5 widths =155 probes;62 axe scans,0 serious/critical/overflow/page errors/external requests. Reduced-motion và CSS zoom200% trên3 states PASS; đây không phải browser zoom hoặc full WCAG acceptance.
- [Demo build](build-demo.log), [live build](build-live.log), [lint/quality/contracts](lint.log). TypeScript kiểm tra trong cả hai builds.
- `regression/` có23 ảnh từ default browser suite lần chạy cuối. Default suite cũng refresh rolling folder public cũ; log/manifest historical của các đợt trước giữ nguyên. Dùng capture/manifest riêng của từng đợt để đọc evidence đúng scope.

Ảnh: [overview](screenshots/overview-1440.png), [exam information](screenshots/exam-information-1440.png), [structure](screenshots/exam-structure-1440.png), [picker](screenshots/exam-picker-390.png), [native question keys](screenshots/question-multiple-390.png), [archive confirmation](screenshots/question-archive-confirm-390.png), [import](screenshots/import-confirm-390.png), [report](screenshots/import-report-1440.png), [monitor](screenshots/monitor-1440.png), [submissions](screenshots/submissions-390.png), [review](screenshots/attempt-completed-1440.png), [statistics](screenshots/statistics-1440.png), [zero sample](screenshots/statistics-zero-390.png), [metrics](screenshots/metrics-1440.png), [audit detail](screenshots/audit-detail-390.png). Synthetic fixtures only.

Tái lập từ repo root, với previews demo4173/live4174 đang chạy:

```sh
npm test
npm run lint
npm run web:build:demo
npm run web:build
node docs/web-ui/evidence/admin-2026-10-07/capture.mjs
```

Từ `apps/web`: `WEB_EVIDENCE_DIR=../../docs/web-ui/evidence/admin-2026-10-07 npm run test:e2e`; sao chép `playwright-report/results.json` vào `browser.json` sau run. Capture tạo context mới cho từng state, login/preset qua UI và không ghi live credentials.

Live Admin không được mở khi chưa có nguồn quyền authoritative. Identity HTTPS và PG integration không chạy lại; full lost-ACK/conflict browser matrix, Firefox/WebKit, WCAG/CWV, capacity và AWS/production acceptance chưa hoàn tất.
