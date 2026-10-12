# PORT-02 local implementation evidence — 2026-10-12

Scope: [Editor/dialog port](../../port-02-2026-10-12.md), following the selected
desktop design contract. Synthetic DemoApi is explicitly labeled; live business
Admin access stays blocked until authoritative capabilities are available. No AWS
deployment/benchmark, backend runtime, schema, migration or dependency change.

## Executed checks

- [Root tests](root-test-final.log): **697 PASS** —492 API,66 tooling,139 Web;
  no skipped tests. Web adds34 meaningful regressions over the105-test PORT-01
  checkpoint. This is unit/tooling validation, not DB integration acceptance.
- [Root lint/quality/contracts](lint-final.log): PASS;48 operations/445 examples,
  import boundaries and Reporting review dependencies. [Formatting](format-final.log): PASS.
- Strict Web TypeScript plus [live](build-live-final.log) and
  [demo](build-demo-final.log) production builds: PASS.
- Final full Chromium: **28/28 PASS**, no skipped/retried cases,75.9 seconds;
  [log](browser-final.log) and [JSON](browser-final-results.json).
  [Visual summary](visual-check.json):14 captures, zero automated axe violations,
  all fonts loaded and no body overflow. Final images/scan JSON are in
  `final-browser/editor/`; intermediate captures remain separate.
- Earlier focused [six editor/Admin cases](browser-reviewed-editor.log):6 PASS.
  [Layered-dialog regression](green-layered-dialog.log):4 PASS after its
  [failing reproduction](red-layered-dialog.log).

No API/DB/real-HTTPS integration rerun: backend and auth transport are unchanged.
No load test, capacity, price/performance, WCAG certification or production claim.
Small-screen maintenance checks do not close the complete mobile/state matrix.

## Failure retention and interpretation

Initial model/controller, dialog, editor and synthetic-fault regressions fail
before implementation; their red/green logs remain beside the accepted checks.
Additional red tests cover schedule instant precision, atomic timezone changes,
unknown-write copy, permission loss during save→publish, stale success notice
and an asynchronous dialog overlay. No failure log is replaced by a passing log.

[An intermediate browser run](browser-final-editor.log) timed out in two of six
cases and took25.1 minutes, with a Chromium closed-session error; its JSON is
`browser-after-revoke-results.json` and failure contexts/images are retained in
`interrupted-browser/`. The cause is unconfirmed; host suspension is not established.
The six-case rerun passed in23.6 seconds.

[A subsequent full run](browser-accepted.log) passed27/28; the live public-sample
keyboard radio stayed unchecked. JSON and retained context/screenshot/trace are
in `browser-accepted-results.json` and `browser-accepted-failure/`. The unchanged
public test passed for both modes in the [focused recheck](browser-fallback-recheck.log).
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

[Before hashes](protected-before.json) cover596 existing API source, PORT-01
evidence and template files. [Pre-status verification](protected-check-before-status.json)
found zero differences. The final check allows only the current PORT-02 checklist
receipt in the template review document; PNGs/prompts and historical evidence
remain immutable. No applied migration checksum changed. Final protection and
artifact scan receipts are in [protection check](protected-final.json) and
[artifact manifest](artifact-manifest.json).
