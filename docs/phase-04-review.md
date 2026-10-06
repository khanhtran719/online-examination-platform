# Review Phần04 — Identity runtime local

2026-10-06. **Lõi local đã bàn giao; toàn Phase04 chưa đóng.** BOOT-10 và ID-01–06/08–10 hoàn tất named deliverables. ID-07 PARTIAL vì browser HTTPS/client coordination; ID-11 PARTIAL vì live SES sender/quota/bounce/complaint/metrics. ID-12/13 LATER. Roadmap50/216; chưa tự chuyển Catalog hay production acceptance.

## Cấu trúc theo điều chỉnh của người dùng

Đã đọc lại quy chuẩn/profile/code/tests và giữ layout bạn vừa đổi:

```text
apps/api/src/
  app.module.ts / main.ts / worker.ts / operator-admin.ts
  modules/identity/
    identity.module.ts
    application/ports/ + errors/ + plain services
    domain/errors/ + identity-policy.ts
    infrastructure/persistence/ + security/ + mail/ + http/
    presentation/http/dto/ + controller + inbound HTTP-session port
  platform/
    application/         # UoW, readiness, shutdown, audit/rate, receipt ports
    domain/              # DomainError, ErrorCategory, technical unavailable error
    infrastructure/      # database, security config/adapters, health composition
    presentation/http/   # generic setup, filter, interceptor, health controllers
```

Platform không import business module; Presentation không import Infrastructure. Nest factories ở composition modules; Application/Domain không phụ thuộc Nest, pg, JOSE, Argon2, SMTP hay AWS. Identity sở hữu repository/challenge/mail intent; shared durable receipt adapter thuộc platform. Success envelope theo thay đổi mới: `{data,errorCode:null,message:null,status:true}`; safe errors có errorCode/message cùng text. Health không bị envelope. Quality/tests kiểm tra boundary này. Build chỉ dọn generated dist để folder cũ không để lại output.

## Deliverables và evidence

| ID | Trạng thái | Implementation / evidence |
| --- | --- | --- |
| BOOT-10 | DONE local | AppModule/IdentityModule/DatabaseModule/HealthModule, fail-fast secrets/config, actual main/worker health and SIGTERM smoke |
| ID-01 | DONE local | Atomic pending account/Candidate/challenge/encrypted intent, normalized unique email, generic duplicate202, no credential overwrite |
| ID-02 | DONE local | Enabled+verified gate, Argon2id floor, bounded hashing/dummy absent verification, shared atomic failure reservation and login audit |
| ID-03 | DONE local | User→family locks, post-lock time, one-use refresh, durable reuse revocation; concurrent refresh test |
| ID-04 | DONE local | Immediate revoke, expired/disabled/current-permission checks across two instances; logout old-cookie retry HTTP test |
| ID-05 | DONE local | Strict ES256 claims/headers/purpose, public overlap/removal tests, real-PG compromised-kid revoke/audit. AWS key rollout unmeasured |
| ID-06 | DONE local | Principal adapter uses authoritative session/current-permission projection; ownership/role restrictions |
| ID-07 | PARTIAL | Cookie/Origin/CSRF/HMAC/context/no-store tested server-side; WEB-02/browser TLS/multi-tab client pending |
| ID-08 | DONE local | One-shot verified-user admin bootstrap, operator role, atomic audit with session_user/reason; no public role endpoint |
| ID-09 | DONE local | Crypto, real PG/HTTP/SMTP tests; two loopback HTTP API instances benchmarked; not browser/AWS acceptance |
| ID-10 | DONE local | Single-use30min, final owner password, bounded coalesced resend, race/retry/expiry/material cleanup |
| ID-11 | PARTIAL | Local SMTP/SES adapter boundary, lease/fence/retry/park/audited SQL replay/retention; live operations pending |
| ID-12/13 | LATER | No magic-link/GitHub endpoint/provider framework |

[Application](../apps/api/src/modules/identity/application/identity.service.ts), [repository](../apps/api/src/modules/identity/infrastructure/persistence/postgres-identity.repository.ts), [crypto](../apps/api/src/modules/identity/infrastructure/security/identity-crypto.ts), [HTTP session](../apps/api/src/modules/identity/infrastructure/http/http-session.ts), [worker](../apps/api/src/modules/identity/application/verification-worker.ts), [integration suite](../apps/api/tests/integration/identity.spec.ts).

## Correctness và các lỗi đã sửa

- Password hash/verify chạy ngoài connection/UoW. Activation thay pending password bằng mật khẩu cuối do email owner chọn, không auto-login; duplicate trước original expiry không ghi mật khẩu mới.
- User→family hoặc user→challenge→intent; write lấy DB time sau lock. Refresh reuse commit revoke/audit trước401; không throw trong transaction làm rollback security effect.
- PUT me reauthorizes sau user lock, receipt/fingerprint trước expectedRevision. Profile/revision/audit/receipt cùng UoW; real audit-failure test chứng minh rollback cả mutation và receipt.
- Auth projection kiểm tra JWT hash/jti/kid, enabled+verified, consumed/expiry, family và current permissions. Không auth cache hay role authority trong JWT.
- Lost logout ACK từng làm retry old cookies403 vì family revoked. Đã thêm logout-only CSRF context cho known signed family; retry200, không authorize mutation khác.
- Login counter từng cho sáu wrong-password calls cùng vượt precheck; RED test thấy cả sáu hash. Sửa short independent transaction/advisory lock/fresh SELECT để reserve trước hash: năm failed/in-flight slots; success/technical rejection release. Crash conservatively giữ slot tới expiry.
- Minute bucket từng dùng expiry lần đầu. Regression RED còn998ms thay vì≥899999ms sau reservation mới; đã extend expiry để giữ≥15min từ latest reservation. Có conservative overlap tối đa khoảng1min. Không giảm security floor để giảm queries.
- Crash ở delivery attempt10 từng không claim được và không parked. Cleanup nay park sau lease expiry; real-PG regression PASS. Lease/fence ngăn stale completion; timeout sau acceptance có thể gửi trùng cùng link, không hứa exactly-once inbox.
- Maintenance từng giữ exhausted-intent locks rồi truy cập challenge trong cùng transaction. Lock test RED bị lock timeout; parking nay commit riêng trước challenge→intent cleanup. Test cho phép cleanup hoàn tất hoặc chờ lock, và kiểm chứng intent vẫn truy cập được; final complete suite PASS.
- External timeout5s, lease30s, jitter1..60s,≤10 attempts, SES SDK maxAttempts1, không extend challenge expiry. Replay operator chỉ parked/live/pending, giữ link/deadline và audit atomic.

## Migration và quyền

[0007](../apps/api/migrations/0007_identity_runtime.sql) expand verifiedAt/credential version/revision, JWT kid/jti, challenges/intents, request limits, Candidate/Admin permissions và narrow audited admin procedure. [0008](../apps/api/migrations/0008_identity_operations.sql) thêm mail-worker privileges, bounded maintenance và operator revoke-key/replay-mail. Tám migrations applied local; sáu checksums trước giữ nguyên. Existing accounts không tự verified; opaque legacy session không được coi là JWT.

API không được trực tiếp DML role assignments. Mail worker column-limited user reads; không password/session/private signing key/catalog keys. Operator functions pinned search_path/no PUBLIC EXECUTE, DB audit lấy session_user. Production IAM/human attribution chưa triển khai. Không inject admin/migration/operator URLs vào API/worker production.

Verification maintenance: terminal ciphertext erased, hash sau24h, redacted email metadata sau7days, pending account7days anonymized/disabled có audit, batches≤500. Session/receipt/general audit retention và restore reconciliation rộng hơn vẫn pending; không coi verification cleanup là production restore evidence.

## Validation đã chạy

| Check | Kết quả thực tế |
| --- | --- |
| `npm test` | 64 Jest/11 suites +26 Node =90 PASS, none skipped |
| `npm run test:integration:local` | 30 foundation +22 Identity =52 PASS/2 suites, restricted PostgreSQL17.11, disposable DB/roles cleaned |
| Typecheck/build/lint/quality | PASS;46 OpenAPI operations/425 example occurrences and boundaries |
| Local DB CLIs | PASS;8 migrations and app/migrator/operator/mail logins |
| Actual entry-point smoke | API/worker live/ready PASS; SIGTERM exit0, latest combined idle shutdown640.6ms ([raw summary](../experiments/identity-local/smoke.json)); earlier run566.2ms |
| SMTP | Actual loopback Mailpit capture; no external recipient |
| SES adapter unit | Request/permanent rejection/5s abort PASS; not live AWS send |
| Runtime audit | 0 vulnerabilities after Nest/Fastify remediation |
| Full audit | 20 moderate dev findings,0 high/critical; no forced downgrade |
| Benchmark | Two loopback HTTP API instances,0 unexpected errors; [raw experiment](../experiments/identity-local/README.md) |

Focused RED selected individual tests temporarily; final full suites above had none skipped. Node24 CommonJS main/worker and native Argon2 on macOS ARM64 run; Linux ARM64 images/deploy/recovery remain pending. Jest uses VM ESM compatibility.

## Measurement → decision

Read-only CSRF-family checks replaced transaction/locks with one projection; writer still locks/revalidates. Refresh queries15→10, logout13→9 including new audit. GET me2 queries: session/permissions plus actor rate. Login now19.5 average including atomic failure admission/release and transaction controls; this added security work is not an optimized-login claim.

Latest p95/p99 ms: login44.44/54.36, me4.92/5.97, refresh9.52/29.17, logout9.26/9.30. Sequential small samples/shared client-API CPU/RSS have noisy tails; no sustainable RPS, TLS, saturation, optimum pool, enumeration-resistance or AWS savings inference. Hash concurrency2 remains local candidate. Redis/extra queue/KMS-per-request have no demonstrated requirement here.

SES supplies production email ownership delivery. Provider outage leaves durable bounded retry but links can expire; API readiness stays DB/signing dependent, while delivery needs age/park alarms. SMTP is local fixture. Sender quotas, private egress/NAT cost, monthly price and TCO comparisons remain unknown until AWS environment selection.

## Remaining gate và bước kế tiếp

1. **ID-07/WEB-02:** same-origin HTTPS inert landing, no third-party scripts/cache/referrer, scrub fragment, explicit final-password POST; browser CSRF/cookies/scanner/multi-tab single-flight tests. Landing currently404, not usable browser verification yet.
2. **ID-11/AWS:** account/profile/region/sender; SES access/quota/IAM/egress, live delivery and suppression/bounce/complaint/age/park/abuse metrics. No domain does not block local but does not waive TLS.
3. **BOOT-09/DB-12:** Git/remote when supplied; actual image/ARM64/old-new migration drill. No commit/PR/image evidence.
4. Re-review remaining gates, then Catalog. Exam correctness/SLO, OTel/CloudWatch, k6, failure/restore and Performance–Cost Curve remain future work.

R-58/59/workflow47/48 reviewed for ownership/UoW/DTO/error/idempotency/audit/external-effect boundaries. No Git diff/commit/PR claimed because checkout is not a Git repository. [Production acceptance](production-acceptance.md) remains NOT ACCEPTED.
