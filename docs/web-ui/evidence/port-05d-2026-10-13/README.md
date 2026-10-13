# PORT-05D local evidence

> Artifact retirement 2026-10-13: raw UI screenshots/trace/JSON/log/gallery đã được dọn theo yêu cầu người dùng. Nội dung bên dưới là báo cáo lịch sử; raw visual receipts không còn trong checkout. [Phạm vi và cách tái kiểm tra](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

Ngày 2026-10-13. [Plan/review](../../port-05d-2026-10-13.md) COMPLETE locally.
Historical logs không phải final acceptance. No AWS/production claim.

## Red→green và các failure giữ lại

- `controller-red.log`:11 FAIL tái hiện unauthenticated reads, actor cache,
  late mutation, denial, incomplete conflict, overlap/wait/reauth submit và
  wrong receipt. `controller-green-initial.log`:44 Assessment PASS sau sửa.
- `controller-review-red*.log`: offline edit và missing ACK. Một lần kiểm tra
  false-positive do offline onlineManager từ test trước; thêm readiness guard,
  reset onlineManager, assertion request thực sự chạy. Red4:2 FAIL đúng behavior.
- `clock-leave-red.log`: missing new clock helper và beforeunload unknown-submit
  FAIL. Sample RTT/monotonic và explicit leave guard được thêm sau đó.
- `recovery-faults-red.log`: reconnect/reauth cắt Retry-After và thiếu synthetic
  submit lost ACK:3 FAIL; đã sửa, không thay live adapter.
- `private-dialog-red.log`: conflict vẫn lộ local selection khi reauth; đã ẩn.
- `submit-owner-red.log`: synthetic receipt bị đọc bởi candidate khác. Green
  [Đã thu hồi — submit-owner-green.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) xác nhận permission/ownership
  trước replay. Fixture registration được bổ sung đủ fields sau TS check.
- `paged-room-red.log`: loaded question không editable nếu còn question cursor
  dù answer scope đã đầy đủ. [Đã thu hồi — final-review-green.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):
  68 Assessment/demo tests PASS sau sửa. Final root còn có đầy đủ regression khác.
- [Đã thu hồi — browser-initial.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):44 PASS/4 FAIL. Findings:
  old fallback copy, section positions lặp ordinal, Alert không phải heading,
  offline status selector trùng. Context/screenshot/trace trong
  `browser-initial-failures/`; retained raw report `playwright-initial.json`.
- `aborted-build-*-delivery.log`: fixture thiếu displayName/password làm TS
  reject. `aborted-browser-delivery.log`, `playwright-aborted.json` và
  `browser-aborted-stale-build/` là lượt bị dừng exit130 vì assets cũ; **excluded**.
- [Đã thu hồi — browser-before-paged-fix.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):47 PASS/1 FAIL;
  score thực tế6/6 đúng, test tìm text nguyên khối trong khi markup có whitespace
  và đơn vị. Đã scope assertion vào region điểm và normalize whitespace; không
  hạ kỳ vọng điểm. Raw trace/context trong `browser-before-paged-fix-failures/`.
- [Đã thu hồi — browser-paged-selector.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):48 PASS/1 FAIL;
  selector đề 120 câu giả định UUID có prefix của seed, trong khi UUID mới là V7.
  Sửa locator theo link đề được tạo; không đổi ứng dụng để khớp giả định test.
  [Đã thu hồi — browser-paged-probe.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) xác nhận flow dài PASS.
- [Đã thu hồi — browser-before-overlay-fix.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):49 PASS,
  nhưng visual review phát hiện backdrop xung đột bị giới hạn 840px ở viewport
  1280px. Bộ kiểm tra trước đó chưa kiểm bounds của backdrop. Thêm assertion
  cho toàn viewport và dialog căn giữa: [Đã thu hồi — browser-overlay-red.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)
  tái hiện FAIL. Sửa selector CSS vào dialog con, giữ backdrop toàn màn hình.
  Trace/context/screenshot RED ở `browser-overlay-red-failures/`.

## Bằng chứng cuối

- [Đã thu hồi — root-tests-delivery-final.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): **850 PASS**,
  gồm 492 API, 66 tooling, 292 Web. Focused Assessment/demo: 68 PASS.
- [Đã thu hồi — browser-overlay-green.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): focused overlay
  regression PASS sau sửa CSS; [Đã thu hồi — browser-delivery.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) và
  [Đã thu hồi — playwright-delivery.json](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): **49 Chromium PASS**,
  0 skipped/unexpected/flaky, retries=0, 204,756ms toàn suite. Đây không phải
  API latency/load benchmark.
- [Đã thu hồi — build-live-overlay-final.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi),
  [Đã thu hồi — build-demo-overlay-final.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): strict builds
  PASS sau CSS cuối. [Đã thu hồi — lint-delivery.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi),
  [Đã thu hồi — format-delivery.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi),
  [Đã thu hồi — extra-format-overlay-final.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi),
  [Đã thu hồi — typecheck-final.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): PASS.
- [Đã thu hồi — Gallery](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — captures.json](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): **26 ảnh final**
  thuộc `browser-delivery/exam-room/`, đủ 4 widths và fault states. Font loaded,
  zero automated axe violations, không tràn document, gutter nhỏ nhất 24px.
  7 dialog có backdrop đúng toàn viewport và căn giữa. Các thư mục browser cũ
  chỉ giữ lịch sử, không chọn ảnh lỗi cho gallery final.
- [Đã thu hồi — runtime.json](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): Node 24.17.0/macOS ARM64/Playwright 1.63.0/
  Chromium 153.0.8010.12. [Đã thu hồi — protected-check.json](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):
  **3.219 file API/template/prior PORT evidence không đổi bytes**;
  baseline/hash sau ở `protected-before.json` và `protected-after.json`.
- [Đã thu hồi — SHA256SUMS](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) gồm final ảnh/JSON, manifest/gallery, report/runtime,
  protection và receipts đã chọn. Historical failures giữ nguyên, không overwrite
  template hoặc evidence cũ. [Đã thu hồi — quality-delivery.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) PASS
  sau cập nhật docs: links/anchors/boundaries, 48 operations và 445 examples.
  [Đã thu hồi — diff-check.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) PASS, không có whitespace error.

Root/backend tests và Chromium demo không thay full live integration. Offline
event và BroadcastChannel là injection cùng một browser; không chứng minh real
shared-cookie multi-tab hoặc network outage. New attempt dùng mọi native type,
server demo save/submit và score6/6; seed401 vẫn không dùng cho consistency.
Không benchmark/cost/rate/HA claim. Parent PORT-05/live/mobile/production mở.
