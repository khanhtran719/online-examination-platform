# ADR-013: Admin retained best/latest candidate report

Status: accepted locally, 2026-10-10, with completed
[BL-01–06](../admin-candidate-results-2026-10-10.md) and
[evidence](../evidence/admin-candidate-results-2026-10-10/README.md). REP-04 remains SUBSET;
independent privacy ledger/deletion/restore and production remain open.

## Decision

The existing submissions ledger returns every retained attempt and the public
leaderboard returns one visible best result. Neither specifies an Admin pair of
best and latest per candidate. Add an independently bounded READ endpoint:
`GET /v1/admin/exams/{examId}/versions/{versionId}/candidate-results`.
This is an additive v1 operation; existing routes, DTOs, events, schema and public
module exports keep their meaning. No selection parameter changes ledger ordering.

Each item contains candidateId, publishedVersionId, best and latest. Summary
fields are attemptId, submittedAt, status, expired, earned and possible.
Best is nullable; latest is always a retained submission. Best considers only
COMPLETED attempts, using greatest earned, earliest accepted submittedAt, then
attempt UUID ASC as in SPEC-08. Latest considers all retained submitted attempts,
using latest accepted submittedAt then attempt UUID DESC. It does not use worker
completion time or revision/replay time. Unsubmitted attempts are excluded.
Pending/FAILED latest has null scores even if an older successful best exists.
Deadline-completed keeps expired:true; a real zero score remains0. Repeated
attempts contribute to selection; versions are never compared or merged.

Admin reporting.read scope covers all exams in this platform. Exact version must
belong to the exam; absent/mismatched404 after authentication/admission. Frozen
leaderboardEnabled, candidate opt-in/enabled/verification and release policy do
not filter this restricted operational report. The caller still needs a live
verified/enabled session and current permission. Only opaque candidate IDs are
exposed; no Identity PII, answer/key text, failure detail or review capability.

## Ownership, transaction and pagination

Reporting owns private DTO/query/cursor/service/pg/crypto/HTTP adapters. It declares
Catalog published_versions(id,exam_id) and Assessment attempts/results as read-only
sources. Assessment alone owns source writes and selection invariants. Direct
optimized SQL is the architecture's declared Reporting exception; no private
Assessment repository/service import or generic report framework is introduced.

One primary statement reads candidate eligibility and both selections consistently.
Current Identity locked revalidation, projection and safe access audit commit
together before response. Audit action `reporting.candidate-results.read` targets
the exact EXAM_VERSION, with actor/correlation IDs and no score payload. Missing/
corrupt completed scores fail503 instead of falling back to an apparently valid
older result. No explicit attempt/result locks or source writes occur.

Candidate UUID ASC keyset keeps paging identity stable while grading/replay/purge
changes best/latest attempts. Database time of the first page bounds eligible
attempt startedAt; subsequent counts/selections remain fresh, not a multi-page
snapshot. Purge can remove a candidate; new qualifying completion/submission of
an older started attempt can appear ahead of the current cursor or be missed
behind it until refresh. No total or exactly-once export completeness is promised.
Watermark is a time bound, not a commit sequence. Frozen output ordering prevents
the same candidate moving below a cursor after best-score downgrade; no additional
epoch/storage is required for this ordering. Restore reconciles privacy and
invalidates cursors before reopening, under the still-pending restore gates.

The encrypted15min cursor binds actor/exam/version/pageSize/order, candidate UUID,
start watermark and fixed original expiry. A separate purpose key derives from
the existing CSRF root. It neither exposes nor grants candidate identity access.
All replicas share the root; root rotation invalidates navigation. No new secret.

## Performance and limits

Limit to pageSize+1 candidates before two lateral best/latest lookups using
existing candidate/exam and version indexes. No per-row network queries, N+1,
answer scan, aggregate hydration, cache, queue or new AWS resource. Candidate
grouping still scans eligible version attempts; output bounds do not imply
constant-time reads. Runtime timeouts/admission/pool are retained. Measure natural
plans and maximum payload under a100k-attempt cardinality fixture before closure.
No index/optimization winner or capacity/cost selection follows from local samples.

Grading/replay/purge tests must verify source consistency, ties, previous best
surviving latest failure, and stable candidate traversal after winner removal.
Applied migration checksums and archived evidence are immutable. Future source
migrations, export/PII policies and privacy deletion/restore require separate review.
