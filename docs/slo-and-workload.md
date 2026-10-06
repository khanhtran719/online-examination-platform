# SLO and reproducible workload v1

Status: targets specified 2026-10-06 for SPEC-11, **not achieved or production-accepted**. Region/task/RDS/network/pricing configuration stays unselected. [Performance protocol](performance.md) owns formulas and [acceptance ledger](production-acceptance.md) owns production evidence. A test harness/file is not a measured result.

## 1. SLI, targets and populations

Monthly eligible-request availability ≥99.9% across authenticated product operations and public auth/browse service: successful expected response/durable outcome divided by eligible requests. Include unexpected 5xx, legitimate load rejected by WAF/admission/rate limits, client timeout, dependency failure and acknowledged-but-lost write. Expected invalid input/foreign ownership/stale-version conflicts and explicitly injected invalid-credential attacks are excluded by scenario label, never by blindly excluding all 4xx. Count both offered and achieved load/dropped iterations; a saturated generator invalidates capacity measurement. Synthetic liveness is an additional diagnostic, not a substitute for user availability.

Monthly request error budget = eligible requests ×0.001; track burn at 1h/6h/24h. A time-based dashboard may also report downtime (43.2min for a 30day 99.9% window), but do not mix its denominator with request budget. Unexpected error rate <1% is a separate ceiling in every steady/burst acceptance interval; achieving it alone does not satisfy monthly 99.9%. Correctness/security have zero accepted violations, regardless of error budget.

| Critical route | p95 target | p99 target | Additional gate |
| --- | --- | --- | --- |
| GET exam | <250ms | <500ms | Published metadata, no keys |
| GET questions page | <350ms | <700ms | ≤100 items and ≤256KiB decoded JSON per page |
| PUT answers batch | <300ms | <600ms | Durable all-or-nothing save, no lost acknowledgement |
| POST submit ACK | <500ms | <1000ms | DB commit included; scoring excluded from request |
| GET attempt/status | <250ms | <500ms | Durable state/server deadline |
| GET result (ready/pending) | <250ms | <500ms | Release/ownership, no pending score fabrication |
| GET leaderboard | <300ms | <600ms | Version/opt-in bound, unique keyset order |
| GET browse/history | <300ms | <600ms | Page 20 default/100 max, no hidden total count |

Auth targets added with ADR-005 for Phase04 measurement, also unverified:

| Auth operation | p95 target | p99 target | Population / extra gate |
| --- | --- | --- | --- |
| Register / confirm verification | <1000ms | <2000ms | Valid eligible requests, hash + durable DB intent/activation; SMTP/SES outside HTTP request |
| Email/password login | <1000ms | <2000ms | Real verified identities + Argon2/session commit; report failure/attack timing separately |
| Refresh / logout | <300ms | <800ms | Signature/CSRF/authoritative session lock/commit included |
| GET me | <250ms | <500ms | Signature + current enabled/verified/session/permissions projection |
| Verification email dispatch | 99% provider-accepted within60s | not an HTTP percentile | Since eligible intent commit, including lease/retries/backlog; acceptance is not inbox delivery, expired/parked eligible jobs count as misses |

These are provisional adopted latency objectives to evaluate hashing/admission/task capacity; none implies a measured hash setting or AWS winning configuration. Track mail requests, suppressed coalesced requests, provider attempts/acceptance, permanent failures, oldest live intent and expirations without email/user IDs in metric labels. Record sender quotas/bounce/complaint and actual SES cost separately; never count an API202 as provider delivery. Revisit objectives with evidence before production commitment while preserving security floors.

Measure p50/p95/p99/sample count per route/state and successful/failed populations separately. Targets apply to viewer/client end-to-end HTTPS request durations, including auth, serialization, network/pool/locks; separately instrument internal spans. Location, payload and connection reuse must be recorded. All p99/remaining-route thresholds above are **adopted target choices**, not observed latency or a promise without verification.

Capacity gate: 2,000 simultaneously active unique authenticated candidates through start → load → saves → synchronized submit → polling → leaderboard. Also run 2,400 candidates (+20%) as a headroom experiment and report first gate failure/saturation; it is not an invented extra minimum capacity or assumed spare CPU. Select operating headroom/scaling alarms from measured variation/saturation/reaction time, never arbitrary permanent overprovisioning. Find sustainable ceiling separately by stress/soak; do not call 2,000 maximum capacity. Scheduled/reactive scaling configurations are assessed separately with max-task DB budgets.

Scoring gate: ≥99% accepted submissions have durable results within 60s of submit commit (includes outbox + queue + retries). Pending work counted in denominator until complete/failure; do not omit DLQ jobs. Queue drain 99%≤60s after mass-submit. Expiry sweep dispatch lag target p99≤10s after deadline at committed load; no save grace during lag. Recovery target: ordinary task interruption/AZ failover restoration ≤120s with no acknowledged data loss, measured separately; disaster RPO≤5min/RTO≤30min via PITR/restore. None verified yet. Failure runs retain traffic/error impact; controlled drills do not rewrite normal-run availability results.

## 2. Dataset and protocol

Seed: 100,000 distinct users; 1,000 exams; ≥500,000 bank questions; ≥1,000,000 historical attempts and ≥5,000,000 answers with valid version/ownership/choices/time distributions. Dataset version/seed/counts and hot-exam skew are recorded. Historical data is not counted as timed completions. Precreate **verified** identities/credentials/sessions for hot API benchmarks; separately run real registration/verification/login/refresh/full lifecycle including CSRF and asymmetric JWT validation. Local mail capture is labelled local, not AWS delivery evidence; no load test sends unsolicited live mail. No bypassed auth or shared candidate identity.

Baseline hot publication: 100 questions, 2 sections ×50, types 60% single /30% multiple /10% true-false, 4 options except true-false=2, points=1, 600-character prompt/60-character option/300-character explanation (keys/explanations absent candidate questions). Metadata ≤8KiB, average question-page decoded payload target ≤160KiB; actual byte counts must be measured. Separate maximum-size fixture: 500 questions, type/text/option limits from product spec, page byte cap ≤256KiB, producing additional pages rather than unbounded response. UTF-8 decoded bytes, compressed bytes and TLS transfer are reported separately.

Create 2,000 candidate identities with one start each and owned answers. Default hot-exam share=100% for synchronized exam; secondary run 80% hot +20% spread across 20 exams. Warmup 5min then full timed lifecycle; record date/UTC schedule and generator location/region/CPU/network. Read/write/poll ratios derive from scenario, not arbitrary fixed RPS alone.

## 3. Exam-night scenario

| Relative wall time | Workload |
| --- | --- |
| −10min | 100 users browse/detail/login |
| −5min | 500 users prepared/authenticated, browse/detail |
| 0..10s | Remaining arrivals reach 2,000; all 2,000 start within 10s, then fetch pageSize=100 question pages and initial answers |
| 10s..45min | Each active user sends one changed-answer batch every 10s ±20% independent seeded jitter; batch=2 questions (90%) or 5 (10%); mark changes in 10% batches; expected version advances only on confirmed writes |
| During exam | 5% candidates open second tab; stale same-version mutation once/minute for those tabs, expected 409 classified separately; add one genuine refresh cycle per 5min session TTL using coordinated refresh |
| 44min50s..45min | 90% manual submit spread across 10s; 10% expiry/client auto-submit at deadline; flush pending acknowledged saves before manual submit |
| Submit..+5min | Poll each pending attempt initially every 2s then back off 4/8/10s with jitter; stop COMPLETED or FAILED with no replayPending. Ready result fetched once; repeat result reads separately for route benchmark |
| +5min..+10min | 2,000 leaderboard first-page requests over 10s; 20% next-page navigation; then history reads |

Deliberate retry fixture: 1% writes repeat identical key/body after simulated timeout; do not introduce real invalid writes into capacity-only runs. Separate failure run forces timeout after actual DB commit; confirms persistence via GET/result and retries. Set leaderboard enabled and eligible opt-in explicitly in seed; never bypass privacy in production.

Offered-load estimates for harness planning only: steady autosave `2000/10 ≈200 batches/s`; mean 2.3 changed questions/batch gives ≈460 answer mutations/s. Mass-start/submit offer ≈200 requests/s over their 10s windows, plus page/auth/status traffic; unbacked immediate polling can offer ≈1000 requests/s at 2s interval. These are arithmetic inputs, **not achieved RPS** or worker capacity. Real workloads with sparse/no changed answers can be cheaper, but synthetic steady-write run remains an explicit adverse scenario.

Scenarios: smoke 10 candidates/5min; baseline 100/full lifecycle; normal 500/full lifecycle; ramp 100→500→1000→2000 (5min stages); spike 100→2000/10s; stress increase offered load 25% per 5min until first gate failure; soak last feasible configuration ≥6h and repeated exam/refresh cycles; mass-start/autosave/mass-submit/result-polling isolated route scenarios alongside full lifecycle. Record stop conditions for data/correctness/DB errors; never run destructive stress on live candidates.

## 4. Query/round-trip budgets

Budgets include one authoritative session/permission read and one PostgreSQL distributed rate-limit operation (two security round trips initially); middleware must not repeat them. Technical timeout/pool telemetry may not add a query per business operation. Counts below are ceilings/hypotheses for adapters, **not measured optimization results**; revise with explicit evidence when correctness/lock requirement warrants it. Combining auth/limiter SQL may lower counts only after implementation/measurement. SQL belongs in infrastructure; budget is not a reason to weaken authorization or transactions.

| Operation | Business SQL statements (fresh path) | Transaction control | Initial DB round-trip ceiling |
| --- | --- | --- | --- |
| GET exam / browse | ≤1 projection +2 security | none | 3 |
| Questions / answers page | ≤2 owner/version+projection +2 security | none | 4 |
| Status / completed result | ≤1 owned projection +2 security | none | 3 |
| Leaderboard | ≤2 policy+ranking/opt-in +2 security | none | 4 |
| History | ≤1 projection +2 security | none | 3 |
| Start | ≤8 for serialization/policy/limit/receipt/create/start response +2 security | BEGIN/COMMIT | 12 |
| Save batch | ≤7 for lock/DB time/receipt/membership/version/set write/receipt +2 security | BEGIN/COMMIT | 11 |
| Submit | ≤6 lock/time/receipt/state+outbox+receipt +2 security | BEGIN/COMMIT | 10 |
| Duplicate save/submit | ≤3 lock/time or receipt +2 security | BEGIN/COMMIT | 7 |

Queries with locking/time must observe DB time **after lock acquisition**, so do not collapse lock and timestamp evaluation into SQL that computes time before a blocking row lock. Set-based answers/options avoid O(batch) query count. DB integration traces assert actual queries/round trips (including errors/duplicate paths), N+1 absence, lock duration and acquired-client reuse. Measure connection wait and transaction duration independently; optimize before growing RDS. No arbitrary pool size chosen in this phase.

## 5. Acceptance and cost evidence

Every run records config/image/schema/dataset/source revision (or content digest before Git), generator/region/AZ topology, intervals, achieved/offered traffic, errors, per-route p50/p95/p99, CPU/request/allocation/RSS, query/pool/locks/WAL/IOPS, queue/outbox/job metrics and headroom. Capture actual latency while profiling separately; do not use success-only samples to hide saturation.

Cost scope includes idle baseline/HA/security/telemetry/network/backups and burst compute. Follow performance.md for RPS/USD/h, concurrent capacity/USD/h, jobs/USD, cost/1,000 users and concurrent-user-hours, cost/10,000 attempts and cost/1M successful requests. Curve requires real comparable feasible/infeasible measurements, marginal +USD and −20% budget reruns. Targets/data/harness specification can complete SPEC-11; load/restore/cost execution tasks remain unchecked until raw evidence exists.
