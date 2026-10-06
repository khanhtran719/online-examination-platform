# Required contract test matrix

These scenarios are **planned**. Current unit tests validate only pure Attempt/scoring behavior; no system integration scenario below has run.

| Capability | Failure/concurrency scenario | Required durable outcome | Evidence environment |
| --- | --- | --- | --- |
| UnitOfWork | joined write fails; caller catches it | rollback-only, neither write committed | PostgreSQL |
| Catalog | edit/publish/start concurrently | attempt binds one immutable complete version | PostgreSQL + API |
| Start | duplicate keys, key reused for another exam, concurrent starts/limit | one durable receipt/active attempt; no limit violation | PostgreSQL + API |
| Save | duplicate/reordered mutation and two tabs using same expected version | original receipt; old retry cannot revert a newer answer | PostgreSQL + API |
| Deadline | lock acquisition waits beyond deadline | no save authorized using earlier timestamp | PostgreSQL + API |
| Submit | submit and autosave concurrent; multiple submit keys | saved-before-submit included or save rejected; one accepted submission/outbox | PostgreSQL + API |
| Restart | commit then HTTP timeout/API crash/retry | same durable result; no memory-only acknowledgement | PostgreSQL + API restart |
| Publisher | broker ACK then crash before delivery mark | duplicate publish safe; recoverable lease; stable identity | PostgreSQL + SQS |
| Publisher | lease expires and stale owner marks delivery | fencing blocks stale completion | PostgreSQL + SQS |
| Inbox | concurrent duplicate deliveries | one business effect and durable duplicate confirmation | PostgreSQL + SQS |
| Grading | result write fails after inbox insert | inbox/result/projections all roll back; redelivery succeeds | PostgreSQL + SQS |
| Consumer | commit succeeds then ACK lost | retry is no-op after confirming durable result | PostgreSQL + SQS |
| Poison/DLQ | malformed/permanent failure; bounded transient retries | durable quarantine/DLQ, visible FAILED/parked and audited replay | SQS + API/admin |
| Projection | result/statistic/leaderboard update fails | no partial completed state; explicit async freshness if separate | PostgreSQL |
| Auth | refresh race/replay, revoke/logout, owner mismatch/admin escalation | agreed rotate/revoke policy; no unauthorized data | API + PostgreSQL |
| Redaction | candidate question/result before explanation release | no keys/explanations/token/SQL leaks | API/browser/log/trace |
| Migration | source schema changes and rollback prior image | report/old-new runtime compatible; checksums enforced | PostgreSQL + CI images |
| Redis, if added | failed post-commit invalidation/stale refill/cache outage | declared freshness bound, correct invariants, bounded DB fallback | PostgreSQL + Redis |
| Scaling/shutdown | task interrupted while serving/receiving | defined drain; uncommitted work recoverable | staging ECS |
| Recovery | failover/PITR/new endpoint | measured RPO/RTO, verified acknowledged outcomes | isolated AWS |
