# PORT-05C evidence —2026-10-13

> Artifact retirement 2026-10-13: raw UI screenshots/trace/JSON/log/gallery đã được dọn theo yêu cầu người dùng. Nội dung bên dưới là báo cáo lịch sử; raw visual receipts không còn trong checkout. [Phạm vi và cách tái kiểm tra](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

Local Status/Result/Released Review on Web/tablet768/1024/1280/1440px.
[Scope/review](../../port-05c-2026-10-13.md), [Đã thu hồi — gallery](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi),
[Đã thu hồi — 20 PNG manifest/SHA-256](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi). Synthetic demo data only.

## Final checks

- `root-tests-delivery.log`:827 PASS =492 API +66 tooling +269 Web.0 skipped.
- `final-review-green.log`:56 Results PASS after the final two regressions.
- `playwright-delivery.json` / `browser-delivery.log`:44/44 Chromium PASS,
  zero skipped/unexpected/flaky, retries0. Full run2.9 minutes, final source.
  Earlier43-case/full and2-case/focused reports/logs are retained as history.
- `build-live-delivery.log` / `build-demo-delivery.log`:strict TypeScript +
  Vite live/demo PASS. Lint/format/quality/types receipts are separately named.
- Every final capture has paired browser JSON: loaded Be Vietnam Pro font,
  zero WCAG-tagged automated axe violations, no document overflow and main
  gutters>=16px. Root inspected19 visual states, corrected status heading and
  closed-review/404 language, reinspected three copy-affected images and the new
  cap-empty feedback. Gallery points to the final20 delivery captures.
  Keyboard previous/next focuses prompt; loaded-only filters/current indicator,
  all question types read-only, active/failed/pending/closed/not-found/reduced
  motion and start→ACK→submit→result/review paths are exercised.
  Cap-empty browser uses Playwright clock + hidden-property injection; this
  proves deterministic stop/restart UI, not a real five-minute production run.
- `protected-before.json` / `protected-after.json`:2,499 API source/template/
  PORT-01–05B evidence files byte-identical. Prior edits retained; no commit/deploy.

`runtime-root.txt`, `runtime-browser.txt`, `browser-runtime.json`:Node24.17.0,
Playwright1.63.0,Chromium153.0.8010.12,macOS ARM64. Preview processes closed after
checks. Environment FORCE_COLOR/NO_COLOR warning is from the runner. Root logs
include Vitest environment timing advice; these are not test failures.

## Red/fix receipts

`red.log`:21 FAIL before implementation;20 expose polling/private-data/cursor/
navigation gaps, one review navigation fixture used a duplicate explanation
selector and was corrected to the question heading. `format-initial.log` and
`typecheck-first.log` retain an array-bracket syntax error from the first view
implementation; fixed, no checks ignored. `green-second.log` retains old test
provider omissions and an assertion before the focus frame; mocks now include
session/memory and the test waits for focus. `web-lint-first.log` retains import
sorting finding, fixed with the repository rule.

`cursor-red.log`:after waiting for the button to enable, a fast release recheck
still failed to reset the cursor (batched fetching render). Explicit discard/
verify/page1 fixed it; `focused-final.log` then caught a duplicate stale refetch.
Immutable review staleTime and explicit release lifecycle fixed that;
`focused-verified.log`53 PASS before two further frozen owner/version cases.
`copy-red.log`:2 FAIL/16 PASS before removing the claim that answers were already
published on a closed page. Final focused55/full826 PASS. Initial browser2/2
PASS is in `browser-first.log`; captures there are preliminary, not final gallery.

`final-review-red.log`:2 FAIL/9 PASS. A hidden status page with no loaded data
stayed a skeleton after the cap, and denied review's release-check button was
enabled despite a closed controller. Empty feedback/manual check and a disabled
control fixed them. `final-review-green.log`56 PASS; full827/44 browser delivery
PASS after fixes. S4/S5 were reopened, then checked again with this new evidence.

## Interpretation limits / open follow-ups

The primary browser case creates one attempt, saves three answer types, submits
and checks score4/6,percentage6667,correct2/3 and exact per-question review across
all widths. Seed401 has historical score5/6 with no saved answers/inconsistent
section weights; it is excluded from consistency proof. Reduced-motion seed
capture validates rendering only. Fix seed data in a separately reviewed demo
increment; do not reinterpret this as production scoring evidence.

No actual API/PG/HTTPS or AWS benchmark ran in this frontend-only increment.
Full live business, release-policy/hidden-cap/replay-pending browser matrices,
multi-tab/lost-ACK/reload reconciliation, mobile/app and production remain open.
Server remains the authority for authorization, release, saved answers and
score. No real-time revocation claim between reads. Automated axe is not WCAG
certification; these checks do not measure sustainable capacity or AWS savings.
Roadmap89/217,FE7/32,parent PORT-05 unchanged; next PORT-05D Exam Room/Autosave/Submit.
