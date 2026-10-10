# Product specification v1

REP-04 Admin subset adds an exact-version candidate-results report. Best is the
retained COMPLETED attempt by earned DESC, submittedAt ASC, attempt UUID ASC;
latest is the retained submitted attempt by submittedAt DESC, UUID DESC, including
pending/FAILED. Best may be null and unfinished latest has null scores. Candidate
UUID paging is stable when selected attempts change, with fresh primary selection
and a first-page start bound rather than a cross-page snapshot. No PII/keys, public
ranking visibility filter or review. [ADR-013](adr/013-admin-best-latest-report.md)
and [subset plan](admin-candidate-results-2026-10-10.md) define current access,
exact-version audit and outstanding privacy-ledger/restore acceptance.

REP-03 local scope: exact frozen-version question/option statistics count every
retained COMPLETED attempt, including repeat candidates and expired completions.
Answered equals correct plus incorrect; missing/empty selections are unanswered.
Zero-count frozen questions remain visible. Multiple-choice option totals can
exceed answered. Grading/replay/purge maintain counters atomically; pages read
fresh primary counts without a cross-page snapshot. Current permission, exact
version audit and bounded opaque paging apply. No keys or PII are returned.
See [REP-03](admin-question-statistics-2026-10-10.md).

REP-02 local scope: Reporting Admin attempt ledger includes all unpurged attempts, optional frozen version filter and immutable start/ID keyset; only COMPLETED has scores. Detail exposes frozen aggregate/section scores with review:null, unfinished409 and purged404. Current permission and mandatory transactional access audit apply. See [REP-02](admin-submissions-2026-10-10.md).

Status: adopted implementation baseline, 2026-10-06; runtime not implemented. Covers SPEC-01–08. Requirements follow [architecture](../.ai/architecture.md) §§77–79; transport is in [OpenAPI](contracts/openapi.yaml), authorization in [permissions](security-and-permissions.md), measurement in [SLO/workload](slo-and-workload.md). Changes require a versioned decision and matching tests, not silent reinterpretation.

## 1. Scope, ownership and decisions

Identity owns accounts/sessions/permissions. Catalog owns exam drafts, sections, bank questions and immutable publications. Assessment owns attempts, answers, results and ranking/statistic projections. Reporting reads declared projections; no table modules or cross-module private repositories.

| Decision | Baseline / reason |
| --- | --- |
| Account access | Email/password only now; email ownership must be verified by a30min single-use link before login. Explicit confirmation selects the final password, never auto-login. Access/refresh are asymmetric signed JWTs with PostgreSQL session authority. Magic link/GitHub later; see [ADR-005](adr/005-email-verification-and-signed-tokens.md). |
| Exam categories | TOEIC, IELTS, IT_CERTIFICATION, UNIVERSITY, RECRUITMENT, CORPORATE are labels. All initially use `EXACT_MATCH_V1`; labels do not assert official score equivalence. Listening media may link private assets; essays/speaking/free-text/manual grading are outside v1. |
| Question types | SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE; positive integer points, no negative/partial credit. Small deterministic policy matches existing pure scoring helper and avoids unsupported conversions. |
| Deadline | `min(startedAt + durationSeconds, frozenCloseAt)`; prevents late entry extending a scheduled exam. Partial time is displayed before candidate confirms start. |
| Attempt limits | Across all versions of the logical exam. One CREATED/IN_PROGRESS attempt per candidate/exam, including an overdue attempt awaiting submission. Republish never resets limits. |
| Explanations | Default NEVER; optional AFTER_COMPLETION or AFTER_EXAM_CLOSE. Policy and close instant frozen at start. Safest default protects reusable question banks. |
| Leaderboard | Publication enables ranking and candidate globally opts in via profile; best completed attempt per candidate in the same version, including expired submissions. Scores from different versions are not merged. |
| PROCESSING | Initially transaction-local during grading. Durable API state remains SUBMITTED/EXPIRED until completion or durable FAILED. Lease/fenced compute outside transaction requires measured need and an ADR/crash tests. |
| Mutation retention | Seven days of durable compact receipts; first-use UUIDv7 age bounded to prevent a pruned key becoming a fresh mutation. See [ADR-003](adr/003-idempotency-retention.md). |

## 2. Scoring and question validation — SPEC-01

Exam: 1–500 questions, 1–20 nonempty sections, duration 60–14,400 seconds, attemptLimit 1–10. Each question belongs to exactly one section and occurs once per publication. Section/question positions are unique positive integers and total order is `(sectionPosition, questionPosition)`. Sum of question points defines section/exam maximum; no additional section multipliers or cross-section weights in v1.

Bank question: prompt 1–8,000 characters of plain text; explanation at most 8,000; 2–10 options with distinct IDs/positions, text 1–2,000; points 1–1,000. TRUE_FALSE has exactly two options representing true/false and one correct choice. SINGLE_CHOICE has exactly one correct choice. MULTIPLE_CHOICE has 1–N correct choices. Keys must be nonempty, unique and members of options. No HTML/script from import is rendered as trusted markup. Each frozen item has its own publication question/option IDs; source bank IDs are admin provenance only.

Selections are sets: order does not affect score; duplicate IDs, foreign options/questions and too many selections for single/true-false are invalid. Empty selection clears an answer and earns zero. Missing answer earns zero. Marks are personal navigation state, never scoring input. Exact set equality earns full question points; every other valid selection earns zero. Result stores `earned`, `possible`, `correct`, `total`, section subtotals and `scoringPolicy=EXACT_MATCH_V1`. Percentage display = integer basis points `floor(earned × 10000 / possible)`; ranking uses raw integer earned within a version. No floating-point rounding in persistence.

Example: section A has single-choice 2 points (key a), multiple-choice 3 (keys c,d); section B has true/false 1 (key true). Responses a, [d,c], [] earn 5/6, correct=2/3, percentageBasisPoints=8333. [c] instead earns 2/6; [c,c] is rejected, not partially graded. New certificate conversion must define reference, table/formula, rounding, section rules and version before publication.

## 3. Publication and immutable snapshots — SPEC-02

Admin edits draft with expected revision; conflicting revision returns conflict. Publish validates all limits, schedule, questions/options/keys, section totals and release policy, creates a complete immutable version and current-version pointer atomically with audit. Version number increases per exam; no draft IDs masquerade as a publication. Publish/start concurrency binds an attempt to exactly one committed complete version via Catalog public capability in the start transaction.

Bank edits/deletes affect future drafts only. Delete means archive when referenced; snapshots survive bank/exam archival. Editing title, schedule, duration, questions, points, attemptLimit, release or visibility creates a new publication rather than modifying existing version data. Unpublish disables new attempts; existing attempts resume/save/submit under frozen policy. Republish unchanged content still creates a new version; old leaderboard/result URLs remain version-specific for authorized users. Admin corrections to existing results require an explicit future regrading policy; v1 has no arbitrary score edit endpoint.

Content projection for a candidate is accessible only through an owned attempt. Authenticated exam detail lists metadata/section counts, not questions/keys. Snapshot loading uses bounded cursor pages (20 default, 100 max) with deterministic ordering; `questionCount` is snapshot metadata, not an automatic COUNT per page. Browse order is `(publishedAt DESC, examId DESC)`; filters/cursor bind category and the first-page publication watermark. Detail uses current publication; attempt reads use their frozen version. Archived/unpublished exams disappear from browse/detail but not authorized attempt history.

Catalog exposes plain public capabilities `getPublishedPolicy`, `getFrozenQuestionPage` (candidate fields only) and `getScoringSnapshot` (trusted grading use case only). Assessment first validates owned attempt/version and calls those capabilities; it cannot access Catalog's private repository or issue a cross-module write. Reporting may use optimized read-only joins over explicitly declared Identity/Catalog/Assessment projection columns. A public capability is not an unauthenticated HTTP endpoint, and grading keys never flow through a candidate controller.

## 4. Time policy — SPEC-03

Schedule input is RFC3339 UTC with `Z`, precision milliseconds, plus an IANA display timezone (default Asia/Ho_Chi_Minh). Validate `openAt < closeAt`, finite instants and valid timezone. Publish cannot create a version already closed. Eligibility for a new start: `openAt <= dbNow < closeAt`, published and within limit. Timestamps in transport are UTC; display timezone never changes comparisons.

Resolve start/save/submit time using PostgreSQL `clock_timestamp()` after acquiring the relevant serialization/attempt lock; transaction-start `now()` or a timestamp captured before lock wait cannot authorize a late write. Store startedAt, deadline, submission time and expiry provenance. Server-returned serverNow/deadline drive countdown; reconnect refetches both. Client clock/timers do not extend duration.

Example: open=20:00, close=20:45, duration=45min. Start at 20:00 gives deadline 20:45; start 20:30 gives 15min. Start exactly 20:45 rejected. Save exactly deadline rejected. Submit at/after deadline accepts an expired submission containing only previously committed answers. Editing close in a new version does not change old deadline or old AFTER_EXAM_CLOSE release time. A save waiting from 20:44:59 until 20:45:01 must be rejected.

## 5. Start, limit and resume — SPEC-04

Authenticate principal and check permission; serialize candidate/exam start before count/create. Actor-scoped idempotency lookup checks fingerprint before mutation. Existing owned CREATED/IN_PROGRESS returns the same attempt, including after unpublish/close; CREATED is normally only a transaction-local construction state. Response carries deadline and `canSave=false` if overdue; it does not create fresh time. Candidate submits overdue attempt or deadline scheduler closes it before another start is eligible.

Without active attempt, Catalog public policy is checked, attempts counted across versions and one attempt created/started with immutable version. Every committed started attempt consumes one slot, including EXPIRED and FAILED; a rolled-back start consumes none. FAILED denotes grading/processing failure after submission; replay reuses the same attempt and consumes no extra slot. No unstarted reservations, client cancellation or automatic quota refunds in v1. Operators repair/replay the existing submission instead of creating free attempts.

Resume GET returns current attempt, paged answers/marks and server deadline; owned status/history remain accessible after unpublish. Access to another candidate's IDs returns Not found. Concurrent starts must not exceed limit or leave two active attempts; constraints back the application locking strategy. History keyset order is `(startedAt DESC, attemptId DESC)`.

## 6. Autosave, marks and retries — SPEC-05

PUT answers accepts 1–20 distinct frozen question IDs, each with a full `selectedOptionIds` set (empty clears), boolean `marked`, and nonnegative `expectedVersion`. New/untouched answer has version 0; first mutation becomes 1. Every accepted new mutation increments affected versions, even if values match. Batch is all-or-nothing; duplicate question IDs, invalid membership/cardinality or any stale version abort the entire batch. Do not split one accepted batch across transactions.

One UoW: attempt row lock → ownership → receipt/fingerprint → database time/state/deadline → validate all memberships and expected versions → write answers/marks and compact receipt → commit. Save and submit share attempt lock order. Receipt contains immutable acceptedAt and affected question IDs/versions, not current answers or keys. Same key/payload returns original receipt even if later saves/submission exist; current authentication/ownership still required. Different payload returns conflict. Old retry never re-executes write.

Client marks UI states pending/saving/saved/conflict; never shows saved before committed acknowledgement. Debounce 500ms, batch changed questions only, periodic flush every 10s with ±20% jitter, at most one in-flight batch per tab. On network timeout/503/429 retry identical key/body with bounded exponential backoff (1,2,4,8,16s, jitter; honor Retry-After); keep pending locally until acknowledged, do not claim local state durable. Apply returned versions monotonically (`max(knownVersion, receiptVersion)`) and clear only the pending mutation matching its key; an old ACK cannot erase newer local intent or revert the UI. On 409 version conflict refetch affected answers, retain unsaved local intent and ask candidate to reconcile before sending a new expected version/key. Tab broadcasting may improve UX but cannot replace DB checks.

Manual submit waits for acknowledged pending saves; if deadline arrives, submit persisted answers and visibly report unconfirmed local edits. Submit request carries no answer body. Browser unload cannot guarantee save; countdown auto-submit is best effort backed by server deadline sweep. Offline after deadline cannot upload late answers.

## 7. Lifecycle, submit and recovery — SPEC-06

| From → to | Trigger / invariant / transaction |
| --- | --- |
| CREATED → IN_PROGRESS | Start UoW with version/deadline/limit/receipt. Construction/start commit together; no persistent draft reservation in v1. |
| IN_PROGRESS → SUBMITTED | First submit before deadline; frozen accepted answers + stable submissionId/eventId + receipt + outbox in one transaction. |
| IN_PROGRESS → EXPIRED | Submit at/after deadline or server sweep; same transaction path and outbox, `expired=true`. |
| SUBMITTED/EXPIRED → PROCESSING → COMPLETED | Inbox + deterministic grading + result/statistics/leaderboard in one UoW. PROCESSING transaction-local, commit only COMPLETED. |
| PROCESSING → FAILED | Permanent/exhausted error: grading transaction rolls back first; separately persist failure/quarantine + audit without partial score or a successful inbox marker. |
| FAILED → PROCESSING → COMPLETED | Authorized audited replay of stable event/submission identity, same immutable answers/version; previous quarantine tracked, no stale success inbox blocking replay. |

COMPLETED is terminal. SUBMITTED/EXPIRED/FAILED cannot accept answers. Transient worker errors roll back inbox/business effects, use bounded retries then DLQ; they do not change attempt to FAILED on first failure. A permanent event-schema error that cannot identify a valid attempt is quarantined without modifying unrelated attempts. Admin replay commits audit + outbox + durable `replayPending=true` before 202, leaving lifecycle FAILED until grading commits; only this authorized pending replay permits processing FAILED. Completion/exhausted failure clears replayPending atomically. Concurrent replay requests cannot enqueue another active replay; return the existing accepted outcome or revision conflict. This metadata supports polling without inventing a persisted PROCESSING lease.

Manual submit, multiple keys, scheduler and retry serialize on the same row. One submissionId and eventId per attempt; after first acceptance, a new submit key returns the existing immutable acknowledgement and may store its receipt without another outbox. Receipt reports acceptance state, not live grading state. ACK after DB commit; broker unavailable does not erase acknowledged submission. Outbox admission/back-pressure may reject an unaccepted request with Service unavailable; it cannot discard committed intents.

Sweep checks overdue attempts in bounded batches every 5s target and calls the same submission policy; observed lag is measured. Worker claim/send/ACK leases and inbox uniqueness follow architecture §79; token fencing for publisher is mandatory. A duplicate with a different eventId is additionally guarded by unique result/submission per attempt. Result/projections/inbox commit atomically; if any fails, no partial COMPLETED. Long grading locks require benchmark-led alternate claim/compute/fenced-completion design before rollout.

## 8. Status, results and explanation release — SPEC-07

Status always describes durable lifecycle plus serverNow, deadline, canSave, expired, resultAvailable, replayPending and pollAfterSeconds. Transaction-local PROCESSING is not fabricated from SQS receive; SUBMITTED/EXPIRED can display processing in UI text without claiming persisted PROCESSING. Poll 2s initially, exponentially back off to 10s with jitter, stop on COMPLETED, FAILED with replayPending=false, or 5min; candidate can manually retry later. FAILED with replayPending=true remains pending and polls with backoff. FAILED shows safe processing failure and support/replay state, not stack/queue details.

Result GET before completion returns 202 with status payload and Retry-After; completed returns 200 result. Result/section score is immutable, owned and immediately readable after completion. `review=null` until authorized release, then review is a separate bounded page endpoint, not an unbounded result payload. Release table:

| Frozen policy | Condition for review |
| --- | --- |
| NEVER | No candidate key/explanation access at any time. |
| AFTER_COMPLETION | Owned attempt COMPLETED. |
| AFTER_EXAM_CLOSE | Owned attempt COMPLETED and serverNow >= frozenCloseAt. |

Review contains candidate choices, correctness, keys and explanation only after gate; denied review returns Permission denied. Admin key access requires `catalog.keys.read` or `assessment.review.admin`, with audit; admin role alone is not a universal bypass. Candidate question payload/logs/errors never include keys/explanations. All authenticated attempt/result/review responses use Cache-Control no-store; shared cache must not cross owner/release boundaries.

## 9. Ranking and statistics — SPEC-08

Publication sets leaderboardEnabled (default false) and each candidate sets global leaderboardOptIn (default false); current opt-out/disabled account suppresses their entry in reads beginning after its commit, independent of historical score. Anonymous requests cannot read ranking. Candidate ranking exposes per-version pseudonym (server HMAC-derived, no email/userId/displayName), earned/possible, rank and completedAt. HMAC secret rotation policy must preserve or deliberately reset aliases; aliases are not authorization credentials.

Assessment's authorized leaderboard read uses Reporting's public ranking projection; Reporting performs the declared read-only join, not a cross-module repository call. Sources are Identity candidate visibility (opaque userId, enabled, verified, leaderboardOptIn, deletion-request flag), Catalog frozen version policy and Assessment retained best entries/results/attempts plus destructive-change cursor epoch. Output has pseudonyms only; no email/password/token/key/answer columns cross that facade. [ADR-012](adr/012-public-ranking-projection.md) declares physical read dependencies and tested source consistency. Projection visibility cannot rely on stale copied opt-in state.

Among COMPLETED attempts in a version, choose greatest earned, then earliest submittedAt, then attemptId ASC for a candidate's best attempt. Global order `(earned DESC, submittedAt ASC, attemptId ASC)`; sequential ranks are unique, tied score is resolved by accepted submit time, not worker completion time. Expired attempts participate with persisted answers. Privacy changes are filters, not permission derived from cached rows.

Pagination cursor contains signed opaque ordering tuple, filter/version identity, first-page maximum completion sequence and expires in 15min. New completions beyond watermark are omitted until refresh; entries improved beyond watermark/opted-out may disappear during traversal. No duplicate candidates, no guaranteed historical snapshot/total. Client refreshes to see live ranking. History/browse cursor likewise binds filters/order/pageSize and does not expose plain SQL. Baseline result/statistics/ranking projections update in scoring transaction; no Redis or separate freshness SLA yet.

Public leaderboard cursors additionally conceal actor/order identity with AEAD,
bind pageSize and retain the original15min expiry. Retention best-entry removal or
downgrade changes an atomic per-version epoch; old continuations return400 and
restart, preventing a previously seen candidate from moving below the old cursor.
Normal improving grading does not bump epochs. Fresh visibility recomputes live
sequential rank; an opt-out can change rank numbers during traversal. A dedicated
stable leaderboard key preserves aliases across JWT/CSRF rotation; deliberate
rotation resets aliases and invalidates cursors. See [runbook](runbooks/public-leaderboard.md).

Admin active monitoring is an exam-scoped, restricted ID-only list, not browser
presence or an exact concurrent-user counter. v1 `reporting.read` covers all frozen
versions, including unpublished/archived exams. Active is retained IN_PROGRESS
with startedAt <= current database statement time and deadline > that time;
CREATED, overdue/pending/completed/failed attempts are excluded. Disabled candidates
can still have an active attempt. Return candidateId, attemptId, status, startedAt,
deadline only. Do not join email/name/answers/keys or use public ranking opt-in as
Admin operational visibility. Primary query freshness is `metadata.asOf` on each
page; submit/deadline can remove entries between pages. Mandatory access audit
commits before response; failures return no report. Descending startedAt/attemptId
keyset, max100 rows, opaque actor/exam/page-size cursor, initial start watermark,
60-second expiry. Refresh the whole list when cursor expires; no hidden COUNT or
frozen snapshot across requests. [REP-01 implementation](admin-monitor-2026-10-10.md)
tracks local evidence separately from AWS acceptance.

Question statistics are per frozen question/version, denominator = all COMPLETED attempts (not only leaderboard opt-in/best). Count correct/incorrect/unanswered; unanswered includes missing/empty selections; option counts count valid selected options and can sum above attempts for multiple-choice. FAILED/pending attempts excluded. Replay/duplicate adds no second contribution. Admin reports distinguish started, submitted, completed, failed and expired-completed; do not collapse failure into score zero.

Business metrics are a separate restricted snapshot at GET /v1/admin/business-
metrics with reporting.read. [ADR-014](adr/014-business-metrics-snapshot.md) defines
current-state counts of an attempt-start cohort [from,to), default preceding24h,
paired canonical UTC millisecond bounds<=7days and ending<=primary asOf. Counts
are per attempt, not distinct candidates or event rates: started, active (future
deadline IN_PROGRESS), submitted, completed, failed, expired submitted and expired
completed. CREATED/future identities are excluded. Compact purged completion
identities remain counted; consent/archive does not filter authorized aggregates.
Global backlog independently includes SUBMITTED/EXPIRED/PROCESSING and FAILED
with replay_pending, oldest original submission and age. Empty timestamp/age are
null. Replay can move current counts; duplicate delivery adds no second attempt.
No SQS depth/worker activity/HTTP telemetry, identifiers, score or time series.
Existing combined /v1/admin/metrics stays specified until real providers exist.
Mandatory current permission/access audit; report data is never write authority.
[BM-01–06](admin-business-metrics-2026-10-10.md) records local checks/limits.

## 10. Acceptance traceability

[Contract-test matrix](contract-tests.md) AC-01–AC-37 specifies behavior/failure requirements; OpenAPI operations reference relevant IDs. Executed local behavior/API/PostgreSQL/worker/browser subsets are recorded in the roadmap and owning closure reports. Managed AWS/restore/load gates remain open; no policy choice or short local diagnostic is accepted as production performance evidence.
