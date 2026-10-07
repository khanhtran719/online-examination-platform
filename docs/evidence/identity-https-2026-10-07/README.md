# Identity browser HTTPS — 2026-10-07

Scope: ID-07/WEB-02 local browser acceptance sau source normalization/pg decision. Live static React client gọi actual Nest AppModule, PostgreSQL17 với restricted API/mail roles và8 immutable migrations; actual verification worker gửi SMTP tới Mailpit. Không route fulfillment/mock business backend. [Runbook](../../runbooks/identity-https.md) và npm run test:identity:https tái lập môi trường; không domain/AWS account cần cho local run.

Môi trường: Node24.17.0, macOS ARM64, Playwright1.63.0/Chromium153.0.8010.12. Certificate/key tạm, CA/SAN kiểm tra bằng Node; Chromium pin một leaf SPKI, ignoreHTTPSErrors=false, không sửa OS trust. Local secure transport là proof cho cookie/Origin/Web Locks; public PKI, AWS edge/origin TLS và private RDS TLS chưa được chấp nhận.

## Kết quả và mapping

| Browser case | Outcome được kiểm tra | Task/scenario |
| --- | --- | --- |
| H01 | TLS positive/negative; no-store/no-referrer/nosniff/correlation; API404 trả JSON, không SPA HTML | FE-07, W-01/05 |
| H02 | Register/duplicate generic202; one intent, actual delayed worker mail; suppressed resend/cooldown; GET inert, fragment scrub/memory, reload mất secret; explicit final password; replay không đổi password/auto login; cookie flags/JSON metadata | FE-08/09/10, W-02–05 |
| H03 | Missing/malformed/expired link; không activation | FE-09, W-03 |
| H04 | Wrong Origin/missing/forged header reject; logged-in verification POST reject vì contract anonymous; UI hướng dẫn logout | FE-07/09, W-05 |
| H05 | Hai page trong cùng BrowserContext/shared cookies, Web Locks thật: một refresh POST200, một consumed session, zero revoke; simultaneous profile200/409, một revision increment; API restart, logout broadcast và cookie clear | FE-10/11, W-06/07 |
| H06 | Refresh commit rồi mất ACK: một application refresh, không reuse/revoke; explicit SPA login reset recovery, refresh tiếp theo thành công | FE-10, W-06 |
| H07 | Logout commit mất ACK giữ old cookie; fresh anonymous CSRF retry200 và clear cookies | FE-10, W-06 |
| H08 | Profile commit mất body: uncertain state, same receipt retry, chỉ một DB revision increment | FE-11, W-07 |
| H09 | Disabled DB account bị từ chối ở request tiếp theo và browser chuyển login | FE-10, W-06 |
| H10 | Body stall sau headers: tổng timeout10s, uncertain state, retry không thêm write | FE-07/11, W-07 |

Verification form đã kiểm tra axe không serious/critical và xem screenshot desktop1440×960/mobile390×844. Không suy rộng thành WCAG/full-route acceptance, Firefox/WebKit, LCP/CLS/INP hoặc frontend performance acceptance. Screenshot chỉ form rỗng, không token/password/email. Session/profile ở PostgreSQL là authority; JWT/cookie values không được đưa vào evidence.

## Findings và sửa

1. **Refresh recovery bị khóa sau login mới.** Unknown-outcome latch không reset. Thêm confirmLogin chỉ sau explicit login + authoritative profile; generation guard ngăn recovery cũ hoàn tất muộn khóa session mới. Generic probe/reload không mở lại quyền rotate sau unknown outcome.
2. **Fresh-CSRF logout retry403.** Old signed family nonce retry đã pass nhưng GET csrf sau revoke cấp anonymous nonce. Kiểm tra live family trước; anonymous chỉ hợp lệ khi không có live family; old revoked-family nonce chỉ được chấp nhận cho logout cùng fingerprint. Exact Origin, cookie/header, signature/age và live-family rejection vẫn giữ.
3. **Timeout/body error.** Timer bị clear khi nhận headers, response.text nằm ngoài catch. Giữ cùng timeout đến hết body và phân loại body I/O failure thành unknown network outcome; malformed completed JSON vẫn là malformed. Không thêm retry.
4. **Verification context chưa enforce.** Request/confirm nhận authenticated family CSRF dù security contract yêu cầu anonymous. Inbound HTTP-session port có explicit anonymous context; hai controllers chọn context đó. Không đổi Domain/Application, schema hoặc response shape.

5. **Thiếu action đăng nhập lại ở profile.** H06 tái hiện missing link sau thay đổi public navigation chạy song song. Profile hiển thị action trực tiếp khi cần reauth; test đi qua SPA link và login để xác nhận latch reset, không reload coordinator nhằm né lỗi.

Copy thành công/replay nói rõ chỉ mật khẩu thiết lập ở activation đầu tiên có hiệu lực. Business transactions, locks, JWT rules, durable session/outbox/receipt data và8 migrations không thay đổi. Logout retry path có thể thêm authoritative lookup; không claim latency/cost improvement hoặc tối ưu SQL từ bug fix.

## RED / GREEN và giới hạn evidence

harness-diagnostic.json là lần đầu4PASS/5FAIL với giả định test sai: activation tăng revision, hash-only navigation không bootstrap document, Chromium tự retry khi socket bị đóng trước headers. Đây không phải5 product bugs. Sau khi sửa harness, red-summary.json ghi6PASS/3FAIL thực: H06/07/08. red-anonymous-verification.json ghi H04 request trả202 thay vì403. red-profile-reauth.json ghi thiếu action đăng nhập lại trên profile. Hai body-stream unit regressions RED (raw TypeError và timeout không settle ở budget); hai coordinator regressions RED trước implementation.

[GREEN summary](green-summary.json), [environment](green-environment.json), [boundaries](green-boundaries.json) và [manifest](manifest.json) được lưu riêng, không viết lại RED hoặc historical ORM/UI benchmarks. Output HTTPS được tách khỏi thư mục default UI suite; static assets được snapshot vào thư mục tạm, SHA-256 API/Web ghi tại đầu run thay vì đoán từ build bị ghi đè sau test. Metadata gồm route/method/status, flags và server correlation/duration; không request bodies/header credential values, mail URLs, secret/key hoặc session cookie jar. Browser network/DOM/storage leak checks chỉ trả boolean. Test durations không phải API latency, sustainable capacity hoặc SLO/FinOps evidence.

Current validation inventory và file digests ở [manifest](manifest.json); [validation log](../../validation.md#identity-browser-https--2026-10-07) ghi lệnh/kết quả và các lần prerequisite failure. Production ledger vẫn NOT ACCEPTED: live SES sender/quota/bounce/complaint, other business APIs, public deployment/certificates, AWS reliability/cost/load/restore chưa đo. ID-12 magic link và ID-13 GitHub không được triển khai trong increment này.
