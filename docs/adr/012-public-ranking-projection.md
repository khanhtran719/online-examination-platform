# ADR-012: Public ranking projection and destructive-change cursors

Status: accepted for local Candidate leaderboard delivery,2026-10-09. Implements
SPEC-08 within REP-04; full Admin reporting/privacy restore and AWS acceptance stay
open. [Evidence](../evidence/leaderboard-2026-10-09/README.md) records the actual
comparison and regression results.

## Boundary and freshness

Assessment owns GET `/v1/exams/{examId}/versions/{versionId}/leaderboard` and current
session, `leaderboard.read` permission, read admission and Presentation validation.
It invokes Reporting's explicit public `RankingProjection` facade. Reporting owns
the plain read use case, query/cursor/alias ports and private pg/crypto adapters.
Only the facade token is exported. Architecture guards allow exactly this facade
and the Reporting composition module; private services/ports/adapters and global
technical imports remain forbidden. No pass-through Assessment service is added.

The projection declares these read-only sources:

| Source owner | Physical source | Required meaning |
| --- | --- | --- |
| Identity | users | opaque id, enabled, verified, current opt-in, no deletion request |
| Catalog | published_versions | exact exam/version identity, frozen leaderboardEnabled |
| Assessment | leaderboard_entries | one retained best attempt per candidate/version, score/order/sequence |
| Assessment | results/attempts | durable unpurged COMPLETED result, matching ownership/score/sequence/submit time |
| Assessment | leaderboard_epochs | destructive-change continuation invalidation |

One primary PostgreSQL statement provides a consistent policy/visibility/ranking
snapshot. No cache, replica, copied opt-in flag, aggregate hydration, explicit read
transaction, network integration or source write occurs. Source schema changes
must review this consumer. Missing version404, disabled frozen policy403; current
Identity authentication/admission happens first. Output contains only rank,
pseudonym, earned/possible and completedAt in the existing page envelope, no-store.

## Ordering, privacy and keys

Use the durable best projection, not the latest result. Sort by earned DESC,
submittedAt ASC, attempt UUID ASC. Expired COMPLETED attempts participate. Ranks
are unique sequential positions among currently visible watermark-eligible rows;
they may change as visibility changes. Pages are1–100, default20; SQL returns at
most101 scalar rows and makes no per-candidate calls.

`LEADERBOARD_KEY_FILE` is a dedicated stable32-byte0600 secret. Domain-separated
HMAC keys produce a96-bit `candidate-` pseudonym bound to version/user and a cursor
encryption key. AES-256-GCM random-nonce cursors authenticate and conceal actor,
exam/version, pageSize, ordering tuple, bigint-string completion watermark, epoch
and expiry. They are not credentials. Authorization is rechecked on every read.
First-page DB time sets15min lifetime; continuations retain the original expiry.
JWT/CSRF rotation does not rotate ranking identities. Deliberate leaderboard-key
rotation resets aliases and invalidates cursors on all API tasks; rollout and
restore reconciliation remain operational gates, not proven by local crypto tests.

## Destructive movement

New completions/improvements beyond the first watermark disappear until refresh;
opt-out is filtered fresh. This is live traversal, not a historical snapshot.
However, retention can replace a previously seen high-score attempt with a worse
surviving result below the cursor. A keyset/watermark alone then repeats that
candidate. The17-migration control reproduces this on real PostgreSQL.

Forward0018 adds compact per-version epochs. A DELETE or worsening best-row UPDATE
bumps the epoch in the same source transaction via an owner-controlled trigger;
rollback undoes both. Ordinary grading INSERT/improving UPSERT does not execute
the invalidation function. A continuation whose epoch differs fails400 and must
restart, preserving the no-duplicate contract without storing traversal history.
Runtime can SELECT epochs only; workers cannot mutate them directly. The trigger
has no PUBLIC EXECUTE, fully qualified objects and `search_path=pg_catalog,pg_temp`,
following [PostgreSQL function security guidance](https://www.postgresql.org/docs/17/sql-createfunction.html).
Best-row candidate/version ownership becomes column-immutable for the runtime;
only winner fields retain UPDATE permission. Grader authority already had that
restriction. No existing migration is rewritten.

## SQL shape and measured trade-off

The initial query ranked/joined/formatted the whole visible version before LIMIT.
Natural100k plans spilled the window sort to disk. The chosen query limits the
ordered visible page before window ranking/formatting; a continuation separately
counts the visible prefix in the same statement to obtain exact live ranks. The
first page skips that prefix count. NOT MATERIALIZED lets both scans share the
same declared predicate without forcing a materialized100k-row intermediate;
see [PostgreSQL CTE semantics](https://www.postgresql.org/docs/17/queries-with.html).

The matched local experiment compares exact frozen before/after SQL, alternating
order on the same100k database, pool and settings. p95 for101-row first pages is
about300→248ms; after rank50,000 about355→271ms. Rows match exactly. This supports
the query choice locally, not an AWS saving or production SLO. Natural plans still
scan/join many rows; output bounds do not bound scanned rows. Prefix ranking is
O(visible prefix), and planner-selected joins can approach O(version population).
No N+1, OFFSET, total-count metadata, per-row network call or new index is added.
Do not claim constant-time paging or sustainable throughput from these samples.

Epochs add only a small PK/FK table for correctness and an exceptional source-write
cost; no normal grading epoch write, Redis, queue, dependency or AWS resource.
Measure destructive-job contention and full-lifecycle scaling later. Per-traversal
seen-user storage adds state/cleanup costs; holding a read transaction violates
short transaction/fresh opt-out requirements; a full historical snapshot also
needs separate privacy reconciliation. Epoch invalidation is the scoped solution.

## Deployment and rollback

Apply0018 before deploying the API and supply the same stable key to every API
task. Existing grader/retention writes remain compatible with the narrower runtime
winner privileges and transactional triggers. Never down-migrate or edit0001–0017.
Rolling API rollback may disable the route but keeps0018 and purged-aware readers.
Restore stays closed until the independent privacy ledger is reconciled; invalidate
pre-restore cursors before reopening. See [runbook](../runbooks/public-leaderboard.md).
