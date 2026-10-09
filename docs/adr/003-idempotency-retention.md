# ADR-003: Bounded durable receipts with time-bearing keys

Status: accepted public-contract specialization, 2026-10-06. Implements architecture §78/R-64's required retention/retry policy; changes no layering or durability guarantees.

## Decision

Critical authenticated mutations use `Idempotency-Key` as UUIDv7 (lowercase canonical form). The UUID's first 48 bits encode Unix milliseconds under [RFC 9562 §5.7](https://www.rfc-editor.org/rfc/rfc9562.html#section-5.7). They limit key freshness only; exam deadlines always use server/DB time.

Receipt unique scope is `(actorId, key)` across operations. Fingerprint is SHA-256 of method, canonical path/resource IDs and canonical validated payload: sorted object keys and set-valued IDs; timestamps normalized to UTC; arrays whose ordering is business-relevant retain order. Unknown fields are rejected; actor is authenticated, not body input. Persist fingerprint, operation/effect reference, original HTTP outcome and compact nonsecret response in the same UoW as effect. Do not persist tokens/passwords/keys/answer contents in receipts.

After current auth/ownership checks, look up receipt before deadline/version evaluation. Existing same fingerprint returns original acknowledgement; different fingerprint returns 409 `Idempotency key conflict`. Unique constraint/locking handles simultaneous creation; rollback has no receipt. Preserve original success status for retry and set `Idempotency-Replayed: true`; GET is how clients learn current state.

On absent receipt, decode key timestamp using authoritative DB time. First use must be within the prior 24h, with at most 5min future skew. Older key returns 409 `Idempotency key expired`; malformed/future key returns 400 `Invalid request`. Retain receipts at least 7 × 24h after acceptedAt, prune bounded batches afterward. A previously accepted key is then necessarily older than the first-use window and cannot execute as a new write after pruning. No permanent tombstone table is needed. Failed/noncommitted requests do not consume a key; retry beyond first-use window requires reconciliation, not blind replacement.

All 409/422 outcomes require refetch/reconcile before creating a new key. After expired receipt, GET attempt/status/answers or admin resource/import report to inspect effect. Concurrent save still checks expectedVersion; start still checks active/limit; submit still has stable submission identity even with a new key. Public login/register/refresh use separate session/security semantics, not credential-bearing generic receipts. Logout is naturally idempotent with revoked/absent cookie.

## Rationale and trade-off

Permanent receipts for periodic saves grow with every batch and add storage/vacuum/backup cost. Pruning opaque keys without a bound can accidentally replay old mutations. Time-bearing keys plus seven-day responses preserve an explicit retry window while bounding storage. A UUIDv7 generator in browser/test clients is required; untrusted timestamps never authorize late answers. Monitor rejected clock-skew keys and receipt growth. Benchmark/prune/pool/transaction/crash tests remain required before deployment; seven days is a product retention decision, not proven optimal cost.

Alternative: keep opaque UUIDv4 receipts/tombstones for the full data lifetime; simpler client generation but larger retained state. Revisit via ADR if measured storage or client compatibility warrants changing the versioned header contract. Existing clients must not silently change key format.

## Scoped implementation —2026-10-09

[ATT-09](../assessment-retention-2026-10-09.md)/
[ADR-011](011-assessment-retention-compaction.md) implement bounded Assessment
start/save/submit receipt pruning after minimum7days, for completed attempts with
settled delivery/failure gates. Active/pending/FAILED/replay work and other
capabilities' receipts remain protected. A real restricted-PG test invokes submit
with an actually pruned old UUIDv7 key and observes expiration without another
effect. This does not close every capability's pruning, full HTTP lost-ACK matrix
or production storage/pool/backup cost. After payload retention, GET can itself
return404; compact quota/submission identity still prevents another effect.
