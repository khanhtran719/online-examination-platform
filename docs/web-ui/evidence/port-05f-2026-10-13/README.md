# PORT-05F evidence — Identity Web/tablet

> Artifact retirement 2026-10-13: raw UI screenshots/trace/JSON/log/gallery đã được dọn theo yêu cầu người dùng. Nội dung bên dưới là báo cáo lịch sử; raw visual receipts không còn trong checkout. [Phạm vi và cách tái kiểm tra](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

Ngày2026-10-13. Named scope Login/Register/Check Email/Verify tại
768/1024/1280/1440px. [Plan/review](../../port-05f-2026-10-13.md).
Mobile/app/AWS/production không được đóng từ evidence này.

## Lịch sử và privacy

`red-summary.json` giữ9 input/duplicate failures trước implementation và11
agent-written actor/route/read/verification failures. `session-red-summary.json`
giữ late bootstrap response sau logout; `bootstrap-red-summary.json` giữ loading
hang do refresh reauth metadata; `resend-scope-red-summary.json` giữ private
email/pending sau epoch change. `green-initial-summary.json` và
`unit-focused-final-summary.json` là các checkpoint riêng. Raw Vitest failure
DOM chứa synthetic password được loại khỏi tracked evidence; chỉ archive tên,
status/count. Không raw credentials/traces/cookies/email links.

`https-initial.log`/`https-initial/` là failure thật: initial bootstrap bị treo và
selectors Profile cũ chưa theo port05E. Không dùng làm acceptance. Sửa provider
với regression, cập nhật selectors/explicit retry CTA theo UI mới; không giảm
assertions TLS/cookie/Origin/CSRF, PG revision/intents/consumed/revoked hoặc hai
tab. `https-review/` giữ10 PASS checkpoint; `https-delivery/` là final build/run
provenance cùng19 migration bundle. Containers dừng, volumes giữ nguyên.

`browser-focused-initial.log` có6 PASS trước bổ sung hai browser regressions.
`browser-first-full.log`/`playwright-first-full.json` giữ59 PASS/2 FAIL của full
run đầu: live Login/Register unavailable cần explicit session recovery thay vì
active form như tests cũ. Fixtures không có credentials; password literal trong
source snippet được redact. `browser-correction.log` giữ3 targeted PASS (demo và
live sample navigation, live no-demo fallback), tăng assertion blocked form và
recovery CTA; không giảm source/business-request/no-demo/error checks.
`browser-delivery.log`/`playwright-delivery.json` là full final run, retries0;
không gộp hoặc dùng focused count làm full count. Extra synthetic live-adapter
tests trong `port-05f.e2e-spec.ts` chỉ intercept HTTP responses; không là real
TLS/session/DB proof. Real HTTPS run có API/PostgreSQL/SMTP worker/Mailpit và
shared cookie jar/Web Locks; scoped ephemeral leaf SPKI trust, không public PKI.
Existing narrow mobile checks được giữ nguyên, không mở mobile/app acceptance.

## Bằng chứng cuối

Root unit/tooling/Web: `root-tests-delivery.log`. Static/boundaries/contracts:
`lint-delivery.log`, `format-delivery.log`, `extra-format-delivery.log`,
`typecheck-delivery.log`, `api-typecheck-delivery.log`, `quality-delivery.log`,
`diff-check.log`. Live build do HTTPS runner thực hiện trong `https-delivery.log`;
demo build `build-demo-delivery.log`. Runtime receipt ghi Node/Playwright/Chromium/
OS thực, không suy viewport từ ảnh mẫu.

`identity/` chỉ capture actual current state, không boards. [Đã thu hồi — Gallery](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi),
[Đã thu hồi — manifest](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) ghi viewport, font, axe ID count, document overflow,
frame gutter và password empty/masked metadata; không input values hoặc token
URLs. [Đã thu hồi — Source/build hashes](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) gắn bản code với artifact.
`SHA256SUMS` bảo vệ toàn bộ evidence hiện tại. Full-suite captures của các feature
cũ vào thư mục riêng trong increment này, không ghi đè prior phase evidence.

`protected-before.json`/`protected-check.json`:6.398 API/template/prior evidence
và sensitive bootstrap/live/coordinator sources giữ nguyên. Kiểm tra sau docs
và final browser run; không coi file hiện diện là production benchmark.

Automated axe/font/overflow và visual inspection chỉ đóng named local UI checks.
Manual screen reader/password-manager vendor/browser-engine/full zoom matrix,
full live Admin/permissions/Catalog/Assessment/Reporting và AWS/cost/SLO/production
vẫn riêng. Mounted secret/retry không persist qua reload; route fence không hủy
request đã tới server. HTTPS durations là test-run durations, không latency/SLO
hoặc capacity benchmark.
