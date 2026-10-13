# Review coverage Web/tablet — 2026-10-13

Remediation update 2026-10-13: [PORT-06A A1–A5](port-06a-2026-10-13.md) COMPLETE
locally; 938 root/75 Chromium PASS, 42 new full-axe/font/overflow observations.
RV-01/02, phần Public RV-03 và local RV-05 triage/fix đã đóng. RV-03 Admin/E5/Q5
vẫn PORT-06B; RV-04 vẫn PORT-06C; RV-06 chưa triển khai. Findings/inventory bên
dưới giữ nguyên trạng thái lúc review gốc, không phải danh sách defect vẫn mở.
Auth shared chrome có additional full-axe checks trên 4 routes ở 1440px;
manual AT/multiple engines/full state acceptance không đóng bằng axe.

REVIEW COMPLETE locally; remediation/integration backlog còn mở. Scope: đối chiếu routes/source/tests với33 page families đã chọn;
kiểm tra lại Public Home/Sample/chrome trên768/1024/1280/1440px và chỉnh tài liệu
status bị cũ. Không đổi application/API/template bytes hoặc triển khai phase mới.
Raw outputs local theo [retention](artifact-retention-2026-10-13.md).

- [x] REV-01 — Đối chiếu registry/route/page owner/template và named port receipts.
- [x] REV-02 — Phân loại state coverage, correctness/architecture và live gates.
- [x] REV-03 — Browser Public desktop/tablet và representative route smoke;
  trực tiếp xem ảnh local, ghi findings thay vì gọi test PASS là pixel fidelity.
- [x] REV-04 — Sửa stale integration status, lập backlog có owner/priority/DoD.
- [x] REV-05 — Quality/contracts/diff/protected hashes, self-review và handoff;
  không lưu thêm screenshot/raw artifacts trong docs.

## Phân biệt trạng thái

Có route/component không có nghĩa mọi state đã kiểm. Có template không có nghĩa
pixel fidelity hoặc behavior được nghiệm thu. Named local port reports đã retire
raw receipts nhưng giữ lịch sử; review này chỉ ghi runtime checks thực sự chạy.
Identity actual HTTPS10 lịch sử không được gán cho Catalog/Assessment/Admin.
Mobile/app, full live, AWS/SLO/performance/cost và production giữ mở.

## Kết quả inventory hiện tại

AST router hiện có39 unique leaf route patterns:35 product paths cho33 families,
3 alias/redirect và1 dev route. Hai editor có create/edit; wildcard chỉ tính một
404 family. Registry33 entries khớp hết; không missing main route. Có31 families
đã qua named local ports PORT-01–05H; Home/Sample có implementation cũ và current
template gaps. Con số31 là provenance của increment, không31 full accepted pages:
PORT-02 E5/PORT-03 Q5 visual được mở lại cho RV-03. Không reset kết quả test cũ.

76 top-level selected manifest entries kiểm file/SHA khớp;830 protected source/
tests/config/template files được baseline trước review. Tổng91 PNG trong template
tree gồm selected references và iterations/mobile; không gọi đó là91 screens
đã port. Manifest/hash validation không là pixel fidelity hoặc runtime proof.

Ma trận bên dưới ghi route chính; source links là owner/page đang được router
compose qua các barrel/lazy imports. Named reports là lịch sử đã retire raw UI
artifacts. “Còn mở” là acceptance/remediation, không mặc định là thiếu code.

| ID / route chính | Owner/source | Reference / named local delivery | Còn mở |
| --- | --- | --- | --- |
| EP-01 — `/` | [experience/home-page.tsx](../../apps/web/src/features/experience/home-page.tsx) | Home V3; implementation2026-10-07 | RV-01/03/04/05; current visual port chưa đóng |
| EP-02 — `/dashboard` | [catalog/dashboard-page.tsx](../../apps/web/src/features/catalog/dashboard-page.tsx) | Dashboard V2; PORT-05G | Actual Dashboard/Catalog/Assessment live, independent faults/cross-actor |
| EP-03 — `/attempts/:attemptId` | [assessment/exam-room.tsx](../../apps/web/src/features/assessment/exam-room.tsx) | Exam V3; PORT-05D | Actual two-tab/concurrent autosave/submit/deadline/recovery |
| EP-04 — `/login` | [auth/login-page.tsx](../../apps/web/src/features/auth/login-page.tsx) | Auth V3; PORT-05F | Full actor/session acceptance; RV-01/05 shell |
| EP-05 — `/register` | [auth/register-page.tsx](../../apps/web/src/features/auth/register-page.tsx) | Auth V3; PORT-05F | Live SES delivery/operations; RV-01/05 shell |
| EP-06 — `/check-email` | [auth/check-email-page.tsx](../../apps/web/src/features/auth/check-email-page.tsx) | Auth V3; PORT-05F | Actual provider quota/bounce; RV-01/05 shell |
| EP-07 — `/verify-email` | [auth/verify-page.tsx](../../apps/web/src/features/auth/verify-page.tsx) | Auth V3; PORT-05F | Key rotation/provider/production; RV-01/05 shell |
| EP-08 — `/exams` | [catalog/browse-page.tsx](../../apps/web/src/features/catalog/browse-page.tsx) | Catalog V4; PORT-05A | WEB-03 actual pagination/cursor/403/429, loaded-only search |
| EP-09 — `/exams/:examId` | [catalog/exam-detail-page.tsx](../../apps/web/src/features/catalog/exam-detail-page.tsx) | Catalog V4 + start dialog; PORT-05A | Actual publication/start lost ACK/quota/open/close; no invented counters |
| EP-10 — `/profile` | [profile/profile-page.tsx](../../apps/web/src/features/profile/profile-page.tsx) | Profile V4; PORT-05E/F | Full current permission/cross-actor gate; no email/password editing |
| EP-11 — `/attempts/:attemptId/status` | [results/status-page.tsx](../../apps/web/src/features/results/status-page.tsx) | Results V4; PORT-05C | Actual queue/worker/replay-pending/hidden/cap timing |
| EP-12 — `/attempts/:attemptId/result` | [results/result-page.tsx](../../apps/web/src/features/results/result-page.tsx) | Results V4; PORT-05C | Actual durable grading/null score/version/expiry outcome |
| EP-13 — `/attempts/:attemptId/review` | [results/review-page.tsx](../../apps/web/src/features/results/review-page.tsx) | Results V4; PORT-05C | Actual release policies/revoke/cursor; RV-06 optional refactor |
| EP-14 — `/history` | [results/history-page.tsx](../../apps/web/src/features/results/history-page.tsx) | Adjusted History; PORT-05B | Actual owner/version cursor/privacy; no N+1 title lookup |
| EP-15 — `/exams/:examId/versions/:versionId/leaderboard` | [results/leaderboard-page.tsx](../../apps/web/src/features/results/leaderboard-page.tsx) | Adjusted Board; PORT-05B | Actual opt-out/visibility/ties/cursor, exact version |
| EP-16 — `/experience` | [experience/sample-experience.tsx](../../apps/web/src/features/experience/sample-experience.tsx) | Public V4; implementation2026-10-07 | RV-01/02/03/05; new sample behavior checks PASS, visual gap open |
| EP-17 — `/how-it-works` | [experience/how-page.tsx](../../apps/web/src/features/experience/how-page.tsx) | Public V4; PORT-05H | RV-01/05 shared chrome; static guide needs no API |
| EP-18 — `/help` | [experience/help-page.tsx](../../apps/web/src/features/experience/help-page.tsx) | Public V4; PORT-05H | RV-01/05 shared chrome;13 authored FAQ, no support ticket API |
| EP-19 — `/admin/exams` | [admin/exam-list-page.tsx](../../apps/web/src/features/admin/exam-list-page.tsx) | Adjusted Admin list; PORT-01/02 | Live UI-GAP-01, actual list/actions/error matrix |
| EP-20 — `/admin/exams/new`, `/admin/exams/:examId/edit` | [admin/exam-editor-page.tsx](../../apps/web/src/features/admin/exam-editor-page.tsx) | Codex Editor/dialogs; PORT-02 | E5 visual IN PROGRESS RV-03; live permissions/409/unknown write |
| EP-21 — `/admin/questions` | [admin/question-list-page.tsx](../../apps/web/src/features/admin/question-list-page.tsx) | Codex Questions; PORT-03 | Q5 visual IN PROGRESS RV-03; live keys/read/manage permissions |
| EP-22 — `/admin/questions/new`, `/admin/questions/:questionId/edit` | [admin/question-editor-page.tsx](../../apps/web/src/features/admin/question-editor-page.tsx) | Codex Questions/preview/dialogs; PORT-03 | Actual three-type mutation/key identity/conflict/archived read-only |
| EP-23 — `/admin/imports/new` | [admin/import-page.tsx](../../apps/web/src/features/admin/import-page.tsx) | Codex Import/confirm; PORT-03 | Actual byte bound/dry-run/atomic commit/lost ACK; RV-06 optional refactor |
| EP-24 — `/admin/imports/:importId` | [admin/import-report-page.tsx](../../apps/web/src/features/admin/import-report-page.tsx) | Codex Import report; PORT-03 | Q5 visual IN PROGRESS RV-03; actual receipt/result scope |
| EP-25 — `/admin` | [admin/admin-home-page.tsx](../../apps/web/src/features/admin/admin-home-page.tsx) | Codex Operations; PORT-04 | Live UI-GAP-01; business snapshot is cohort/asOf, no online guarantee |
| EP-26 — `/admin/monitor` | [admin/monitor-index-page.tsx](../../apps/web/src/features/admin/monitor-index-page.tsx) | Codex Operations; PORT-04 | Actual query permissions/filter/cursor, no presence claims |
| EP-27 — `/admin/exams/:examId/monitor` | [admin/monitor-exam-page.tsx](../../apps/web/src/features/admin/monitor-exam-page.tsx) | Codex Operations; PORT-04 | Actual visible polling/active60s cursor expiry/all versions |
| EP-28 — `/admin/exams/:examId/submissions` | [admin/submissions-page.tsx](../../apps/web/src/features/admin/submissions-page.tsx) | Codex Operations; PORT-04 | Actual nullable score/lifecycle/exact version/cursor |
| EP-29 — `/admin/attempts/:attemptId` | [admin/admin-attempt-page.tsx](../../apps/web/src/features/admin/admin-attempt-page.tsx) | Codex Attempt/replay; PORT-04 | UI-GAP-01/06, authorized current revision, no candidate impersonation |
| EP-30 — `/admin/exams/:examId/versions/:versionId/statistics` | [admin/statistics-page.tsx](../../apps/web/src/features/admin/statistics-page.tsx) | Codex Statistics; PORT-04 | Actual version/current permissions, option denominator/zero samples |
| EP-31 — `/admin/metrics` | [admin/metrics-page.tsx](../../apps/web/src/features/admin/metrics-page.tsx) | Codex Metrics; PORT-04 | UI-GAP-01/07; business API exists, technical metrics unavailable |
| EP-32 — `/admin/audit` | [admin/audit-page.tsx](../../apps/web/src/features/admin/audit-page.tsx) | Codex Audit/drawer; PORT-04 | Actual permission/redaction/cursor/retention and drawer state |
| SY-01 — `*` | [experience/not-found-page.tsx](../../apps/web/src/features/experience/not-found-page.tsx) | Codex SY-01; PORT-05H | RV-01/05 shell; fixed public links, no safe-history Back contract |

## Coverage các state và integration gate

| Nhóm | Có implementation/test source hoặc named local report | Còn phải nghiệm thu |
| --- | --- | --- |
| SY-02 permission | Candidate/Admin denied states, protected read clearing; Admin live fail-closed | Authoritative permission capability, role/revoke/cross-actor actual browser |
| SY-03 loading/error/empty/stale | Bounded queries/cursor, independent Dashboard snapshots, retry/server wait | Real Catalog/Reporting cursor expiry,503/429/denial matrix với API/PG |
| SY-04 session | Identity actual HTTPS10 lịch sử; same-actor reauth/UI fences | Full exam multi-tab/cross-actor/restart/revoke trên HTTPS mới |
| SY-05 save/conflict | Immutable batches, ACK fencing, explicit reconciliation, demo fault source | Two browser tabs cùng owned attempt, real concurrent PUT/submit, transport faults |
| SY-06 deadline/submit/exit | Deadline local model; unknown submit bounded reconcile; controlled dialogs | Real lost ACK/reload/expiry-worker/worker recovery và durable result flow |
| SY-07 Admin dialogs | Publish/unpublish/archive/type-loss/import/replay/audit drawer trong demo/tests | Actual permission/revision nguồn và browser409/422/timeout recovery |
| Released review | Read-only policies, denied purge, exact version metadata | Actual NEVER/AFTER_COMPLETION/AFTER_EXAM_CLOSE + opt-out/privacy matrix |
| Accessibility | Native controls/focus/automated scans và new Public probe | RV-02/03; manual screen reader, browser zoom, Firefox/WebKit chưa chạy |
| Budgets/assets | Static SPA/lazy chunks; source request bounds | LCP/CLS/INP/CPU/memory/request và actual same-origin cache/security headers |

Không gắn “chưa có backend” cho các gate này: backend Catalog/Assessment/
Leaderboard/Reporting có implementation. Browser demo chỉ kiểm synthetic state;
HTTP route fulfillment trong một số tests cũng không là actual PG/TLS proof.
UI-GAP-02–05 là presentation/product limitations có fallback an toàn, không chặn
mọi Candidate operation. Live Admin bị chặn bởi UI-GAP-01; replay còn UI-GAP-06;
technical provider thiếu ở UI-GAP-07. Magic-link/GitHub vẫn là LATER theo người dùng.

## Findings và priority

| ID / priority | Finding và evidence mới | Owner / tác động / hướng xử lý |
| --- | --- | --- |
| RV-01 / P2 | Public header full-width thay capsule; footer/last CTA dùng `rgb(8,28,37)` và mint. Internal `/register` vẫn có↗; `Navigation` gắn arrow theo emphasis, `SampleSummary` cũng có↗ | `experience/public-chrome`, Public CSS, shared Navigation. Normalize public chrome theo selected V3/V4, bỏ external cue cho internal link; giữ auth-aware destinations,44px,active/menu/focus. Palette authored3D là exception đã ghi trong ADR-007, không tự bỏ scene hoặc đổi backend |
| RV-02 / P2 | Standalone sample1280: aside x24, question x288; selected V4 main question trái/navigator phải2:1. `.sidebar h3` “Cứ bình tĩnh” trước question h2 tạo axe `heading-order` moderate ở desktop | `experience/sample-experience`, CSS. Dùng question-first DOM + desktop2:1; tablet stack theo task, normal heading order, giữ reducer/marks/clear/focus/memory-only behavior. Không port numeric shortcuts/chứng chỉ của artwork khi chưa có scope |
| RV-03 / P2 | Public helper/eyebrow11–13px; Home1280 có19 matching text nodes<14px (không phải19 defects độc lập). Editor native small13,33px; bank caption12px; import report eyebrow11px | Public CSS + shared field/authoring/Admin typography. Helper≥14/body16 theo design contract; scan badges/caption/legend/footer và validation states. E5/Q5 visual reopened; không đổi mutation logic |
| RV-04 / P3 | Home vẫn green paper scene, section ordering/geometry khác selected Home V3; thiếu compact journey link/strip giữa category/FAQ. Header/footer khác đã tách RV-01 | `experience/home-page`, CSS/hero. Reconcile content/layout với V3 và approved3D exception, tái dùng How route thay copy5 steps trùng; keep loaded/no-webgl/reduced-motion. Không thêm proctoring/quota/SLO/security guarantee để giống ảnh |
| RV-05 / P3, triage | Full axe best-practice scan báo `region` ở `.skip-link` trên32 Public/Auth probes; no serious/critical. WCAG-tagged scan trước không có rule này | PublicFrame/global skip link. Kiểm exposed/offscreen/focus rectangle và manual AT trước khi coi là WCAG failure; không xóa skip link, bọc landmark giả hoặc tắt rule để xanh |
| RV-06 / P3 |7 presentation files>200lines; `DELIVERED_LIVE_OPERATIONS` còn9 Identity names, không có runtime caller | Maintainability backlog: tách view khi sửa owner liên quan, giữ controllers/fences. Rename/remove unused marker trong integration increment sau; không kết luận performance bug hoặc thêm abstraction chung |
| RV-D01 / docs, FIXED | `ui-gap.md` nói mọi gap BLOCKED và Catalog/Assessment/Reporting chỉ contract; không còn đúng current source | Đã sửa register/API-state doc/inventory pointers; giữ original handoff là lịch sử, không đóng full live từ việc sửa doc |

RV-06 files: `exam-preflight`269, `admin-attempt-page`209, `import-page`214,
`exam-list-page`230, `exam-structure`205, `exam-room`257, `review-page`252 dòng.
Đây là red flag maintainability, không tự kích hoạt rewrite7 components trong review.

## Checklist triển khai tiếp theo có thứ tự

1. [x] **PORT-06A — COMPLETE locally 2026-10-13: Public chrome + Sample
   convergence.** [Implementation/checks](port-06a-2026-10-13.md): RV-01/02,
   Public RV-03 và local RV-05 fix; 42 new observations, 938 root/75 Chromium PASS.
   Auth-aware destinations/native keyboard, sample score/reload/request budget
   giữ đúng; green 3D exception không đổi. Không API hoặc full production gate.
2. [ ] **PORT-06B — NEXT: Typography closure.** Owner shared fields/Admin presentation.
   Sửa RV-03 còn lại; error/helper/section totals/PageEnd/import report≥14px trên
   768/1024/1280/1440. Regression forms/dialogs/long Vietnamese content; không
   tăng kích thước icon trang trí như thể là helper text hoặc nới design requirement. Restore PORT-02 E5/PORT-03 Q5
   chỉ với kiểm thử mới; prior checked command/correctness items vẫn lịch sử.
3. [ ] **PORT-06C — Home reference closure.** Owner experience. RV-04 sau shared
   chrome; approved3D/fallback/reduced motion/viewport stop vẫn đạt. Ghi deliberate
   template deltas rõ, không yêu cầu generate lại các templates đã chốt.
4. [ ] **WEB-03 — Actual Catalog browser integration.** Owner Web Catalog + test
   harness. Nối existing same-origin HTTPS/API/PG, authoritative verified actor,
   browse/detail/category/pageSize/cursor/empty/error,401/403/429 và publication
   unavailable/republish. Không tạo Admin grants trong Web. Giữ frozen metadata
   exact ownership; không N+1. Cần provision dataset/roles trong local test harness,
   cleanup fixture và kiểm no-store/SPA `/v1` separation bằng host thật.
5. [ ] **WEB-04–09 — Actual exam workflow theo increment.** Start/lost ACK,
   questions/answers, concurrent save/submit, deadline/autosave, worker status/result,
   policy release và leaderboard privacy. Chia các named gates; không tick hết từ
   một happy path. Độc lập FE UI port và backend correctness ledger.
6. [ ] **Live Admin handoff.** Identity authoritative permission DTO/capability
   và Reporting authorized revision cần decision/contract/tests trước khi mở UI.
   Sau đó mới run actual authoring/import/monitor/replay/audit. Không suy quyền từ
   email/JWT/preset hoặc dùng Candidate-owned resume thay Admin revision.
7. [ ] **Broader acceptance.** Clean install/dependency audit closure, browser
   engines/manual AT/zoom, budgets/asset deployment; rồi AWS/SLO/FinOps/restore/
   rollout theo roadmap. Mobile/app giữ deferred, không trộn vào Web/tablet scope.

## Validation và giới hạn của review này

Fresh static inventory:39 route patterns/33 families/0 missing;76 selected manifest
entries file+SHA match. Fresh live/demo builds PASS trước browser review. Local
review script không trở thành production test/framework/dependency; source tests
và app giữ bytes. Browser artifact chỉ local, sẽ dọn sau inspection.

Browser gồm2 Public review cases PASS và1 route case PASS ở lượt focused riêng;
không gọi đó là full70 suite rerun. Public32 probes (20 Public path-width,4 Auth
at1440,8 sample state-width) và50 Candidate/Admin route-width probes ở768/1280.
Tổng82 observations, covering primary rendering của33 families, không tất cả
states/variants/alias/permission/data modes.25 route cases mỗi width gồm create/edit
Exam riêng; Question edit alias không chạy lại. Import report tạo bằng demo dry-run/
commit trong bộ nhớ, không actual POST/DB. Room dùng old-version seed, title fallback
an toàn; không tự lấy current Catalog title. Route smoke không scan axe, chỉ32
Public/Auth probes dùng full axe. Public có moderate findings ở RV-02/05; không
serious/critical và không document overflow; font self-host loaded.

Initial combined run2 PASS/1 FAIL vì h1 mất tạm lúc lazy navigation; focused route
run sau PASS nhưng chưa bổ sung wait. Sau đó thêm heading wait trong local probe
và chạy lại hai Public cases để lấy complete observations riêng. Không gán failure
này thành application regression đã fix.3 captures đã xem trực tiếp: Home1280,
Sample1280 và sample result768;10 local PNG không là retained templates. Không
pixel-diff claim hoặc chứng nhận WCAG. Full business HTTPS/PG, real Admin permission,
933 unit suite/full70 Chromium/actual Identity10 và AWS không rerun trong review.

Final quality/contracts PASS:48 operations/445 examples, links/anchors/boundaries/
Reporting dependency receipts; git diff --check PASS.830 protected files unchanged,
không source/test/config/template diff. Raw PNG/JSON/traces của review đã dọn sau
inspection; docs chỉ giữ report/checklist, không gallery mới. Các temporary local
scripts không là app dependency hoặc new CI acceptance suite.

Recheck phù hợp sau remediation: root quality/lint/format, Web types/live/demo
builds và existing Public/PORT-05H browser suites với local output. Bổ sung focused
regressions cho findings khi sửa behavior; full matrix cần cả Question Edit,
alias/redirect, loading/errors/dialogs/live permission và manual AT. Không coi các
commands này đã chạy toàn bộ trong review; fresh checks ghi cụ thể ở trên.

Self-review R-58/59 và workflow47/48: scope presentation/read-only inspection,
không mutation của ứng dụng thật, no new repository/UoW/remote query/framework.
Không change database/migration/transaction/events/cache/AWS resource, commit hoặc
deploy. Review hoàn tất không đóng RV-01–06, E5/Q5, parent PORT-05/FE7/32,
roadmap89/217/full live/production. Next bounded increment PORT-06A.
