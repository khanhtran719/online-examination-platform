# Evidence review Web UI — 2026-10-07

Scope: [review report](../../review-2026-10-07.md). macOS, Node24, Playwright1.63.0/Chromium. Demo preview `http://127.0.0.1:4173`, live preview `http://127.0.0.1:4174`. Live reproduction dùng HTTP fixtures qua `page.route`; không có actual backend/TLS/DB/email integration trong bộ test này. Credentials/question/review contents đều synthetic.

## Raw artifacts

- [results.json](results.json): run cuối gồm 9 cases, **5 PASS / 4 FAIL**. Bốn existing scenarios PASS; bốn assertions thêm FAIL vì UI-RV-01–04. Demo editor smoke PASS không xác nhận HTTP revision reconciliation vì object alias trong DemoApi.
- [answer-pages-results.json](answer-pages-results.json): recheck W-14 với40 câu frozen và40 đáp án cùng tập ID, hai cursor lists có thứ tự khác nhau; vẫn FAIL (2 radio trống thay vì unknown state). Đây là fixture cuối của ca phân trang.
- [findings.spec.ts](findings.spec.ts): assertions theo contract cho unknown answer scope, reauth, held-save deadline, editor smoke và 403 review eviction. Deadline dùng Playwright clock và response giữ có kiểm soát, không fixed sleep để che race. Reauth assertion dừng ở việc UI bị chuyển tới login, chưa chứng minh inline-login retry vì nhánh đó không tới được.
- [existing.spec.ts](existing.spec.ts): bản sao suite hiện có; chỉ đổi module import/screenshot output để không ghi đè evidence cũ.
- [state-probes.mjs](state-probes.mjs) và [state-probes.json](state-probes.json): transpile source hiện có tới thư mục tạm, gọi HttpApi với injected fetch và autosave reducer. Probe in ra tab A status403 sau tab B đổi CSRF cookie; Retry-After10s cho delay8s. Script exit0 nghĩa probe chạy xong, không nghĩa contract PASS.
- [artifact-check.json](artifact-check.json): live scan không có fixture banner/credentials;8 file SQL trong API dist khớp byte source migrations.
- [source-sha256.json](source-sha256.json): digests 60 files trong `apps/web/src` tại lúc lưu evidence. Không snapshot signing keys, env secrets, private session payload hoặc backend data.
- `findings-*.png`: bốn failure screenshots; `home-1440.png`, `home-320.png`, `exam-room-saved-1440.png`, `exam-sheet-320.png`, `admin-exams-1024.png`: output mới đã lưu riêng với baseline cũ.

Lần chạy đầu fixture deadline1s hết quá sớm trước khi giữ save; đó không được dùng làm bằng chứng deadline bug. Fixture được đổi thành60s, xác nhận save request đã tới, sau đó advance61s. Run cuối FAIL đúng ở assertion submit count0 thay vì1. Không sửa implementation hoặc nới assertion.

## Chạy lại

Build demo/live từ root, mở hai preview theo [runbook](../../runbook.md), rồi từ `apps/web`:

```text
./node_modules/.bin/playwright test --config ../../docs/web-ui/evidence/review-2026-10-07/playwright.config.mjs
node ../../docs/web-ui/evidence/review-2026-10-07/state-probes.mjs
```

[Config](playwright.config.mjs) và reproduction imports dùng path tương đối đến dependencies đã cài của repository. Output chạy lại ghi `/private/tmp/web-ui-review-20261007`; raw report đã lưu ở đây được giữ nguyên. Preview không tự khởi động qua config. Kết quả thêm đang RED là expected khi chưa sửa findings; không tính bộ này vào32 Vitest tests hiện có hoặc52 historical real-PG cases.

- [final-quality.txt](final-quality.txt): lần root quality cuối FAIL vì test placement của công việc persistence đồng thời; không bypass hoặc sửa file ngoài scope Web.

## Checks và giới hạn

Web typecheck/lint/32 tests/live+demo builds đạt. Root lint/typecheck/build/quality và100 unit/tooling cases đạt tại thời điểm chạy;46 operations/425 examples contract đạt. Không chạy real-PG integration trong review; workspace có công việc persistence khác cùng lúc nên không suy root results thành acceptance cho thay đổi đó sau thời điểm chạy.

Lần root quality cuối sau cập nhật report FAIL ở `experiments/persistence-comparison/tests/statistics.unit.spec.mjs`: unit test phải ở `__tests__`. Đây là file mới của công việc persistence; command dừng trước contracts:check. Các root PASS ở trên là kết quả lần chạy trước.

Existing Playwright4 cases chạy lại đạt; axe home320/1440 và exam1440 không serious/critical. Đã xem ảnh home và exam desktop để đối chiếu design. Không claim WCAG, tất cả24 scenarios,500-question performance, LCP/CLS, HTTPS, Firefox/WebKit hoặc production readiness.
