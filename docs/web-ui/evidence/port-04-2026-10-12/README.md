# PORT-04 local Web/tablet evidence — 2026-10-12

Scope: [Operations/Reporting port](../../port-04-2026-10-12.md), selected EP-25–32,
replay confirmation and audit drawer. New visual targets are768/1024/1280/1440px.
Mobile design/matrix is deferred to the future app phase. Existing narrow-screen
regressions remain maintenance checks. DemoApi and fault presets are synthetic
and visibly labeled; live Admin permission/revision discovery remains blocked.

## Executed checks

- [Root tests](root-test-final.log): **760 PASS**,492 API/66 tooling/202 Web,
  no skips.31 new Web regressions over the171-test PORT-03 checkpoint. These are
  unit/tooling checks, not real database integration acceptance.
- [Lint/quality/contracts](lint-final.log): PASS,48 operations/445 examples,
  architecture/import/Reporting dependency guards. [Source format](format-final.log)
  and [changed E2E format](e2e-format-final.log): PASS.
- Strict Web TypeScript and [live](build-live-final.log)/[demo](build-demo-final.log)
  production builds: PASS. No dependency or backend/migration change.
- Final full Chromium: **36/36 PASS**,0 skipped/retried/flaky,126.2s.
  [Log](browser-accepted.log), [JSON](browser-accepted-results.json). Existing tests
  retain their assertions; retries are disabled.
- [Visual scans](visual-check.json): **45 final PORT-04 captures**, zero automated
  WCAG-tagged axe violations, all fonts loaded and no document/body overflow.
  Images/per-capture JSON are in `verified-browser/operations-reporting/`.
- [Live artifact marker check](live-mode-check.json): no exact synthetic banner,
  demo credentials or fault-control markers in live JavaScript. Static marker
  scans do not establish full live integration.
- Final documentation/link/contracts and whitespace checks are recorded in
  `quality-final.log` and `diff-check.log`.

No real-DB/real-HTTPS integration rerun, AWS deployment, load test, cost comparison,
capacity/SLO acceptance or production claim. Backend/auth transport did not change.
Chromium automated accessibility checks are not WCAG certification or a complete
touch/zoom/browser/device matrix. Full live business integration remains open.

## Behavior and architecture review

Admin owns feature query controllers, the cursor-report helper and replay intent.
Views use shared UI; shared components do not import runtime/session/transport.
HTTP DTO/parser changes align with existing backend sources: active page `asOf`,
statistics `answered`, and independent `getBusinessMetrics` permission/endpoint.
The old combined metrics method remains unused by the new UI; its existence is
not proof of a technical provider. No backend endpoint/schema/transaction change.

Tests cover first-page restart without expired cursor reuse, serialized refresh/
load-more,403 latching across filters, permission-loss cache purge and late read
cancellation. Monitor stops timers when hidden and avoids overlapping polls.
Business metrics separate started-at cohort/current-state counts from global
backlog. Backlog counts attempts and original submission age, not SQS messages.

Replay requires FAILED, not replayPending, separate permissions and a valid admin
revision source. No Candidate revision substitution. A reason of8–500 trimmed
Unicode codepoints requires explicit confirmation. Double sends are blocked
synchronously; network/timeout/malformed/5xx outcomes freeze key/body for exact
manual retry. Revoke/regrant/unmount discard late ACK effects. Acceptance is not
completion. Result403 also clears review data, and completed attempts have no
failed-replay action. Live revision/capability gates remain intact.

Audit uses only redacted loaded rows, newest first; null reason is unavailable.
Copy notices from an old selection/access epoch cannot reappear. Multiple-choice
bars divide each option count by completedAttempts, independently. The browser
submits a synthetic TOEIC attempt selecting3 options:2 completed attempts give
three1/2 bars; total selections3 must not use the wrong denominator3.

## Visual review and deliberate differences

Root compared selected references with overview, tablet submissions, statistics,
failed detail, audit/drawer and replay captures. Cobalt–Apricot tokens and shared
shell remain consistent. Overview uses one white snapshot panel and four task
tiles. Replay confirmation informational copy uses a neutral Cobalt panel; unknown
ACK is warning, not success. Drawer anchors right and restores trigger focus.

Fixtures/profile/IDs/counts are current synthetic data rather than illustrative
raster rows. Demo banner/scenario toolbar remains visible and adds height. Rows
use actual DTO exam/version IDs instead of invented frozen titles/candidate
metadata. Statistics adds an explicit keyboard selection button. Tablet tables
keep IDs readable on one line and scroll inside labeled regions without document
overflow. Public404 and wider Candidate/Public ports are deferred; no mobile/app
acceptance is inferred from retained old regressions.

## Retained intermediate outcomes

- [Contract red](contracts-red.log):7 expected failures exposed missing/wrong
  Web reporting DTO/API parsing; [green](contracts-green.log) follows correction.
  [Operations red](operations-red.log) and [green](operations-green-2.log) cover
  protected result/filter/replay behavior. The first green fixture omitted new
  business metrics and is retained in `operations-green.log`.
- `report-controllers-first.log` has2 assertions checking before batched query
  notifications. The green tests wait for the observable state, preserving cursor/
  permission assertions. Replay/access final focused checks are in `replay-green.log`
  and `report-access-first.log`.
- [Audit order red](audit-order-red.log)/[green](audit-order-green.log) and
  [completed replay red](completed-replay-red.log)/[green](completed-replay-green.log)
  precede their fixes. Formatter/lint/build iterations remain distinct from final
  passing logs. `format-final-copy.log` records an intermediate formatting issue.
- `browser-counts.log` initially resumed an existing frozen Networking attempt,
  which correctly had one question. The test now starts the separate TOEIC fixture;
  `browser-counts-corrected.log` passes. Failure trace/context/PNG is retained in
  `counts-first-failure/`; no Candidate resume logic was changed to force a pass.
- `browser-full-first.log` passed35/36: an old homepage heading expectation had
  not followed the selected overview title. Its selector was updated; capability
  navigation assertions were retained. JSON/trace/context/PNG remain separately.
- `browser-preview-unavailable.log` hit connection refused because both preview
  servers were absent; their unexpected exit cause is unconfirmed. This run is
  not UI evidence. Later runs own both preview PIDs, check readiness and stop them
  on exit in the same shell.
- Two full runs (`browser-public-keyboard-first.log`, `browser-final.log`) passed
  35/36. Trace [diagnosis](public-keyboard-diagnosis.json) shows the URL had changed
  to `/experience` while the homepage's embedded sample DOM was still mounted;
  keyboard focus matched that disappearing radio. The test now waits for both
  destination URL and its level-1 heading, then uses the same Space/Enter/focus
  assertions. [Focused repeated check](public-keyboard-green.log):6/6 PASS,
  demo/live each repeated3 times. Both failed runs retain JSON/trace/context/PNG.

No failed log is relabeled or overwritten as a pass. Final screenshot/scan artifacts
are separated from earlier directories; protected historical evidence is retained.

## Acceptance limits and next scope

[Before hashes](protected-before.json) cover **1,371 files**: API source, selected
templates and PORT-01–03 evidence. Both pre-status checks found zero changes.
[Final protection](protected-final.json) verifies1,370 files byte-for-byte and
allows one current template checklist line closing PORT-04. Its exact replacement
is recorded in [template receipt](template-review-changes.json); the original
bytes remain in `template-review-before.txt`. No applied migration/old PNG/prompt
or prior port evidence changed. [Artifact manifest](artifact-manifest.json)
records hashes for the45 final screenshot/scan pairs. Preview processes owned
by the accepted browser run were stopped on exit; no infrastructure was deployed.

Roadmap89/217 and FE7/32 remain unchanged. This closes local PORT-04 O1–O5 only.
Live Admin/WEB-03, broader FE and
AWS/performance/cost/production acceptance remain open. The proposed next bounded
scope is Candidate/Public Web/tablet with its own checklist and live dependencies.
