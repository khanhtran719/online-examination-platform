# ADR-010: Candidate frozen result and review projections

Status: accepted for local ATT-08 delivery,2026-10-09. This specializes the
existing CQRS-lite read path, scalar module IDs and frozen examination contract.
It does not change architecture rules, runtime persistence library or AWS services.

## Context

Assessment owns attempts, committed answers and grading results. A Candidate
needs a small score summary, personal history and a separately authorized review.
The content and release policy belong to the immutable Catalog version selected
at start. Looking up the current draft/public listing would change an existing
attempt after republish or unpublish. Hydrating an aggregate or composing a
per-question service call would add work unrelated to these read-only responses.

## Decision

Assessment owns CandidateResultsService, its DTOs and CandidateResultsQuery port.
Presentation authenticates the current Identity session, requires the action
permission and applies admission limits. Application depends only on ports and
the pure Domain canReleaseReview rule. Module composition supplies the private
PostgresCandidateResultsQuery adapter, existing cursor and HTTP encoding adapters.

The query port explicitly declares these read dependencies:

- Assessment attempts/results/result_sections/result_questions/answer_selections.
- Catalog published_versions/published_sections/published_questions/published_options.
- Catalog published_answer_keys only for the separately released review projection.

Catalog remains the owner of these immutable snapshots. No Catalog repository,
private application service, ORM entity or write authority crosses the boundary.
The existing restricted API grants are sufficient; no grant or migration is
added. This narrow frozen projection dependency follows the adopted Assessment
read path. It does not grant business modules arbitrary access to mutable foreign
tables. Future Catalog schema changes must review these declared consumers and
keep old attempt versions readable through expand/contract migration ordering.

Each projection uses one parameterized SQL statement with current ownership and
statement_timestamp. Review SQL materializes the ownership/release gate before
question/key construction. Application also checks the pure Domain rule against
the returned completion, frozen policy/close and authoritative time. The SQL
predicate is an enforcement optimization of the same rule, not a second policy
owner. NEVER always denies; AFTER_COMPLETION requires a durable completed result;
AFTER_EXAM_CLOSE additionally requires server time at or after frozen close.

Result/history cannot contain answer keys or explanations. Only COMPLETED has
scores; a completed row without a durable result fails closed. FAILED remains
score-free and only resumes polling after an operator-authorized pending replay.
Result acknowledgement uses the existing202/Retry-After contract until ready.

History uses the existing attempts_history index and descending(started_at,id)
keyset with a first-page time watermark. Normal starts persist millisecond UTC
timestamps; the cursor preserves their precision. The watermark excludes later
starts, while statuses/results may advance between pages. This is a stable list
boundary, not a database snapshot transaction. Review uses frozen
(section position,question position,question ID) order. Existing HMAC cursors bind
actor,kind,pageSize,filter and version/watermark for15 minutes; expiry uses DB time.

Review has20 default/100 maximum requested items and a256KiB cap on the complete
encoded HTTP response. The existing size port is generic over PageResult so
Application can keep a fitting prefix and sign continuation after its last row.
No OFFSET, aggregate hydration, total COUNT, read lock, read transaction, Redis,
new event or external service is required.

## Alternatives and consequences

| Option | Decision basis |
| --- | --- |
| Build rich aggregates for each read | No read invariant needs mutation or full hydration |
| Per-question Catalog calls | Extra round trips and difficult bounded release/ownership consistency |
| Copy all frozen content into Assessment | Duplicates existing durable immutable snapshots without evidence |
| Move Candidate reads into Reporting | Assessment owns these attempt-specific contracts and release behavior |
| Add Redis/result cache | No measured benefit; revocation/release correctness would need extra controls |

Observed local reads cost3 SQL calls including Identity authentication and rate
admission. Correlated option/key aggregations are bounded inside one SQL statement;
this removes application N+1 round trips, not all per-question database work.
The adapter can construct up to101 rows before the256KiB response prefix is chosen.
Worst-case in-flight memory, serialization overhead and concurrent capacity need
profiling/load tests; the HTTP cap is not a database allocation cap.

## Evidence and remaining gates

[Closure](../assessment-results-2026-10-09.md) and
[raw evidence](../evidence/assessment-results-2026-10-09/README.md) record current
permission/owner checks, frozen release policies, escaped-byte/cursor traversal,
terminal/replay status, section scores, natural100k history plans and a denied
review plan with answer-key nodes never executed. Full local regression checks
pass. The [runbook](../runbooks/candidate-results.md) records polling and rollout.

Short sequential local diagnostics do not establish sustainable RPS, DB
saturation, allocation/request, production SLO, AWS price/performance or savings.
Leaderboard/privacy, retention, Admin replay HTTP, broader failure/load matrix,
AWS deployment and production acceptance remain separate gates.
