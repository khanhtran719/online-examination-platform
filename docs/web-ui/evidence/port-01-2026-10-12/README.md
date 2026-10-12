# PORT-01 evidence

Local frontend foundation and Dashboard/Admin exam-list pilot, 2026-10-12.
[Plan/review](../../port-01-2026-10-12.md), [frontend architecture](../../frontend-architecture.md).
Synthetic data is visibly labeled; these files do not prove live business or AWS
production acceptance. Historical template PNGs and benchmark evidence remain intact.

## Executed checks

- [Root tests](unit-tests.log):663 PASS =492 API +66 tooling +105 Web.
- [Lint/quality/contracts](lint.log):PASS,48 operations/445 examples.
- [Format](format.log):PASS.
- [Live build](live-build.log) and [demo build](demo-build.log):PASS, both include
  strict TypeScript checking. Static output remains separate from API dist.
- [Full Chromium log](browser.log) and [raw result](full-browser-results.json):26/26 PASS,
  Candidate/Admin/exam/public, keyboard, native controls, dialog focus/escape,
  save/conflict/submit/review, permissions/logout and live-without-demo fallback.
- Final pilot evidence is in `final/pilot`:loaded captures and matching JSON
  at1440×1000,1280×1000 and320×720. Root reviewed actual images. Zero automated
  WCAG-tagged axe violations in these six scans; correct body width and self-hosted
  Be Vietnam Pro are recorded. This is not full WCAG certification/mobile acceptance.

## Failures found and resolved

Initial boundary tests fail before the new lint rule. New Dashboard3-item query
and Admin filter/provenance tests fail before implementation. Later root-target
lint crash and duration-seconds rounding regressions fail before fixes.

`first-run/pilot/dashboard-320.json` retains the white menu text contrast finding.
The first pilot also exposed a selector issue (use accessible combobox role) and
an incorrect fixture assumption (all3 initial exams are published). A later mobile
run found score width plus margin caused body overflow; fixed with bounded width.
`first-run/sandbox-launch-failure.json` records an environment-only Chromium launch
denial; rerun with host permission succeeds. Local server binding also needed
host permission. These are not app availability measurements.

Earlier `pilot`/initial full mobile Admin capture included a loading placeholder;
the final focused capture explicitly waits for table and loaded count. Use the
latest `final/pilot` images as the current visual evidence. Both full26 and final
focused2 results are retained separately. No historical evidence is rewritten.

[Final focused log](final-pilot.log), [raw focused results](final-pilot-results.json),
[final Web tests](final-web-tests.log), [final Web lint](final-web-lint.log) and
[capture hashes/review checks](review-checks.json) record the post-hint verification.

## Intentional differences and open gates

Actual session name/initials and3 actual seed rows replace mock persona/six image
rows. Dashboard uses exact-version title fallback and nullable scores; no fake
timer/proctoring/KPI/personalization. No inert notification/overflow actions.
Public marketing keeps its authored palette while shared font/control/shell
regressions pass. Mobile Admin uses a horizontally scrollable labeled table,
not a separately accepted mobile design.

Backend/API/migrations/auth transport/AWS resources are unchanged. Real PG/SMTP/
HTTPS integration suites and AWS benchmarks were not rerun; no production/SLO/
performance-cost claim. Live Admin capability discovery, WEB-03, broader states/
mobile and other page ports remain open. Existing9 high Web development audit
findings were reported by npm install; no audit auto-fix/major upgrade was applied.
No commit/deploy is performed.
