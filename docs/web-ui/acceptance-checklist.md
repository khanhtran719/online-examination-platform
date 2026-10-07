# Web UI acceptance và scenario catalog

Status: **spec giữ nguyên; một phần scenario đã chạy ngày 2026-10-07**. [Review mới](review-2026-10-07.md) tái hiện FAIL ở W-06/14 reauth, W-14 answer scope, W-16 deadline và W-18 review sau403. Bốn browser smoke hiện có vẫn PASS; xem [raw review evidence](evidence/review-2026-10-07/README.md). Kết quả trước review ở [evidence](evidence/README.md). Đây không phải bộ tick production. FE task checklist ở [implementation-tasks](implementation-tasks.md); baseline business policies ở [product](../product-specification.md) và [contract cases](../contract-tests.md).

## 1. Data modes và evidence

Mỗi scenario ghi `dataMode=demo|live`, route, browser/version/viewport, initial state, action, visible result, network/state evidence, PASS/FAIL/BLOCKED/NOT RUN. Demo tests kiểm tra UI logic với synthetic backend state; live tests chứng minh actual HTTP/HTTPS behavior. Demo không đóng live email/permissions/processing/AWS gates.

Để tick FE task, chạy các checks phù hợp, không giảm assertion khi failure. Screenshots chứng minh layout, không chứng minh DB durability. Mutation correctness cần coordinator test và network/backend outcome khi live. Required live scenario BLOCKED không được đổi thành skipped rồi báo mọi thứ xanh.

## 2. Reproducible fixture catalog

| Fixture | Nội dung                                                       | Dùng                     |
| ------- | -------------------------------------------------------------- | ------------------------ |
| D-01    | Candidate đã verified, synthetic account, opt-in=false         | bình thường              |
| D-02    | Pending registration, generic acceptance, delayed mail         | email flow               |
| D-03    | Candidate permission set và Admin từng capability riêng        | access/navigation        |
| D-04    | Reviewer chỉ reporting.read, không keys/replay/manage          | least privilege          |
| D-05    | Exam100 questions/45min,3 types,2 sections,releaseNEVER        | main exam                |
| D-06    | Exam500 questions,20 sections,long prompt/options,title có dấu | render/pagination stress |
| D-07    | Late start còn15min,close20:45,server clock khác client        | countdown                |
| D-08    | Published version1 attempt,version2 current,exam unpublish     | frozen/resume            |
| D-09    | Result5/6,correct2/3,basisPoints8333,section data              | scoring display          |
| D-10    | Review blocked/permitted after completion/close                | leakage gates            |
| D-11    | FAILED false và FAILED replayPending=true                      | polling/replay           |
| D-12    | Cursor pages20/100,watermark changes,expired cursor            | list semantics           |
| D-13    | Import valid/invalid/mixed/oversize;dry-run and real           | import                   |
| D-14    | Metrics snapshot/missing values,audit safe records             | honest reporting         |

Fixture clock/delays phải điều khiển được, không test phụ thuộc đồng hồ thực hoặc randomness không seed. Credentials trong fixtures chỉ synthetic, không production key/token. Auth cookie/security fixture riêng; không tự đặt token localStorage để test app login.

## 3. Scenarios bắt buộc

### W-01 — Route, shell và modes

Open deep link rồi reload: đúng shell,page title và404 khi unknown. Candidate exam không load Admin chunks/nav. Demo luôn banner; live endpoint lỗi không thành demo. Missing API capability render unavailable với retry/back phù hợp, không success state/blank white screen. Map FE-02/04/06/31.

### W-02 — Form constraints và enumeration

Register15–128 password,ASCII normalized email,displayName1–80; confirm-password client-only. Login không ép register minimum. Existing/absent/unverified/disabled generic401 không reveal trạng thái; duplicate register202 không overwrite/hứa delivered. Paste/autocomplete/reveal hoạt động. Map FE-08/10.

### W-03 — Verification không activate bằng GET

Open fragment link: scrub URL, không POST tự động; không token trong request URL,referrer,storage/log/telemetry. User chọn final password và explicit POST anonymous CSRF. Success chỉverified,không login. Missing/expired/consumed retry có đúng states; retry không hứa ghi password mới. Live mail/link test chỉ khi actual environment. Map FE-09.

### W-04 — Resend generic/bounded

Click resend một lần,cooldown60s,202 suppressed vẫn generic.429 dùng Retry-After; refresh page không được frontend giả server quota đã reset. Chọn email khác không overwrites existing account. No infinite timer/request loop. Map FE-08.

### W-05 — HTTPS cookies và CSRF

Browser HTTPS thực dùng Secure/HttpOnly access/refresh +valid csrf/Origin. Thiếu header/wrong context/wrong Origin bị backend reject; frontend không nới cookie policy hoặc CORS để pass. Empty-body action không malformed JSON. Token/private keys không trong browser code/storage/network JSON. Đây là live-only security proof. Map FE-07/30.

### W-06 — Refresh/multiple tabs/lost ACK

Hai tabs gặp expired access đồng thời: cross-tab lock/recheck chỉ một rotation cần thiết; loser dùng shared current cookies. Broadcast không token. Timeout sau refresh commit không blind replayoldcookie; có reauth. Unsupported coordination fallback được test. Logout/revoke/disable xóa sensitive data và không loop. Map FE-10/11/30.

### W-07 — Profile revision/permission source

Save profile with key/revision; lost ACK retry giữ body,key.409 giữ local fields,cho reconcile. Opt-in false default và changes validated server. Live Profile thiếupermissions không bật Admin; reviewer cannotkeys/manage/replay bằng role selection. Backend UI-GAP-01 BLOCKED vẫn được ghi rõ. Map FE-11/22.

### W-08 — Catalog/list/cursor

Category đổi reset cursor,page20→loadmore,page100cap,expired cursor cho reload. Empty/filter/error states phân biệt. Không GET detail per row,total giả hoặc global search chỉ lọc currentpage mà không ghi giới hạn. Unknown filters không gửi API. Map FE-12/21.

### W-09 — Start correctness

Double click hoặc timeout sau commit giữ same key và trả existing attempt. Late start nhận actual deadline; không hứa full45 phút.422 unavailable/limit có safe action. Returned version1 attempt không dùng version2 metadata; questions không tải trước ownership. Map FE-13/14.

### W-10 — Three types/clear/mark

Keyboard radio/single/true-false và checkbox/multiple hoạt động. Clear tạo empty set; mark không cộng score/answered count. XSS-like prompt render literal. Test long options,8000-character prompt,500 questions. Candidate payload không keys/explanation. Map FE-14/23/29.

### W-11 — Saved chỉ sau ACK

Save delay5s: UI pending/saving, chưa Saved; ACK mới confirm timestamp/version. Clean10s không request; batch≤20 distinct,one in-flight,mark/clear cũng save.429/503 retries giữ immutable body/key và có giới hạn. Timeout unconfirmed không là durability. Map FE-15.

### W-12 — New edit survives old ACK

Send A version0/keyK,choose B trước ACK A. ACK version1: B visible/pending,server snapshot A; next B uses expectedVersion1/new key. Duplicate ACKK sau version2 không revert version/xóa B. Test cả server snapshot và draft,không chỉ string của component. Map FE-15/16.

### W-13 — Conflict atomic/multiple tabs

Hai tabs khác lựa chọn:409 giữ losing draft,refetch latest version và explicit compare/decision. Batch2 items với một stale item không được claim item kia đã save. Không mint new key trước reconciliation; marks cũng có conflict test. Map FE-16.

### W-14 — Clock/resume/offline

Client clock drift,tab background/interval throttled,reauth dialog không kéo dài countdown. Reconnect sau deadline:canSave=false khóa edit. Reload khôi phục ACKed answers,copy về mất memory draft rõ. Unknown answer page không version0,beforeunload không guaranteed save. Map FE-14/17.

### W-15 — Manual submit/failed save

Pending saves:freeze/flush/wait ACK. Failed save khi còn giờ:retry/cancel,không silent submit. POST không answer body;ACK202 status. Double click/timeout sau commit retry same key/status lookup,không lượt mới. Map FE-18.

### W-16 — Deadline/race

Deadline với offline/in-flight save:stop new edits/saves,best-effort submit persisted answers,show unconfirmed count. Late answers không retry thành fresh valid mutation. Predeadline save ACK đến muộn xác nhận outcome cũ,không mở editing lại. EXPIRED có thể COMPLETED. Server sweep cần backend proof riêng. Map FE-17/18/20.

### W-17 — Processing/polling

202 pending không error;SUBMITTED/EXPIRED text processing giữ durable state. Poll2→10s+jitter/hints,pause hidden,one refresh khi visible,stop terminal/5min. FAILED false stop,replay true pending bounded. Không ETA/%fake/duplicate pollers/timer leak. Map FE-19.

### W-18 — Result/review

5/6 với basisPoints8333 hiển thị83.33%,correct2/3;không official conversion. review=null không fetch keys;released review có permissions/owner gate và bounded pages.403/logout evict cache. Candidate payload/bundle không unreleased keys;section labels không current-version substitution. Map FE-20.

### W-19 — History/ranking

Null score “Chưa có”,owned unpublished attempts vẫn resume. Ranking version-bound,pseudonym only;opt-out/disabled suppression theo server contract. Không identity join/isMe guess/total từ page. Manual watermark refresh/cursor expiry hoạt động. Map FE-21.

### W-20 — Admin content/revisions

Reviewer không manage/keys/replay khi thiếu specific permission. Question limits/cardinality/positions valid,plaintext literal. Exam full replacement/revision/timezone UTC roundtrip/sections/membership preflight.409 giữ draft,publish creates new version,unpublish/archive không đổi old attempt. Map FE-22–25.

### W-21 — Import

JSON1MiB/1–100/schemaVersion1/unique clientRef. Structurally invalid JSON khác semantic report. Dry-run valid vẫn committed=false;real invalid inserts none. Dry-run→real new key;real retry same key/body returns accepted outcome. Không CSV/XLSX/remote URL/raw logs. Map FE-26.

### W-22 — Monitor/replay

Active là lifecycle,không online presence;visible polling bounded. Replay FAILED/reason/current revision/permission/key;202 queued,không completed. Duplicate replay action bị chặn. Live revision gap BLOCKED,không candidate impersonation/default0. Key review permission khác score read. Map FE-27.

### W-23 — Reports honesty

0 completed denominator khôngNaN;multi-option counts không partition pie;scope đúng version. Metrics snapshot không history chart khi thiếu nguồn;cost/CPU/p99 thiếu không0. Audit readonly safe fields,không secrets/SQL/answers. asOf/stale labels và bounded memory. Map FE-28.

### W-24 — Accessibility/performance/artifacts

Viewport/keyboard/zoom/reduced-motion/focus matrix bên dưới,network/bundle budgets theo task doc. Live artifact không mock/credentials;web build giữ API migrations;deep-link fallback không biến API404/missing assets thànhHTML. No service worker/private offline cache. Report actual hardware/mode,không mock-to-production inference. Map FE-29–32.

## 4. Manual visual/a11y matrix

| Page family     | Visual cases                                    | Manual interaction                                       |
| --------------- | ----------------------------------------------- | -------------------------------------------------------- |
| Auth            | form/error/429/success,320/390/1440             | keyboard,paste,password manager,reveal,summary focus     |
| Verification    | missing/valid/expired/authenticated conflict    | no automatic POST,explicit confirmation,fragment privacy |
| Browse/detail   | long title/empty/error/cursor                   | category/loadmore/start confirmation                     |
| Exam            | 1440/768/320,500 questions/long options         | radio/checkbox,next/jump/mark/clear,mobile sheet         |
| Save/submit     | pending/offline/conflict/unknown ACK/deadline   | reconcile dialog,save-error cancel,button separation     |
| Results/history | null score/denied/allowed/long explanation      | authorized fetch/navigation/cache clear                  |
| Admin editor    | 20 sections/500 references/long prompt/conflict | keyboard reorder,timezone/publish confirmation           |
| Admin reports   | wide table/zero/missing/stale/denied            | contained scrolling,readonly audit,polling pause         |

Zoom200% không clip controls hoặc sticky bars che focus. Check contrast4.5:1 normal text/3:1 relevant large content,visible focus,status ngoài màu. Axe không critical/serious findings trên tested routes;manual screen-reader/keyboard evidence vẫn cần. Tool output không certifies full WCAG compliance. [W3C reference](https://www.w3.org/WAI/WCAG22/quickref/).

## 5. Browser automation/production separation

Playwright dùng user-observable assertions/auto-wait,không fixed sleep;fixture control delayed commit. Failure screenshots/traces được redacted,không verification token/auth body. [Playwright assertions](https://playwright.dev/docs/test-assertions).

Chạy Chromium/Firefox/WebKit representative flows khi có environment;feature-detect và verify refresh coordination riêng. Thiếu browser/environment=NOT RUN/BLOCKED,không universal compatibility claim. HTTPS Identity proof dùng actual restricted backend/local mail;live SES/AWS operations riêng.

32 FE tasks không tăng216 product items. WEB-01 cần actual build/budget/asset strategy;WEB-02/ID-07 cần live HTTPS browser;WEB-10 cần actual E2E/a11y. Catalog/Assessment/Reporting live blockers không đóng bằng fixtures. Không suy AWS capacity/cost/SLO/recovery từ UI report.

## 6. Grok final deliverables

- [x] Runbook install/dev/build/preview/test, origin/TLS, public env, data modes. Xem [runbook](runbook.md). HTTPS vẫn BLOCKED.
- [x] Route/action inventory, demo scenarios, live capability map/UI-GAP statuses. Xem [ui-gap](ui-gap.md).
- [x] Screenshots 320/390/768/1024/1440, errors/conflicts. Thư mục [evidence/screenshots](evidence/screenshots) và [fix screenshots](evidence/fix-2026-10-07/screenshots). Layout viewport 720 và 384 không tràn trang. CSS zoom 2 trên viewport 320 cố định cắt dock và không phải browser zoom. Empty cursor vẫn NOT RUN.
- [x] Component/coordinator/browser results với lệnh, mode và PASS/FAIL/BLOCKED/NOT RUN. Xem [evidence](evidence/README.md) và [fix evidence](evidence/fix-2026-10-07/README.md).
- [x] Bundle numbers với máy và profile. Đề 500 câu đã tải trên live preview. LCP/CLS vẫn NOT RUN, không bịa.
- [x] Security/cache/fragment/key/mode isolation findings và remaining live gates. Fragment browser NOT RUN.
- [x] Updated FE task checklist. Không tick task khi check chưa chạy.
- [x] Review/limitations/backend dependencies. Không bắt đầu ORM/AWS.
