# Independent Catalog review evidence — 2026-10-07

Outcome: **5 RED / 1 PASS**, representing four reproduced runtime defects and one successful pagination control. Product code is unchanged by the review. [Review report](../../catalog-review-2026-10-07.md), [expected/actual JSON](probes.json), [check inventory](checks.json), [source/migration provenance](manifest.json), [safe HTTPS summary](identity-https-summary.json).

## Scope and environment

- Node v24.17.0, macOS ARM64; actual PostgreSQL 17 from the local HTTPS compose service on loopback port55435.
- Every run creates a random disposable database and DDL/runtime/operator logins; runtime inherits the restricted application grants. All nine source migrations are applied. Teardown drops the database/logins.
- Real Identity registration/activation, JWT verification and current PostgreSQL permissions; HTTP probes use real Catalog/Identity controllers, Fastify setup, CSRF and session cookies held only in memory. No runtime test endpoints or fake auth bypass.
- Pool max10, statement timeout2000ms, lock timeout500ms (databaseConfig defaults). R01 closes250ms after draft preparation, observes PostgreSQL lock wait and releases the exam lock after close.
- R01 was first reproduced with a longer diagnostic timeout, then reproduced twice with defaults. The final JSON reflects default settings and the portable fixture below.
- No development database on55432 was used. No AWS load/cost/capacity claim is made. The current run remains RED until runtime fixes are applied.

## Reproduce

From repository root with installed dependencies and Node24:

```sh
docker compose -f infra/identity-https/compose.yaml up -d --wait postgres
```

Set `TEST_DATABASE_ADMIN_URL` to the local disposable-test administrator from that compose file. Do not use a production or shared database administrator. Then run:

```sh
node --experimental-vm-modules node_modules/jest/bin/jest.js \
  --config docs/evidence/catalog-review-2026-10-07/review.jest.cjs \
  --runInBand
```

Expected current exit code: **1**. [review.spec.ts](review.spec.ts) records only safe expected/actual outcomes in `probes.json`; it does not store passwords, keys, cookies, JWTs, prompts or answer keys. Running again intentionally updates this review output; preserve this initial review manifest when comparing a fix and capture a separate acceptance run. The custom config does not add these RED cases to the default baseline discovery.

| Probe | Expected | Observed |
| --- | --- | --- |
| R01 post-lock publish close | closed error, no version | no error,1 late version |
| R02 valid bounded large question | HTTP201 | HTTP400;36,377 bytes |
| R03 valid500-question draft | HTTP201 | HTTP400;42,231 bytes |
| R04 detail strict schema fields | no extra fields | extra`publishedAt` |
| R05 impossible calendar date | HTTP400 | HTTP201;February30 becomesMarch2 |
| C01 bank pagination control | all current bank IDs |503/503 IDs, PASS |

The same fixture covers both body limit failures; count them as one root-cause group. R01 verifies an exam-lock wait; a future fix also needs a bank-question-lock boundary regression.

## Other checks performed

The existing integration suite was selected with the following filter specifically to preserve Grok's dated evidence file:

```sh
npm run test:integration -- \
  --testNamePattern='^(?!.*records a browse and publication diagnostic)'
```

This produced **63 PASS,1 deselected**, not64 fresh accepted cases. Identity SMTP uses the separate root Mailpit compose service. `npm test` remains FAIL from pre-existing Jest/Vitest discovery despite71 API cases passing. Node tooling was run separately (34 PASS), and the proper Web runner passed73 cases. Actual Chromium HTTPS passed10 cases after building AppModule with Catalog. Lint/typecheck/API build passed. See [checks.json](checks.json) for exact commands and limits.

The copied HTTPS summary lists safe case names/status/durations. Its environment is recorded as a fresh9-migration run because the real fixture loads all built assets; the runner's hard-coded “eight migrations” description is stale and identified in GR-06. [manifest.json](manifest.json) independently verifies all9 built/source hashes and original0001–0008 equality withHEAD.

Grok's [original diagnostic](../catalog-2026-10-07/README.md) was left intact. Its simplified EXPLAIN, absence of publish samples and README/raw latency mismatch remain review findings; no new benchmark result was substituted.

## Cleanup

Only review-started PostgreSQL/SMTP containers were used, with loopback bindings. Temporary databases/logins were dropped; review-started services were stopped and volumes preserved. No staging/commit, runtime Catalog fix, UI change or historical migration/evidence rewrite was made in this review.
