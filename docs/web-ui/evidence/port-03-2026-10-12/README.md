# PORT-03 local Web/tablet evidence — 2026-10-12

> Artifact retirement 2026-10-13: raw UI screenshots/trace/JSON/log/gallery đã được dọn theo yêu cầu người dùng. Nội dung bên dưới là báo cáo lịch sử; raw visual receipts không còn trong checkout. [Phạm vi và cách tái kiểm tra](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

Scope: [Question bank/editor/import port](../../port-03-2026-10-12.md), selected
Cobalt–Apricot references and the user's current Web/tablet priority. New visual
targets are768/1024/1280/1440px. Mobile design/matrix is deferred to the future app
phase; existing narrow-screen regressions are retained as maintenance checks.
DemoApi and its fault presets are synthetic and visibly labeled. Live business
Admin access remains blocked without authoritative permission discovery.

## Executed checks

- [Đã thu hồi — Root tests](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): **729 PASS**,492 API/66 tooling/171 Web;
  no skips.32 new Web regressions over the139-test PORT-02 checkpoint. These are
  unit/tooling checks, not real DB integration acceptance.
- [Đã thu hồi — Lint/quality/contracts](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): PASS,48 operations/445 examples,
  architecture/import boundaries and reviewed Reporting dependencies.
  [Đã thu hồi — Format](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) and [Đã thu hồi — E2E source format](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): PASS.
- Strict Web TypeScript and [Đã thu hồi — live](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)/
  [Đã thu hồi — demo](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) production builds: PASS.
- Final full Chromium: **31/31 PASS**,0 skipped/retried/flaky,93.6s.
  [Đã thu hồi — Log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — JSON](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).
- [Đã thu hồi — Visual scans](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): **23 PORT-03 captures**, zero automated
  WCAG-tagged axe violations, all fonts loaded and no document/body overflow.
  Images and per-capture JSON are in `verified-browser/questions-import/`.
- [Đã thu hồi — Live artifact marker scan](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): no exact synthetic banner,
  demo credential or fault-control markers in live JavaScript. Static marker
  checks are limited; full live integration is not established by them.
- Final documentation/link/contracts and whitespace checks are recorded in
  `quality-final.log` and `diff-check.log`.

No backend/real-DB/real-HTTPS integration rerun, load test, AWS deployment, cost
comparison or capacity/SLO acceptance. Backend/auth transport did not change.
No complete browser/zoom/touch-device matrix or WCAG certification is claimed.

## Behavior review

Failing regressions preceded fixes for refreshed revision/old fields, concurrent
save/archive, unknown-write immutable retry, invalid non-finite points, option/key
identity and strict import input. Import tests cover lost dry-run ACK snapshots,
distinct dry/commit keys, invalid commit reports, file-read races and permission
revoke/regrant before an old response. Protected-read/write tests check both
hidden UI fields and cache clearing; manage alone cannot load key-sensitive data.

Late self-review reproduced [Đã thu hồi — stale conflict adoption](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)
and [Đã thu hồi — archive after save with a stale read](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi). Their focused
green checks are [Đã thu hồi — conflict](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) and
[Đã thu hồi — archive snapshot](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi). Final full root/browser checks
follow both fixes. No force-write or automatic merge was added.

Browser scenarios exercise loaded-only bank filtering, three native question
types, key-preserving reorder, Candidate projection without keys/explanation,
destructive type confirmation, save-receipt navigation, conflict adoption,
unknown retry and pending/archive protection. Import covers exact validated text,
input edits invalidating commit, dialog Escape/focus, unknown atomic commit retry
and three actual report mappings. Synthetic lost ACK proves the UI retry path;
it does not prove production delivery/durability.

## Visual review and deliberate differences

Root viewed representative current bank/editor, tablet layout, preview, type/
archive/conflict, import validation/unknown and committed-report captures against
the selected references. Desktop uses2:1 content/preview; tablet stacks cards and
reflows option actions. Tables keep horizontal scrolling inside labeled regions.
The import stepper was corrected to numbered circles; comparison dialog was
widened to840px maximum so its two columns remain readable.

Bank rows/IDs/counts come from current synthetic fixtures rather than the raster's
illustrative rows; no answer-key column or unsupported overflow actions. Candidate
preview is read-only content. Original JSON remains editable below the dry-run
report, and changing it invalidates commit. Report contains actual IDs/timestamps/
mappings, no fabricated prompts/keys/scores. Native file input follows browser
locale. Prompt/option text is rendered literally, including the XSS-like fixture.

## Retained intermediate outcomes

- Initial focused browser checks could not launch Chromium inside the sandbox
  (`browser-first.log`). After launch was allowed, previews were absent and all
  three cases hit connection refused (`browser-review.log`). Neither run is UI
  acceptance; local preview servers were subsequently started with approval.
- The [Đã thu hồi — first UI run](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) passed2/3. A select locator used the
  wrapping label text rather than its accessible combobox name. JSON and retained
  failure context/image/trace are in `browser-ui-review-results.json` and
  `browser-ui-review-failure/`. The corrected focused run passed3/3 in
  [Đã thu hồi — browser-reviewed.log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).
- The [Đã thu hồi — first full run](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) passed30/31. An older substring label
  locator matched the new option movement/removal buttons as well as the input.
  It now selects the exact textbox. Keyboard selection/type-confirmation/archive
  assertions remain intact. JSON and trace/context/image are in
  `browser-final-first-results.json` and `browser-final-first-failure/`.
- [Đã thu hồi — The full rerun](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) passed31/31 before final self-review.
  Later archive-snapshot and comparison-width fixes were followed by the final
  root/build/lint/format/full-browser checks above.
- Intermediate formatter failures remain in `format-final.log` and
  `format-checked.log`; the last chain expression needed another formatter pass.
  Accepted/verified formatting checks pass. No runtime behavior changed for it.
- [Đã thu hồi — The first live marker scan](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) matched the generic
  words “Dữ liệu mẫu” inside an existing live-unavailable explanation. Inspection
  confirmed this was explanatory copy, not bundled DemoApi/chrome. The final scan
  uses the exact synthetic banner/credentials/control markers; no source changed
  to hide the false positive.

No failure log is relabeled or overwritten as a pass. Intermediate scan/capture
directories remain separate from the final `verified-browser` set.

## Protected baseline and acceptance limits

[Đã thu hồi — Before hashes](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) cover **959 files**: API source, PORT-01/
PORT-02 evidence and templates. [Đã thu hồi — Pre-status check](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)
found zero changes. The only allowed final changed file is the current template
review checklist: PORT-03 closure and the explicit Web/tablet/mobile-deferral
preference. Five exact line replacements are recorded in
`template-review-changes.json`, with `template-review-before.txt` preserving its
original bytes. [Đã thu hồi — Final protection](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) checks reconstruction
and all other958 files byte-for-byte; no applied migration/old PNG/prompt changed.
[Đã thu hồi — Artifact manifest](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) records final screenshot/scan hashes.

Roadmap89/217 and FE7/32 remain unchanged. This closes local PORT-03 Q1–Q5 only;
live Admin/WEB-03, wider FE, AWS/performance/cost/production acceptance remain
open. Next bounded scope is PORT-04 Operations/Reporting Web/tablet; no PORT-04
implementation is started here.
