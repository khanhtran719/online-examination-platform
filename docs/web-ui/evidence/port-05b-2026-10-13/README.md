# PORT-05B evidence —2026-10-13

PASS locally. [Review/checklist](../../port-05b-2026-10-13.md),
[gallery11 captures](gallery.html), [manifest](capture-manifest.json),
[machine summary](summary.json), [runtime](runtime.json).

## Validation

- `root-tests-final.log`:492 API +66 tooling +241 Web =799 PASS. Includes20 new
  tests for protected reads, actor/session/route races, cursor serialization,
  transient errors, empty states, lifecycle routes and nullable/zero scores.
- `browser-final.log` / `browser-final-results.json`:41/41 Chromium PASS,
  zero skipped/flaky/retries. Two new cases cover Web/tablet, correct frozen
  fallback, lifecycle actions, board privacy/unchanged consent, closed board and
  keyboard scrolling/refresh. Prior app regressions remain active.
- `lint-final.log`, `format-final.log`, `format-css-e2e.log`, `typecheck-final.log`:
  PASS after all source/test edits. Lint includes architecture quality and
  contracts48 operations/445 examples. `build-live-final.log` and
  `build-demo-final.log`: strict typecheck + production builds PASS.
- `verified-browser/history-leaderboard`:11 captures at768/1024/1280/1440px,
  loaded self-hosted font, no automated axe violations, no document overflow,
  content gutters>=16px. Root viewed each final PNG. History intentionally
  scrolls inside its table at tablet widths; this is not missing columns.
- `protected-before.json` / `protected-after.json`:2,171 files byte-identical:
  API source, all templates and PORT-01–05A evidence. `workspace-before.txt`
  records the existing unstaged work; no reset/stage/commit/deploy occurred.

## Failure and correction receipts

`red-results.log` first exposed nine behavior failures plus an absent test-matcher
setup. After adding the matcher setup, `red-results-valid.log` proves9 FAIL/1 PASS
against the old pages; the zero-score baseline already passed. The new controller
was unused by those old pages, so it could not mask the reproduction.

`focused-results.log`:17 PASS/1 FAIL plus an unhandled error because the existing
Leaderboard test double omitted MemoryApi.clear. Completing that double resolved
the test; no assertion was removed. `typecheck.log` also caught a missing required
pageSize in a new typed fixture. `focused-results-final.log` then passed25 cases;
three later empty/lifecycle cases are in the final root run.

`browser-first.log`:1 PASS/1 FAIL. The second case used a checkbox name that did
not exist; Profile actually labels it “Hiện bí danh trên bảng xếp hạng”. The exact
behavior assertion remains unchanged after correcting the selector. Original
failure JSON/screenshot/trace are kept in `browser-first-results.json` and
`first-browser-failures`. First captures are retained separately; final images
reflect the subsequent typography/horizontal-scroll-hint review.

The initial runtime-only probe used a login shell in apps/web, which resolves
Node26 locally. `runtime-probe-login-shell.json` retains that diagnostic. The
actual browser command uses login:false (Node24.17.0), while root validation
resolves Node24.17.0. `runtime.json` repeats the probe in the matching browser
environment and records its executable. No tests/builds used that Node26 probe.

## Limits

These are synthetic demo/UI and local test results. No actual API/PostgreSQL
integration, Identity HTTPS rerun, AWS deployment, load test, cost measurement,
capacity claim or mobile acceptance was performed in this increment. Full live
business integration stays open. Existing demo board grant uses catalog.read;
actual endpoint requires leaderboard.read, documented as a separate integration
gap. Missing exact metadata uses IDs rather than invented current titles. Query
denial remains latched until scope remount/change; ordinary errors use explicit
first-page retry. The two new browser cases do not cover every unit failure state
as a screenshot. Axe has limited coverage and is not WCAG certification.
