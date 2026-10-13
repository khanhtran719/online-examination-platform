# PORT-05D local evidence

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
  [submit-owner-green.log](submit-owner-green.log) xác nhận permission/ownership
  trước replay. Fixture registration được bổ sung đủ fields sau TS check.
- `paged-room-red.log`: loaded question không editable nếu còn question cursor
  dù answer scope đã đầy đủ. [final-review-green.log](final-review-green.log):
  68 Assessment/demo tests PASS sau sửa. Final root còn có đầy đủ regression khác.
- [browser-initial.log](browser-initial.log):44 PASS/4 FAIL. Findings:
  old fallback copy, section positions lặp ordinal, Alert không phải heading,
  offline status selector trùng. Context/screenshot/trace trong
  `browser-initial-failures/`; retained raw report `playwright-initial.json`.
- `aborted-build-*-delivery.log`: fixture thiếu displayName/password làm TS
  reject. `aborted-browser-delivery.log`, `playwright-aborted.json` và
  `browser-aborted-stale-build/` là lượt bị dừng exit130 vì assets cũ; **excluded**.
- [browser-before-paged-fix.log](browser-before-paged-fix.log):47 PASS/1 FAIL;
  score thực tế6/6 đúng, test tìm text nguyên khối trong khi markup có whitespace
  và đơn vị. Đã scope assertion vào region điểm và normalize whitespace; không
  hạ kỳ vọng điểm. Raw trace/context trong `browser-before-paged-fix-failures/`.
- [browser-paged-selector.log](browser-paged-selector.log):48 PASS/1 FAIL;
  selector đề 120 câu giả định UUID có prefix của seed, trong khi UUID mới là V7.
  Sửa locator theo link đề được tạo; không đổi ứng dụng để khớp giả định test.
  [browser-paged-probe.log](browser-paged-probe.log) xác nhận flow dài PASS.
- [browser-before-overlay-fix.log](browser-before-overlay-fix.log):49 PASS,
  nhưng visual review phát hiện backdrop xung đột bị giới hạn 840px ở viewport
  1280px. Bộ kiểm tra trước đó chưa kiểm bounds của backdrop. Thêm assertion
  cho toàn viewport và dialog căn giữa: [browser-overlay-red.log](browser-overlay-red.log)
  tái hiện FAIL. Sửa selector CSS vào dialog con, giữ backdrop toàn màn hình.
  Trace/context/screenshot RED ở `browser-overlay-red-failures/`.

## Bằng chứng cuối

- [root-tests-delivery-final.log](root-tests-delivery-final.log): **850 PASS**,
  gồm 492 API, 66 tooling, 292 Web. Focused Assessment/demo: 68 PASS.
- [browser-overlay-green.log](browser-overlay-green.log): focused overlay
  regression PASS sau sửa CSS; [browser-delivery.log](browser-delivery.log) và
  [playwright-delivery.json](playwright-delivery.json): **49 Chromium PASS**,
  0 skipped/unexpected/flaky, retries=0, 204,756ms toàn suite. Đây không phải
  API latency/load benchmark.
- [build-live-overlay-final.log](build-live-overlay-final.log),
  [build-demo-overlay-final.log](build-demo-overlay-final.log): strict builds
  PASS sau CSS cuối. [lint-delivery.log](lint-delivery.log),
  [format-delivery.log](format-delivery.log),
  [extra-format-overlay-final.log](extra-format-overlay-final.log),
  [typecheck-final.log](typecheck-final.log): PASS.
- [Gallery](gallery.html), [captures.json](captures.json): **26 ảnh final**
  thuộc `browser-delivery/exam-room/`, đủ 4 widths và fault states. Font loaded,
  zero automated axe violations, không tràn document, gutter nhỏ nhất 24px.
  7 dialog có backdrop đúng toàn viewport và căn giữa. Các thư mục browser cũ
  chỉ giữ lịch sử, không chọn ảnh lỗi cho gallery final.
- [runtime.json](runtime.json): Node 24.17.0/macOS ARM64/Playwright 1.63.0/
  Chromium 153.0.8010.12. [protected-check.json](protected-check.json):
  **3.219 file API/template/prior PORT evidence không đổi bytes**;
  baseline/hash sau ở `protected-before.json` và `protected-after.json`.
- [SHA256SUMS](SHA256SUMS) gồm final ảnh/JSON, manifest/gallery, report/runtime,
  protection và receipts đã chọn. Historical failures giữ nguyên, không overwrite
  template hoặc evidence cũ. [quality-delivery.log](quality-delivery.log) PASS
  sau cập nhật docs: links/anchors/boundaries, 48 operations và 445 examples.
  [diff-check.log](diff-check.log) PASS, không có whitespace error.

Root/backend tests và Chromium demo không thay full live integration. Offline
event và BroadcastChannel là injection cùng một browser; không chứng minh real
shared-cookie multi-tab hoặc network outage. New attempt dùng mọi native type,
server demo save/submit và score6/6; seed401 vẫn không dùng cho consistency.
Không benchmark/cost/rate/HA claim. Parent PORT-05/live/mobile/production mở.
