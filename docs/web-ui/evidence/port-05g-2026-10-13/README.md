# PORT-05G evidence — Candidate Dashboard

> Artifact retirement 2026-10-13: raw UI screenshots/trace/JSON/log/gallery đã được dọn theo yêu cầu người dùng. Nội dung bên dưới là báo cáo lịch sử; raw visual receipts không còn trong checkout. [Phạm vi và cách tái kiểm tra](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

Ngày2026-10-13. Named Web/tablet768/1024/1280/1440px scope.
[Plan/review](../../port-05g-2026-10-13.md). Parent/mobile/app/live/AWS/production
không được đóng từ screenshots hoặc synthetic HTTP.

## Failures và interrupted work

`fences-red-summary.json`:15 failing reproductions do agent viết độc lập trước
fix (actor/cache/session/denial/unmount/stale/serialization/default retry/focus).
`snapshot-red-summary.json`:2 FAIL/1 PASS về cursor-null copy và wrong frozen
version, zero/null/status routing retained. `backpressure-red-summary.json`:
5 FAIL về immediate chained callbacks/429/category/actor wait; `metadata-scope-red-summary.json`:5 PASS/1 FAIL trước scope clearing. `green-initial-summary.json`
và `green-final-summary.json` là checkpoints riêng, final27 PASS.

`lint-initial.log` giữ2 import-sort errors đã sửa; no source-rule suppression.
Vitest raw failure DOM có synthetic fields, không tracked; tên/count/status giữ
trong summaries. Không raw auth credentials/token/traces/response dumps.
Lượt full browser bị user interruption trước khi khởi chạy; không có run receipt
và không dùng làm acceptance. Config local mới tự quản lý previews và current
evidence directory để dễ tái hiện; base config/old browser tests/API unchanged.

## Final receipts

`root-tests-delivery.log`:930 PASS (492 API/66 tooling/372 Web).
`browser-focused-initial.log`/`playwright-focused-initial.json`:5 PASS.
`browser-delivery.log`/`playwright-delivery.json`:66 PASS full final run,0 skipped/unexpected/flaky,retries0.
`build-live-delivery.log`/`build-demo-delivery.log`, `typecheck-delivery.log`,
`lint-delivery.log`/`web-lint-review-config.log`, `format-delivery.log`/
`extra-format-delivery.log`, `quality-delivery.log`, `diff-check.log` ghi checks
riêng. Managed preview proxy ECONNREFUSED trong live-no-API cases là expected
fixture, không là production outage hoặc bị bỏ qua bởi tests.

`dashboard/` có24 captures; [Đã thu hồi — gallery](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — manifest](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi),
font loaded/axe/overflow/gutters và runtime Node/Chromium metadata. Synthetic
HTTP fixture zero/null scores, long names/frozen metadata, complete empty,
partial errors, stale, denied, pending, Retry-After và reauth được ghi đúng scope.
`dashboard/request-budget.json` ghi bounded query requests, không latency/RPS/
CPU/cost benchmark. Explicit detail navigation khác automatic per-row lookup.

[Đã thu hồi — Source/build hashes](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) và `SHA256SUMS` gắn artifacts
với bản code. `protected-before.json`/`protected-check.json`:6.960 API/templates/
prior evidence/PORT-05F source files unchanged, dirty authorized F work retained.
Full-suite captures của feature khác vào current directory, không overwrite
historical evidence. Root report/config/test artifacts là local, không deploy.

Real Dashboard API/PostgreSQL/HTTPS/shared-cookie business acceptance chưa chạy.
10 real HTTPS cases thuộc PORT-05F chỉ là lịch sử. Automated axe không là full
WCAG/screen-reader/password-manager/zoom/browser-engine/mobile acceptance.
