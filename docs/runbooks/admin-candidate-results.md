# Admin best/latest candidate report

Call `GET /v1/admin/exams/{examId}/versions/{versionId}/candidate-results?pageSize=20`
with a current enabled/verified session holding reporting.read. Both IDs must
identify the same frozen publication. Admin scope is all exams in this platform,
including archived/unpublished versions or disabled public leaderboards. Candidate
opt-out/disable does not hide this restricted operational report. This does not
implement account deletion or the independent privacy-ledger restore protocol.

Each item contains candidateId, publishedVersionId, best and latest. These summaries
contain attemptId, submittedAt, status, expired, earned and possible. No candidate
email/name, answers, keys, explanations, failure text, review or ranking is returned.
Follow the existing Admin score-detail route for a selected completed attempt.

`best` considers all retained COMPLETED attempts in the exact version, using earned
DESC, accepted submittedAt ASC, then attempt UUID ASC. It is null if none completed.
`latest` considers retained submitted attempts, using submittedAt DESC then attempt
UUID DESC. Worker completion/replay time is irrelevant. Pending/FAILED/deadline
submissions may be latest while an older completed result remains best. Only
COMPLETED has scores: a real zero is0; unfinished/FAILED is null. Deadline completion
keeps expired:true. Unsubmitted CREATED/IN_PROGRESS attempts and purged payloads
are excluded. Versions and different scoring scales are never merged.

Example: a candidate completes9/10, then submits another attempt that fails. The
report retains best9/10 and latest FAILED with null scores. Replaying the failed
attempt may update its status/score and the selected best; its original submittedAt
does not change. Purge can replace best/latest with a retained survivor, or remove
the candidate when no retained submitted attempts remain. Source effects are
Assessment-owned transactions, not report-side repair or cached state.

Pages are1–100/default20, ordered by candidate UUID ASC. Use returned metadata.next
with the same actor, exam/version and page size. Cursor is opaque/encrypted and
expires15 minutes after the first page; continuation retains that expiry. Changing
scope/page size/actor, tampering or expiry returns400 Invalid request. Restart from
the first page, never decode or manufacture a token. Replicas share the existing
CSRF root with a distinct cursor-purpose key; root rotation invalidates navigation.

The first-page database time bounds attempt startedAt. Each page still reads fresh
best/latest selections from one primary statement snapshot. A newly submitted or
completed older-started attempt can appear ahead of the cursor or remain behind
it until refresh; purge may remove a candidate. Candidate order does not move when
its selected score/attempt changes, preventing repeat paging after downgrade.
This is not a historical snapshot, total, complete export or concurrency metric.
Refresh the whole report to see the latest eligible population. Restore remains
closed until privacy reconciliation and cursor invalidation are actually verified.

Authentication/permission/admission happen before input parsing. Application uses
Identity's public locked revalidation and a short audited read UnitOfWork. Audit
action reporting.candidate-results.read targets EXAM_VERSION and the exact version
UUID, with actor and correlation ID only. Response is released after commit.
Audit outage, lost permission or invalid completed-result state releases no report.
The normal response is no-store. Do not log raw cursors/credentials or use IDs as
metric labels. Reads acquire no explicit attempt/result locks.

The budget is8 SQL calls per successful page including authentication/admission,
BEGIN, locked/current revalidation, one projection, audit and COMMIT. The query
limits candidate IDs before two bounded lateral best/latest lookups. It uses
existing indexes and does not fetch answers, count the whole population or perform
per-candidate network calls. Scans can grow with version population and a candidate's
other exams; a bounded output is not a constant-work guarantee. Maximum response
is tested under128KiB. Pool/admission/acquisition/lock/statement limits stay in force.
Respect429/Retry-After and use bounded backoff for transient503; repeated audit or
state failures require authorized operator investigation using the correlation ID.
Do not lower constraints, invent zero scores or edit source projections to silence
a report error. PostgreSQL prevents COMPLETED without its durable result at commit.

[Closure](../admin-candidate-results-2026-10-10.md),
[evidence](../evidence/admin-candidate-results-2026-10-10/README.md) and
[diagnostic protocol](../../experiments/admin-candidate-results/README.md) separate
local checks from AWS load/SLO/cost and privacy-ledger acceptance.
