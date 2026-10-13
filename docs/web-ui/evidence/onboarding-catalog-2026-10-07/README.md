# Evidence — Web UI đợt 2

> Artifact retirement 2026-10-13: raw UI screenshots/trace/JSON/log/gallery đã được dọn theo yêu cầu người dùng. Nội dung bên dưới là báo cáo lịch sử; raw visual receipts không còn trong checkout. [Phạm vi và cách tái kiểm tra](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

Baseline `80710f5`; implementation chưa commit. [Báo cáo và phạm vi](../../onboarding-catalog-implementation-2026-10-07.md).

- [Đã thu hồi — Manifest](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): source hashes và kết quả kiểm tra đã quan sát.
- [Đã thu hồi — Visual checks](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):13 screens/states ×5 widths =65 probes,26 axe scans,0 serious/critical,0 overflow/pageerrors/external requests; login reduced-motion/zoom200%.
- [Đã thu hồi — Browser log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — browser JSON](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):18 Chromium cases passed trên build cuối.
- [Đã thu hồi — Identity HTTPS summary](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):10 cases với API/PostgreSQL/SMTP thật; chỉ summary redacted, không raw credentials/cookies/mail links.
- [Đã thu hồi — Demo build](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — live build](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — quality](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).
- [Đã thu hồi — Capture script](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): fixtures synthetic. Screenshots có banner Dữ liệu mẫu; không phải dữ liệu người dùng/production.

Ảnh chính: [Đã thu hồi — login desktop](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — register mobile](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — dashboard](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — catalog](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — detail desktop](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — detail mobile](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi). Các ảnh missing/invalid verification, empty/invalid category và start dialog ở cùng thư mục.

Tái lập từ repo root, với preview demo4173 và live4174 đang chạy:

```sh
npm run web:build:demo
npm run web:build
npm test
npm run lint
node docs/web-ui/evidence/onboarding-catalog-2026-10-07/capture.mjs
```

Chạy từ `apps/web`: `WEB_EVIDENCE_DIR=../../docs/web-ui/evidence/onboarding-catalog-2026-10-07 npm run test:e2e`. Từ repo root: `npm run test:identity:https` theo [runbook Identity](../../../runbooks/identity-https.md), sau đó sao chép summary redacted từ `apps/web/.local/identity-https-results/summary.json`.

Unit/tooling206, typecheck, build và lint đã chạy trên source mới. Live Catalog UI/Assessment/Reporting, browser matrix ngoài Chromium, WCAG/CWV/production acceptance chưa được xác nhận bởi bộ evidence này.
