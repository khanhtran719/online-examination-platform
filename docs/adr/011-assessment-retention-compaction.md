# ADR-011: Assessment retention with compact durable identities

Status: accepted for local ATT-09 delivery,2026-10-09. Specializes the existing
retention, UoW and SQL-adapter contract; no runtime ORM, cache, queue or AWS service
is added. Production scheduling and storage economics remain unmeasured.

## Context

Deleting a completed attempt would remove lifetime attempt quota and the identity
used to reject delayed source/DLQ delivery. Removing only its result would violate
the deferred COMPLETED/result invariant and leave statistics/ranking inconsistent.
Generic table DELETE authority would let a maintenance credential bypass recovery,
retention and ownership constraints. Existing receipts use the minimum7day window
and UUIDv7 first-use freshness under [ADR-003](003-idempotency-retention.md).

## Decision

Assessment owns the WRITE use case, pure Domain eligibility and maintenance port.
Application owns one receipt-prune UoW and a separate UoW per completed payload.
Infrastructure implements the port with parameterized pg function calls; the
scheduler calls only the public Assessment factory and stays outside ambient UoW.
No ORM/driver/context escapes into Application or Domain.

Receipt pruning covers only Assessment start/save/submit operations belonging to
completed attempts, at least7days after acceptance. Pending/replay/FAILED work,
undelivered/leased/parked outbox and unresolved quarantine are protected. Foreign
operation receipts are unaffected. Older pruned UUIDv7 keys fail freshness checks
instead of being treated as new writes. Other modules' pruning is a separate gate.

Completed payload withdrawal requires all of these post-lock DB facts:

- COMPLETED, durable result and canonical successful grading inbox, no prior purge.
- Finite submitted/completed timestamps, at least365days from submit and7days from completion.
- No Assessment receipt accepted within7days, pending replay, unresolved failure
  or outstanding/leased/parked outbox delivery.

The completion/receipt grace protects recovery completed late in the365day window;
these are minimum gates, not a promise of deletion at a specific wall-clock time.
Unresolved incidents can extend retention and require operator review. Ages are
fixed policy, not caller-supplied arguments or configurable shorter TTLs.

The atomic effect removes selections/answers/result detail/sections/result,
subtracts their question/option statistics and selects the user's best remaining
result for that frozen version. The lock order matches grading: attempt, all
question counters in question-ID order, option counters in question/option order,
then leaderboard. Missing counters/detail mismatch/nonnegative constraint failure
or audit failure rolls the whole attempt effect back. Statements after waiting
use fresh READ COMMITTED snapshots. This maintains retained-result projections;
it does not implement public Reporting/privacy endpoints.

`purged_at` marks a compact COMPLETED identity. Attempt/user/exam/version,
submission/event/provenance/generation identity and successful inbox remain. Quota
counts include it. Candidate attempt/questions/answers/result/review projections
return not-found and history excludes it. Source/DLQ consumers validate identity
and generation before acknowledging a purged completed duplicate without scoring,
result reconstruction or new inbox aliases. No zero-score record is invented.
A deferred completion guard permits exactly this marked state and rejects removal
of an ordinary completed result without the marker at COMMIT.

Migration0017 introduces a NOLOGIN maintenance group with schema USAGE and EXECUTE
on exactly3 fixed-policy functions. It grants no direct table DML or key/Identity
read. Private facts/policy functions and completion trigger EXECUTE are revoked
from PUBLIC. SECURITY DEFINER functions use a trusted owner, fully qualified
objects, `search_path = pg_catalog, pg_temp` and fixed TimeZone UTC. Caller timezone/DST cannot shorten the minimum168hour receipt window. SQL duplicates the Domain gate
as an enforcement boundary so direct authorized RPCs cannot bypass eligibility;
Domain remains the policy owner. Local real-PG tests exercise both paths.

PostgreSQL's [function security guidance](https://www.postgresql.org/docs/current/sql-createfunction.html)
informs the restricted search path and execution grants. Its
[SELECT locking contract](https://www.postgresql.org/docs/current/sql-select.html)
informs SKIP LOCKED overlap handling; this does not remove relation locks.

## Bounds and resources

Default batch:500 receipts and10 attempts; enforced maxima1000/50. Each attempt
contains at most500 frozen questions and5000 selections. One-shot entry point is
opt-in/default-off; it does not require a permanently provisioned service, cache
or additional queue. Overlapping jobs skip claimed rows. Stop admission between
UoWs and drain the current UoW, with a30s process deadline and DB timeouts.

`attempts_retention_due(submitted_at,id)` is partial for unpurged COMPLETED rows.
The receipt resource index bounds per-attempt recent-receipt checks. Their storage,
write amplification and RDS benefit still need workload measurement. Discovery
filters protected rows before LIMIT so a finite protected prefix cannot permanently
starve healthy rows. Batch bounds do not bound all scanned rows: a large population
of blocked completed rows can still hit statement timeout and needs operational
investigation/benchmarking, not an assumed saturation guarantee.

Compact identities and frozen references remain as an explicit quota/redelivery
requirement. This is not a full PII/account/Catalog/privacy purge or indefinite
retention of answer/score payload. Identity unlinking, lifecycle cost measurements
and safe reclamation after reference/queue/restore gates are separate work. The
new functions do not age-delete active/pending/FAILED rows, audit, inbox, outbox or
Catalog. Restore must reconcile its independent deletion ledger before reopening.

## Rollout and alternatives

Apply bootstrap group/forward migration; deploy compatible API/source/DLQ readers
on every instance; then enable the dedicated maintenance job. After the first
purge, rollback must retain purged-aware readers/consumers and migration0017.
Stopping the scheduler prevents further purge but cannot restore removed payload.
Do not deploy a down migration or old grading image that requires every completed
identity to have a result. See [runbook](../runbooks/assessment-retention.md).

Deleting attempt/inbox would reset quota or permit duplicate effects. Keeping
answers/results forever violates the chosen payload lifecycle. Broad maintenance
DELETE grants bypass fixed policy. Per-row application DELETE/UPDATE RPCs add
round trips and grant surface without a business requirement. A microservice or
new queue adds operational cost for a bounded DB-only job. The scoped function
adapter preserves the UoW boundary and narrower authority; it is not evidence
that pg wins AWS performance/cost.

[Closure](../assessment-retention-2026-10-09.md) and
[raw evidence](../evidence/assessment-retention-2026-10-09/README.md) record local
correctness, race/rollback, compiled stop/drain and plan/timing limits.
