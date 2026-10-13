# Evidence — Web UI đợt4 Admin

> Artifact retirement 2026-10-13: raw UI screenshots/trace/JSON/log/gallery đã được dọn theo yêu cầu người dùng. Nội dung bên dưới là báo cáo lịch sử; raw visual receipts không còn trong checkout. [Phạm vi và cách tái kiểm tra](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

Named scope14 Admin page exports, final verification2026-10-08. Baseline `80710f5`, cộng các thay đổi UI/backend có sẵn chưa commit. [Báo cáo](../../admin-implementation-2026-10-07.md).

- [Đã thu hồi — Manifest](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): source/build SHA,11 AST command/poll comparisons, source preservation và phạm vi.
- [Đã thu hồi — Root tests](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):224 PASS =94 API +37 tooling +93 Web. [Đã thu hồi — Workflow GREEN](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):7 regression mới. [Đã thu hồi — 6 RED ban đầu](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) và [Đã thu hồi — archive RED](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) ghi lỗi trước implementation.
- [Đã thu hồi — Browser log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — JSON](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):24 Chromium cases PASS,0 skipped/flaky;4 flows Admin mới đi qua editor/reorder/publication, native keys/type/archive, import và audit/replay/capabilities.
- [Đã thu hồi — Visual checks](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — capture log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):31 states ×5 widths =155 probes;62 axe scans,0 serious/critical/overflow/page errors/external requests. Reduced-motion và CSS zoom200% trên3 states PASS; đây không phải browser zoom hoặc full WCAG acceptance.
- [Đã thu hồi — Demo build](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — live build](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — lint/quality/contracts](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi). TypeScript kiểm tra trong cả hai builds.
- `regression/` có23 ảnh từ default browser suite lần chạy cuối. Default suite cũng refresh rolling folder public cũ; log/manifest historical của các đợt trước giữ nguyên. Dùng capture/manifest riêng của từng đợt để đọc evidence đúng scope.

Ảnh: [Đã thu hồi — overview](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — exam information](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — structure](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — picker](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — native question keys](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — archive confirmation](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — import](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — report](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — monitor](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — submissions](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — review](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — statistics](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — zero sample](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — metrics](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — audit detail](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi). Synthetic fixtures only.

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
