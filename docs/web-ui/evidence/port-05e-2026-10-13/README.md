# PORT-05E local evidence

> Artifact retirement 2026-10-13: raw UI screenshots/trace/JSON/log/gallery đã được dọn theo yêu cầu người dùng. Nội dung bên dưới là báo cáo lịch sử; raw visual receipts không còn trong checkout. [Phạm vi và cách tái kiểm tra](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

Ngày 2026-10-13. [Plan/review](../../port-05e-2026-10-13.md) COMPLETE locally.
Historical logs không phải final acceptance. Web/tablet,
mobile/app deferred; full live/AWS/production chưa nghiệm thu.

## Red→green và findings

- `profile-page-red.log`, `profile-page-red-retry.log`:3 FAIL với page cũ:
  click lặp, UTF-16 thay code points và unknown503 mất logical key. Lượt đầu
  unknown assertion dừng ở thiếu warning; lượt thứ hai retry/body assertion
  tái hiện chính xác key đổi.
- `demo-profile-red.log`:2 FAIL, lost ACK chưa có và cached receipt dùng chéo
  actor. Demo chỉ Profile được sửa actor+key namespace và fault injection;
  không audit toàn bộ synthetic adapter hoặc sửa backend.
- `profile-green-initial.log`:18 PASS; `profile-green-review.log`:21 PASS.
- `contradictory-projection-red.log`:1 FAIL/15 PASS; same-revision GET làm thay
  acknowledged fields. `projection-regression-red.log`:1 FAIL/16 PASS; GET
  revision thấp hơn session đã quan sát. Đã chặn cả hai; focused23 PASS.
- `dialog-scope-red.log`, `profile-delivery-green.log`: fixture actor change
  qua query-only navigation chưa phát React session context update; không coi
  đó là bằng chứng riêng cho actor fencing. Build `*-before-harness-fix.log`
  còn bắt nhầm option `exact` của Playwright dùng trong Testing Library.
  Đã sửa harness thành context update và bỏ option không thuộc type.
  `dialog-scope-corrected-red.log`: bỏ key scope thì FAIL thực; khôi phục keyed
  content PASS ở final root. `dialog-scope-green.log`:4 page tests PASS.
- [Đã thu hồi — browser-initial.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):48 PASS/5 FAIL, raw
  [Đã thu hồi — playwright-initial.json](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), retained trace/context/PNG
  trong `browser-initial-failures/`. Một prior test dùng opt-in label cũ;
  ba new selectors match cả checkbox description; gutter measurement tính
  wrapper border box thay vì content box bên trong padding. Product content
  có24px gutter trong ảnh; không thu nhỏ hoặc miễn điều kiện gutter để vượt test.
  Name/description checkbox được tách; scoped textbox + current label và content
  box đo thật được dùng. Không sửa API/fixture để che failure.
- [Đã thu hồi — browser-focused.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):5 PASS sau sửa, gồm prior opt-in
  regression và4 Profile flows. [Đã thu hồi — playwright-focused.json](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)
  là checkpoint; gallery final chỉ lấy full delivery mới.

## Phạm vi

Controlled demo loss/delay/429/conflict/reauth không chứng minh real network,
shared-cookie multi-tab, PostgreSQL durability hay permission discovery live.
Current synthetic Profile dựa verified session; không có live identity.self
permission provider trong UI. Mounted draft/key không survive navigation/reload.
Protect baseline API/templates/prior PORT evidence5505 files; tất cả giữ bytes.
Seed401/broader demo audit giữ follow-up riêng.

## Final receipts

- [Đã thu hồi — root-tests-delivery.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): **874 PASS**,492 API,
  66 tooling,316 Web. Root872/873 và focused18/21/23 là intermediate.
- [Đã thu hồi — browser-delivery.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — raw report](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):
  **53 Chromium PASS**,0 skipped/unexpected/flaky, retries=0;223,326ms toàn suite,
  không phải API latency/load benchmark. Full delivery sau final source/harness fix.
- [Đã thu hồi — Live build](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — demo build](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi),
  [Đã thu hồi — typecheck](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — lint](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi),
  [Đã thu hồi — format](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — extra format](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): PASS.
- [Đã thu hồi — Gallery](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — manifest](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): **25 final captures** trong
  `browser-delivery/profile/`. Font loaded,0 automated axe violations/no document
  overflow; minimum actual content gutter24px.7 dialog bounds/centering PASS.
  Normal/edit/saved cùng actor qua4 widths; không phải isolated fixtures.
- [Đã thu hồi — Runtime](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): Node24.17.0/macOS ARM64/Playwright1.63.0/
  Chromium153.0.8010.12, đọc từ browser worker thật.
- [Đã thu hồi — Protection](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):5.505 file unchanged; baseline/after hashes
  giữ cùng folder. [Đã thu hồi — SHA256SUMS](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) giữ selected final artifact hashes.
- [Đã thu hồi — Quality](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) PASS sau cập nhật docs: links/anchors/boundaries,
  48 operations/445 examples. [Đã thu hồi — Diff check](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) PASS; source snapshot
  và selected final receipts/PNG/JSON/gallery có SHA-256 cùng folder.

Historical Identity HTTPS/PG receipts không được tái sử dụng cho UI/controller
mới. No real Profile HTTPS/PG rerun, no production/SLO/FinOps/AWS acceptance.
