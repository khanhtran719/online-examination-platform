# Assessment grading consumer — local delivery

2026-10-09. ASYNC-05–07 CLOSED locally; roadmap76/216. Production remains NOT ACCEPTED.
[Evidence](evidence/grading-consumer-2026-10-09/README.md),
[runbook](runbooks/grading-worker.md), [roadmap](implementation-roadmap.md).

## Implemented and reviewed behavior

Assessment retains result/statistic/ranking ownership. Its plain Application
orchestrates Domain exact-match scoring through UoW/repository ports and Catalog's
public scoring facade. Catalog public worker composition exposes frozen questions,
all option IDs and keys without composing HTTP/Identity services. No business layer
imports pg, NestJS, SDK, HTTP, config or workers. The architecture guard allows this
specific Catalog composition entry and still rejects private/cross-module bypasses.

One attempt lock serializes grading/duplicates. A fresh result check after waiting
for a completed attempt avoids a stale locking-statement snapshot. Successful inbox,
one unique result, sections/questions, all question/option contributions and best
attempt entry commit with COMPLETED; PROCESSING never survives commit. Statistics
lock in stable UUID order. Ranking compares earned DESC, submitted time ASC, attempt
UUID ASC; completion order cannot change the winner. Every completed attempt
contributes statistics, irrespective of leaderboard opt-in/visibility; future
public reads must enforce live Identity/publication privacy rules.

Strict envelope validation and authoritative submission matching reject forged
identity/provenance. Different event IDs are admitted only as matching completed
duplicates. Schema/identity poison enters digest-only durable quarantine without
mutating a legitimate attempt. A transaction/result/projection/inbox/COMMIT failure
rolls back all effects. Broker ACK loss redelivers into the durable result check.
Public inbound admission also requires an independent committed transaction boundary.

Independent review reproduced two durability failures before the final guard:
malformed-message quarantine joined an outer UoW, and delivery ACK occurred before
that outer UoW rolled back. The public factory now asserts outside a transaction
before parsing or invoking Application. The three restricted-PG boundary cases
(two RED assertions and one control) pass; worker entry remains the root owner.
This specializes the existing UoW/ACK contract without adding another abstraction.

The dedicated grading group has no Identity/bank/answer/submission-identity writes,
no successful inbox DELETE or result UPDATE.0015 adds only poison digest storage and
specific existing-table/column/sequence grants; no AWS service, ORM dependency or
cache is introduced. Existing14 applied migrations remain immutable. Shared regional
queue URL validation is extracted from the dispatcher with its original validation
behavior retained. SQL layout preserves tokens/bindings and query ordering.

SQS SDK contract tests cover Receive/GetAttributes/Delete/ChangeVisibility, timeout,
one attempt, checksum rejection and safe error/configuration handling. Separate
worker provides bounded admission/pool use, visibility heartbeat, health/probes,
sampled correlation events, fixed metrics, drain and compiled SIGTERM exit. A real
PG + local SDK HTTP broker test verifies the first DeleteMessage occurs after commit,
then simulates failed delete/redelivery without a second effect. This is not live SQS.

## Measurement and decision

The final pure compute diagnostic uses Node24/Apple M1 Pro/ARM64,300 warmups and
2,000 samples per100/500-question scenario with10 correct/selected options and
integer points.100 questions: p50/p95/p99≈0.239/0.297/0.349ms;500 questions:
≈1.263/1.448/1.694ms. CPU≈251/1,298µs per grade. Heap delta includes GC/samples;
it is not allocated bytes per job. Source hash/host/raw results are captured.

Two captured runs of ten sequential3-question local PG jobs took≈91.7/112.2ms,
with observed≈109/89jobs/s over those short runs. This does not establish
sustainable throughput or an improvement. The500-question/5,000-selection
observations took≈151.9/217.1ms (transactions≈151.5/216.7ms, attempt lock≈1.05/1.19ms).
Both workloads used15 SQL statements including BEGIN/COMMIT; no DB query grows per
question. These are noisy laptop diagnostics; the full transaction is materially
longer than pure compute. Retain transaction-local grading provisionally: leased external compute
would add claims/fencing/recovery without a demonstrated compute benefit here.
ASYNC-08 remains open until representative contention/queue/saturation measurements.
No p99 transaction, optimal pool, jobs/task/USD, AWS savings or SLO claim is made.

## Validation and limits

Final root316 PASS:179 API cases/27 suites,41 tooling and96 Web. Full integration
200 PASS/14 suites,0 skipped, including the three independent boundary regressions.
Lint/quality/contracts46 operations/425 examples, strict typecheck and build PASS.
After those checks one comment's indentation was corrected; Prettier and build
were rerun, with no executable behavior change. No dependency or lockfile changed;
the prior runtime vulnerability audit is historical and was not rerun here.

All14 applied migration bytes and203 historical evidence files match the captured
baseline. All15 source/built migrations match. SQL token preservation covers55
adapter/fixture statements; parameter code is unchanged. Fixture cleanup confirms
zero temporary databases/logins/connections. Only the owned PG55435 and root Mailpit
services were stopped; volumes and the development DB55432 were preserved.
Unrelated concurrent Web documentation edits were retained. No stage/commit/deploy.

Full distributed tracing, terminal FAILED/DLQ replay, automatic retention,
result/history/review HTTP, Reporting/privacy reads, AWS IAM/VPC/encryption
effectiveness, image compatibility and production acceptance remain open. Live
AWS/HTTPS/image tests were not run for this increment. ASYNC-08/09/11 remain
unchecked with named local subsets; ASYNC-10/12 remain open. Next increment:
durable terminal failure + operator-authorized audited replay, followed by public
result/history/review and scoped read projections.
