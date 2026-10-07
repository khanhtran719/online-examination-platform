# Frontend implementation tasks — senior hướng dẫn junior

**App `apps/web` đã có.** Checklist không phải production acceptance. **7/32 checked: FE-01/03/04/07–10**; FE-32 còn IN PROGRESS. [HTTPS Identity evidence](../evidence/identity-https-2026-10-07/README.md) đóng named local ID-07/WEB-02 với API/PG/SMTP thật và10 Chromium cases, sau [fix evidence](evidence/fix-2026-10-07/README.md). Live Catalog/Assessment/Reporting, permissions UI-GAP-01 và public PKI/SES/AWS vẫn mở. API boundary fixes enforce existing security contract; không đổi ORM/schema. Public visual work có scope riêng. Xem [runbook](runbook.md), [UI-GAP](ui-gap.md), [review](review-2026-10-07.md) và [roadmap](../implementation-roadmap.md).

## 1. Cách làm một task

Trước task, mở đúng input/schema, xác định component và data mode; viết acceptance thành test/scenario khi logic quan trọng. Làm lát cắt nhỏ, chạy focused checks, tự xem browser ở desktop/mobile, rồi mới tick. Không tick vì file đã tồn tại. Với tính năng chưa có API, giao demo có tương tác + Http adapter theo schema + live unavailable state; ghi riêng live dependency. FE task không tự đóng ID/CAT/ATT/REP/WEB production gates.

Mỗi task để lại: files đổi, behavior, tests/checks đã chạy, screenshot nếu đổi layout, mode đã kiểm chứng và gap còn lại. Nếu không có tool browser, ghi visual/E2E NOT RUN và không claim đã nghiệm thu các gate đó. Không hứa một command chạy khi chưa thêm package script thật.

Đường đi: FE-01→06 foundations; FE-07→11 Identity; FE-12→13 catalog; FE-14→18 exam engine; FE-19→21 results; FE-22→28 Admin; FE-29→32 acceptance. Auth correctness và exam coordinator đi trước dashboard polish. Không chuyển sang phase tiếp theo khi critical regression còn đỏ; mode-specific backend blockers được tách rõ.

## 2. Master checklist

- [x] **FE-01** Repository/contracts/dependency audit và report baseline. — PASS. Gap register và runbook. Không sửa API/migration/ORM.
- [ ] **FE-02** Bootstrap app/build/tooling riêng, giữ API build. — PARTIAL. `web:typecheck`, `web:lint`, `web:test`, `web:build`, `web:build:demo` đạt. Root `dist` còn 8 file SQL sau web build. Review mới: root lint/typecheck/build và100 unit/tooling cases PASS; quality PASS ban đầu, lần cuối FAIL vì test placement của persistence đồng thời. Clean install NOT RUN nên task vẫn PARTIAL. `npm audit` ở `apps/web`: 9 high, 0 critical; không `audit fix --force`.
- [x] **FE-03** Typed DTO/capability contracts và HTTP envelope mapping. — PASS. `http-parse.test.ts` gồm 202, malformed, điểm null, profile không bị bịa permissions, UUIDv7.
- [x] **FE-04** Deterministic demo scenarios, mode isolation. — PASS cho tách artifact và một transition. Live `apps/web/dist` không chứa “Dữ liệu mẫu” hay `candidate@example.test`. Browser đã chạy conflict-save. 429/503/lose-ack/delay-ack có trong demo server, browser NOT RUN.
- [ ] **FE-05** Tokens, typography, reusable UI primitives. — PARTIAL. Token, font self-host, primitive và `/dev/ui` có trong bản demo. Axe home 320/1440 không serious/critical. Ma trận keyboard của showcase NOT RUN.
- [ ] **FE-06** Public/Candidate/Examination/Admin shells và route map. — PARTIAL. Prior preview evidence giữ nguyên; H01 chứng minh API404 JSON không bị SPA rewrite và H05 private deep-link reload phục hồi qua session thật. Full shell/browser/public visual acceptance vẫn riêng.
- [x] **FE-07** Same-origin HTTPS/CSRF transport foundation. — PASS local: H01/04/05/10 với real API; Secure/HttpOnly/host-only cookies, signed context/Origin rejection, metadata-only Session, empty-body POST, complete response timeout. [Runbook](../runbooks/identity-https.md); scoped ephemeral leaf trust, không AWS public TLS acceptance.
- [x] **FE-08** Register/check-email/resend. — PASS local: normalized form/body tests, actual delayed worker SMTP, browser duplicate202/one intent/no session, generic suppressed resend và cooldown. Server integration kiểm tra absent/disabled/verified policies; Retry-After regressions giữ nguyên. Live SES vẫn ID-11.
- [x] **FE-09** Inert email verification/final password. — PASS local H02/03/04: GET/scanner inert, fragment scrub/reload loses secret, no DOM/URL/referrer/storage leak, explicit anonymous POST, final-owner password, expiry/replay không đổi password hoặc auto login; authenticated context bị từ chối.
- [x] **FE-10** Login/refresh coordination/logout/reauth. — PASS local H05–09: hai tab shared cookies/Web Locks thật chỉ rotate một lần, restart, disable/logout broadcast, lost ACK không application replay, explicit login reset recovery và profile reauth link. Unit unsupported coordination/late outcome/token-free broadcast và existing draft-preservation checks PASS. Chromium only; broader browser matrix/real Assessment vẫn gate riêng.
- [ ] **FE-11** Profile/revision và authoritative permission boundary. — PARTIAL. H05/08/10: profile200/409 và lost/stalled-body same-receipt retry chỉ một write PASS trên real HTTPS/PG. Full permission source, cross-actor/frontend cache acceptance và live Admin còn UI-GAP-01.
- [ ] **FE-12** Dashboard/browse/cursor/empty states. — PARTIAL. Browser đã mở danh sách và đề tiêu đề dài. Cursor hết hạn và live catalog 404 NOT RUN thành case riêng.
- [ ] **FE-13** Detail/start confirmation/idempotent resume. — PARTIAL. Browser xác nhận rồi bắt đầu đề Đại học. Đề Networking đang có lượt cũ nên start trả lại lượt đó. Lost ACK của start NOT RUN trên browser.
- [ ] **FE-14** Owned question/answer loading và three-type renderer. — PARTIAL. Unit: prompt/option là text, không thành script/img; không suy version 0 khi answer scope chưa đủ. Browser W-14 PASS. Live preview 500 câu: trang đầu 0 radio, 24 lần tải thêm, 500 ô phiếu. Đủ ba loại câu trên browser NOT RUN.
- [ ] **FE-15** Autosave coordinator với immutable in-flight batches. — PARTIAL, chưa tick. Probe Retry-After giữ 10000 ms. Reducer: jitter không rút Retry-After, một in-flight, nút thử lại dùng lại key/body đã hết lượt. Phòng 500 câu sạch không gửi PUT trong 2,5 giây. HAR lịch lưu khi đang dirty NOT RUN. Bằng chứng RED cũ giữ ở [review](review-2026-10-07.md).
- [ ] **FE-16** Conflict/old ACK/multiple-tab reconciliation. — PARTIAL. Reducer và browser đã chọn “Dùng bản máy chủ”, không tự ghi đè. Hai tab trình duyệt NOT RUN.
- [ ] **FE-17** Server countdown/reconnect/resume/deadline. — PARTIAL. Unit: đồng hồ monotonic, không kéo dài khi nhảy giờ tường. Browser thấy đồng hồ chạy. Drift/ẩn tab NOT RUN trên browser.
- [ ] **FE-18** Manual/deadline submit/unknown outcome. — PARTIAL. Unit: hết giờ không gửi lại save trong 10 giây cuối và không cho retry reset đồng hồ transport. Browser W-16: một POST submit sau save bị giữ. Nộp thủ công và lost ACK trên browser NOT RUN. W-16 chưa chạy lại sau rebuild chỉ đổi brand.
- [ ] **FE-19** Processing/failed/replay-pending polling. — PARTIAL. Unit: backoff, hint, dừng terminal hoặc 5 phút. Browser polling NOT RUN.
- [ ] **FE-20** Result/authorized review/no scoring leak. — PARTIAL. Browser: 5/6 và 83.33%, có câu không quy đổi IELTS/TOEIC. W-18: 403 gỡ lời giải đã tải. Các cửa NEVER/AFTER_EXAM_CLOSE trên browser NOT RUN.
- [ ] **FE-21** History/version leaderboard/privacy. — PARTIAL. UI và demo có trang. Browser leaderboard/opt-out NOT RUN.
- [ ] **FE-22** Admin permissions shell/question-bank list. — PARTIAL. Demo chỉ hiện “Quản trị” khi preset có quyền quản trị; smoke cũ đòi link đó nên FAIL. `/admin` vẫn vào được bằng URL. Live đã đăng nhập NOT RUN vì không có Identity HTTPS.
- [ ] **FE-23** Question editor/preview/revision/archive. — PARTIAL. Demo smoke lần hai dùng revision đã nhận, Playwright PASS. DemoApi trả bản sao transport. Lost ACK và conflict trên browser NOT RUN.
- [ ] **FE-24** Exam sections/membership/schedule editor. — PARTIAL. Load membership lấy `question.points` của đề đã tải. Policy mặc định là NEVER. Unit đổi giờ `Asia/Ho_Chi_Minh` và `America/New_York` có roundtrip UTC. Browser editor, reorder và confirm phát hành NOT RUN.
- [ ] **FE-25** Publish/unpublish/archive/conflict flows. — PARTIAL. Hành động có trong code. Browser publish NOT RUN.
- [ ] **FE-26** Bounded JSON import/dry-run/report. — PARTIAL. Validator và trang có trong code. Browser import NOT RUN.
- [ ] **FE-27** Monitor/submissions/admin result/replay. — PARTIAL. Trang có trong code. Replay live BLOCKED theo UI-GAP-06. Browser monitor NOT RUN.
- [ ] **FE-28** Statistics/metrics/audit, no synthetic live metrics. — PARTIAL. Browser metrics hiện “HTTP p99: Chưa có dữ liệu” và “Chi phí: Chưa có dữ liệu”. Nhật ký mở được. Mẫu 0 không thành NaN có unit `rateLabel`. Biểu đồ không có.
- [ ] **FE-29** Responsive, keyboard/focus/accessibility verification. — PARTIAL. Trang chủ năm bề rộng và phòng thi 320 không tràn. Focus radio không nằm dưới dock. Layout viewport 720/384 không tràn. CSS zoom 2 trên viewport 320 cố định cắt dock. Keyboard radio/phiếu PASS; login Tab đầu dừng ở “Kịch bản mẫu”. Firefox/WebKit và keyboard admin NOT RUN. Không phải chứng nhận WCAG.
- [ ] **FE-30** Browser scenarios/security/cache isolation. — PARTIAL. Năm ca review W-14, W-06, W-16, FE-23, W-18 PASS trên preview. Hai smoke cũ FAIL vì copy và menu quyền, xem [fix evidence](evidence/fix-2026-10-07/README.md). Probe CSRF một realm Node, lastStatus 200, không phải HTTPS. W-01–W-24 không được tick đủ.
- [ ] **FE-31** Bundle/render/request budgets/static artifact readiness. — PARTIAL. Live home gzip level 9: JS ban đầu 129916 byte, CSS 3370 byte, font đã phát 100600 byte raw. Năm font trang chủ yêu cầu 55920 byte raw. Đề 500 câu đã tải trên preview. LCP/CLS NOT RUN. Không phải p75 production.
- [ ] **FE-32** Final self-review, runbook, evidence and truthful handoff. — IN PROGRESS. Local Identity HTTPS có10PASS/73 current web units và [runbook](../runbooks/identity-https.md); WEB-02 được đóng với evidence riêng. Full exam/Admin/browser/performance/deployment review vẫn chưa xong. Historical RED/fix artifacts không viết lại; không tuyên bố production readiness.

## 3. Foundations

### FE-01 — Hiểu repository trước khi chạy scaffold

Input: AGENTS, profile, ADR-007, OpenAPI, package/build/Jest/ESLint configs, UI-GAP register. Lập inventory chín Identity routes đang chạy và phần business chưa có. Kiểm tra repo có `apps/web` implementation chưa; nếu đã có, giữ hoặc migrate có giải thích. Đọc root build đang xóa root dist; ghi danger nếu Vite cũng dùng đó.

Deliver: implementation note với stack/version candidates, data modes, capability gaps và plan giữ backend checks. Acceptance: không tự sửa API/migration/ORM; các gap01–08 có owner/blocked status. Test: đây là inspection/report, không tạo tests giả hoặc khởi động AWS.

### FE-02 — Bootstrap một frontend thật

Depends FE-01. Tạo `apps/web` package React/TS/Vite với strict types, rõ dev/build/preview/typecheck/lint/test scripts và output `apps/web/dist`. Cài compatible pinned dependencies, cập nhật lockfile bằng package manager của repo; không bỏ root scripts. Thêm CSS Modules/assets/test tooling cần dùng, không cài hai UI/state frameworks song song. Root API build/test/lint cần tiếp tục pass; nếu root lint quét TSX, thêm cấu hình đúng phạm vi.

Deliver: app shell trắng có route cơ bản và build artifact thật. Acceptance: clean install và commands được quảng cáo chạy được; API SQL bundle không mất sau web build. Check: frontend typecheck/build, backend build/quality regression; security scan dependencies mới khi có registry access.

### FE-03 — Typed API boundary

Depends FE-02. Generate/derive DTOs từ OpenAPI; adapter không thêm fields. Tạo HTTP client xử lý envelope, metadata cursor, status202, safe errors, Retry-After/correlation. Feature capability interfaces tách auth/catalog/attempt/result/admin; read hooks gọi interfaces, component nhận view models. Không cho components fetch trực tiếp hoặc import backend implementation.

Deliver: types/client/adapters và focused tests cho malformed/error/202/null/list payloads. Acceptance: Session không token, Profile không fabricated permissions, Result null scores/pending không bị chuyển0. Wrong request fields hoặc version types phải lỗi compile/validation. No invented endpoints.

### FE-04 — Demo có tương tác

Depends FE-03. Tạo deterministic synthetic fixtures cùng route models; mock backend state lưu riêng khỏi UI draft để ACK có nghĩa khác click. Scenario controls áp dụng delay/conflict/commit-lost-ACK/429/503/review gates/replay. Chọn data mode trước bootstrap; banner tồn tại trên mọi demo route. Live lỗi không đổi mode.

Deliver: demo flows chạy end-to-end, scenario catalog và reset state. Acceptance: Candidate payload không keys; permission fixture chỉ demo; live production build không mock imports/assets/scenario switches. Check: contract-shape fixtures, demo transitions và artifact mode separation. Không claim cookie mock là live auth proof.

### FE-05 — Design system nhỏ nhưng đủ

Depends FE-02/04. Áp tokens/type/spacing/radius; self-host fonts hợp lệ hoặc system fallback có ghi chú. Build Button/Input/Checkbox/Radio/Badge/Alert/EmptyState/Skeleton/Dialog/Drawer/Table/SaveStatus. Native semantics trước; dialog dùng primitive đã được kiểm chứng nếu không tự đáp ứng focus. Không một component options object chứa toàn bộ app.

Deliver: internal component showcase chỉ dev, có variants/states bằng real Vietnamese labels. Acceptance: focus/reduced-motion/error/disabled/overflow đúng; contrast kiểm tra, không dùng màu duy nhất. Check: browser keyboard smoke và screenshot desktop/mobile; không viết snapshot phản chiếu toàn bộ implementation vô nghĩa.

### FE-06 — Shells và browser routes

Depends FE-05. Build bốn layouts theo spec, route lazy loading,404/error boundary, protected route loading state. Verification route isolation phải xảy ra trước telemetry/bootstrap có thể ghi URL. Sidebar/nav visibility lấy permission capability, không role string; placeholder live admin blocked theo gap01.

Deliver: mọi browser route có entry/redirect/back; unknown route404, refresh deep-link phục hồi shell. Acceptance: exam shell không mang admin/sidebar/marketing; mobile drawers không che controls. Check: direct navigation + browser refresh + forbidden live Admin; không SPA-rewrite `/v1`404 thành HTML.

## 4. Identity và browser session

### FE-07 — HTTPS/CSRF nền tảng

Depends FE-03/06. Set same-origin dev proxy `/v1`, browser origin trùng API PUBLIC_ORIGIN; chuẩn bị documented TLS test config, không bundle secrets. Implement csrf fetch/expiry/context invalidation và unsafe headers; đừng manually set Origin. Empty-body actions không gửi JSON Content-Type vô cớ. Handle safe correlation/error text.

Deliver: transport tests và local HTTPS guide. Acceptance: browser gửi đúng Secure cookies/Origin/CSRF, token không JavaScript storage/log. HTTP-only preview được ghi demo/dev, không dùng đóng HTTPS gate. Check: live browser request/Set-Cookie proof khi environment sẵn; chưa sẵn thì BLOCKED, không đổi flags cho pass.

### FE-08 — Register/check-email/resend

Depends FE-07. Form đúng limits, confirm-password chỉ UI; preserve paste/autocomplete. Generic202 đưa check-email, không session. Resend60s minimum cooldown, Retry-After429, generic response cả suppressed request. Email chỉ component memory, không URL/password storage.

Deliver: AU-02/03 đủ loading/error/success. Acceptance: duplicate register không hứa tạo thêm account/delivered mail; submit body không confirm field. Check: valid/invalid fields, duplicate generic202, delayed mail, cooldown/retry; actual SMTP/mail scenario riêng khi live backend sẵn.

### FE-09 — Verification page an toàn

Depends FE-07/08. Đọc fragment, validate shape, scrub URL, giữ token memory, skip analytics/third-party scripts. Anonymous CSRF; authenticated user được hướng dẫn logout trước. Final password explicit submit, no page-load POST/no automatic login. Missing/expired/replayed token states theo spec.

Deliver: AU-04 và integration tests. Acceptance: page GET/email scanner không activate; confirmed success không auth session; refresh sau scrub không recover secret. Check: DOM/network/storage/log traces không token leak, retry consumed challenge không hứa đổi password. Đây là task cần làm sớm để đóng UX gap đang có, trước exam polish.

### FE-10 — Login/refresh/logout

Depends FE-07/09. Implement expiry metadata, bootstrap me, safe return path và one refresh Promise. Add Web Locks/BroadcastChannel coordination with feature detection; under lock kiểm tra session trước rotate. Define refresh unknown-outcome→reauth policy. Logout clears private caches; exam reauth preserves memory draft while timer continues.

Deliver: auth coordinator và AU-01/session dialogs. Acceptance: concurrent tabs không cố refresh hai lần; no raw token broadcast, no retry loop401/403; unsupported coordination fallback rõ. Check: wrong credentials generic, expired access, two-tab refresh, refresh response lost, disable/revoke, logout retry. Record actual browser support, đừng hứa mọi browser.

### FE-11 — Profile và permission capability

Depends FE-10. Profile readonly email/verifiedAt, editable displayName/opt-in với expectedRevision/key. Add permission provider interface: live source hiện thiếu, do not invent role; demo scenarios can pass current declared permission sets. Form conflict preserves draft và refetch-reconcile.

Deliver: CA-10/permission route guard/source gap report. Acceptance: opt-in defaultfalse, no email/password/role mutation; live Admin không bật từ profile ID/selection. Check: profile409/receipt retry/new edit before ACK/cache isolation,permission changes error gating. Full live admin remains UI-GAP-01 BLOCKED.

## 5. Catalog và exam engine

### FE-12 — Dashboard/browse

Depends FE-06/10/03. Bắt đầu với recent history và exam page đầu; category là filter server-supported. Làm cursor loadmore/reset khi filter đổi, rồi empty/error/long-title states. Không thêm summary API, total hoặc global search giả; history thiếu title dùng fallback.

Deliver: CA-01/02 demo và Http adapters/unavailable states. Acceptance: không N+1 detail mỗi row, không total từ partial page, live lỗi không thành mock. Test filter reset, expired cursor, null/empty và payload dài. Live business endpoints vẫn pending.

### FE-13 — Detail/start

Depends FE-12. Render current publication metadata và start dialog trước; sau đó thêm UUIDv7 stable key, existing-attempt resume và duplicate-click guard. Handle unavailable/limit/late start/timeout. Thời gian preview trước start là estimate; deadline từ Attempt mới authoritative.

Deliver: CA-03. Acceptance: không load questions trước owned attempt, không quota refund/cancel hoặc remaining slots giả. Test commit-lost-ACK, returned old attempt, republished version, partial time. Không gắn old attempt vào metadata của current publication.

### FE-14 — Question loading/renderer

Depends FE-13. Tách owned question pages, saved answer pages và draft state. Theo dõi unknown answer khác known absent/version0. Build radio/checkbox/plaintext renderer, clear/mark, previous/next/jump, mobile navigator. Section/title/ordinal chỉ dùng frozen context hợp lệ.

Deliver: CA-04 interaction slice. Acceptance: renderer không keys/explanations; failed page không thành blank answer. Test three types, max prompt/options, old unpublished version, paged navigation. UI-GAP-02 phải có fallback navigator giới hạn hoặc BLOCKED LIVE, không metadata substitution.

### FE-15 — Autosave coordinator

Depends FE-14. Viết reducer/queue tests trước phần UI: local sequence/baseVersion, immutable capture/key/body. Implement500ms debounce,10s±20% dirty flush,1–20 distinct items,one in-flight và bounded eligible retry. SaveStatus đọc ACK, không optimistic Saved.

Deliver: coordinator + connected controls. Acceptance: marked/clear được lưu, batch atomic, clean không gửi request. Test delayed ACK/newer edit/timeout/429/503/deadline. Dùng network log chứng minh schedule; tắt default mutation retries để không có hai retry layers.

### FE-16 — Conflict/multiple tabs

Depends FE-15.409 suspend writes cho conflicted scope; refetch supported paged answers, giữ local intent. Drawer đối chiếu server/local, explicit user decision rồi mới new version/key. ACK dùng max version và captured sequence; broadcast chỉ giúp UX.

Deliver: conflict UI và race tests. Acceptance: lựa chọn B sau khi A sent còn pending sau ACK A; duplicate old ACK không xóa B hoặc hạ version2. Test two-tab edits/marks và một stale item abort whole batch. Không last-writer-wins tự động.

### FE-17 — Countdown/resume/reconnect

Depends FE-14/15. Viết clock hook nhận serverNow/deadline/monotonic elapsed/RTT uncertainty; resync visibility/reconnect. Resume sau reload chỉ server state; explain loss of unconfirmed memory draft. canSave=false override local timer.

Deliver: timer/resume/offline states. Acceptance: thời gian không tăng qua drift/background tab/reauth/modal. Test injected drift, throttled interval, late reconnect, post-lock deadline rejection. Screen reader chỉ announce milestones, không từng giây. Không thêm persistent storage để che gap.

### FE-18 — Submit

Depends FE-15–17. Manual flow freeze edits→flush→wait ACK→POST no answers. Save failure khi còn giờ cho retry/cancel; deadline branch nộp persisted data. Retain one logical submit key qua retries; lost ACK dùng status reconciliation.

Deliver: confirmation/manual/auto-submit flows. Acceptance: chưa success response thì chưa “Đã nhận bài”; pending edits không được upload late. Test save-submit race,double-click,commit-lost-ACK,offline deadline. Server sweep được ghi backend dependency, không giả browser guarantee.

## 6. Results/privacy

### FE-19 — Status/polling

Depends FE-18. Map durable lifecycle/replayPending, rồi implement2→10s+jitter/server hints/hidden pause/5-minute cap.202 Result là pending success; không %/ETA giả. FAILED false stop, replay true continue bounded.

Deliver: CA-05. Acceptance: terminal dừng polling, không mutate status thànhPROCESSING hoặc submit lại. Test submitted/expired→complete,failed/replay,429,5-minute stop. Network log chứng minh không duplicate pollers và không request storm.

### FE-20 — Result/review

Depends FE-19. Render earned/possible/correct/total/basis points; section labels chỉ frozen context. `review=null` chặn fetch; review href phải relative/allowlisted theo contract, tải riêng bounded. Tách query scopes và clear sensitive cache khi logout/403.

Deliver: CA-06/07. Acceptance: không browser grading/official conversion, keys không hidden preload. Test NEVER/AFTER_COMPLETION/AFTER_EXAM_CLOSE gates,expired score,missing explanation,malicious plain text và cross-user cache isolation. Permissions/release luôn server authority.

### FE-21 — History/leaderboard

Depends FE-12/20. History CTAs theo status, nullable score đúng, cursor loadmore. Ranking per version chỉ pseudonym/rank/score/time; profile opt-in link,disabled state,manual refresh reset watermark. Không “you” highlight nếu thiếu isMe.

Deliver: CA-08/09. Acceptance: không real identity join/version merge/total từ page. Test opt-out/disabled,watermark changes,expired cursor,old version/unpublished history và missing-title fallback. Không tự phát sinh list/version endpoint.

## 7. Admin

### FE-22 — Admin gate/bank list

Depends FE-06/11. Làm permission-scoped nav/route/actions trước; live thiếu source thì blocked, demo có permission sets. Bank cursor list và picker dùng prompt preview/type/points/revision/archived, không global search không có API.

Deliver: AD-04/Admin shell. Acceptance: catalog.manage không ngầm có keys.read; server403 vẫn enforce khi mở direct route. Test readonly reviewer,direct URL,permission loss/logout/cached data. Route guard là UX, không security boundary thay backend.

### FE-23 — Question editor

Depends FE-22. Build type-specific options/keys validation,plaintext fields/points/limits,keyboard reorder và safe Candidate preview. Save full body/revision/key; archive confirmation. Type change confirm khi mất content và remove invalid keys.

Deliver: AD-05. Acceptance: true-false đúng hai options,mỗi loại cardinality đúng,không HTML execution. Test2–10 options,8000-character prompt,409 giữ draft,receipt retry,new local edit before ACK. Archive không sửa frozen published snapshot theo contract.

### FE-24 — Exam editor

Depends FE-23. Info/sections/preflight tabs; timezone-aware conversion,bank picker,cursor,membership position/points. Check1–20 nonempty sections,500 unique questions và integer duration. Separate local draft/server revision; receipt refetch không xóa edits mới.

Deliver: AD-03. Acceptance: request full replacement đúng schema,create expectedRevision đúng,không entity leakage sang Candidate. Test timezone roundtrip,schedule invalid,duplicate membership,max limits và accessible reorder. Backend publish validation vẫn authoritative.

### FE-25 — Publish/unpublish/archive

Depends FE-24. Admin exam list/actions theo permission,preflight+publish confirmation,immutable version notice. Handle revision/receipt/refetch,disable duplicate action;409/422 giữ draft. Unpublish/archive notice giải thích existing attempts.

Deliver: AD-02/actions. Acceptance: Save Draft khác Publish,archive logical,không refund quota/sửa điểm tùy ý. Test publish race,invalid publication,timeout stable key,old attempt resume. Không backend API/ORM edits để làm button hoạt động.

### FE-26 — JSON import

Depends FE-22/23. File/paste cap UTF-8 bytes1MiB; parse local; dry-run report semantic issues; explicit real import/new logical key. Retry mỗi action giữ key/body; report route dùng actual schema.

Deliver: AD-06. Acceptance: schemaVersion1,1–100 entries,no CSV/XLSX/remote URL; dryRun không claim committed,real import atomic. Test malformed/oversize/duplicate clientRef/invalid keys/mixed validity/lost ACK. Không log raw import hoặc gợi ý new-key retry tạo duplicates.

### FE-27 — Monitor/submissions/replay

Depends FE-19/25. Active rows theo lifecycle,không online presence; visible-page polling bounded. Submissions supported version filter; admin result/review permissions riêng. Replay requires reason/latest revision/key; live gap06 blocked until authoritative capability exists.

Deliver: AD-07/08/09. Acceptance: không impersonation/force-submit/default revision,không replay COMPLETED. Test hidden pause,permission loss,replay duplicate,reason validation,replayPending. Demo đủ interaction; report tách live dependencies.

### FE-28 — Stats/metrics/audit

Depends FE-27. Stats theo frozen version/completed denominator,overlapping multi-option counts. Metrics snapshot+asOf không chart history giả. Audit cursor/detail readonly và safe fields. Only supported API data; không AWS SDK browser.

Deliver: AD-10/11/12. Acceptance: missing metric không0/price,zero denominator khôngNaN,audit không raw answers/secrets. Test0/1/many,stale refresh,version filter,readonly permission và cache clear. No fabricated exports.

## 8. Acceptance/handoff

### FE-29 — Responsive/accessibility

Depends visual flows. Verify320/390/768/1024/1440,200%zoom,keyboard-only,labels/focus/dialog recovery,reduced motion,sticky controls. Run axe và manual checks; screenshots gồm long content/error/conflict.

Deliver: viewport matrix/repair evidence. Acceptance: tested routes không critical/serious automated findings; keyboard hoàn tất form/exam/admin editing. Library dùng sẵn không là proof. Ghi browsers/versions và NOT RUN khi environment thiếu, không tự đóng visual gate.

### FE-30 — Browser/security regression

Depends FE-07–29. Implement [acceptance scenarios](acceptance-checklist.md) bằng meaningful coordinator/component/Playwright tests. Actual HTTPS Identity khi có environment; separate mock/live reports. Verify DOM/network/cache/URL/logs không credentials/unreleased keys.

Deliver: runnable tests/evidence. Acceptance: required cases không skipped mà gọi complete; mocks không thay live session proof. Test tab races,batch retry,privacy isolation,backend state sau ACK. Browser assertions có auto-wait,không arbitrary sleeps che race.

### FE-31 — Performance/build/static readiness

Depends flows. Đo gzip bundles,initial load/lazy Admin,500-question interaction,memory/polling/request counts. Dùng proposed budgets dưới đây,record hardware/browser/network/CPU/raw measurements. Optimize failing budget nhưng giữ correctness/security.

Deliver: web artifact report/cache/deep-link/release/rollback guide. Acceptance: web build không erase API SQL artifact,live không demo assets,no service worker/no API HTML fallback. Không deploy AWS trong UI increment; actual delivery remains production gate.

### FE-32 — Self-review/report

Depends FE-29–31. Review mọi route/state/DTO/permission/dependency; cập nhật checklist theo actual data mode. Runbook ghi setup,commands,scenario IDs,origin/TLS; env chỉ public values. Giao screenshots,tests,budget numbers và blockers.

Deliver: concise summary + detailed evidence/limitations. Acceptance: no production-ready claim từ mock/screenshots/scripts; critical bugs closed,blocked live explicit. Không tự bắt đầu ORM/AWS/backend phase sau UI. Product ticks chỉ đổi khi named gate có evidence.

## 9. Folder/build guide và proposed budgets

```text
apps/web/
  src/
    app/                 # router, bootstrap, providers, shells
    features/
      auth/              # forms, csrf/session coordinator, auth adapters
      catalog/           # browse/detail/start presentation
      assessment/        # owned questions, drafts, autosave/clock/submit
      results/           # status/result/review/history/ranking
      admin/             # owned editors, reporting UI, permission checks
      profile/           # profile/opt-in
    shared/
      api/               # envelope/error client + transport types
      ui/                # accessible primitives, no feature policy
      styles/            # semantic tokens/global baseline
    demo/                # synthetic adapter/scenarios; excluded from live build
  tests/                 # browser scenarios
  public/                # licensed local fonts/assets
  dist/                  # generated web artifact, separate from API dist
```

Placement guide, không scaffold hết. Tests colocate trong **tests** theo conventions khi áp dụng. Thin pages compose features; exam coordinator thuộc assessment,không shared global god store. Không import backend implementations; minimal dependencies và không hai state frameworks cùng vai trò.

Proposed local gates, chưa đo: initial JS≤250KiB gzip,CSS≤40KiB,font transfer cần dùng≤150KiB; Admin chunks không load trên Candidate exam. Lab LCP≤2.5s/CLS≤0.1 trên fixed mobile profile4×CPU/1.6Mbps/150msRTT; ghi scenario,không coi là production p75. Visible selection p95≤100ms trong500-question fixture; navigation/polling10 phút không growing subscriptions/timers/memory. Thay threshold cần measurement/decision; không bỏ security/ACK/conflict để giảm bundle.

Network gates: one in-flight autosave,zero requests khi clean,≤20 changed items/batch,pages≤100,no N+1 per row,bounded terminal/hidden/5-minute polling.2,000 users poll2s tương ứng khoảng1,000 status requests/s,10s khoảng200/s,chưa tính traffic khác. Đây là arithmetic về offered traffic,không sustainable capacity; giải thích tại sao jitter/backoff/stop cần được đo. AWS performance/cost chưa có evidence.
