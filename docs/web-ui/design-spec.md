# Web UI specification — thiết kế và hành vi màn hình

Status: spec vẫn là hợp đồng hành vi. SPA local đã có trong `apps/web`; dòng này không còn nghĩa là chưa có source. HTTPS, capability live và production acceptance vẫn mở. Đọc [API/state](api-and-state-contract.md) trước khi nối dữ liệu; DTO/product/security là authority. Mục tiêu không phải một landing page đẹp đơn lẻ: người dùng phải đăng ký, xác thực email, thi, biết đáp án đã được lưu hay chưa, nộp bài và xem kết quả; Admin quản lý được nội dung và theo dõi xử lý.

## 1. Ý tưởng thiết kế

**Phòng thi số, chính xác và bình tĩnh.** Bố cục lấy cảm hứng từ phiếu trả lời và bàn làm bài: câu hỏi là trọng tâm, thời gian và trạng thái lưu luôn nhìn thấy, sơ đồ câu hỏi giúp định hướng. Phần khác giữ nhẹ để không cạnh tranh sự chú ý. Không dựng dashboard bằng một loạt card số liệu lớn khi API chưa cung cấp số liệu đó.

Tên tạm “Exam Platform”, logo chữ kèm biểu tượng phiếu trả lời bằng SVG đơn giản. Hero trang giới thiệu dùng một preview workspace có chú thích “Minh họa”, không stock photo. Trong workspace thật không có illustration hoặc hero. Dùng sentence case: “Bắt đầu bài thi”, “Nộp bài”, “Đã lưu”, “Lưu thay đổi”. Tiếng Việt có dấu đầy đủ. Nội dung câu hỏi có thể là tiếng Anh và không tự dịch.

Điểm nhận diện duy nhất là **Answer sheet navigator**: ô số câu, trạng thái đã trả lời/chưa trả lời/đánh dấu/chưa lưu, cùng timer có chữ số tabular và một thanh tiến độ mỏng. Ô đã chọn có viền, dấu lưu có icon/check và label trong legend; không dùng màu là tín hiệu duy nhất. Không cho các ô màu giống một gameboard.

## 2. Tokens bắt buộc

Khai báo một lần trong `shared/styles/tokens.css`; components dùng semantic tokens, không lặp raw hex. Các giá trị là quyết định thiết kế; kiểm tra contrast trên output thực tế, đặc biệt disabled/focus/status.

| Token                          | Giá trị               | Dùng                      |
| ------------------------------ | --------------------- | ------------------------- |
| `--color-canvas`               | `#F4F7FA`             | nền app                   |
| `--color-surface`              | `#FFFFFF`             | form, câu hỏi, bảng       |
| `--color-text`                 | `#14283F`             | heading, body primary     |
| `--color-text-muted`           | `#516176`             | helper, metadata          |
| `--color-primary`              | `#0F766E`             | CTA, lựa chọn active      |
| `--color-primary-hover`        | `#115E59`             | hover CTA                 |
| `--color-primary-subtle`       | `#E8F5F2`             | selected surface          |
| `--color-border`               | `#D9E2EC`             | separator/border neutral  |
| `--color-focus`                | `#2563EB`             | keyboard focus ring       |
| `--color-warning-text/surface` | `#92400E` / `#FFF7E6` | unsaved, sắp hết giờ      |
| `--color-danger-text/surface`  | `#B42318` / `#FFF1F0` | error, destructive        |
| `--color-success-text/surface` | `#166534` / `#F0FDF4` | confirmed save/completion |

Type: heading **Source Sans 3** 600/700, body **Noto Sans** 400/500/600, timer/body numbers `font-variant-numeric: tabular-nums`. Self-host WOFF2 có glyph tiếng Việt, lưu license; tải font từ origin của app, không Google Fonts CDN. Nếu chưa có font assets hợp lệ, dùng system sans và ghi thiếu asset, không để invisible text. Chỉ dùng hai font families và subset/weights cần thiết.

| Role            | Desktop size/line | Mobile  | Ghi chú                     |
| --------------- | ----------------- | ------- | --------------------------- |
| Page title      | 32/40px           | 26/34px | một h1/page                 |
| Section title   | 24/32px           | 22/30px | h2                          |
| Card/form title | 20/28px           | 20/28px | hierarchy thực              |
| Body            | 16/24px           | 16/24px | form không nhỏ hơn16px      |
| Question prompt | 18/30px           | 17/28px | tối đa khoảng75 ký tự/line  |
| Utility/helper  | 14/20px           | 14/20px | không dùng cho lời giải dài |
| Timer           | 28/32px           | 22/28px | không nhảy width mỗi giây   |

Spacing scale:4,8,12,16,24,32,48,64px. Border1px; radius6px controls,8px containers,999px chỉ badge/pill. Shadow nhẹ chỉ dropdown/dialog/sticky separation. Desktop content max1280px; reading/detail max1064px; auth form max440px. Main horizontal padding24px desktop,16px mobile; form field gap16px, section gap32px. Button/input chiều cao44px; icon button44×44px, kể cả navigator/mobile actions.

Motion150–200ms cho hover/dialog; không animate số timer, không pulse cả phòng thi, không confetti khi nộp/đạt điểm. Tôn trọng reduced-motion; skeleton không gây flash/pulsing gắt. Không toast cho mỗi autosave; một trạng thái lưu inline là đủ.

**Public visual increment được yêu cầu 2026-10-07:** homepage dùng “Vào nhịp thi / Cổng ánh sáng” đã xem trong demo. Bổ sung semantic tokens `--color-public-*` cho navy/mint, hero heading 40–64px và radius public 12/20px. Các giá trị này chỉ áp dụng trang giới thiệu và public experience; các form/Assessment/Admin giữ type, contrast và semantic status hiện có. Scene phiếu thi 3D được lazy-load cùng origin, có fallback CSS, nút dừng, reduced-motion, pause hidden/offscreen và cleanup khi rời trang. Không đưa scene hoặc ambient motion vào bài thi thật. Xem [kế hoạch triển khai](vao-nhip-thi-implementation-2026-10-07.md).

## 3. Layout và navigation

### 3.1 Public shell

Header tối thiểu80px desktop,72px mobile: logo trái, “Trải nghiệm”, “Cách bắt đầu”, “Trợ giúp”, “Đăng nhập” và “Tạo tài khoản”; khi đã đăng nhập thay hai link cuối bằng “Bảng làm việc” và “Đề thi”. Mobile có nút Menu với trạng thái mở/đóng, tự đóng sau khi chọn route. Main không có fake exam feed công khai: API browse yêu cầu đăng nhập. Home có lời giới thiệu, scene phiếu thi, các category, ba bước tạo tài khoản–xác nhận email–chọn đề và làm bài, cùng CTA ba câu mẫu. Không dùng số người dùng, rating, logo khách hàng hoặc testimonial bịa. Footer có tên tạm và links trợ giúp/trải nghiệm nội bộ; legal routes chỉ thêm nếu có policy đã được duyệt.

### 3.2 Candidate shell

Top header64px: logo, “Tổng quan”, “Đề thi”, “Lịch sử”; menu profile có tên, “Hồ sơ”, “Đăng xuất”. Desktop main có breadcrumbs khi nested. Mobile dùng header nhỏ và nav bar bốn mục; nhãn/icon đều rõ. Không hiển thị nút Admin từ lựa chọn role phía client; permission gating xem API document.

### 3.3 Examination shell

Tách khỏi Candidate shell: không sidebar/menu/marketing. Header ghi tên bài/version khi có frozen metadata hợp lệ, timer, SaveStatus và nút nộp. Desktop gồm content câu hỏi bên trái, navigator bên phải khoảng304px; question content không quá850px. Section header và điều hướng nằm trong content. Hai cột vẫn sử dụng chiều cao tài liệu, tránh nhiều vùng cuộn lồng nhau.

```text
+-------------------------------------------------------------+
| Exam / version     Đã lưu lúc...     32:14     [Nộp bài]     |
+--------------------------------------+----------------------+
| Phần A                               | Đã trả lời 12/100*   |
| Câu 13 · Chọn một đáp án              | [Bản đồ câu hỏi]     |
| Prompt                               | 01 02 03 04 05 ...   |
| ( ) Option A                         | Legend có icon/text  |
| ( ) Option B                         | [Chỉ xem đánh dấu]   |
| [Xóa lựa chọn] [Đánh dấu xem lại]     |                      |
| [Câu trước]               [Câu sau]  |                      |
+--------------------------------------+----------------------+
```

`*` Tổng/section labels phụ thuộc frozen metadata; không lấy current exam version thay cho attempt version. Nếu thiếu metadata live, chỉ hiển thị số câu đã tải và navigation của trang đã tải, ghi dependency thay vì bịa tổng.

Mobile: timer/status sticky ở trên, nội dung một cột, nút “Danh sách câu hỏi” mở bottom sheet có focus trap/close. Footer sticky có trước/sau và current ordinal, không che radio cuối, có safe-area inset. Nút nộp ở header hoặc menu action rõ, cách nút “Câu sau” đủ xa. Khi mở bàn phím/dialog, có thể cuộn đến controls. Không buộc fullscreen; mất focus/tab không tự nộp hay trừ điểm.

### 3.4 Admin shell

Sidebar240px desktop, topbar64px, main padding24px. Nhóm “Nội dung”: Đề thi/Ngân hàng câu hỏi/Nhập câu hỏi. Nhóm “Vận hành”: Theo dõi bài thi/Bài nộp/Thống kê. Nhóm “Hệ thống”: Metrics/Audit. Không một menu chung “Users/Roles/Settings” với CRUD chưa có contract. Sidebar collapse/mobile drawer có labels. Permission mất sau API403 phải cập nhật trạng thái access, không thử tiếp dữ liệu admin từ cache.

## 4. Danh mục route màn hình

Mỗi route phải có page title, loading/empty/error/success và navigation back hợp lý. `:id` là route parameter, không được dùng để suy ra ownership.

| ID    | Browser route                                               | Màn hình / shell                                           |
| ----- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| PU-01 | `/`                                                         | Giới thiệu / public                                        |
| PU-02 | `/experience`                                               | Ba câu minh họa công khai / public, chỉ state trong bộ nhớ |
| AU-01 | `/login`                                                    | Đăng nhập / public                                         |
| AU-02 | `/register`                                                 | Đăng ký / public                                           |
| AU-03 | `/check-email`                                              | Hướng dẫn kiểm tra email / public                          |
| AU-04 | `/verify-email`                                             | Xác thực link + final password / isolated public           |
| CA-01 | `/dashboard`                                                | Candidate tổng quan                                        |
| CA-02 | `/exams`                                                    | Danh sách đề                                               |
| CA-03 | `/exams/:examId`                                            | Chi tiết + start confirmation                              |
| CA-04 | `/attempts/:attemptId`                                      | Phòng thi / examination                                    |
| CA-05 | `/attempts/:attemptId/status`                               | Đã nhận bài/đang xử lý/thất bại                            |
| CA-06 | `/attempts/:attemptId/result`                               | Kết quả                                                    |
| CA-07 | `/attempts/:attemptId/review`                               | Xem đáp án/lời giải được phép                              |
| CA-08 | `/history`                                                  | Lịch sử                                                    |
| CA-09 | `/exams/:examId/versions/:versionId/leaderboard`            | Xếp hạng theo version                                      |
| CA-10 | `/profile`                                                  | Hồ sơ/leaderboard opt-in                                   |
| AD-01 | `/admin`                                                    | Admin overview từ Metrics, không một API dashboard mới     |
| AD-02 | `/admin/exams`                                              | Quản lý đề                                                 |
| AD-03 | `/admin/exams/new`, `/admin/exams/:examId/edit`             | Form đề/sections/membership/publish                        |
| AD-04 | `/admin/questions`                                          | Question bank                                              |
| AD-05 | `/admin/questions/new`, `/admin/questions/:questionId/edit` | Question editor                                            |
| AD-06 | `/admin/imports/new`, `/admin/imports/:importId`            | JSON import/dry-run/report                                 |
| AD-07 | `/admin/exams/:examId/monitor`                              | Active candidates                                          |
| AD-08 | `/admin/exams/:examId/submissions`                          | Danh sách bài nộp                                          |
| AD-09 | `/admin/attempts/:attemptId`                                | Result/admin review/replay                                 |
| AD-10 | `/admin/exams/:examId/versions/:versionId/statistics`       | Question statistics                                        |
| AD-11 | `/admin/metrics`                                            | System/business metrics                                    |
| AD-12 | `/admin/audit`                                              | Audit list/detail drawer                                   |
| SY-01 | no fixed route                                              | 403/404/unavailable/session-expired components             |

Không phải thêm mọi folder/page trong một lần. Tuân thứ tự task: foundations→Identity→Catalog→exam engine→results→Admin→QA.

## 5. Public và Identity, chi tiết theo màn hình

### PU-01 Home

Headline: “Vào nhịp thi. Tập trung vào từng câu trả lời.” Subtext giải thích tiến độ, chuyển câu và đánh dấu. CTA chính “Trải nghiệm 3 câu mẫu” tới `/experience`; có đường tạo tài khoản/đăng nhập hoặc tới đề thi khi đã đăng nhập. Hero dùng phiếu thi/bút/đồng hồ 3D với nhãn “Minh họa giao diện”; chữ và CTA hữu dụng ngay cả khi graphics chưa tải. Category chips TOEIC/IELTS/IT Certification/Đại học/Tuyển dụng/Nội bộ dẫn tới browse có auth. Ghi các bài trắc nghiệm chưa tương đương quy đổi điểm kỳ thi chính thức. Nội dung bước bắt đầu gồm tạo tài khoản, xác nhận email, chọn đề và làm bài; FAQ dùng hợp đồng hành vi hiện tại.

### PU-02 Public experience

Ba câu tổng hợp tự tạo, độc lập ngân hàng đề và adapter demo nghiệp vụ, công khai trong cả build live/demo. Có một câu một đáp án, một câu nhiều đáp án, một câu đúng/sai. Chuyển câu, đánh dấu, xóa lựa chọn và quay lại giữ state trong bộ nhớ route. Refresh/rời route bắt đầu lại; không lưu storage, không gọi API hoặc tạo attempt. Chấm exact-match tại client chỉ cho nội dung tổng hợp này, luôn có nhãn “Kết quả mẫu”. Đây là ngoại lệ minh họa, không áp dụng scoring của bài thi thật. Cho xem lại các lựa chọn trước kết quả, thử lại, về giới thiệu và tạo tài khoản qua form thật `/register`. Không báo “Đã lưu” theo nghĩa durable ACK, không countdown deadline, không dùng auth/role switch. Mọi câu/đáp án thuộc bộ mẫu này được phép công khai; không chia sẻ renderer hoặc DTO chứa keys vào phòng thi Candidate.

### AU-01 Login

Desktop hai cột: bên trái giới thiệu ngắn “Tiếp tục bài thi của bạn”, bên phải form; mobile chỉ form. Email, mật khẩu với reveal button có accessible label, “Đăng nhập”, link “Tạo tài khoản”, “Gửi lại email xác thực”. Login password chấp nhận1–128 ký tự, không ép minimum15 như register để tránh thêm client policy trái transport. Email trim/lowercase ASCII theo product, không xóa plus-tag/dấu chấm; không trim password. Cho paste/password managers; autocomplete đúng.

Loading giữ form/disabled submit, không disable reveal hoặc keyboard focus bằng cách làm biến mất toàn form.401 generic: “Không thể đăng nhập. Kiểm tra email, mật khẩu hoặc xác thực email rồi thử lại.” Không tiết lộ email tồn tại, disabled hay unverified.429 hiển thị thời gian chờ theo Retry-After, giữ nút resend riêng không bypass hạn mức. Network503 cho retry có kiểm soát; login/refresh không tự replay tùy tiện. Sau success lấy profile, fresh CSRF và điều hướng safe return path cùng origin; không redirect URL bên ngoài.

Không có nút GitHub/magic link có vẻ hoạt động; reserve extension trong code/docs. Không “Ghi nhớ tôi” vì contract chưa có option. Không “Quên mật khẩu?” clickable khi chưa có recovery flow; nếu cần helper ghi “Nếu không truy cập được tài khoản, liên hệ đơn vị tổ chức.”

### AU-02 Register

Email, tên hiển thị1–80, password15–128 Unicode, confirm-password client-only. Gợi ý minimum15; không tự đặt compulsory uppercase/symbol policy. Submit gửi chính xác email/displayName/password; confirm field không vào request. Generic202 chuyển check-email, không auto-login; không ghi password ở route state/storage/log.

### AU-03 Check email/resend

Title “Kiểm tra hộp thư của bạn”. Nội dung generic: “Nếu email đủ điều kiện, hệ thống sẽ gửi link xác thực. Kiểm tra cả thư rác.” Không hứa đã delivered vì202 chỉ nhận ý định gửi. Email người dùng nhập có thể giữ trong component memory để điền resend; page reload cho nhập lại, không bắt buộc email ở URL. Button “Gửi lại link” với cooldown60s, chỉ user submit mới gọiAPI; local timer không thay server rate controls.202 suppression giữ generic response. Link “Về đăng nhập”; “Dùng email khác” quay register không đổi credential hiện có.

### AU-04 Verify email

Boot isolated trước telemetry/router bootstrap có thể ghi URL. Đọc `#token=...` đúng43 base64url chars, scrub fragment bằng history.replaceState, token chỉ trong memory. Header/referrer/cache yêu cầu xem API doc. Render final password + confirm, lý do đơn giản: “Đặt mật khẩu cho tài khoản của bạn để hoàn tất xác thực.” Không tự POST khi load, không tự đăng nhập. Nếu đang authenticated, yêu cầu đăng xuất trước khi có anonymous CSRF; không activate dưới phiên khác.

Missing/malformed token: “Link không hợp lệ hoặc đã hết hạn” và email resend form.400 dùng cùng thông báo an toàn, không đoán consumed/cancelled cause. Success “Email đã được xác thực. Đăng nhập để tiếp tục.” và CTA login. Consumed retry có thể trả verified:true nhưng không đổi password lần nữa; helper không hứa password mới được áp dụng qua retry. Refresh sau scrub mất token thì yêu cầu mở lại email, không khôi phục từ storage.

### CA-10 Profile

Email/emailVerifiedAt read-only; displayName editable, leaderboardOptIn defaultfalse. Notice “Khi bật, kết quả tốt nhất có thể xuất hiện với bí danh trong bảng xếp hạng được mở.” Save displayName/optIn/expectedRevision với UUIDv7; success dùng accepted revision, refetch profile.409 giữ local fields, hiển thị đối chiếu mới nhất, người dùng chọn reload hoặc apply lại với revision mới. Không nút tự đổi email/password/role. Logout nếu có pending exam edits phải giải thích trước, không claim chưa nhận logout đã hoàn tất.

## 6. Candidate browse, detail và dashboard

### CA-01 Dashboard

Title “Chào {displayName}”, CTA “Tìm đề thi”. Hai vùng: “Lượt thi gần đây” từ history page đầu và “Đề mới” từ browse page đầu. Nếu history trả active attempt có thể CTA “Tiếp tục”; không tuyên bố đã tìm tất cả active attempts nếu chưa duyệt mọi page. Empty: “Bạn chưa có lượt thi trong kết quả đã tải.” Không thống kê tổng số lượt/điểm trung bình/rank từ một trang dữ liệu. Live title thiếu thì dùng tên generic/short ID; không tạo N+1 detail query cho từng row.

### CA-02 Exam list

Desktop list rows hoặc grid2 cột theo content length; mobile1 cột. Mỗi item: category, title, duration, question count, open/close, explanation policy label, CTA “Xem đề”. Filter category là server-supported; cursor “Tải thêm” giữ watermark/filters, thay category reset pages/cursor. Không page-number/total giả. Search/title/status/sort chưa có API filters: live không hiển thị global search giả; nếu có filter trong dữ liệu đã tải phải ghi rõ giới hạn.

Skeleton có cùng chiều cao content. Empty category: “Chưa có đề trong danh mục này”; clearfilterCTA. Error với retry có backoff, không 0results. Giá trị schedule format theo displayTimezone; tooltip UTC khi admin/debug không cần showtechnicaltoCandidate. Schedule badge chỉ là estimate nếu thiếu authoritative server clock; start API vẫn quyết định.

### CA-03 Detail/start

Main title/category/version, description chỉ khi contract có field (hiện không có), section counts/points, timing/duration/attemptLimit, release policy, scoring exact-match/no partial points. Summary side card chứa CTA. Không preview candidate questions trước owned attempt. Leaderboard link chỉ khienabled, version từpublishedVersionId.

Start confirmation dialog: thời gian danh định, lịch đóng, cảnh báo vào muộn có thể ít thời gian, đáp án nhiều lựa chọn phải đủ đúng mới có điểm, một attempt tiêu thụ quota sau khi accepted, nền tảng tự nộp câu đã lưu khi hết giờ. Checkbox “Tôi đã đọc hướng dẫn” là UX local, không thêm request field. CTA “Bắt đầu làm bài”; chưaPOST thì có thể cancel. Sau accepted không có “hủy để lấy lại lượt”.

422 unavailable/limit/closed: message actionable đúng nguyên nhân safe text; không đoán remaining slots từ history partial. Existing active attempt response dẫn tới resume cùngID. Network timeout start retry giữ đúng key/body, không tạo key mới. Khi deadline từresponse cho ít hơn duration, hiển thị thời gian thực tế và notice ngay trong exam.

## 7. Phòng thi CA-04

### 7.1 Câu hỏi và điều hướng

Single choice/true-false dùng fieldset/legend và native radio; multiple choice dùng checkbox. Helper của multiple là “Chọn các đáp án bạn cho là đúng”, không tiết lộ số đáp án đúng. Prompt/options render plain text, giữ xuống dòng; không dùng dangerouslySetInnerHTML. Candidate view không có source bank IDs, keys hoặc explanation.

Click option cập nhật draft ngay và hiển thị “Chờ lưu”. “Xóa lựa chọn” tạo full empty set; “Đánh dấu xem lại” đổi marked và đi qua cùng save/version pipeline. Answered count dựa vào selections, không dựa vào mark. Chuyển câu/page vẫn giữ draft. Previous/next/jump không nộp bài; focus tới heading câu mới, autosave ACK không giật focus.

Navigator có legend Chưa trả lời/Đã trả lời/Đánh dấu/Chưa lưu/Đang chọn. Filter marked chỉ thay điều hướng, không thay submission. Không giả total khi thiếu frozen metadata hoặc chưa tải đủ answer scope: dùng “12 câu đã trả lời trong phần đã tải”. Page chưa tải có loading/retry, không mặc định version0.

### 7.2 Trạng thái lưu và conflict

SaveStatus độc lập với trạng thái đã trả lời/đánh dấu. Các trạng thái: pending, saving, saved, retrying, conflict, offline, unconfirmed. Copy: “Có 2 thay đổi chờ lưu”; “Đang lưu…”; “Đã lưu lúc20:12:36”; “Chưa kết nối. Các thay đổi hiện chỉ ở trình duyệt”; “Đáp án đã thay đổi ở tab khác”. Saved timestamp lấy từ acceptedAt của ACK, không từ thời điểm click.

409 mở đối chiếu từng câu: bản server đã lưu, bản local đang chọn, cả mark/selections. User chọn “Dùng bản đã lưu” hoặc “Giữ lựa chọn của tôi”; phương án thứ hai chỉ gửi mutation mới sau refetch latest version và explicit confirmation. Không tự last-writer-wins, không refetch xóa draft. Timeout/429/503 retry bounded theo API document. Lưu lỗi vẫn cho điều hướng, nhưng không báo Saved.

Memory-only draft là baseline: reload/crash có thể mất phần chưa ACK. Resume khôi phục server state, không hứa phục hồi local edits. Navigation guard giải thích “Các thay đổi chưa được xác nhận có thể bị mất”. beforeunload không bảo đảm save. Không thêm offline storage/service worker để che durability gap.

### 7.3 Countdown

Đồng bộ serverNow/deadline, tính mỗi tick bằng elapsed monotonic thay vì trừ từng giây. Tab visible/reconnect phải refetch status và resync. Timer không dừng khi offline, reauth hay mở dialog. Threshold5 phút dùng amber nhẹ,1 phút thêm warning label; screen reader thông báo5 phút/1 phút/0, không mỗi giây.

Tới0 hoặc canSave=false: khóa edit, dừng tạo save mới, hiển thị “Hết giờ. Hệ thống chỉ nhận những đáp án đã lưu đúng hạn”. Auto-submit là best effort; server sweep là backstop. Giữ visible count của unconfirmed edits, không âm thầm xóa hoặc gửi chúng muộn. Client clock/timer không là authority và không được kéo dài bài thi.

### 7.4 Nộp bài

Manual dialog hiển thị answered/marked/unanswered khi counts có nguồn đúng, trạng thái save và lời nhắc nộp xong không sửa được. Hai nút “Quay lại làm bài” và “Nộp bài”. Trước POST khóa edits mới, flush và đợi ACK. Save lỗi khi còn giờ: cho retry/quay lại, không nộp silent. Khi deadline đến: nộp persisted answers, không chờ vô hạn hoặc nhét draft vào submit body.

ACK202 dẫn tới status page “Đã nhận bài lúc…”. Timeout/lost ACK chuyển “Đang xác minh bài nộp”; retry cùng key/status lookup, không tạo lượt mới. Double click chỉ một logical submission. Không chấm điểm trong browser. expired=true hiển thị “Nộp khi hết giờ”; EXPIRED không đồng nghĩa kết quả thất bại.

## 8. Status, result, review, history và ranking

### CA-05 Status

Card width640px, “Đã nhận bài”, thời gian nhận và processing text; không full-page spinner. SUBMITTED/EXPIRED chưa complete có text “Đang xử lý kết quả”, giữ nguyên durable lifecycle. FAILED + replayPending=true: “Đã yêu cầu xử lý lại”. FAILED false: safe error/trợ giúp/manual refresh. Không phần trăm/ETA giả.

Poll2→10s+jitter, honor server hints, dừng terminal hoặc5 phút; pause hidden và refetch một lần khi trở lại. Sau timeout cap: “Chưa có kết quả mới. Bạn có thể xem lại trong lịch sử”.202 Result là pending success. User có thể refresh thủ công sau đó.

### CA-06 Result

Earned/possible là số chính; correct/total và percentageBasisPoints/100 hiển thị hai chữ số thập phân. Label “Điểm bài trắc nghiệm”; không quy đổi TOEIC990/IELTS band. Title/version/section labels chỉ từ frozen context hợp lệ. Section table điểm/đúng/tổng; không gauge trang trí.

Actions: về lịch sử, leaderboard cùng version nếu enabled, review khi `review` nonnull. `review=null`: “Bài thi chưa mở quyền xem đáp án”; không fetch keys để ẩn bằng CSS. Không suy ra release của old attempt từ current publication. “Làm lại” nếu có dẫn detail để server kiểm tra limits, không tự tạo quota.

### CA-07 Released review

Read-only question với “Bạn chọn”, “Đáp án đúng”, correctness icon/text và explanation. Empty explanation: “Không có giải thích cho câu này”. Multiple-choice giải thích exact-match, không partial credit. Pages bounded; local filter phải ghi chỉ áp dụng phần đã tải.403 quay result với access message và clear review cache, không giữ sensitive payload dưới hidden component.

### CA-08 History

Rows có title/fallback, version, startedAt, status, expired, score nullable và CTA tiếp tục/status/result. Earned=null hiển thị “Chưa có”, không0. Cursor loadmore; reload reset watermark. Không tổng/average từ partial page, không invented query filters. Old/unpublished attempts vẫn có owned history access.

### CA-09 Leaderboard

Authenticated only, version-specific; columns rank/pseudonym/earned–possible/completedAt. Không avatar, email, displayName hoặc frontend identity join. Không “Bạn” highlight vì DTO chưa có isMe. Opt-in notice dẫn profile; ranking disabled/403 có message riêng. Loadmore qua cursor; manual refresh reset watermark để thấy completion mới. Không gộp versions hoặc dựng podium hoạt họa.

## 9. Admin theo capability

### AD-01 Overview

Metrics thật: active/submitted/completed/failed +asOf; links tới exams/monitor/submissions. Không revenue/growth giả. Demo có banner; live Admin blocked nếu thiếu permission source. system.metrics.read không tự cấp catalog.manage.

### AD-02 Exam management

Table title/category/duration/published/archived/revision/current version/schedule. Row actions Edit/Publish/Unpublish/Archive/Monitor/Submissions/Statistics theo permissions; CTA “Tạo đề thi”. Archive dialog giải thích logical archive, attempts hiện có không bị xóa. Không bulk-delete hay global server filters chưa có API; lọc local loaded rows phải có nhãn.

### AD-03 Exam editor

Tabs “Thông tin”, “Các phần & câu hỏi”, “Kiểm tra & xuất bản”. Fields đúng DTO: title/category/duration/open/close/displayTimezone/attemptLimit/explanationPolicy/leaderboardEnabled. UI minutes→integer seconds,1–240 phút; limit1–10; open<close. Date editor chuyển IANA timezone sang RFC3339 UTC Z có test roundtrip, không ngầm dùng timezone máy.

Sections1–20 nonempty, position rõ; picker ngân hàng bounded cursor. Question references gồm bankQuestionId/position/points; max500 unique/publication, points1–1000. Reorder có nút Lên/Xuống cho keyboard, drag optional. Draft totals là local preflight, server publish vẫn authoritative. Edit bank không đổi frozen attempt.

Create expectedRevision=0 theo schema; edit dùng revision đã load. Save draft gửi full replacement, Publish là action khác. Sau receipt refetch nhưng không xóa edits mới hơn đang local.409 đối chiếu local/current draft,422 validation; không tự overwrite. Publish dialog giải thích immutable version; unpublish chỉ chặn start mới. Không controls sửa điểm tùy ý/reset limits.

### AD-04/05 Question bank/editor

List prompt preview/type/points/revision/archived. Editor prompt/explanation plaintext, options2–10 có position/text. Single có một key; true-false đúng hai options Đúng/Sai và một key; multiple1–N keys. Transport Admin dùng correctOptionPositions; Candidate dùng frozen option IDs. Type conversion phải confirm nếu mất options/keys và không giữ hidden invalid keys.

Candidate preview map sang safe view model, không đưa AdminQuestion nguyên vào renderer. Prompt/explanation≤8000, option text≤2000, points1–1000; character counter gần giới hạn. Save full body/key/revision; archive thay tương lai của bank, không sửa published snapshots.

### AD-06 Import

JSON file/paste only,1MiB/schemaVersion1/1–100 entries. Template tải từ synthetic valid example tạo local, không bịa export API. Không CSV/XLSX/zip/remote URL. Đo UTF-8 bytes trước parsing nặng; không log raw input. Chọn file không tự POST.

Luồng: chọn/preview→“Kiểm tra dữ liệu” dryRun→issues clientRef/field/message→“Nhập câu hỏi” explicit real import. dryRun valid vẫn committed=false. Real import atomic, invalid không claim partial insert. dryRun→real là body mới/key mới; retry mỗi action giữ key/body. New key retry real import có thể tạo duplicates nên không dùng như cách sửa lỗi mạng. Report không dump raw keys ngoài editor có quyền.

### AD-07 Monitor

Rows candidateId opaque/attemptId/status/start/deadline. “Đang làm bài” là lifecycle, không online presence vì thiếu heartbeat. Label lần tải gần nhất; poll10–15s+jitter là candidate budget cần đo, pause hidden và chỉ refetch bounded visible page. Không IP/location/device/webcam/tab-change columns, impersonate hay force-submit chưa có endpoint.

### AD-08/09 Submissions/detail/replay

Version filter supported publishedVersionId; table opaque candidate/status/submittedAt/expired/nullable score. Admin result cần reporting.read; keys review cần assessment.review.admin riêng. Replay chỉ FAILED phù hợp +assessment.replay; reason required/current expectedRevision/stable key.202 nghĩa accepted replayPending, không complete. Nếu thiếu revision capability, live replay blocked; không dùng candidate resume để impersonate. Replay không tạo attempt mới, thay answers hay refund quota.

### AD-10 Statistics

Version/frozen question scope, completedAttempts denominator, correct/incorrect/unanswered counts và labeled bars.0 completed: “Chưa có bài chấm xong”, tránhNaN. Multi-choice option counts có thể vượt total attempts; label “Lượt lựa chọn”, không pie chart giả một partition. Không invent response time/difficulty/average fields.

### AD-11 Metrics

Render DTO asOf/activeCandidates/submitted/completed/failed/httpRps/httpP95Ms/queueDepth/oldestJobSeconds. Nhóm Business/HTTP/Processing. Chỉ vẽ timeseries khi có dữ liệu thật/bounded adapter; snapshot đơn lẻ không thành lịch sử. Missing p99/CPU/RDS/Redis/cost: “Chưa có dữ liệu”, không0. Poll10–15s+jitter cần đo, pause hidden, tránh growing memory. Không synthetic prices dưới nhãn monthly AWS bill.

### AD-12 Audit

Paginated rows occurredAt/opaque actor/action/resource/outcome; drawer reason/correlationId/changedFields. Read-only, không edit/delete/secret viewer/raw body/answers/SQL. Copy correlationID bằng explicit button. Backend audit access là authority; frontend không tự manufacture audit success.

## 10. States, accessibility và responsive

Label form luôn hiện; inline error linked aria-describedby, error summary nhận focus khi cần. Password paste/managers hoạt động. Dialog focus/trap/Esc phù hợp/restore trigger; pending critical outcome không dismiss mà không giải thích. Toast chỉ cho action chủ động, không mỗi autosave. Skeleton stable layout; refreshing giữ authorized data và chỉ báo cập nhật nhỏ.

| State       | Hành vi                                                       |
| ----------- | ------------------------------------------------------------- |
| Empty       | text cụ thể + CTA hợp lý, không blank screen                  |
| Stale/error | label stale/last good data và retry; không success mask       |
| 401         | one coordinated recovery cycle hoặc reauth; timer không reset |
| 403         | permission denied, clear protected data, không login loop     |
| 404         | “Không tìm thấy nội dung”, không phân biệt foreign owner      |
| 409         | giữ draft, refetch, reconcile                                 |
| 429/503     | bounded retry/Retry-After, chưa ACK thì chưa Saved            |
| Unexpected  | safe message/correlationID nếu có, không stack                |

Verify320/390/768/1024/1440px và zoom200%. Không body overflow; table có contained labeled scrolling hoặc mobile rows. Focus ring nhìn rõ; sticky bars không che option/focused element. Keyboard-only hoàn tất auth/exam/submit/admin edit. Label icons và native groups; trạng thái có text/icon ngoài màu. Timer không announce mỗi giây. Reduced motion hoạt động. Xem [W3C reference](https://www.w3.org/WAI/WCAG22/quickref/) và [acceptance](acceptance-checklist.md); chưa có WCAG certification claim.

## 11. Content và fixtures

Synthetic titles: “IT Certification — Networking Fundamentals”, “TOEIC — Reading practice”, “Đại học — Toán cơ bản”, “Recruitment — Logical reasoning”. Nội dung là ba loại trắc nghiệm v1, không giả essays/listening assets. Test long bilingual titles,500-question fixture,8000-character prompt,10 long options; result8333 basis points; unanswered/expired/failed/replay pending, ranking pseudonyms.

Fixtures đủ zero/one/many,slow load,timeout after commit,429/503,old ACK after new edit,one stale item aborting batch,two tabs,refresh lost ACK,review denied/allowed. Không real PII/secrets. Scenario panel chỉ dev/demo và IDs tái hiện được; không production permission override. Danh mục cụ thể ở acceptance document.
