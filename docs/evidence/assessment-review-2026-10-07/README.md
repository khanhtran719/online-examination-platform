# Independent Assessment API review evidence

Review started2026-10-07; final restricted-PG/HTTP probes and HTTPS ran2026-10-08. [Report](../../assessment-review-2026-10-07.md) is the acceptance outcome. Runtime fixes were not applied.

- [baseline](baseline.json): API source/10 migrations, current Grok tests, contracts/config/lock and frozen Grok/Catalog-fix evidence captured before testing.
- [probes](probes.json)/[final log](review-final.log):6 expected RED +3 PASS.5 findings; first-publication and republish races are separate cases. Controls cover concurrent saves, duplicate submit and4 observed save/submit races.
- [review fixture](review.spec.ts)/[config](review.jest.cjs): uses existing restricted-PG setup but new assertions, actual HTTP and actual Catalog publication UoW. Second instance binds Identity to its own database transaction context. No mocked persistence/lock semantics.
- [initial probes](initial-probes.json)/[initial log](initial-review.log): prior run preserved. One extra RED was a review expected-text mistake; the final fixture fixes it. Other defects reproduced unchanged.
- [checks](checks.json)/[manifest](manifest.json): final checks, preservation and cleanup; [Identity HTTPS summary](identity-https-summary.json) retains safe names/status/durations only.

```sh
docker compose -f infra/identity-https/compose.yaml up -d --wait postgres
TEST_DATABASE_ADMIN_URL=postgres://examination_https:local-https-only-password@127.0.0.1:55435/examination_https npm run test:api -- --config docs/evidence/assessment-review-2026-10-07/review.jest.cjs
docker compose -f infra/identity-https/compose.yaml stop postgres
```

Use only the dedicated local test administrator. Fixture creates/drops its own database and login roles, applies all10 migrations and runs business work under restricted runtime. Review test command intentionally exits1 while assertions are RED. It writes current probes; copy them before a follow-up run if preserving this frozen evidence. Do not rerun in this folder during fixes; migrate regression cases into supported suites or copy the harness into new closure evidence.

Existing integration was run with `--testNamePattern='^(?!.*diagnostic)'`:90 PASS and3 deliberately deselected diagnostic writers, preserving original summary/raw files. Full diagnostic execution is not claimed. Query counts13/18/13 were observed independently through actual cookie/CSRF HTTP writes, not guessed from source. Local latency/capacity/SLO/AWS costs were not accepted. Artifacts contain no private keys, cookies/JWTs, email links, answer contents or production credentials; synthetic fixture inputs remain in test source only.
