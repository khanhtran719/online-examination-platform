# Phần 04 — Identity và composition roots

2026-10-06. Đã triển khai lõi local: email/password, link xác thực một lần, access/refresh JWT ký bằng private key và kiểm tra bằng public key. Magic link và GitHub thuộc bước sau. [ADR-005](adr/005-email-verification-and-signed-tokens.md) ghi quyết định; [runtime review](phase-04-review.md) ghi implementation, kiểm chứng và giới hạn.

## 1. Phạm vi và trạng thái

**LOCAL CORE DELIVERED — phase chưa đóng:** BOOT-10 và ID-01–06/08–10 có runtime evidence. ID-07 còn browser HTTPS; ID-11 còn live AWS sender/quota/bounce/complaint/metrics. ID-12/13 giữ LATER. Không đóng phase từ các test local.

- [x] **BOOT-10** Nest API/Fastify composition root, worker entry point, cấu hình fail-fast, correlation/error mapper, liveness/readiness và graceful drain.
- [x] **ID-01–06, ID-08–09** Register/login/session/permissions/profile/admin bootstrap; crypto/real-PG/server HTTP tests và local benchmark.
- [ ] **ID-07 — PARTIAL** HTTP cookie/Origin/CSRF controls đã triển khai; browser HTTPS/client coordination chưa kiểm chứng.
- [x] **ID-10** Xác thực email, gửi lại, expiry, single use, activation, ciphertext cleanup và chống chiếm tài khoản đăng ký trước.
- [ ] **ID-11 — PARTIAL** Outbox/worker/SMTP/SES adapter, retries/park/replay/retention đã kiểm chứng local; live sender/quota/bounce/complaint/metrics chưa triển khai.
- [ ] **ID-12, ID-13 — LATER** Magic link và GitHub. Chưa thêm endpoint/SDK/provider credential trong phase hiện tại.

Các checkbox runtime được cập nhật trong [roadmap](implementation-roadmap.md), không chỉ từ specification. DB-12 vẫn chờ old/new image drill; Git/origin đã hiện diện ở review mới; BOOT-09 branch/PR workflow vẫn chưa kiểm chứng. Không cần domain để kiểm thử local; gửi email AWS cần account/region/sender được chọn. WEB-02 chưa có `/verify-email` page: link local chưa hoàn tất được bằng browser.

## 2. Ownership, luồng và atomicity

Identity sở hữu account, trạng thái email, session family, challenge và email intent. Domain giữ điều kiện activation/session; Application dùng các port plain TypeScript và UnitOfWork. Nest, `pg`, thư viện JOSE/Argon2, SMTP/SES và secret loading nằm trong adapter/composition root. Không tạo module riêng cho từng bảng, không gọi SDK/email provider trong transaction.

| Use case | Luồng | Invariant / transaction / retry |
| --- | --- | --- |
| Register | WRITE, public + CSRF | Hash password ngoài UoW; unique normalized email; tạo pending account + Candidate assignment + challenge + encrypted email intent cùng commit. Email đã tồn tại luôn 202, không ghi đè credentials/profile. |
| Request verification email | WRITE, public + CSRF | Account chưa verified mới có intent; user/challenge serialization, cooldown và delivery sequence ngăn enqueue trùng. Cùng 202 cho absent/disabled/verified. |
| Confirm email | WRITE, token capability + anonymous CSRF | Hash mật khẩu người giữ email chọn ngoài UoW; lock user rồi challenge; lấy DB time sau lock; consume challenge + verifiedAt + final password + vô hiệu challenge khác/email intent cùng commit. Không tự login. |
| Login | WRITE, public + CSRF | Verify Argon2 ngoài UoW, dummy hash khi absent; trong UoW kiểm tra lại enabled/verified/credential version rồi tạo family + session. Chỉ gửi cookies sau commit. |
| Refresh | WRITE, refresh JWT + CSRF | Verify signature/type/audience trước DB; lock user rồi family, reread session và DB time; consume token + session mới cùng commit. Reuse phải commit family revocation rồi mới trả 401, không throw làm rollback revocation. |
| Logout | WRITE, CSRF | Cùng lock order với refresh; revoke family và clear cookies; absent/revoked trả 200. |
| Authenticate / GET me | READ | Verify access JWT rồi một projection authoritative user/session/family/current permissions; không tin role claim hoặc auth cache. |
| PUT me | WRITE | User lock; receipt trước expectedRevision; profile + revision + audit + receipt cùng UoW. Receipt cũ không ghi đè profile mới. Không cho đổi email/password/role ở endpoint này. |
| Grant first admin | operator WRITE | Existing enabled **verified** user; dedicated DB/IAM role, bootstrap lock + durable once marker + grant + reason/operator audit cùng commit. |
| Send verification mail | staged WRITE + external effect | Claim lease trong transaction ngắn; decrypt + send ngoài transaction; mark delivery với fencing token. Crash sau provider acceptance có thể gửi trùng cùng link, không activation trùng. |

Lock order chung: user → family hoặc challenge → session/email intent. Adapter maintenance không đảo thứ tự; concurrent refresh/logout/disable/activation cần real PostgreSQL tests. Rate/admission controls commit độc lập business UoW để failed login không xóa counter. Không giữ connection trong lúc hash password hoặc gọi SES.

## 3. Thứ tự triển khai có thể review

1. **04A — Runtime/config:** thêm Nest/Fastify root và health; phân API/worker role và pool budget; keyring/email config validate lúc boot; fail startup khi thiếu signing key, sai curve/kid/issuer hoặc key pair không khớp. Worker email có encryption key nhưng không có JWT private signing key. Không chờ SES trong readiness API; DB và usable signing config là critical.
2. **04B — Expand schema:** thêm `email_verified_at`, `credential_version`, profile `revision`, challenge/email-intent tables/indexes, signing `kid` + access/refresh `jti` metadata và audit/operator grant restrictions. Giữ sáu migration đã applied nguyên checksum. Token hash columns hiện có tiếp tục lưu SHA-256 full compact JWT. Account cũ mặc định unverified, không backfill verified từ việc tồn tại email. Không coi plaintext opaque session cũ là JWT hợp lệ.
3. **04C — Crypto/session:** purpose-specific `SessionTokenPort`, Argon/password port, keyring adapter; verify adversarial cases trước login flow. Active pair ES256/P-256; private ký, public verify. Các claims/expiry/rotation theo security contract; JWT chỉ là credential format, không thay PostgreSQL revocation.
4. **04D — Registration/verification/mail:** pending account, generic acknowledgement, CSRF và bounded hashing; opaque random verification token + hash; encrypted durable delivery material; POST confirmation + final password. Local mailbox chạy loopback, không gửi email thật trong integration tests. API 202 nghĩa là DB đã nhận intent, chưa phải email đã tới inbox.
5. **04E — Login/refresh/logout/principal/profile:** kiểm tra email verified, session rotation/reuse, permission changes qua hai API instances, CSRF context, idempotent profile update; cookies `__Host-*`, no-store, không trả raw credentials trong JSON.
6. **04F — Operator + delivery operations:** admin grant an toàn; SES sender/sandbox/production access, bounded retries/parked jobs, suppression/bounce/complaint policy và runbook key compromise/rotation. AWS phần này còn pending account/region/sender; local passing không đóng gate AWS.
7. **04G — Validation/measurement:** unit → real restricted PG → HTTP E2E → browser HTTPS → local auth bench → AWS evidence khi có môi trường. Review diff và cập nhật checkbox với đúng evidence.

Không dựng generic provider registry cho provider chưa tồn tại. Sau này password, magic link, GitHub sẽ cùng gọi Identity capability tạo session sau khi chứng minh danh tính; external OAuth adapter không được cấp quyền riêng hoặc bypass verified/disabled policy.

## 4. File/dependency impact

Phần dưới ghi placement của implementation trước thay đổi §5, được giữ làm lịch sử bàn giao. Source hiện đã chuẩn hóa theo [ADR-006](adr/006-source-layout-normalization.md) và [normalization checklist12/12](architecture-normalization-plan.md); dùng mapping mới cho development, không tái tạo folder platform từ ví dụ lịch sử này.

Đã áp dụng folder bạn chỉnh: Identity có `application/ports`, `domain/errors`, `infrastructure/{persistence,security,mail,http}` và `presentation/http/dto`. Crypto/email policy adapter thuộc Identity; database, idempotency, rate/audit mechanisms và reusable HTTP filter/interceptor/health thuộc platform. `AppModule`/IdentityModule/DatabaseModule/HealthModule là composition factories; platform không import module business, Presentation không import Infrastructure. SQL adapter dùng `PostgresDatabase`/UoW. Build xóa riêng generated `dist` trước compile để loại output theo folder cũ.

Dependencies đã dùng: Nest12.1.2/Fastify5.12.5, cookie plugin, Argon2, JOSE, Nodemailer và SESv2 SDK. Runtime audit báo0 vulnerabilities;20 moderate dev findings còn theo dõi. Node24/CommonJS startup và Argon2 trên host ARM64 đã chạy; Linux container ARM64 compatibility chưa đo. Không thêm OAuth SDK/Redis/Kafka/email queue/KMS signing mỗi request. Key material tạo exclusive trong ignored `.local/identity`, quyền600; production Secrets Manager wiring còn pending.

Outbox email là Identity-owned PostgreSQL delivery intent được worker đọc trực tiếp; `platform.outbox_events` hiện có FK/type dành cho attempt submission nên không tái sử dụng sai ownership. SES là resource mới có operational requirement từ email verification; phải ghi cost provenance, quota, failure mode, retry/backlog utilization và lựa chọn khác vào resource ledger trước AWS deploy. Chưa có giá/chi phí tiết kiệm được đo.

## 5. Kiểm chứng và phép đo bắt buộc

| Nhóm | Cases / evidence cần đạt |
| --- | --- |
| Contract | Email/password only; no username/role/userId overrides; verify POST yêu cầu token/password, no GET activation; schemas không nhận access/refresh token trong Session JSON. |
| Verification | Single use; expired/wrong-purpose/tampered; duplicate confirm không mutate lại; two tabs; resend cooldown; absent/verified/disabled generic; account pre-registration không giữ attacker password sau activation. |
| JWT | Wrong key/alg/kid/issuer/audience/type/use, missing claim, future iat, invalid nbf/exp/jti/sid, refresh-as-access/access-as-refresh, disabled/revoked/consumed; reject injected key URLs. |
| Concurrency | Unique email/register race; activation vs login/disable/resend; refresh reuse revocation durable; refresh/logout/user disable two instances; HTTP timeout sau commit; DB outage fail closed. |
| Delivery | DB commit before mail; API/worker crash; lease expiry/fencing; timeout sau provider acceptance; duplicate same link; recheck used/expired trước send, mail đang in-flight có thể tới sau activation nhưng không còn hiệu lực; bounded retries, parked alert/replay; no plaintext token/email URL in logs/queue/receipt. |
| Key operation | Load public overlap trước switch signer; unknown kid fail closed; old refresh hoạt động trong validity; compromise deny kid + revoke affected families; no worker signing private key. |
| HTTP/browser | Secure HttpOnly cookies, no-store, same Origin/CSRF ở public unsafe routes, email link fragment + no-referrer + explicit user POST; link scanner GET không kích hoạt. |
| Performance | Hash duration/RSS và admission concurrency sweep; sign/verify CPU + token/cookie bytes; p50/p95/p99, achieved RPS, CPU/RSS, DB queries/pool wait/locks; hai instances cùng Postgres. |

[SLO/workload](slo-and-workload.md) ghi auth targets riêng; hot-path exam benchmarks setup sẵn verified sessions, không bypass verification. Đo full HTTP và crypto/DB riêng. No Redis baseline. Chỉ tối ưu hashing concurrency/pool/algorithm khi giữ security floor, correctness và SLO. Kết quả local không suy ra jobs/USD, sustainable AWS RPS hay cấu hình thắng.

Kết quả hiện tại:90 unit/tooling +52 integration PASS; actual main/worker `/live`/`/ready` và SIGTERM PASS; benchmark hai API không có lỗi, raw samples có trong [experiment](../experiments/identity-local/README.md). Gate còn ID-07/ID-11; không chuyển sang Catalog như thể toàn Phase04 đã đóng. DB-12 chỉ tick sau image drill. Production vẫn cần browser/TLS/SES/key rollout/AWS load/failure/restore.
