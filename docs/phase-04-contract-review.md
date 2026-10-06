# Phase04 authentication contract amendment review

2026-10-06. Scope: amended requirements/design/OpenAPI/tooling and the detailed Identity plan, before runtime implementation. Contract amendment self-review/checks **COMPLETE**. Roadmap40/216 delivered after adding ID-10–13; no runtime Identity checkbox is completed by this document. No background implementation is running.

## Changes and rationale

- Email is the login identifier; enabled verified accounts only. Pending register, single-use30min link, explicit POST activation, generic bounded resend. Activation selects the email owner's final password so a pre-registered attacker password cannot persist.
- Access/refresh are signed JWTs ES256/P-256; private signs/public verifies, separate typ/audience/use/jti and trusted kid ring. Current PG session/permissions/revocation remain required, with unchanged five-minute/seven-day/thirty-day validity limits and cookie/CSRF transport.
- Identity owns encrypted durable email intent; worker leases/fences/retries outside DB transactions, with separate email encryption key and no JWT signing private key. SES candidate justified by required email delivery; no account/domain/resources/mail sending added.
- Magic-link/GitHub remain later ID-12/13 with distinct proof/purpose and explicit account linking. Current platform remains one modular monolith with ports/adapters, no new business service or provider registry.

Owners updated: R-36, architecture §47, security/product/API/SLO, profile, roadmap and [ADR-005](adr/005-email-verification-and-signed-tokens.md). [Phase04 plan](phase-04-plan.md) records transactions, lock order, new migrations, file/dependency impact, delivery order and runtime acceptance cases. Six applied SQL migration files are unchanged. No external v1 auth client/runtime exists; OpenAPI info version1.1.0 intentionally amends the pre-release `/v1` design.

## Review limits and remaining work

Validation executed:

| Check | Result |
| --- | --- |
| Fail-first contract tests | Initial new suite:12 PASS /3 FAIL as expected for missing verification routes, missing signed-token metadata and accepted cross-purpose audience. Added raw-token/username/ASCII negatives also verify existing schema protections. |
| `npm test` final | **72 PASS**:47 Jest +25 Node (16 contract/9 quality); no skipped tests. These are domain/technical/tooling cases, not Identity runtime crypto tests. |
| `npm run typecheck`, `npm run build` | PASS; no runtime Identity entry point exists yet. |
| `npm run lint` including quality/contracts | PASS: links/anchors/import boundaries/unit placement plus46 operations,79 schemas,425 schema/media example occurrences (shared fixtures repeat), event schema and selected boundary metadata. |
| Focused Prettier | PASS for amended tooling/test/OpenAPI files. |
| Roadmap count | Actual checkbox count40 checked +176 unchecked =216. ID-01–13 remain unchecked; ID-12/13 LATER. |
| PG/API/browser/SES/key rotation/AWS/load | NOT RUN in this amendment. Earlier30 PG fixtures remain Phase03 evidence; no schema/driver/UoW change justifies another DB run. |

Static checker now rejects signed-token format/algorithm/key-source/DB-authority drift and shared access/refresh purpose metadata, while allowing only the two explicit verification POST paths into the public-auth allowlist. The contract declares encryption/key/activation policy but does not implement those controls. [Validation log](validation.md) records the run; [test inventory](test-inventory.md) separates current from previous execution.

The contract deliberately handles refresh reuse by committed family revocation before401, pending-account activation by final credential replacement only once, resend without invalidating a live link, and duplicate/in-flight email with safe expired/consumed capability behavior. Normal key rotation requires public overlap deployment before signer switch; compromised keys get denied/revoked rather than overlap. No failure path falls back to in-memory authorization or accepted-but-undurable email intent.

Schema/examples/boundary checks cannot prove actual signatures, email ownership, browser behavior, session concurrency, encrypted material handling, SES delivery or key propagation. BOOT-10/ID-01–11 and all local/AWS operational/performance evidence remain required; ID-12/13 later. No PG integration rerun is required for this docs/tooling-only amendment; previous30 PG results remain historical evidence. No API/browser/key/SES/AWS/k6 run is claimed.
