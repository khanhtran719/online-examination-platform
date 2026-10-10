# Web API integration và state contract

Document này là hướng dẫn nối frontend, không sửa [OpenAPI](../contracts/openapi.yaml). Thông tin DTO lấy từ contract và chín Identity routes hiện có. Xem [security](../security-and-permissions.md), [product](../product-specification.md), [ADR-003](../adr/003-idempotency-retention.md), [ADR-005](../adr/005-email-verification-and-signed-tokens.md).

## 1. Tách DTO, view model, UI state

API DTO phải đúng field/type/nullable trong OpenAPI; request không được có unknown fields. UI view model có thể chứa label/format/local ordinal/loading state, nhưng không được giả field đó có trong response. Ví dụ `Exam.title` có, `HistoryItem.examTitle` không có; `Profile.permissions` không có. Không casting `as any` để che gap.

Server state: profile, immutable exam/question pages, authoritative answer versions, attempt status, result, ranking/admin reads. UI state: dialog/filter/focus/current question, draft selections/marks, transport queue và pending intent. Auth session metadata chỉ có userId/expiry timestamps; JWT cookies không đọc được ở JavaScript. Read components không truy cập client/SDK trực tiếp; hooks/capability adapters thực hiện network/mapping.

Prototype có `DemoApi`; live có `HttpApi`. Chọn một adapter tại bootstrap bằng config rõ ràng. Không catch network error rồi return fixture. Demo role/scenario switches chỉ trong demo build với banner “Dữ liệu mẫu”. Live build không ship mock worker/fixture dataset/scenario permission override; artifact scan và network test xác nhận. Mock không là authorization thực.

Public experience `/experience` được yêu cầu 2026-10-07 là feature minh họa riêng trong cả hai build: ba câu tổng hợp công khai, state trong bộ nhớ và kết quả có nhãn mẫu. Nội dung này không phải fixture dataset của `DemoApi`, không gọi API, không chứa bank/attempt keys và không thay dữ liệu khi live lỗi. Chấm tại client chỉ áp dụng bộ ba câu tổng hợp; kết quả Assessment chính thức vẫn do backend. Bootstrap Identity có thể gọi CSRF/profile theo chính sách phiên hiện tại; thao tác trong mẫu không thêm request nghiệp vụ. Xem PU-02 trong [design spec](design-spec.md).

## 2. API-to-screen mapping

The original handoff listed44 business plus2 health operations. Current contract has48 operations after additive Admin best/latest and business metrics. Execution status follows the [roadmap](../implementation-roadmap.md); the table below preserves the original handoff inventory, not the current backend acceptance ledger. “Specified” dưới đây nghĩa API có schema, không nghĩa endpoint hoạt động.

| Operation / method + API path                                                                   | Browser feature                                             | Trạng thái integration |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| getCsrf — GET `/v1/auth/csrf`                                                                   | anonymous/live unsafe requests                              | Identity local         |
| register — POST `/v1/auth/register`                                                             | register                                                    | Identity local         |
| requestEmailVerification — POST `/v1/auth/email-verification/request`                           | resend/check-email                                          | Identity local         |
| confirmEmailVerification — POST `/v1/auth/email-verification/confirm`                           | explicit final-password verification                        | Identity local         |
| login — POST `/v1/auth/login`                                                                   | login                                                       | Identity local         |
| refresh — POST `/v1/auth/refresh`                                                               | session coordination                                        | Identity local         |
| logout — POST `/v1/auth/logout`                                                                 | logout                                                      | Identity local         |
| getProfile — GET `/v1/me`                                                                       | bootstrap/profile                                           | Identity local         |
| updateProfile — PUT `/v1/me`                                                                    | profile mutation                                            | Identity local         |
| browseExams — GET `/v1/exams`                                                                   | catalog list                                                | Specified              |
| getExam — GET `/v1/exams/{examId}`                                                              | current publication detail                                  | Specified              |
| startAttempt — POST `/v1/exams/{examId}/attempts`                                               | start/resume existing attempt                               | Specified              |
| resumeAttempt — GET `/v1/attempts/{attemptId}`                                                  | exam resume                                                 | Specified              |
| getQuestions — GET `/v1/attempts/{attemptId}/questions`                                         | owned frozen questions                                      | Specified              |
| getAnswers — GET `/v1/attempts/{attemptId}/answers`                                             | saved answers/versions                                      | Specified              |
| saveAnswers — PUT `/v1/attempts/{attemptId}/answers`                                            | selections/marks/clear                                      | Specified              |
| submitAttempt — POST `/v1/attempts/{attemptId}/submit`                                          | manual/deadline submit                                      | Specified              |
| getAttemptStatus — GET `/v1/attempts/{attemptId}/status`                                        | clock/status/poll                                           | Specified              |
| getResult — GET `/v1/attempts/{attemptId}/result`                                               | pending202/ready200                                         | Specified              |
| getReleasedReview — GET `/v1/attempts/{attemptId}/review`                                       | authorized explanation page                                 | Specified              |
| getHistory — GET `/v1/me/attempts`                                                              | history/dashboard recent                                    | Specified              |
| getLeaderboard — GET `/v1/exams/{examId}/versions/{versionId}/leaderboard`                      | version ranking                                             | Specified              |
| listAdminExams — GET `/v1/admin/exams`                                                          | admin exam list                                             | Specified              |
| createExam — POST `/v1/admin/exams`                                                             | create draft                                                | Specified              |
| getAdminExam — GET `/v1/admin/exams/{examId}`                                                   | draft editor                                                | Specified              |
| replaceExamDraft — PUT `/v1/admin/exams/{examId}`                                               | full draft replacement                                      | Specified              |
| archiveExam — DELETE `/v1/admin/exams/{examId}`                                                 | archive logical exam                                        | Specified              |
| publishExam — POST `/v1/admin/exams/{examId}/publish`                                           | publish immutable version                                   | Specified              |
| unpublishExam — POST `/v1/admin/exams/{examId}/unpublish`                                       | deny new starts                                             | Specified              |
| listBankQuestions — GET `/v1/admin/questions`                                                   | bank list                                                   | Specified              |
| createBankQuestion — POST `/v1/admin/questions`                                                 | new question                                                | Specified              |
| getBankQuestion — GET `/v1/admin/questions/{questionId}`                                        | editor with keys                                            | Specified              |
| replaceBankQuestion — PUT `/v1/admin/questions/{questionId}`                                    | edit with revision                                          | Specified              |
| archiveBankQuestion — DELETE `/v1/admin/questions/{questionId}`                                 | bank archive                                                | Specified              |
| importQuestions — POST `/v1/admin/question-imports`                                             | JSON dry-run/import                                         | Specified              |
| getImportReport — GET `/v1/admin/question-imports/{importId}`                                   | report                                                      | Specified              |
| listActiveCandidates — GET `/v1/admin/exams/{examId}/active-candidates`                         | monitor                                                     | Specified              |
| listSubmissions — GET `/v1/admin/exams/{examId}/submissions`                                    | submissions/version filter                                  | Specified              |
| getAdminResult — GET `/v1/admin/attempts/{attemptId}/result`                                    | admin score detail                                          | Specified              |
| getAdminReview — GET `/v1/admin/attempts/{attemptId}/review`                                    | audited answer review                                       | Specified              |
| replayFailedAttempt — POST `/v1/admin/attempts/{attemptId}/replay`                              | reason/revision replay                                      | Specified              |
| getQuestionStatistics — GET `/v1/admin/exams/{examId}/versions/{versionId}/question-statistics` | per-version question stats                                  | Specified              |
| getAdminBusinessMetrics — GET `/v1/admin/business-metrics` | distinct cohort/backlog snapshot; new DTO, Web not wired | Backend increment BM-01–06; see roadmap |
| getSystemBusinessMetrics — GET `/v1/admin/metrics`                                              | overview/metrics                                            | Specified              |
| getAudit — GET `/v1/admin/audit`                                                                | audit                                                       | Specified              |
| liveness/readiness — GET `/live`, `/ready`                                                      | operational checks, not browser availability banner polling | Technical local        |

Do not poll `/ready` from every browser to infer whether all business services work. Error state comes from the operation that failed.

## 3. Dependency register — do not invent a solution in UI

These are backend/product handoff items, not authorization to Grok to edit APIs.

| ID        | Current gap                                                                                                                    | Required decision / safe UI behavior                                                                                                                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI-GAP-01 | Profile/Session DTOs lack current permissions; no permissions endpoint                                                         | Authoritative capability required before live Admin nav/actions. Demo uses declared fixtures. Live Admin denied/unavailable until connected; do not parse JWT roles, trust role switch or infer admin from email                                                  |
| UI-GAP-02 | Attempt DTO lacks frozen title/category/section titles/counts/questionCount; CandidateQuestion lacks section ordering metadata | Full navigator/title/totals need owned frozen presentation projection. Current GET exam may be unpublished or a newer version, so cannot substitute. Minimal live fallback shows short attempt/version ID and loaded-page navigation; explicitly track limitation |
| UI-GAP-03 | Exam detail lacks serverNow and remaining/used attempts                                                                        | Start confirmation can warn about close time; estimates are not authoritative. Do not show exact remaining quota from partial history or guaranteed full duration. Backend validates on start and returns actual deadline                                         |
| UI-GAP-04 | Lists do not define global text search, all advertised filters, page totals or version-list endpoint                           | Wire only declared query params. Search loaded rows only with label or leave control out in live mode. Version choices only known authorized IDs; no unimplemented endpoint or numbered pagination                                                                |
| UI-GAP-05 | History lacks exam title; results/statistics have section/question IDs but not all labels                                      | Avoid per-row N+1 and mismatched current-version labels. Use permitted existing context/fallback IDs; richer immutable presentation projection needs contract decision                                                                                            |
| UI-GAP-06 | AdminSubmission/AdminResult do not provide attempt revision, while replay requires expectedRevision                            | Live replay stays blocked until an authorized current-revision capability exists. Candidate-owned resume endpoint cannot be used to impersonate candidate. Demo can exercise the replay view model independently                                                  |
| UI-GAP-07 | Metrics returns snapshot, not historical timeseries, p99/CPU/RDS/cache/cost                                                    | Render supported values/asOf; unsupported values are unavailable. No fabricated charts/prices, AWS SDK in browser or direct console access                                                                                                                        |
| UI-GAP-08 | No media attachments/essay/speaking/recovery/magic-link/GitHub endpoints                                                       | Keep v1 question renderer to three types/plain text; omit active controls for later features                                                                                                                                                                      |

Record each gap in the implementation report as BLOCKED LIVE / PROPOSED CONTRACT with source reference. Grok completes demo UI around it but cannot mark full live/production done. Resolve later in the owning backend/product task with updated contracts/tests.

## 4. HTTP client rules

Base path same-origin `/v1`; `fetch` uses credentials appropriate for cookies. Success `{data,errorCode:null,message:null,status:true}`; safe error `{data:null,errorCode,message,status:false}`. List adds `metadata:{next,pageSize}`. Preserve actual HTTP status/Retry-After/X-Correlation-Id separately.202 is accepted/pending success, not an exception; null score does not mean0. Health is outside envelope. Validate response shape enough to prevent rendering wrong state; do not reinterpret malformed success as empty data.

Do not attach `Content-Type: application/json` to empty refresh/logout/submit/start bodies unless actually sending valid JSON allowed by the contract. Submit carries no answer body. Request bodies use exactly declared DTOs; UI-only confirm-password/tabs/local labels stay out of transport.

Unsafe calls require `X-CSRF-Token` from fresh GET csrf/context, cookies and browser-generated Origin. JavaScript does not manually set Origin or synthesize signed tokens. CSRF token may live in memory/readable csrf cookie for echo; access/refresh are Secure/HttpOnly cookies, never JSON/localStorage/sessionStorage/URL/header bearer from JS. A browser must actually prove Secure cookies on HTTPS; a dev cookie jar is not enough.

Login/refresh rotate CSRF; invalidate stale client CSRF state and obtain the proper context. Verification needs anonymous context; logged-in verification asks logout first.403 is not a universal signal to endlessly refetch CSRF/retry protected requests; distinguish declared permission/context failures with a bounded recovery path. Server error text stays safe; presentation can map known text to helpful Vietnamese but cannot disclose hidden account state.

## 5. Same-origin development and build layout

Use frontend dev server with same-origin `/v1` proxy; API PUBLIC_ORIGIN must equal the browser origin used for Origin validation and emailed links. Configure an ignored local env variant rather than silently changing repo defaults. Browser HTTPS E2E requires a locally trusted certificate/test TLS setup and a cookie-policy proof. No claim is made that plain HTTP Vite development validates Secure cookies. Production requires the existing end-to-end TLS requirement; no HTTP origin exception is introduced.

Output frontend to `apps/web/dist`; root `dist` is API output plus immutable migrations. Do not replace root build with `vite build` or let cleanup erase API artifacts. Future CloudFront `/v1/*` routes to API without response caching; HTML entry routes go to static app, assets use fingerprinted names. SPA fallback applies to browser document navigation, never to API errors/missing JS assets. Verification HTML uses no-store/no-referrer and no third-party telemetry. Hashed static assets may use immutable long caching; HTML release invalidation must be validated. No service worker baseline.

Frontend environment values are public once bundled. No DB URLs, AWS credentials, signing/private keys, email encryption/rate/CSRF keys in VITE variables. Do not call PG/Redis/SQS/Secrets Manager/AWS SDK from browser.

## 6. Auth refresh and multi-tab coordination

Keep one refresh Promise per tab; for multiple tabs use a same-origin Web Lock and BroadcastChannel metadata. Feature-detect both and test browsers. Broadcast only session epoch/expiry/reauth signals, not tokens/profile/answers/keys. Under the cross-tab lock re-check protected auth before rotating: another tab may already have refreshed the shared cookies. Re-fetch CSRF for the winning current context. Retried protected reads after a successful refresh are bounded to one auth recovery cycle.

Web Locks coordinates origin tabs in supported secure contexts; BroadcastChannel provides origin-scoped communication but is not itself an atomic lock. [MDN Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API), [BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel). If reliable coordination is unavailable, disable automatic cross-tab refresh and use explicit re-auth/single-window guidance; do not implement a racy localStorage “lock” and claim it safe.

Refresh reuse can revoke the whole family. After an unknown outcome/timeout of refresh, do not blindly resend the old refresh request as if it were an idempotent save. Re-authenticate when state cannot be confirmed. Session-expired exam UX preserves memory draft if possible with an inline re-auth dialog, pauses editing/sending while unauthenticated, keeps deadline running and explains that only acknowledged answers survive reload. No JWT decoding replaces PostgreSQL authority.

Logout success revokes/clears cookies; clear profile/attempt/review/admin query caches and sensitive in-memory drafts. Before logout warn about unconfirmed edits, but after revocation do not continue authorized requests from old data. Route guards are UX only; server permissions/object ownership always control access.

## 7. Mutation identity and admin revision

Use a maintained UUIDv7 generator compatible with the implementation environment; crypto.randomUUID is v4 and not sufficient. Keys belong to one logical action/actor/body. Generate once, retain key plus immutable body during retries; never “fix” a conflict by minting a key. Capture the expected answer versions/revision in that immutable body.

Important authenticated mutations require idempotency per OpenAPI: profile/start/save/submit/admin create/edit/archive/publish/import/replay. Registration/login/refresh and verification obey their separate auth contracts, not an invented generic receipt mechanism. Changed dryRun→real import body is a new logical mutation/new key; retry of each action keeps that action's key/body. Pruned/stale keys can return Idempotency key expired; prompt re-read/reconciliation before a new action.

Admin edits use expectedRevision and full replacement request. A successful receipt is not a full current aggregate; refetch projection, reconcile newer local editing and accepted revision.409 Version conflict shows compare/reload choices. Queue/replay accepted202 does not mean grading done.

## 8. Autosave coordinator — implement before polishing exam UI

Represent a question draft by questionId, selectedOptionIds full set, marked, baseVersion, localIntentSequence. Question/option IDs are frozen publication IDs. Maintain server snapshots and local drafts separately. Never treat an unloaded answer page as version0; absence means0 only once the relevant authoritative answer scope has been loaded completely.

Scheduling:500ms debounce after interaction; changed questions only; periodic flush10s±20% jitter while dirty; batch1–20 distinct questions; one in-flight batch per tab. Do not poll/send when nothing changed. Marks and clear-answer use the same pipeline. Batch remains atomic; a stale item aborts the whole batch. Retry1/2/4/8/16s with jitter on eligible timeout/503/429, honor Retry-After and stop after the bounded attempts/deadline; no React Query default retry layer on top.

Pseudo-algorithm (a design contract, not existing code):

```text
edit(question): create/update local draft, increment local sequence, show pending
flush: if authenticated, canSave, no conflict and no in-flight batch
  capture <=20 drafts with current known versions + immutable key/body + captured sequences
  send once; newer edits remain in their separate draft entries
ACK:
  advance known versions monotonically with max(known, receipt)
  clear only drafts whose current sequence still equals the captured sequence
  for a newer unsent draft, rebase it on confirmed version, keep it pending
  label saved only if no outstanding unconfirmed intent remains
timeout/eligible503/429: retry the captured key/body, never take newer drafts into it
409: stop writes for conflicted scope; fetch latest; keep local intent; ask reconciliation
deadline/canSave=false: stop creating saves; keep unconfirmed indicator; submit persisted data
```

Example: send A version0/keyK; user chooses B before ACK of A. ACK version1 means A persisted, not B. Keep B pending, next new batch uses expectedVersion1 and a new key. If late duplicate ACKK arrives after version2, `max` prevents regression and its captured sequence cannot erase the newer draft. A received ACK after deadline confirms a save accepted earlier; it does not authorize another late write. On 409 fetch paged answers with supported API (no invented `questionIds` query); never overwrite drafts by blind refetch merge.

No automatic “last writer wins” between tabs. Broadcast may notify changes but never overrides DB versions; UI asks reconciliation. Baseline pending data is memory-only, not a durability promise; reload restores server-ACKed state. Add persistent offline storage only through an explicit privacy/retention/recovery decision later.

## 9. Server clock, submit and polling

For attempt/status responses capture request start and receipt with performance.now; estimate server offset/uncertainty from serverNow and RTT, use an elapsed monotonic base. Recalculate remaining `max(0, deadline - estimatedServerTime)`, not “minus one each tick”. Resync after visibilitychange/reconnect/status load. If server says canSave=false, lock editing immediately even if estimate disagrees. Offline uncertainty never extends duration.

Manual submit freezes new editing, flushes all dirty batches and waits for ACKs before POST. If saves remain failed while time remains, present retry/cancel rather than submit silently. At deadline, stop new save and make submit best effort with existing persisted answers; show unconfirmed count, never upload late answers inside submit body. Retry submit with same key, reconcile durable status on unknown outcome. Sweep is backend protection; browser timer cannot guarantee submission through closed/offline tab.

SUBMITTED/EXPIRED UI may say “Đang xử lý” but retain lifecycle. Processing initially transaction-local; do not fake durable progress/percentages. Status poll2s then up to10s+jitter, honoring pollAfterSeconds/Retry-After; pause hidden polling, refetch once on return. Stop COMPLETED, FAILED with replayPending=false, or after5min. ReplayPending true remains waiting with backoff. Manual later refresh is allowed. Result GET202 success/status;200 has immutable score. Stop polling after completion and fetch released review only when gated.

## 10. Cache, payload and telemetry policy

TanStack Query defaults include automatic stale refetch and retries; configure explicitly. [Important defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), [query retries](https://tanstack.com/query/latest/docs/framework/react/guides/query-retries). Query keys bind authenticated session scope, capability, exam/version/attempt, filters/pageSize and cursor. User changes/logout clear private caches; candidate/admin/review entries stay separate. No persistent query cache baseline. No-store transport does not itself clear JavaScript memory.

Immutable owned questions can remain in memory for the active attempt; answer/status/current permissions need reconciliation. Background refetch must not overwrite a dirty editor. Only prefetched current/adjacent bounded pages, no eager entire bank/500-question payload or all results. Cursor pageSize20 default/max100; no total/lastpage/OFFSET UI; reset cursor on changed filter/watermark/expiry. Unknown cursor400 shows reload action.

Record client performance route-level without question/answer/password/token/URL fragment/PII. No IDs in metric labels, no full query/body/error payload logs, no full session replay. Verification route skips analytics entirely. Frontend budgets are proposed gates, not measured backend SLO claims. App polling and refetch traffic counts against cost/capacity, so prove request rates in network logs.
