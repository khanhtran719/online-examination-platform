# Evidence — Web UI đợt 2

Baseline `80710f5`; implementation chưa commit. [Báo cáo và phạm vi](../../onboarding-catalog-implementation-2026-10-07.md).

- [Manifest](manifest.json): source hashes và kết quả kiểm tra đã quan sát.
- [Visual checks](visual-checks.json):13 screens/states ×5 widths =65 probes,26 axe scans,0 serious/critical,0 overflow/pageerrors/external requests; login reduced-motion/zoom200%.
- [Browser log](browser.txt), [browser JSON](browser.json):18 Chromium cases passed trên build cuối.
- [Identity HTTPS summary](identity-https.json):10 cases với API/PostgreSQL/SMTP thật; chỉ summary redacted, không raw credentials/cookies/mail links.
- [Demo build](build-demo.txt), [live build](build-live.txt), [quality](quality.txt).
- [Capture script](capture.mjs): fixtures synthetic. Screenshots có banner Dữ liệu mẫu; không phải dữ liệu người dùng/production.

Ảnh chính: [login desktop](screenshots/login-1440.png), [register mobile](screenshots/register-390.png), [dashboard](screenshots/dashboard-1440.png), [catalog](screenshots/catalog-1440.png), [detail desktop](screenshots/detail-1440.png), [detail mobile](screenshots/detail-long-390.png). Các ảnh missing/invalid verification, empty/invalid category và start dialog ở cùng thư mục.

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
