# Identity trên browser HTTPS local

Runbook cho ID-07/WEB-02. Dùng live SPA và API thật; không cần domain hoặc AWS account. [Evidence](../evidence/identity-https-2026-10-07/README.md) phân biệt local acceptance với public PKI/SES/AWS.

## Chạy suite

Prerequisites: Node24, Docker Compose đang chạy, OpenSSL hỗ trợ EC certificate/SAN, dependencies từ hai lockfiles đã cài và Chromium của Playwright1.63 có sẵn. Không dùng production secrets/configuration. Clean-install acceptance và audit frontend vẫn là FE-02 riêng.

Từ gốc repository:

```sh
npm run test:identity:https
# Chạy riêng một ca khi debug:
npm run test:identity:https -- --grep H07
```

Runner build API và Web live, bật dedicated Compose, chạy Playwright rồi stop containers trong finally. Fixture snapshot static assets vào thư mục tạm và ghi SHA-256 ngay đầu run, nên build UI song song không thay assets đang được test. Không dùng Vite HTTP preview hoặc demo để đóng gate cookie. Default demo Playwright config loại suite HTTPS để không trộn môi trường/evidence.

| Thành phần | Địa chỉ / lifecycle |
| --- | --- |
| PostgreSQL17 | loopback55435; disposable database/DDL/API/mail logins mỗi worker |
| Mailpit SMTP/API | loopback13025/20025; chỉ recipient synthetic @example.test |
| HTTPS static gateway | loopback ephemeral port; same origin với PUBLIC_ORIGIN của API |
| Nest AppModule | loopback ephemeral HTTP upstream; actual controllers/adapters/health |
| Verification worker | public Identity factory, restricted mail role; runOnce gửi SMTP thật |
| Secret/certificate files | task-owned temporary directory0700, private files0600; xóa khi teardown |

API dùng examination_runtime; mail dùng examination_mail_worker và không nhận JWT signing/public/CSRF files. DDL dùng examination_owner. Bootstrap chạy toàn bộ migration bundle từ build bằng migration runner thật; hiện có9 files. Environment ghi migrationCount từ built provenance, không hard-code số lượng. Fixture administrator chỉ expire/revoke dữ liệu disposable để kiểm tra DB authority; không có test endpoint, runtime bypass hoặc chỉnh cookie flags.

## TLS và giới hạn trust

Mỗi run tạo self-signed EC certificate với SAN localhost và127.0.0.1. Chromium chỉ bỏ certificate error cho SPKI của đúng leaf tạm; ignoreHTTPSErrors=false. Không cài CA vào OS/keychain và không tắt certificate checking toàn bộ browser. Node HTTPS dùng CA material tạm với rejectUnauthorized=true; positive TLS/SAN, wrong hostname và untrusted certificate đều được kiểm tra.

Đây là TLS transport thật để kiểm tra Secure cookies, secure-context Web Locks và same-origin policy. Chromium SPKI exception không chứng minh public certificate chain/hostname validation trong production browser. AWS viewer/origin certificates, private DB TLS, ALB/CloudFront/WAF và SES vẫn chưa nghiệm thu.

## Fault injection và privacy

Gateway chờ upstream commit/response, không forward Set-Cookie rồi gửi response body bị cắt hoặc bị giữ. Partial headers/body ngăn Chromium tự retry POST trên socket keep-alive đóng trước header. Đây là kiểm tra outcome không rõ sau commit, không mô phỏng mọi failure mạng. Refresh không được application blind replay; profile giữ cùng receipt/body; logout đã revoke chấp nhận retry đúng CSRF/context.

Output ở ignored apps/web/.local/identity-https-results (tách khỏi output của default UI suite): summary, environment, bounded route/status observations và hai screenshot verification form rỗng. Không HAR, trace, video, raw cookie jar, mail body/link hoặc password artifact. preserveOutput=never loại error artifacts; pinned Playwright NO_COPY_PROMPT switch tránh snapshot DOM auth form khi fail. Chỉ boolean storage/URL/header metadata được dùng trong checks. Không bật tracing để debug bằng tài khoản thật.

Thông thường harness drain API/pools, close worker/browser, drop disposable DB/logins và xóa temp keys; runner stop dedicated containers, giữ volume. Khi bị kill cứng, dừng project test bằng:

```sh
docker compose -f infra/identity-https/compose.yaml stop
```

Không dùng docker system prune, drop database ngoài identity_https_* hoặc xóa .local/identity của developer. Kiểm tra ownership trước cleanup thủ công của run bị ngắt. Root backend integration suite dùng Mailpit11025/18025; không nhầm với mail server của HTTPS suite.
