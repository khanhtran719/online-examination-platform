# Admin question statistics

Use `GET /v1/admin/exams/{examId}/versions/{versionId}/question-statistics?pageSize=20`
with an enabled, verified session holding current `reporting.read`. Both UUIDs
must identify the same frozen publication. Admin scope is all exams in this
single platform. An archived/unpublished exam, disabled leaderboard or candidate
ranking opt-out does not hide an authorized aggregate report. A missing or foreign
version returns 404 after authentication and admission. No candidate identities,
prompts, option text, keys, explanations or individual answers are returned.

The denominator is **retained COMPLETED attempts**, including repeated attempts
by the same candidate and deadline submissions that subsequently complete. FAILED,
SUBMITTED and EXPIRED attempts awaiting scoring contribute nothing. Missing or
empty selections count as unanswered; a nonexact multiple-choice selection counts
as incorrect. For each frozen question:

```text
answered = correct + incorrect
completedAttempts = answered + unanswered
0 <= option.selectedCount <= answered
```

The sum of option counts can exceed answered for multiple choice. Every frozen
question and option appears even before its first completion, with zero counts.
Question IDs and option IDs belong to the publication, not its mutable question
bank. Aggregate counts do not represent unique candidates or the best leaderboard.

Assessment grading, replay fencing and retention maintain these projections in
their own transactions. Each successful page reads a fresh primary PostgreSQL
statement snapshot, so it sees a complete old or new grading/purge contribution.
Purge decreases the denominator; it does not leave a permanently cumulative
counter. Reporting does not reconstruct attempts or update business statistics.

Page size is 1–100, default 20. Ordering is frozen section position, question
position, then question UUID ascending. Forward the returned opaque `metadata.next`
with the same actor, exam, version and page size. Cursors expire 15 minutes after
the original page using database time; continuation never extends that deadline.
Tampering, changed scope/page size/actor or an expired cursor returns 422. Restart
from the first page after expiry. Never parse or manufacture cursors in the client.
Frozen ordering is stable while counters remain fresh per page: a multi-page read
is not a statistics snapshot or export. Do not sum pages into a purported atomic
report while grading or purge is active.

Authentication and admission precede input validation. Application revalidates the
current session/permission while holding the Identity actor lock. Projection and
mandatory access audit share the same short UnitOfWork, with response only after
commit. Audit records action `reporting.question-statistics.read`, resource type
`EXAM_VERSION`, the exact version ID, actor and correlation ID. It contains no
answers or counter payload. Audit failure returns 503 without releasing data;
counter validation failure also rolls back the audit. Reads do not lock attempts,
statistics rows or a whole publication.

The current diagnostic budget is 8 auth-inclusive SQL calls per successful page,
including admission, transaction, locked revalidation, one bounded projection,
audit and commit. The frozen question set is at most 500, with at most 20 sections
and 10 options per question. The query limits to pageSize+1 before option lookups;
the maximum response is verified below 128 KiB. It uses the shared finite pool,
acquisition/lock/statement/transaction timeouts and bounded admission. Respect 429
and Retry-After; avoid parallel polling tabs. Use bounded backoff for transient
503, retaining the same scope or restarting after cursor expiry.

HTTP counters are exact integers from 0 to 2,147,483,647. PostgreSQL bigint is read
as decimal text and checked before serialization. Negative, nonintegral, oversized
or inconsistent counters fail closed with 503, not rounding or clamping. Investigate
with the correlation ID and authorized operator diagnostics. Restore valid source
projections through the owning operational process; do not modify counters merely
to make a response pass. A future larger numeric contract requires a versioned
decision and matching clients/tests.

[Closure](../admin-question-statistics-2026-10-10.md) and
[local evidence](../evidence/admin-question-statistics-2026-10-10/README.md)
record regression checks and diagnostic populations. Local sequential samples do
not establish sustainable capacity, production latency, cost, export limits or
privacy-ledger deletion/restore acceptance. No Redis, schema, runtime grant or AWS
resource was added for this report.
