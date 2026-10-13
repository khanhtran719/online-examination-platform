# PORT-05H evidence — Public How / Help / 404

> Artifact retirement 2026-10-13: raw UI screenshots/trace/JSON/log/gallery đã được dọn theo yêu cầu người dùng. Nội dung bên dưới là báo cáo lịch sử; raw visual receipts không còn trong checkout. [Phạm vi và cách tái kiểm tra](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

Ngày2026-10-13. Web/tablet768/1024/1280/1440px.
[Plan/review](../../port-05h-2026-10-13.md). H1–H5 COMPLETE locally. Parent/full live/mobile/app/AWS/production không đóng.

## Reproduce

Node24, dependencies hiện có. Ở root chạy `npm test`, `npm run lint`,
`npm run format:check`, `npm run web:typecheck`, `npm run web:build`,
`npm run web:build:demo`. Ở apps/web chạy
`npm run test:e2e -- --config playwright.port-05h.config.ts`.
Config tự bật/dừng hai previews, reuseExistingServer=false, không overwrite
historical evidence; không chạy real Identity HTTPS suite hoặc AWS.

## Receipts

- `unit-red-summary.json`:3 FAIL trước implementation trên Auth-owned pages.
  `unit-green.log`/`unit-green-summary.json`:3 PASS; no raw failure DOM/token dump.
- `failures/focused-01/`:1 PASS/3 FAIL do probe bỏ qua padding trong gutter;
  giữ JSON/log/partial captures. Không UI defect hoặc SLO/performance regression.
- `browser-focused.log`/`playwright-focused.json`:4 PASS after corrected probe.
  `browser-delivery.log` (bounded console transcript) /
  `playwright-delivery.json` (complete report):70 PASS,0 unexpected/skipped/flaky,
  retries0. Managed previews stopped.
- `root-tests-delivery.log`:933 PASS (492 API/66 tooling/375 Web).
  Lint/format/types/build-live/build-demo logs là receipts riêng.
- `public-guides/`:28 final captures; [Đã thu hồi — gallery](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — manifest](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).
  Font/axe/body overflow/content gutters/44px control checks kèm từng ảnh.
  Keyboard mở cả13 FAQ, reset topic/reload, Enter/Space, reduced-motion,
  safe links/route guards/404 private-URL nonreflection và live `/dev/ui` gate.
- `public-guides/public-request-budget.json`:2 bootstrap GET me,0 page-owned
  business calls trong synthetic503 live adapter; không real TLS/PG/SES.
- `protected-baseline.json`/`protected-check.json`:7.680 protected files unchanged.
  API/templates/prior evidence/completed features/app/Home/Sample giữ bytes;
  Auth barrel/router là explicit placement exceptions, before text lưu riêng.
- `source-build-manifest.json`:current Web source và actual live/demo assets SHA.
  Lazy route chunks là build output, không đo production LCP/CLS/RPS/cost.

PublicFrame/Home/Sample ngoài named scope; public chrome/footer và internal arrow
khác artwork giữ follow-up. Không secret/dependency/backend/AWS change, no
production readiness claim. Preview proxy errors khi existing live-no-API tests
gọi3000 là expected fixture và vẫn phải được test kiểm tra.
