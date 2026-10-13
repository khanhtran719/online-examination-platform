# Kiến trúc frontend

PORT-06A 2026-10-13: PublicFrame sở hữu capsule chrome/light footer và session-aware
destinations; shared Navigation chỉ nhận optional CSS slots, không đọc session,
runtime hoặc transport. SampleNavigator là pure view trong experience, dispatch
reducer action có sẵn. Câu hỏi đứng trước navigator trong DOM, desktop 2:1 và
tablet stack; heading embedded theo H2 → H3 → H4. Skip link là phần tử đầu trong
header landmark thật, offscreen khi không focus và trỏ tới main focusable. Không
đổi Sample reducer/data/scoring hoặc official Assessment. Green 3D artwork giữ
approved exception; Home section convergence và Admin typography là increments
riêng. [Plan/review và giới hạn](port-06a-2026-10-13.md).

PORT-05H2026-10-13: Public How/Help/404 thuộc `features/experience`, tách khỏi
Auth barrel; router lazy-load từng page. Nội dung tác giả và topic state local,
FAQ dùng native details/summary; count lấy từ danh sách thực. Không remote query,
session/transport import trong các page hoặc global FAQ/navigation store. 404
không phản chiếu unknown URL; recovery links dùng public destinations cố định
vì chưa có safe-history contract. [Plan/review](port-05h-2026-10-13.md).

PORT-05G2026-10-13: Dashboard compose `dashboard-attempts`/`dashboard-catalog`,
controller chọn bounded first20 history/first3 category catalog. Feature-owned
snapshot helper scopes resource/actor/epoch/filter; signals reject late reads,
401/403 latch riêng channel, session loss purge cả hai. Immediate denial/wait
refs chặn callback trước render, clocks monotonic theo auth scope; no automatic
retry/focus/reconnect/polling. Stale snapshots có notice, frozen title khớp
owner/version; pure model map paths/nullable score. [Review/limits](port-05g-2026-10-13.md).

PORT-05F2026-10-13: Identity pages compose finite feature controllers/forms.
`use-login` tách login ACK và authoritative profile read; explicit GET-only
recovery phải khớp userId trước `session.replaceActor`. Register/resend generic
202; Verify explicit anonymous POST và same-body retry trong mounted memory.
`use-auth-scope` dùng route/session/actor/reauth/local epoch và unmount fence.
Session reload có read-generation guard; local epoch là UI invalidation, không
phải token/session authority. Anonymous bootstrap không bị treo bởi refresh
reauth metadata trước khi có principal. Password/token/email không history/store;
registration chỉ handoff acceptance metadata. Không vendor client trong feature
hoặc runtime/session trong shared UI. [Review/evidence](port-05f-2026-10-13.md).

PORT-05E 2026-10-13: `features/profile/use-profile.ts` sở hữu finite profile
write/read coordinator, actor scope và immutable intent; page compose settings
và dialogs. `app/session.syncProfile` chỉ sync same actor/email với revision
không lùi; không xác thực hoặc reset refresh coordinator như `adoptProfile`.
Receipt khác current projection; read lỗi sau ACK không POST lại. Local dialogs
reset theo actor/auth scope. [Review/limits](port-05e-2026-10-13.md).

PORT-05D2026-10-13: `features/assessment/use-room-reads.ts` sở hữu actor/attempt
queries, retry/focus policy, response/signal fencing và scope cleanup;
`use-exam-room.ts` sở hữu autosave/submit coordination và exact frozen metadata.
Page compose toolbar/question/navigator/dialog; feedback form giữ local fields.
Server receipt/deadline/version vẫn authoritative; controllers không tạo score.
Conflict cần full snapshot và explicit choice, unknown submit bounded serialized
reconciliation với cùng key. Local page state reset theo actor/attempt. Ordinal
view liên tục theo cursor order, không sửa DTO position trong từng section.
Full answer scope đủ để infer absence0 cho loaded questions; không cần eager
load toàn bộ question pages. [Review và limits](port-05d-2026-10-13.md).

PORT-05C2026-10-13: Status/Result/Released Review thuộc `features/results`; page
compose controller hooks, shared UI không đọc runtime/session. Poll local state
có actor/attempt fence; result/review query keys có actor/attempt và cleanup.
Optional status metadata không grant score access. Query signal kiểm sau response
vì PlatformApi chưa có abort parameter. Gate pending/closed/error purge review;
explicit release check bỏ chain và tải page1, không dựa isFetching transition có
thể bị batch. Selection/filter local, loaded-only; immutable review staleTimeInfinity
không thay server authorization và mỗi release check bỏ cache. Không hứa real-time
revocation giữa các reads. [Implementation/limits](port-05c-2026-10-13.md).

PORT-05B2026-10-13: Candidate History/Leaderboard dùng controller riêng trong
`features/results/use-result-pages.ts` qua hai hook hữu hạn `useHistory` và
`useLeaderboard`. Page compose shared controls, `result-table-elements` và CSS
colocated. Actor/exam/version nằm trong query key. Refresh bỏ cursor chain cũ;
guard đồng bộ serialize refresh/load-more. Retry/focus refetch tắt.401/403 và
board404 ẩn/purge query, xóa metadata, latch denial trong mounted scope. Session
invalidation ẩn ngay; cleanup hủy/xóa scope cũ và query signal loại late response.
Transient error giữ loaded snapshot có cảnh báo, retry từ trang đầu. Không có
permission discovery tự động hay cam kết cross-tab/live acceptance từ controller.
Metadata phải khớp exam/version, không lookup Catalog từng dòng. Null khác0;
rank/score/pseudonym do server sở hữu. Không thêm store/repository/transport hoặc
dependency. [Review và giới hạn](port-05b-2026-10-13.md).

Ưu tiên cập nhật2026-10-12 theo người dùng: triển khai/nghiệm thu Web desktop và
tablet trước, target768/1024/1280/1440px. Mobile design/matrix tạm hoãn cho giai
đoạn phát triển app; không mở rộng scope mobile chỉ vì ảnh hoặc guideline chung.
Giữ các regression hiện có; không coi chúng là nghiệm thu mobile đầy đủ.

Áp dụng cho `apps/web`, bổ sung [ADR-007](../adr/007-web-ui-implementation-direction.md)
và [quy ước import](../../.ai/conventions.md#83-path-aliases). Backend Architecture
Contract vẫn giữ nguyên. Frontend tổ chức theo tính năng và composition, không
sao chép các lớp repository/UoW của backend vào trình duyệt.

## 1. Sơ đồ thư mục và trách nhiệm

```text
src/
  app/             router, providers, session/runtime/memory, workspace shells
  features/
    auth/          email/password, verification, session coordination
    catalog/       browse/detail/dashboard
    assessment/    exam room, autosave, submit, conflict coordination
    results/       status/result/review/history/leaderboard
    profile/       user profile
    admin/         authorized authoring/import/operations/reporting workflows
    experience/    public homepage, sample experience, guides/help/recovery
  shared/
    api/           PlatformApi port, DTOs, safe errors, HTTP parser/transport
    ui/            domain-neutral accessible primitives
    styles/        fonts, semantic tokens, global reset, basic layout
    ...            pure formatting, timezone, protected-data helpers
  live/            real HTTP adapter, live mount
  demo/            synthetic adapter, fixtures, labeled demo controls, demo mount
```

Không tạo thư mục rỗng hoặc barrel cho mọi thư mục. Admin hiện là một nhóm
workflow có chung capability gating; khi lớn hơn có thể tách subfolder theo
authoring/import/reporting trong owner này. Không tổ chức theo database table.

## 2. Chiều phụ thuộc được kiểm tra bằng lint

`app` ghép route/provider/feature; `live` và `demo` là composition roots theo mode.
Feature dùng `shared` và code trong chính feature. `shared` không import
`app/features/live/demo`. Feature không import feature khác hoặc adapter cụ thể.
`live` không import `demo`. Module transport/parser ở `shared/api/{http,parse}`
chỉ được adapter sử dụng. UI/feature không tự gọi fetch hoặc vendor transport.

Bốn facade có chủ đích từ `app` mà feature được dùng: `runtime` (injected
PlatformApi), `session`, `memory` (metadata phiên bản trong bộ nhớ), `use-title`.
Ngoại lệ composition duy nhất: `admin/admin-layout.tsx` dùng `WorkspaceFrame`.
Đây là danh sách hữu hạn, không cho feature import router/provider internals.
Adapter được dùng session-coordinator contract thuần của Auth hiện có.

`apps/web/eslint-boundaries.mjs` áp dụng cho alias `@web/*`, relative import,
type import, side effects, re-export và dynamic import literal; chặn traversal ra
ngoài `src`. Dynamic target không xác định bị chặn để tránh bỏ qua kiểm tra.
Alias chỉ viết gọn, không cấp thêm quyền. `npm run lint` ở root chạy cả hai app;
negative tests ở `scripts/__tests__/web-boundaries.unit.spec.mjs` chống regression.
Lint là guard chống sai sót thông thường, không phải sandbox chạy mã không tin cậy.

## 3. Cấu trúc một màn và luồng dữ liệu

Hai pilot chuẩn:

```text
dashboard-page.tsx / exam-list-page.tsx   route composition, title, feature gate
use-dashboard.ts / use-exam-list.ts      queries, filters, loading/error/retry
exam-list-model.ts                      pure loaded-row filtering/status
dashboard.module.css / exam-list.module.css
__tests__/                              tests cạnh owner
```

Page render từ controller hook, không tự tạo HTTP client. Chỉ tách một view riêng
khi có lý do tái sử dụng/độ phức tạp; không tạo một lớp pass-through chỉ để đủ
pattern. Logic không cần React nên là hàm thuần và kiểm thử riêng. Shared UI
nhận props/callback; không đọc session, không gọi API và không biết exam workflow.
API DTO được parse tại adapter; không cast network JSON để bỏ validation.

TanStack Query giữ remote state và cursor pages. `useState` giữ filter/dialog/
form draft. URL giữ filter cần deep-link theo contract của từng màn. Context chỉ
cho session/runtime/memory xuyên app. Không thêm global store/event bus khi
state hiện tại giải quyết được. Query key phải chứa mọi tham số remote có ảnh
hưởng kết quả; filter loaded-only không tạo query request hay sửa cursor.

## 4. Correctness và xử lý lỗi

Máy chủ sở hữu deadline, saved receipt, revision, score, permissions. Không
suy quyền từ tên/role hoặc signature; live Admin vẫn chặn khi profile chưa có
capability discovery. Không lưu token/password/answers trong localStorage hoặc
query logs. Logout/session transition dùng coordinator hiện có để xóa dữ liệu
riêng tư; không tự retry mutation bằng payload mới.

Loading, empty, load failure, stale data và permission denial là các trạng thái
khác nhau. Admin 403 phải ẩn dữ liệu cache và dừng query; danh sách permission
đổi phải ẩn ngay. Nullable score luôn là “Chưa có điểm”. Không lấy title của đề
hiện tại gán vào attempt phiên bản cũ; memory phải khớp version lẫn owner exam.
Không suy tổng toàn hệ thống từ một trang. Search Admin ghi rõ “trong phần đã tải”.
Các lỗi dùng `ErrorPanel`/safe `ApiError`; mã đối chiếu từ server giúp truy vết,
không hiển thị stack/raw response. Dashboard history và catalog lỗi độc lập.

## 5. Design system và accessibility

[Design contract](templates/codex-desktop-v1/design-contract.md) và selected
references sở hữu art direction. CSS semantic tokens dùng Cobalt–Apricot,
Be Vietnam Pro/JetBrains Mono tự host, white rail/header. Public marketing giữ
nhóm `--color-public-*` riêng cho đến khi có increment riêng.
Không hardcode lại màu brand ở từng page. CSS Modules colocated; global CSS
chỉ reset/token/focus/reduced-motion. Button/ActionLink/Badge/fields/TableScroll/
Dialog dùng chung. Biến thể UI có ý nghĩa, không một component khổng lồ điều
khiển mọi screen bằng flags. Desktop pilot không đồng nghĩa mọi màn đã port.

Semantic headings, label thật, accessible name, focus-visible, control 44px,
keyboard navigation và không dùng màu làm tín hiệu duy nhất. Dialog giữ focus/
restore; bảng cuộn trong region có nhãn, không làm tràn body Web/tablet. Trạng thái
pending chặn click lặp. Mọi icon trang trí aria-hidden. Lỗi, font và focus phải
kiểm tra trong browser; axe chỉ là một phần kiểm tra, không chứng nhận WCAG.

## 6. Cách thêm tính năng và tìm lỗi

1. Xác định route/owner/capability/API contract, đọc feature và test hiện có.
2. Tái hiện lỗi; thêm test hành vi thất bại khi logic/correctness bị ảnh hưởng.
3. Lỗi JSON/network: kiểm tra live adapter + parser. Lỗi tải/refetch: controller
   hook/query key. Lỗi dữ liệu hiển thị: model/format. Lỗi bố cục: page CSS/token.
   Lỗi session/permissions: coordinator/provider/gate, không vá bằng role giả.
4. Sửa trong owner nhỏ nhất. Không copy private helper từ feature khác sang shared
   chỉ để vượt lint. Nếu cần dùng chung thật, xác định contract và owner trước.
5. Chạy focused tests rồi Web tests/lint/types/builds. Với shared shell/control,
   chạy browser regression cả Candidate/Admin/public/exam và keyboard/Web/tablet.
   Giữ narrow-screen regressions hiện có, không mở mobile matrix mới khi chưa
   có scope giai đoạn app.
6. So sánh screenshot template, ghi sai khác có chủ đích, cập nhật checklist cùng
   bằng chứng. Không tick live/AWS/production từ demo hoặc ảnh.

Commands: `npm run web:lint`, `web:typecheck`, `web:test`, `web:build`,
`web:build:demo`; `npm run test:tooling`; `npm run quality`.
Preview demo `npm --prefix apps/web run preview:demo`, rồi
`npm --prefix apps/web run test:e2e`. Bản live không được fallback demo.

## Editor write controller — PORT-02

Admin owns `exam-draft-model` (local fields/validation/DTO mapping),
`use-exam-draft` (protected reads, operation and receipts) and
`use-exam-navigation` (route/native unload guard). Information/structure/picker,
preflight/summary, actions and dialogs are feature views. Shared Dialog handles
stable focus containment/restoration without importing runtime or feature state.
When an asynchronous warning overlays another dialog, only the upper dialog
contains focus and handles Escape/Tab; lower dialog listeners remain inactive.

A single pending operation spans save and optional publication. Capture stage,
resource ID, UUIDv7 key, body and field snapshot once. After save acknowledgement,
record its revision/clean snapshot and create the distinct publication intent.
An ambiguous publication resumes that stage; it never replaces the draft again.
Pending/unknown operations block competitors and editing. Definite rejection
releases the operation; publication failure retains the acknowledged save notice.
A success receipt is separate from the refreshed current projection.

Conflict reads retain local fields/base revision. Only explicit adoption replaces
both with the fresh read. Stale/error/loading reads cannot be adopted. Protected
403/capability loss clears private queries/local fields, disables navigation
warnings for hidden content and prevents an in-flight save from continuing into
publication. Server permission/idempotency/revision checks remain authoritative.

Minute inputs map to integer seconds. Local `sourceSchedule` metadata preserves
untouched exact UTC instants (milliseconds/DST occurrence included), and changing
timezone updates display fields atomically. The metadata never enters the API
body. Local completeness validation retains the editor's existing stricter UX;
it does not change the backend's ability to persist incomplete drafts.

Local drafts/retry intents remain in memory. Internal navigation needs explicit
discard; reload/close uses the native beforeunload warning. Auth/session clearing
wins over recovery. This does not promise reload durability, offline storage,
force-save, auto-merge or complete live Admin integration.

## Question authoring/import controllers — PORT-03

Admin `use-question-list`, `use-question-editor`, `use-question-draft`,
`use-question-import` and `use-import-report` own remote reads and operation state.
`question-draft-model` maps stable local option IDs to transport positions; key
membership follows the same option during reorder/remove. Views compose shared
controls with `authoring.module.css`; option rows and import validation are focused
feature views. Bank/preview omit keys/explanations; key-sensitive reads require
the explicit read permission. Live capability discovery remains blocked.

One pending/unknown operation guards each authoring flow. Retry freezes the action,
body/key and base revision. Conflicts retain local fields/base revision until fresh
explicit adoption; a background refresh cannot advance just the local revision.
Protected read/write errors or capability loss hide/purge data and unmount private
question drafts. Import also invalidates file-read/request tickets on permission
loss; an old response cannot restore a cleared report after permission returns.

Dry-run stores the exact input text snapshot and report. Editing invalidates both;
only that snapshot can be committed with a distinct key and explicit confirmation.
Import parsing checks bounded UTF-8 size/count, exact fields and primitive types,
positions/keys/points and Unicode code-point lengths without silent coercion.
Report DTOs contain actual mappings, not invented prompt/score/answer data.
`use-authoring-navigation` is a small feature-owned navigation/unload helper used
by question and import views; drafts/intents remain memory-only. No new runtime
framework, transport, backend layer or storage is introduced.

New port visual checks target desktop Web/tablet768/1024/1280/1440px per the latest
user preference. Existing narrow-screen regressions remain useful maintenance;
mobile implementation/acceptance is deferred to the future app phase.

## Operations / Reporting controllers — PORT-04

Admin `use-operations`, `use-admin-attempt`, `use-attempt-replay`,
`use-report-insights` và `use-business-metrics` sở hữu query/interaction state.
`use-report-pages` là helper hữu hạn cho các cursor reports trong Admin: serialize
refresh/load-more, restart trang đầu, disable implicit retry/window-focus, hủy và
purge protected scope khi403/mất quyền. Query signal được kiểm sau response để
late read không khôi phục dữ liệu sau khi access đổi. Route owner remount theo
exam/version/attempt; version filter không được reset forbidden latch.

Monitor poll10–15s có jitter, visible-only và không overlap. Refresh bỏ cursor
chain cũ, đọc lại trang đầu vì active cursor60s. Active DTO có server `asOf` theo
page riêng; không gọi đó là presence/frozen snapshot nhiều trang. Submissions,
audit, statistics không có source asOf và không bịa total. Business query dùng
key riêng, staleTime30s và manual refresh; error có thể giữ snapshot cũ khi quyền
còn, với mốc/source scope rõ. Business `reporting.read` độc lập technical
`system.metrics.read`; technical provider hiện chưa có, UI không gọi combined
specification-only endpoint hay biến unavailable thành0.

Replay controller chỉ mở confirm khi FAILED/quyền/admin revision/reason8–500
code points hợp lệ. In-flight ref chặn lặp trước render; unknown network/timeout/
malformed/5xx giữ nguyên key/body. Permission epoch loại completion cũ sau revoke/
regrant. ACK khác completed; source result vẫn quyết định score. Admin revision
chỉ có trong demo hiện tại, không dùng candidate revision. Review cần cả result
read hợp lệ và quyền review riêng; result403 phải purge cả review.

Views dùng `operations.module.css` và shared controls. Statistics mỗi thanh dùng
completedAttempts riêng, không chia theo tổng selections. Audit drawer đọc row
đã tải, copy đúng correlation và loại thông báo copy đến muộn của row khác.
Không thêm store, frontend repository/UoW, API endpoint, dependency hoặc AWS
resource. Đây là chuẩn tổ chức Web, không mở live Admin capability gate.

## Candidate Catalog controllers — PORT-05A

`features/catalog/use-catalog.ts` owns browse/detail queries, actor-scoped keys,
URL category, page size/cursors, loaded-only search and denial handling. Refresh
keeps only the first cursor page before refetch; synchronous busy guards serialize
load-more/refresh. Aborted reads check cancellation before/after the injected port
so a late old-category/detail response cannot restore stale data or metadata.
401/403 latch denial and purge owned query data plus frozen presentation memory;
changing filters does not unlock the denial. Session coordinator remains the
owner of auth recovery and global logout cleanup.

`use-exam-start.ts` owns confirmation and the idle/pending/unknown/accepted
interaction. One immutable exam/key intent survives timeout/network/malformed/5xx
inside the mounted view. Synchronous in-flight guard prevents duplicate clicks;
route/actor/session/access epoch checks fence late ACKs. Successful response must
match the requested exam, then navigation uses its actual attempt ID. The current
preview version is not promised as the started version; frozen attempt projection
and deadline remain authoritative. No new request fields or client scoring.

Browse/detail pages and `start-confirmation.tsx` compose shared controls and
semantic CSS. Shared UI has no Catalog/session/transport dependency. Pending or
unknown confirmation removes close/Escape cancellation; unknown allows explicit
same-intent retry. Intent is not persisted across reload/unmount and does not
claim cross-tab coordination. Live Catalog/Assessment integration and those wider
recovery scenarios remain acceptance work, independent of local demo evidence.
