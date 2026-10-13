# PORT-02 local implementation evidence — 2026-10-12

> Artifact retirement 2026-10-13: raw UI screenshots/trace/JSON/log/gallery đã được dọn theo yêu cầu người dùng. Nội dung bên dưới là báo cáo lịch sử; raw visual receipts không còn trong checkout. [Phạm vi và cách tái kiểm tra](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

Scope: [Editor/dialog port](../../port-02-2026-10-12.md), following the selected
desktop design contract. Synthetic DemoApi is explicitly labeled; live business
Admin access stays blocked until authoritative capabilities are available. No AWS
deployment/benchmark, backend runtime, schema, migration or dependency change.

## Executed checks

- [Đã thu hồi — Root tests](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): **697 PASS** —492 API,66 tooling,139 Web;
  no skipped tests. Web adds34 meaningful regressions over the105-test PORT-01
  checkpoint. This is unit/tooling validation, not DB integration acceptance.
- [Đã thu hồi — Root lint/quality/contracts](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): PASS;48 operations/445 examples,
  import boundaries and Reporting review dependencies. [Đã thu hồi — Formatting](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi): PASS.
- Strict Web TypeScript plus [Đã thu hồi — live](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) and
  [Đã thu hồi — demo](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) production builds: PASS.
- Final full Chromium: **28/28 PASS**, no skipped/retried cases,75.9 seconds;
  [Đã thu hồi — log](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) and [Đã thu hồi — JSON](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).
  [Đã thu hồi — Visual summary](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):14 captures, zero automated axe violations,
  all fonts loaded and no body overflow. Final images/scan JSON are in
  `final-browser/editor/`; intermediate captures remain separate.
- Earlier focused [Đã thu hồi — six editor/Admin cases](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):6 PASS.
  [Đã thu hồi — Layered-dialog regression](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):4 PASS after its
  [Đã thu hồi — failing reproduction](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

No API/DB/real-HTTPS integration rerun: backend and auth transport are unchanged.
No load test, capacity, price/performance, WCAG certification or production claim.
Small-screen maintenance checks do not close the complete mobile/state matrix.

## Failure retention and interpretation

Initial model/controller, dialog, editor and synthetic-fault regressions fail
before implementation; their red/green logs remain beside the accepted checks.
Additional red tests cover schedule instant precision, atomic timezone changes,
unknown-write copy, permission loss during save→publish, stale success notice
and an asynchronous dialog overlay. No failure log is replaced by a passing log.

[Đã thu hồi — An intermediate browser run](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) timed out in two of six
cases and took25.1 minutes, with a Chromium closed-session error; its JSON is
`browser-after-revoke-results.json` and failure contexts/images are retained in
`interrupted-browser/`. The cause is unconfirmed; host suspension is not established.
The six-case rerun passed in23.6 seconds.

[Đã thu hồi — A subsequent full run](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) passed27/28; the live public-sample
keyboard radio stayed unchecked. JSON and retained context/screenshot/trace are
in `browser-accepted-results.json` and `browser-accepted-failure/`. The unchanged
public test passed for both modes in the [Đã thu hồi — focused recheck](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).
Its cause remains unconfirmed; no keyboard assertion was removed or retries enabled.
The final full run follows the separately proven shared layered-dialog fix.

## Visual and behavior review

The final Editor captures cover information, empty structure, remove-section,
preflight at1440/1280/320, publication confirmation/pending, unsaved exit,
unpublish/archive, independent validation, fresh/local conflict and unknown write.
Per-image JSON records automated WCAG-tagged axe results, loaded self-hosted font
and document width; these are local checks, not certification. Root visually
reviewed the editor and dialogs against the selected information/preflight/conflict
references. Comparison-column overlap and old success copy were fixed during review.

Controller tests exercise exact key/body retry after lost publication ACK,
distinct save/publish revisions, no competing write,403/capability clearing,
no publication continuation after permission revoke, explicit fresh conflict
adoption and create-receipt recovery. Browser tests exercise real navigation,
native reload cancellation, dialog focus/Escape/pending protection, local remove,
permission loss and synthetic delayed/lost ACK. Synthetic delivery does not prove
the real server's durability or retry behavior.

## Protected baseline

[Đã thu hồi — Before hashes](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) cover596 existing API source, PORT-01
evidence and template files. [Đã thu hồi — Pre-status verification](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)
found zero differences. The final check allows only the current PORT-02 checklist
receipt in the template review document; PNGs/prompts and historical evidence
remain immutable. No applied migration checksum changed. Final protection and
artifact scan receipts are in [Đã thu hồi — protection check](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) and
[Đã thu hồi — artifact manifest](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).
