# Import/alias normalization evidence

Status: COMPLETE locally. 653 root, 427 integration and 10 actual HTTPS tests pass.
[Plan/review](../../import-normalization-2026-10-12.md) owns the decisions and
IMP-01–06 checklist. These are local correctness/tooling checks, not a performance
benchmark or AWS production acceptance.

Environment: macOS ARM64, Node 24.17.0, npm 11.13.0. Sorter dependency pinned to
14.0.0 independently in root and Web lockfiles. No runtime alias hook.

| Evidence | Meaning |
| --- | --- |
| guard-red.txt / guard-green.txt | New boundary regressions fail before implementation; all 23 pass after alias resolution |
| compile-red.txt / compile-green.txt | Compiler implementation missing in RED; static/dynamic/re-export/import-equals runtime and source-map tests pass GREEN |
| tooling-focused.txt | 27 focused guard/compiler/autofix tests pass |
| root-tests.txt | 492 API, 62 tooling and 99 Web tests pass |
| lint-final.txt / format-check-final.txt | Both applications/tooling policy and safe code formatting pass |
| typecheck-api.txt / typecheck-web.txt | Both TypeScript checks pass |
| build.txt / web-build-live.txt / web-build-demo.txt | Three builds pass |
| artifact-resolution.json | 209 compiled JS files, 387 resolved dependencies, 19 matching migrations, zero errors |
| import-counts.json | Pre/post source readability counts with fixed file scope |
| preservation-baseline.json / preservation-final.json | Pre-edit digest baseline and result: 409 sources match; 1,121 protected old files unchanged |
| audit-root*.json / audit-web*.json | Runtime findings zero; existing dev findings retained explicitly |
| integration-initial-wrong-profile.txt | Initial development-profile guard rejection, not an accepted run |
| integration-full.txt | First disposable full run: 419 pass/eight fail; timeout and ExamNotOpen errors retained |
| integration-expiry-rerun.txt | Same unchanged deadline suite: 17 pass |
| integration-full-rerun.txt | Accepted unchanged full rerun: 427 pass, 24 suites, zero skips |
| identity-https.txt / identity-https-summary.json | API/live Web rebuilt; all ten real Chromium HTTPS auth cases pass |
| identity-https-environment.json | Browser/runtime, ephemeral TLS scope and SHA-256 build provenance |
| databases-before.json | Disposable administrator database inventory before fixtures |
| databases-after-integration.json / databases-after-https.json | Inventory returns to the same two administrator databases; zero extra fixture databases |
| dependencies-stop.txt / cleanup-inspection-stop.txt / containers-after.txt | Test resources stopped with volumes retained; unrelated containers left running |
| summary.json / SHA256SUMS.json | Machine-readable outcome and digests of this evidence bundle |

From the repository root, rerun the read-only preservation proof:

```sh
node docs/evidence/import-normalization-2026-10-12/verify-preservation.mjs
```

It canonicalizes configured aliases for syntax/import/export comparisons and
preserves ordered explicit side-effect imports. Import type syntax, declaration
ordering, whitespace and comments may change. It does not replace runtime tests
or prove every possible module-initialization ordering safe. The protected digest
set includes old archived experiments/evidence and all 19 applied migrations;
new evidence in this directory is outside that pre-edit set.

The failed initial runs remain recorded. No retry assertion/timeout or application
behavior was changed for the transient full-run failure. Only safe summaries/build
provenance are retained for HTTPS auth; no cookies, JWTs, email links, raw
request bodies, screenshots or browser traces are archived here.

Lint/format closure logs repeat the checks after documentation/link cleanup.
Contracts remain 48 operations/445 examples. Runtime audits have zero findings;
existing development findings (root20 moderate, Web9 high) are not resolved by
this increment. The first transient deadline failure's cause is unconfirmed;
green reruns establish the accepted checkpoint, not a fix for every environment
stall/clock condition. Production remains NOT ACCEPTED; no AWS benchmark ran.
