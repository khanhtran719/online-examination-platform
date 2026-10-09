# Candidate result/history/review operations

Local implementation accepted2026-10-09 under ATT-08. Production acceptance is
still open. See [ADR-010](../adr/010-candidate-frozen-read-projections.md),
[OpenAPI](../contracts/openapi.yaml) and [closure](../assessment-results-2026-10-09.md).

## Routes and client behavior

| Route | Permission | Successful response |
| --- | --- | --- |
| GET /v1/attempts/:attemptId/status | assessment.take | 200 AttemptView |
| GET /v1/attempts/:attemptId/result | assessment.result.read | 200 ResultView when COMPLETED;202 AttemptView otherwise |
| GET /v1/attempts/:attemptId/review | assessment.result.read | 200 cursor page only after frozen policy releases |
| GET /v1/me/attempts | assessment.take | 200 personal history cursor page |

All requests use current session/permission checks and existing read admission.
All responses have no-store. Foreign/nonexistent attempt IDs return404; missing
permission or unreleased review returns403. An Admin role does not bypass owner
checks. Revoked sessions return401. Safe error envelopes never expose SQL, tokens,
failure codes, candidate identity, unreleased keys or explanations.

Result202 retains Retry-After:2 from the public contract. The body governs whether
polling continues: SUBMITTED/EXPIRED/PROCESSING have pollAfterSeconds:2; terminal
FAILED without replay has0; FAILED with replayPending:true has2. A client stops
automatic polling at0 even though the202 header remains2. Missing COMPLETED
result data is an internal consistency failure, not a zero score or pending job.
Do not retry that failure indefinitely or repair results through the read API.

The result summary has integer points, percentage basis points, frozen version,
submission identity and ordered section totals/correct counts. The review link
is null until allowed. Review admission is rechecked when following the link; a
prior link/cursor does not retain permission after revocation. NEVER denies;
AFTER_COMPLETION requires completed data; AFTER_EXAM_CLOSE uses the original
version's close and DB time. Republish/unpublish does not change an owned attempt.

## Pagination and bounds

Use pageSize20 by default,1–100 maximum and follow metadata.next until null.
Do not assume returned length equals requested size: review clips the complete
encoded response to256KiB. Empty final pages are valid. Keep the original actor,
attempt and pageSize throughout traversal. Cursors expire after15 minutes and
are bound to kind/filter/version or history watermark. A malformed, tampered,
expired or incorrectly scoped cursor returns400; restart traversal explicitly.

History sorts startedAt descending, then attemptId descending. The first page
establishes a DB-time watermark; later starts appear on a refreshed traversal.
Status/result fields can advance as grading completes. It is not a long-running
snapshot transaction. Pending/FAILED entries have null earned/possible. The
normal start write path stores millisecond timestamps; imports or migrations
must preserve that precision contract or update the private cursor representation.

## Diagnosis

- Check the correlation ID and bounded metrics without logging request bodies,
  answers, answer keys, raw cursors or credentials.
- For202, use durable status/replayPending. Inspect publisher/grader queue age
  separately; a fast read does not establish fast scoring.
- For unexpected403, verify current permission and frozen policy/close. Do not
  change the current draft to try to release an older attempt.
- For repeated500 on COMPLETED, inspect result consistency with an authorized
  operator. Do not fabricate or delete successful result/inbox identities.
- For query latency, inspect pool wait and exact plans before resizing RDS.
  The expected successful read budget is3 statements including auth/admission.
- Observe review serialization/in-flight memory as well as query latency. SQL
  may construct up to101 rows before response clipping; this bound still needs
  maximum-payload concurrent profiling.

## Deployment and rollback

This increment adds application code only: no migration, runtime grant, resource,
dependency or event format change. Deploy after the existing grading/recovery
migrations and grants with the ordinary readiness/drain/rolling procedure.
Verify an owned pending202, completed summary, denied/released review, history,
unauthenticated401 and foreign404 in the deployment environment.

Roll back the API image if these reads fail. Preserve completed results, frozen
versions and all recovery-generation behavior in publisher/consumer images; see
the [grading recovery runbook](grading-recovery.md). Never reverse applied SQL
migrations or alter frozen close/policy as a rollout repair. Live image rollout,
HTTPS/browser integration, AWS SLO/capacity/cost and timed recovery were not tested
by this local increment.
