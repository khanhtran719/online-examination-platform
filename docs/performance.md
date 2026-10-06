# Performance and cost protocol

This protocol is normative through architecture §§80–85 and rules R-63–R-75. No benchmark has run yet. Proposed SLOs are in the [profile](project-profile.md); the [acceptance ledger](production-acceptance.md) records missing evidence.

## Feasibility before cost

A configuration is eligible only if correctness, security, durability, availability/recovery controls, all committed SLOs and capacity pass. Keep failed configurations in the report with failure reasons; do not select them because they are cheaper. Targets are not measured values. Pick the lowest **total cost** eligible configuration; no universal winner is assumed for ARM64, Fargate, EC2, Redis, managed services or self-hosting.

## Workload specification

Capture exam size/sections/question types/options/payload, candidates/exam distribution, arrival pattern, exam duration, autosave interval/jitter/batch size, tab concurrency, retry probability, submit distribution, poll/backoff schedule and leaderboard/history requests. The initial scenario has 100→500→2,000 candidates, a 45-minute exam, synchronized submissions, five minutes of result polling and ranking burst. Interval/payload values still need product specification; do not invent a capacity result from undefined traffic.

Use unique identities and real attempts. Seed users/sessions before timed hot-path measurement unless registration/login itself is being tested. Include a separate end-to-end lifecycle run. Use smoke/baseline/normal/ramp/spike/stress/soak/mass-start/autosave/mass-submit/result-polling scenarios. Record offered and achieved load, dropped iterations, client timeouts/retries and load-generator CPU/network. Closed-loop VUs alone can conceal overload; use arrival-rate scenarios where appropriate and account for coordinated omission.

## Measurement populations

For each critical endpoint record p50/p95/p99, sample count, achieved successful RPS, unexpected error rate, payload bytes, CPU/request, allocation/GC/RSS, DB query count/round trips/pool wait, query/lock/transaction duration. Publish per-route values and whole-lifecycle values separately; result polling may be cheap per request but costly in aggregate. Include full unsuccessful/timed-out request latency separately so success-only percentiles cannot hide degradation.

Availability denominator is agreed eligible requests/time windows; expected validation/ownership/business conflicts are classified separately. Unexpected 5xx, dependency failure, timeout, rejected legitimate load and invalid durable outcomes count against applicable SLIs. WAF/rate-limit rejections of valid candidates cannot be excluded to make a capacity test pass. Scoring SLI measures accepted submission commit to durable result completion, including outbox delay, queue delay and retries.

CPU/request = measured process/container CPU seconds during steady interval divided by served requests in that interval, with idle/baseline methodology stated. This aggregate includes background work unless separated by runtime. Memory/request cannot be inferred from RSS/request count: record allocation bytes/request if profiling supports it, plus steady/peak RSS, heap/GC and concurrent in-flight requests. Mark unsupported measurements unmeasured. Never use profiling overhead runs as latency baselines without noting the overhead.

## Sustainable load and saturation

Warm up, run a steady interval and repeat enough to characterize variance. Increase offered load until a hard gate fails or throughput stops increasing while latency/queue/pool wait increases. First bottleneck can be generator, network, API CPU/memory, DB pool/query/locks/IOPS/WAL or worker capacity. Record it with evidence. Confirm the last feasible load with a soak long enough to exercise session rotation, connection/heap stability, backlog drain, vacuum/checkpoints and workload cycles. Headroom is measured distance from the committed load to first gate failure, not an arbitrary unused CPU percentage.

Compare one variable at a time with the same image/schema/dataset/traffic/region/AZ topology and observation settings. Record changed variables explicitly. Run EXPLAIN (ANALYZE, BUFFERS) and schema/query/index/pool tuning before RDS growth. Failure/destructive experiments require an isolated environment, rollback/stop condition and operator context.

## Cost scope and formulas

Let `T` be measured run hours, `C_run` the full attributed cost in USD for the run, `C_h=C_run/T`, `R` sustainable successful requests/second, `U` active concurrent candidates at the workload, `J` jobs/second, `N_req` served successful requests, `N_users` unique served candidates, `N_attempts` durable completed attempts and `N_jobs` durable completed jobs. Also report total HTTP requests, failed attempts and retries so normalization does not hide waste.

| Metric | Formula / unit |
| --- | --- |
| Sustainable RPS per hourly USD | `R / C_h`, expressed as `(requests/s)/(USD/h)`; always state time basis |
| Concurrent capacity per hourly USD | `U / C_h`, expressed as candidates per `(USD/h)` at specified activity |
| Jobs per USD | `N_jobs / C_run`; steady approximation `3600 × J / C_h` only when steady assumptions hold |
| Cost per 1,000 unique users | `1000 × C_run / N_users`, with run duration/activity stated |
| Cost per 1,000 concurrent-user-hours | `1000 × C_h / U`; this is distinct from unique-user cost |
| Cost per 10,000 attempts | `10000 × C_run / N_attempts`, include grading/polling/history allocation scope |
| Cost per 1 million successful requests | `1e6 × C_run / N_req`; steady approximation `1e6 × C_h /(3600 × R)` |
| Marginal sustainable capacity | `(R2−R1)/(C_h2−C_h1)` for tested adjacent feasible configs, not assumed linear |

Avoid zero denominators; keep missing/invalid observations null. A run with no completed attempts cannot produce attempt-unit cost.

Cost includes API/worker compute, RDS standby/storage/IOPS/backups, ALB/LCU, CloudFront/transfer, WAF, SQS/DLQ operations, S3, Secrets Manager/SSM/KMS, endpoint/NAT/cross-AZ/egress, CloudWatch logs/queries/metrics/traces and applicable fixed shared infrastructure. Specify allocation of shared costs, discounts/Spot/Savings Plans, idle hours, region/pricing date/currency/taxes. Monthly estimate must specify 730-hour or actual-calendar-hours assumptions and scheduled scaling. Estimates from rate cards/calculators are separate from tagged usage/billing/Cost Explorer/CUR measurements; billing delay is recorded. Operational TCO includes maintenance, incident/recovery burden and support effort with explicit assumptions.

## Experiments and curve

Use [experiment template](../experiments/template.md). Every run stores config/image digest/commit/schema/dataset seed, traffic and raw k6/telemetry artifacts with provenance. Build a curve only from actual measurements: x=full cost/hour, y=sustainable capacity, plus p95/p99/worker/utilization/headroom and pass/fail gates. No synthetic point is labeled measured. Select minimum-cost feasible configuration at required capacity. Test +$1 marginal gain as a specified budget step where meaningful; test −20% full cost and report SLO/capacity/control impact. Preserve nonlinear/uncertain outcomes.

## Resource ledger requirement

For every proposed service record: purpose; behavior if absent; failure mode; SLO/security/reliability requirement; performance hypothesis or measured gain; utilization/headroom target; monthly fixed/variable cost with region/date/source; alternatives and operations TCO; chosen decision; raw evidence links. Reliability-required minimum utilization can be low, but explain it. Redis and Kafka remain conditional. Route53/custom-domain resources remain conditional; production TLS/certificate requirements stay mandatory even without a domain.
