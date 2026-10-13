# PORT-05A — Candidate Catalog evidence

> Artifact retirement 2026-10-13: raw UI screenshots/trace/JSON/log/gallery đã được dọn theo yêu cầu người dùng. Nội dung bên dưới là báo cáo lịch sử; raw visual receipts không còn trong checkout. [Phạm vi và cách tái kiểm tra](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

2026-10-12. EP-08 list, EP-09 detail and start confirmation on Web/tablet
768/1024/1280/1440px. C1–C5 COMPLETE locally; final Chromium39/39 PASS without skips/retries/flaky
cases. [Scope/checklist](../../port-05a-2026-10-12.md). Existing PORT-03/04
workspace changes were present before this increment; Git diff alone includes
those earlier changes. [Đã thu hồi — Workspace baseline](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

## Checks and receipts

- [Đã thu hồi — Root tests](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):492 API/66 tooling/221 Web =779 PASS. After the page
  gutter fix, [Đã thu hồi — Web tests](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):221 PASS again.
- [Đã thu hồi — Focused controllers](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):19 PASS —12 detail/start, six
  browse and one synthetic lost-ACK receipt test.
- [Đã thu hồi — Root lint](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — format](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), strict
  [Đã thu hồi — live](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi)/[Đã thu hồi — demo](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) builds PASS. Lint includes
  architecture guards, quality and48 operations/445 contract examples.
- [Đã thu hồi — Focused Chromium](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):3/3 PASS after gutter/contrast
  fixes, no skips/retries. [Đã thu hồi — Raw result](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).
- [Đã thu hồi — Final Chromium](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):39/39 PASS in136.1s.
  [Đã thu hồi — Raw result](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi). [Đã thu hồi — Gallery](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi) and
  [Đã thu hồi — manifest](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):17 Catalog captures, zero automated axe
  violations/document overflow, loaded font and content gutters>=16px.
- [Đã thu hồi — Protection receipt](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi):1,862 baseline API source,
  templates and PORT-01–04 evidence files byte-identical, none added/removed.
  [Đã thu hồi — Before](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi), [Đã thu hồi — after](../../artifact-retention-2026-10-13.md#artifact-đã-thu-hồi).

Chromium demo validates synthetic UI flows. The full suite also retains the live
mode gate that rejects unavailable business capabilities; it does not prove live
Catalog/Assessment execution. No backend/schema/migration/AWS changes this turn.
API/PostgreSQL integration, AWS deploy/load/failure/cost tests were not rerun for
this frontend increment. Mobile/app and other browser/device matrices stay open.

## Implementation review

Catalog owns `use-catalog.ts`, `use-exam-start.ts`, pages and confirmation. Views
compose shared controls; injected PlatformApi remains the transport boundary.
No direct HTTP/vendor/other-feature imports. Queries contain actor and all remote
filters. Category is server-filtered; local title search/counts only cover loaded
rows. Refresh discards old cursor chains, duplicate load-more is guarded and late
old-category/detail reads cannot repopulate current data or frozen memory.
401/403 hide/purge private query data and metadata; filters cannot unlock denial.

Start freezes examId/UUIDv7 once, guards duplicate clicks and retains exact intent
for timeout/network/malformed/5xx retries. Pending/unknown cannot be dismissed as
cancelled. Route/actor/session/access checks ignore late ACKs; an ACK for another
exam stays unknown. Accepted response chooses the actual attempt, including an
existing active attempt. Server owns publication, limits, deadline and scoring.
The start POST still has no body and cannot promise the preview version is locked.
The synthetic adapter exercises lost/delayed ACK, one receipt and permission
before replay; this is not PostgreSQL durability evidence.

Unknown intent exists only in the mounted controller. Reload/navigation loses
that local key and does not cancel a server attempt. Full live reload/multi-tab
reconciliation remains a follow-up, with durable receipt/resume owned by backend.

## Visual review and deliberate differences

Selected [list](../../templates/catalog-profile-v4/exam-list-desktop-v4.png),
[detail](../../templates/catalog-profile-v4/exam-detail-desktop-v4.png) and
[confirmation](../../templates/catalog-profile-v4/dialogs/start-confirmation-desktop-v4.png)
guide card hierarchy, section blocks, policies and main/sidebar proportion.
Shared Cobalt–Apricot rail/header/tokens take precedence over the old wide sidebar.
White panels, blue primary controls, Apricot timing notice, self-hosted Vietnamese
font and44px controls remain consistent. List has two columns above850px, one at
768px; detail is approximately2:1 above1100px and stacked at1024/768px. Shared
content wrapper preserves gutters and maximum reading width.

Actual synthetic fixtures replace invented raster counts, codes and descriptions.
Full section titles and open/close/timezone remain readable. No unsupported proctor,
latency, certification scale, quota remaining or business metrics. The compact
heading follows the current shared shell; no large illustrative banner is added.
Confirmation uses an explicit action without an extra acknowledgement checkbox;
no new request field. Demo banner/scenario toolbar remains visible and increases
page height. Empty filter and loaded-search miss are distinct from failed reads.

Root inspected the loaded list/detail/confirmation at all four widths plus local
search miss, empty/invalid category and pending/unknown start. Axe/font/document
width/content gutter receipts accompany captures; automated scans are not a full
manual accessibility or device acceptance audit.

## Failures retained and corrected

- `start-red.log` and `start-read-red.log` retain pre-fix duplicate-click,
  unknown retry, route/late-read and protected-data failures.
- `start-green-first.log` exposed an overly broad test expectation that required
  no query objects. Disabled observers may recreate empty objects; the corrected
  assertion requires every private data value to be absent.
- `start-additional-red.log` retains401 data exposure, uncleared frozen metadata
  and mismatched ACK failures. The session-loss test also needed the mocked
  session to actually rerender; that test harness correction is not a new product
  fix. `start-green.log` records12 PASS.
- `browse-demo-first.log` retains the missing synthetic start fault and an early
  query-notification assertion. The latter now waits for the observable result,
  without weakening the cursor/request-count expectations.
- `browser-first.log`/`browser-first-results.json` retain37 PASS/two failures from
  incorrect fixture selection. Corrected the exact title and used empty IELTS
  instead of populated TOEIC; product fixtures were not changed to fit tests.
- `browser-second-interrupted.log` was deliberately stopped to repair missing
  gutters. The stale prior JSON copy is explicitly named
  `browser-second-stale-prior-results.json` and is not a receipt for that run.
  Temporary uncompressed partial traces were removed from this new evidence;
  their size/hash inventory is retained in
  `browser-second-artifacts/temporary-trace-inventory.json`. Earlier evidence is
  untouched; final and genuine failure traces remain separate.
- `browser-gutter-red.log`/`browser-gutter-red-artifacts` reproduce content ending
  at1440 instead of<=1424. Shared content wrappers restore both page gutters;
  the browser check remains.
- `browser-contrast-red.log`/`category-contrast-red.json` retain38 PASS/one failure:
  selected category text changed to white while its background was still a pale
  interpolated tint (measured1.46:1). Catalog category fills/text now switch
  together; border/shadow transitions remain. Axe was not delayed or disabled.

Roadmap89/217 and FE7/32 remain unchanged; full PORT-05, live business/WEB-03
and production acceptance remain open. Next bounded work is Candidate History/Leaderboard using the chosen
adjustments, followed by remaining Candidate/Public surfaces; mobile/app deferred.
