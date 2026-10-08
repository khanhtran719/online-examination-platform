# Prompt bổ sung Stitch — ExamPlatform UI/UX Redesign

Ngày 2026-10-08. Project ID `11777231516922865355`; design system `assets/fc11c9370fdb41e5b12e4b4ed727d8b3`. [Review và danh sách thiếu](stitch-review-2026-10-08.md).

## Cách gửi

Giữ nguyên dự án và design system đã có. Gửi **Prompt nền + một nhóm A–H** mỗi lần; nhóm A chỉnh nội dung mẫu có sẵn, B–G bổ sung 29 loại trang, H bổ sung mobile/state variants. Với MCP, truyền designSystem ở tool tạo màn hình và projectId hiện tại. Kiểm tra danh sách resource sau mỗi lần; nếu Stitch tạo ít hơn yêu cầu, ghi tên còn thiếu và yêu cầu chính những màn đó. Không dùng một dashboard dài để thay cho nhiều route. Không đếm prototype như trang mới.

Mỗi nhóm có thể chia tiếp thành một prompt cho từng màn bằng cách giữ Prompt nền và đoạn mô tả ID tương ứng. Không tự đổi model/gói trả phí. Thực hiện theo output thực tế, không gửi lặp mutation sau timeout.

## Prompt nền — dùng cùng mọi nhóm

```text
Bạn đang bổ sung UI vào dự án ExamPlatform UI/UX Redesign hiện tại. Chủ sản phẩm đã DUYỆT phong cách của ba mẫu: Trang chủ - ExamPlatform (43fe592b5ebe411aacc87c1f5aadb71b), Bảng làm việc Thí sinh (0e91fe7b89774fcfb0d9469494281dc6), Phòng thi - Exam Room (268f0679a2154b91828af861b8b6bfec). Dùng design system Vào Nhịp Thi, assets/fc11c9370fdb41e5b12e4b4ed727d8b3. Bổ sung nhất quán vào dự án này. Giữ ngôn ngữ thị giác đang có; không chuyển sang một phong cách mới.

Giữ nền sáng mát, paper surfaces trắng, chữ/nav navy sâu, primary teal và điểm nhấn mint, Source Sans 3 cho heading, Noto Sans cho body, JetBrains Mono cho timer/mã/số. Kế thừa chính các tokens, độ đậm chữ, hàng lựa chọn, đường viền, thẻ thông tin, rail trái và cấu trúc header hiện có. Dùng motif phiếu trả lời OMR như ngôn ngữ hình ảnh, không quảng cáo máy quét/chống gian lận. Mỗi màn có hierarchy rõ, một hành động chính, nội dung tiếng Việt có dấu, tiêu đề và dữ liệu mẫu thực tế, không lorem ipsum.

Tăng chiều sâu 2D/3D ở illustration giấy/bút/đồng hồ: giấy có độ dày cạnh, 2–3 lớp lệch phối cảnh, nguồn sáng nhất quán, contact shadow sát vật thể và ambient shadow riêng, điểm sáng mint nhỏ, có khoảng trống giữa các lớp. Giữ vị trí minh họa theo bố cục đã duyệt. Không phủ hiệu ứng lên chữ/form/bảng. Minh họa Home/auth có thể bay nhẹ; dashboard chỉ có điểm nhấn nhỏ. Phòng thi, editor và reporting tĩnh; không parallax, confetti, nhấp nháy timer hoặc cảnh 3D nền. Ghi chú motion: transform/opacity 160–220ms cho controls; float nhỏ 5–7s chỉ ở illustration có nút dừng; reduced-motion chuyển tĩnh. Mẫu hình ảnh chỉ mô tả art direction, không tự nhận WebGL 3D thật hoặc hiệu năng đã đo.

Tách shell theo nhiệm vụ. Public có Home/Trải nghiệm/Hướng dẫn/Trợ giúp và login/register. Candidate có Bảng làm việc/Đề thi/Lịch sử/Hồ sơ; liên kết Admin chỉ khi được quyền. Admin dùng rail giống ngôn ngữ hiện có nhưng menu quản trị riêng. Exam dùng shell tập trung: chỉ các thao tác thi và đường rời phù hợp, không hiển thị menu quản trị. Không có role switch trên UI thật. Quyền thật quyết định menu/action; chưa có nguồn quyền thì hiển thị unavailable, không tự bật quyền từ tên, email hay token.

Đặc tả chức năng v1: chỉ single choice, multiple choice, true-false; prompt/options/explanation plaintext. Điểm integer exact match, không điểm lẻ/partial credit. Danh mục TOEIC, IELTS, IT Certification, Đại học, Tuyển dụng, Nội bộ là nhãn trắc nghiệm, không band/quy đổi chứng chỉ. Không thêm webcam/proctoring, AI giám sát, khóa copy/chuyển tab, listening/media/LaTeX/essay/speaking, thanh toán, chat, reset password, social login hoặc phân quyền người dùng. Không tạo action hủy lượt thi, dừng timer, sửa bài đã nộp, refund quota hay impersonate.

Mọi dữ liệu minh họa có nhãn Dữ liệu mẫu. Không claim rating/số người dùng/tăng điểm/SLO/latency/FPS/100% sao lưu/chứng nhận WCAG/chi phí AWS. Không hứa chưa được backend bảo đảm. Mẫu live unavailable giữ câu trạng thái rõ và CTA hợp lý, không thay bằng dữ liệu mẫu khi API lỗi.

Thiết kế riêng default/loading/empty/error theo từng luồng; có inline error, retry và last updated nếu được cung cấp. Trạng thái lưu có pending/saving/saved/retrying/offline/conflict/unconfirmed; “Đã lưu” chỉ sau ACK máy chủ. Bản nháp chưa ACK chỉ ở bộ nhớ; reload có thể mất. Offline/reauth không dừng deadline. Lỗi 409 giữ bản local và cho đối chiếu. Cursor dùng Tải thêm, không tổng/page-number/search toàn hệ thống khi chưa có API. Điểm null là Chưa có, không 0. Quyền xem đáp án cần dữ liệu được cấp, không lấy keys rồi giấu bằng CSS.

Desktop target 1440px, content max-width khoảng 1200–1280px, khoảng cách theo nhịp 4/8px. Mobile target 390px và reflow được 320px; tablet 768px. Không body overflow, bảng cuộn trong vùng có nhãn và scrollbar nhìn thấy; không ẩn scrollbar toàn cục. Native button/input/select/radio/checkbox, label luôn hiện, focus rõ, touch target 44px; trạng thái có chữ/icon ngoài màu. Dialog có title, focus, cancel khi hợp lệ; sticky header/actions không che controls. Không announce timer mỗi giây. Một H1/màn. Không gộp empty và populated states thành nội dung đang hiển thị đồng thời.

Output: tạo các màn độc lập với tên bắt đầu bằng ID yêu cầu, nói rõ ID nào đã tạo, route, desktop/mobile, state và các flow links. Bảo toàn ba mẫu gốc khi chỉ tạo phần bổ sung. Không chỉnh nội dung nghiệp vụ ngoài yêu cầu. Tên route là thông tin bàn giao; không in mã kỹ thuật/permission/API gap lên UI người dùng.
```

## Nhóm A — chỉnh copy/controls và bổ sung states cho ba mẫu hiện có

```text
Giữ nguyên art direction, layout chính và design system của ba mẫu đã duyệt; chỉ chỉnh các nội dung sai capability và bổ sung state variants. Tạo bản chỉnh để có thể đối chiếu với mẫu gốc.

A1 Home: giữ headline Vào nhịp thi. Tập trung vào từng câu trả lời., hero phiếu giấy/đồng hồ, CTA Trải nghiệm 3 câu mẫu và Tạo tài khoản. Thay 0.05s/60 FPS/100% sao lưu bằng các lợi ích Chuyển câu rõ ràng, Đánh dấu để xem lại, Biết trạng thái lưu. FAQ mất mạng ghi: Đáp án đã được máy chủ xác nhận vẫn được lưu. Thay đổi chưa xác nhận chỉ ở phiên trình duyệt và có thể mất nếu tải lại. Không dùng Dual-Cache/Local Storage/không bao giờ mất. Bỏ claim WCAG AA+, SSL 256-bit, OMR 4.0 như chứng nhận. Nội dung listening/LaTeX/Not Given đổi thành trắc nghiệm plaintext ba loại được hỗ trợ. Hình hero ghi Minh họa giao diện, không có dữ liệu hiệu năng thật. Giữ khối mẫu nhúng như preview; CTA chính đi tới mẫu riêng PU-02. Chỉ một hệ navigation public, không hai header trùng nhau. Tăng chiều sâu giấy/bút/đồng hồ theo Prompt nền, giữ khả năng đọc hero khi graphic chưa tải.

A2 Dashboard: giữ bố cục lượt đang làm → lịch sử gần đây → danh mục. Đổi tạm dừng thành lượt đang làm, ghi thời gian vẫn chạy khi rời trang. Bỏ Hủy lượt này. Không in countdown/progress/tổng nếu history chưa cung cấp; đặt Tiếp tục làm bài và hướng dẫn quay phòng thi để xem thời gian/đáp án đã lưu. Thay tỷ lệ tổng/thời gian trung bình/năng lực vượt chuẩn bằng một card hướng dẫn hoặc trạng thái chưa có dữ liệu, cùng footprint thị giác. Điểm TOEIC dùng 30/40 điểm trắc nghiệm; không band. Bỏ Camera & AI giám sát, mã phòng/giám thị và chống gian lận. Dùng Candidate rail; Admin link chỉ trong variant được quyền. Chỉ hiện tối đa ba lượt trong dữ liệu đã tải; catalog có sáu danh mục gồm Tuyển dụng. Empty dashboard là variant độc lập, không đặt bên dưới dữ liệu đang có như một phần nội dung thường trực.

A3 Exam: giữ header/câu hỏi/phiếu câu hỏi của mẫu. Tách khỏi Candidate/Admin navigation; bỏ độ khó Level 4, camera/giám thị/OMR version và fields không có trong Candidate projection. Không thêm nguồn thống kê có vẻ thật cho câu hỏi tổng hợp. Câu hỏi plaintext, ba loại native controls, helper multiple không nói số đáp án đúng. Tạo variant có metadata frozen đầy đủ và variant chỉ biết phần đã tải; không giả tổng số câu. Save badge có pending/saving/saved/offline/unconfirmed/409. Timer dùng giờ máy chủ; không reset khi dialog/reauth/offline. Tạo submit dialog, conflict dialog, leave warning, reauth trong phòng thi và deadline khóa edit. Deadline notice: Hết giờ. Hệ thống chỉ nhận những đáp án đã lưu đúng hạn. Không 3D chuyển động trong lúc thi. Quy ước phiếu có thêm Chưa lưu và tách Đã trả lời khỏi Đã lưu.
```

## Nhóm B — Identity: 4 màn

```text
Tạo bốn màn AU-01 đến AU-04 độc lập theo phong cách Stitch đã duyệt. Desktop split panel: trái minh họa giấy/bút có chiều sâu và câu giới thiệu ngắn, phải form một bề mặt rõ. Mobile form trước, art thu gọn hoặc bỏ. Không thêm provider/recovery flow.

AU-01 — Đăng nhập — /login. H1 Tiếp tục bài thi của bạn. Email, Mật khẩu, reveal button có nhãn, Đăng nhập, Tạo tài khoản, Gửi lại email xác thực. Email autocomplete email; password current-password và cho paste. Login không áp minimum 15 của đăng ký. Loading giữ form, disabled submit. 401: Không thể đăng nhập. Kiểm tra email, mật khẩu hoặc xác thực email rồi thử lại. 429 có thời gian chờ do server cung cấp, 503/network có retry. Không Ghi nhớ tôi/Quên mật khẩu/social login. Thành công về safe return hoặc dashboard, không mở phòng thi thật trước chọn đề/start.

AU-02 — Đăng ký — /register. Email, Tên hiển thị 1–80, Mật khẩu 15–128 Unicode, Nhập lại mật khẩu; hint 15 ký tự, không bắt uppercase/symbol. Confirm chỉ ở UI. Một CTA Tạo tài khoản, link Đã có tài khoản? Đăng nhập. Inline email/name/password/mismatch errors và error summary nhận focus. Sau accepted chuyển AU-03, không auto-login. Không role selection hoặc mặc định Admin.

AU-03 — Kiểm tra hộp thư — /check-email. Illustration phong bì/phiếu nhỏ, nội dung Nếu email đủ điều kiện, hệ thống sẽ gửi link xác thực. Kiểm tra cả thư rác. Email nhập lại để resend, Gửi lại link, cooldown 60s, Về đăng nhập, Dùng email khác. Không hứa email đã delivered; không show tồn tại/không tồn tại. Tạo default/cooldown/rate-limited/network/error/accepted variants. Tải trang không tự gửi email.

AU-04 — Hoàn tất xác thực — /verify-email. Form Mật khẩu cuối + Nhập lại và Xác thực email. Giải thích Đặt mật khẩu cho tài khoản của bạn để hoàn tất xác thực. Token không hiển thị, không đưa vào copy hoặc form input nhìn thấy. Trang mở link không tự activate. Success: Email đã được xác thực. Đăng nhập để tiếp tục. Invalid/expired/missing dùng cùng safe message và form gửi lại. Variant người đang có phiên: yêu cầu đăng xuất trước khi xác thực; không ghép tài khoản/đổi phiên ngầm. Refresh mất token hướng dẫn mở lại link từ email. Không tự đăng nhập sau success.

Flow links: AU-01 ↔ AU-02 → AU-03 → AU-04 → AU-01; resend ở AU-01/AU-03/AU-04. Có desktop bốn màn và mobile AU-01/AU-04 đại diện; các states là variants riêng, không gộp tất cả vào một form.
```

## Nhóm C — Public: 3 màn

```text
Tạo PU-02/03/04 riêng, kế thừa header/footer và style Home đã duyệt. Không lặp landing hero lớn trên các trang thao tác.

PU-02 — Trải nghiệm 3 câu mẫu — /experience. Nhãn Bản minh họa. Câu hỏi và kết quả mẫu. Panel câu hỏi 65–70%, phiếu ba ô bên phải. Câu 1 single radio, câu 2 multiple checkbox, câu 3 true-false hai radio. Nội dung tổng hợp tự tạo, không bank thật; gợi ý multiple không tiết lộ số key. Chọn, Xóa lựa chọn, Đánh dấu, Câu trước/sau, nhảy 1/2/3 giữ state trong phiên. Không deadline, lưu máy chủ, login hoặc tạo attempt. Counter số câu có lựa chọn, legend trả lời/đánh dấu/đang chọn. Finish mở recap choices trước khi xác nhận Kết thúc mẫu. Result variant Kết quả mẫu, đúng/tổng và điểm mẫu, xem lại lựa chọn/lời giải của bộ mẫu, Thử lại, Tạo tài khoản, Về trang chủ. Có Bỏ qua trải nghiệm, tạo tài khoản. Refresh/rời trang bắt đầu lại. Illustration/perspective chỉ ở header tĩnh; controls phẳng dễ đọc. Mobile sheet phiếu ba câu, actions không che lựa chọn.

PU-03 — Hướng dẫn bắt đầu — /how-it-works. Flow bốn bước Tạo tài khoản → Xác nhận email/đặt mật khẩu cuối → Chọn đề và đọc hướng dẫn → Làm bài/nộp/xem kết quả. Dùng UI snippets đúng các màn, số bước dễ quét; không hướng dẫn OMR giấy/máy quét. Section làm bài giải thích ba loại câu, nhiều lựa chọn exact-match, đánh dấu khác trả lời, Đang lưu khác Đã lưu, deadline vẫn chạy, nộp xong không sửa. Section mất mạng/reauth có copy đúng memory/ACK. CTA Thử 3 câu mẫu và Tạo tài khoản. Mobile timeline dọc, ảnh UI không thành chữ nhỏ không đọc được.

PU-04 — Trợ giúp — /help. Các nhóm tài khoản/email, chọn đề, lưu/kết nối, thời gian/nộp, kết quả/quyền xem đáp án. FAQ accordions có focus và trạng thái mở. Trả lời rõ 202 email là đã nhận yêu cầu, link hết hạn cần gửi lại, điểm là trắc nghiệm, lịch đóng có thể rút ngắn thời gian, đáp án chỉ mở theo policy. Không fake live chat/support ticket/hotline/số liên hệ chưa được cung cấp. Nếu cần trợ giúp thêm: Liên hệ đơn vị tổ chức kỳ thi. Quick links login/check-email/how-it-works/experience. Không thêm chức năng reset password. Desktop sidebar mục lục, mobile mục lục thu gọn, nội dung đọc dễ.
```

## Nhóm D — Catalog và Profile: 3 màn

```text
Tạo CA-02/03/10 với Candidate shell giống dashboard đã duyệt. Rail navy và header compact; hiển thị dữ liệu mẫu nhưng fields tuân contract.

CA-02 — Khám phá đề thi — /exams. Title, mô tả ngắn, category pills Tất cả/TOEIC/IELTS/IT Certification/Đại học/Tuyển dụng/Nội bộ. Danh sách hoặc grid hai cột desktop, một cột mobile; card category/title/duration/questionCount/open/close/chính sách lời giải/Xem đề. Title bilingual dài vẫn wrap. Pagination Tải thêm với loading và hết dữ liệu; filter đổi reset pages. Không tổng đề/page-number/global search/status/sort chưa có contract. Nếu tìm trong rows đã tải, label đúng phạm vi. Empty theo danh mục với Xóa lọc; error với Thử lại, không 0 kết quả giả. Cards có depth nhẹ, không float liên tục.

CA-03 — Chi tiết đề & bắt đầu — /exams/:examId. Title/category/published version, bảng sections số câu/điểm, duration/schedule/timezone/attemptLimit/explanationPolicy/scoring exact match/leaderboard enabled. Không description field nếu chưa được cung cấp; không preview câu hỏi/keys trước attempt. Summary side card với Bắt đầu làm bài, mobile đặt card sau thông tin quan trọng. Dialog xác nhận: thời gian danh định, giờ đóng, vào muộn có thể ít thời gian, accepted attempt tiêu thụ lượt, hết giờ chỉ nhận câu đã lưu. Checkbox Tôi đã đọc hướng dẫn là local UI. Không số lượt còn lại suy từ history; label Chưa có thông tin số lượt đã dùng khi cần. States starting, resume existing attempt, schedule closed/not open/limit error, network đang xác minh yêu cầu bắt đầu; retry không tạo lượt mới. Leaderboard link chỉ khi enabled, đúng version.

CA-10 — Hồ sơ cá nhân — /profile. Email/read-only email verification; Tên hiển thị editable; switch Tham gia bảng xếp hạng default off. Notice Khi bật, kết quả tốt nhất có thể xuất hiện với bí danh trong bảng xếp hạng được mở. CTA Lưu thay đổi, read-only identity card và illustration nhỏ. Không email/password/role editor. Success lưu accepted revision; 409 variant giữ local và đối chiếu bản mới, Dùng dữ liệu mới/Gửi lại thay đổi có confirmation. Loading, invalid name, network error. Logout rõ ràng; nếu có thay đổi bài thi chưa xác nhận phải giải thích trước.
```

## Nhóm E — Status, kết quả, lịch sử và ranking: 5 màn

```text
Tạo CA-05/06/07/08/09; kế thừa Candidate shell, ngôn ngữ paper/teal/mint và typography đã duyệt. Không tạo chứng chỉ/điểm quy đổi/phân tích năng lực ngoài DTO.

CA-05 — Trạng thái bài nộp — /attempts/:attemptId/status. Card khoảng 640px, thông tin attempt/version, Đã nhận bài lúc ... khi có ACK. States Đang xác minh bài nộp sau mất ACK; SUBMITTED/PROCESSING hoặc EXPIRED chưa có kết quả: Đang xử lý kết quả; FAILED: safe error và Trợ giúp/Thử tải lại; FAILED replayPending: Đã yêu cầu xử lý lại; completed có CTA Xem kết quả. Không phần trăm/ETA chấm giả. Poll cap hết: Chưa có kết quả mới. Bạn có thể xem lại trong lịch sử. Luôn có Về lịch sử; expired không tự thành failure. Progress illustration chỉ tĩnh hoặc loader nhỏ reduced-motion.

CA-06 — Kết quả bài trắc nghiệm — /attempts/:attemptId/result. Điểm earned/possible là số chính, correct/total và phần trăm hai chữ số, ví dụ 83.33%, title/version/section labels chỉ frozen context hợp lệ. Bảng điểm theo phần, elapsed nếu được cấp; không TOEIC 990/IELTS band/gauge năng lực. Nhãn Nộp khi hết giờ khi expired. Review allowed: Xem bài; review null: Bài thi chưa mở quyền xem đáp án, không preview key. CTA Lịch sử, Leaderboard đúng version nếu enabled, Làm lại dẫn detail để kiểm tra limit. Variant thiếu frozen title dùng mã version gọn; pending result giữ trạng thái xử lý. Minh họa hoàn thành nhỏ, không confetti chiếm điểm.

CA-07 — Xem bài đã được mở — /attempts/:attemptId/review. Question read-only với Bạn chọn/Đáp án đúng/icon và chữ đúng-sai/chưa trả lời, explanation plaintext hoặc Không có giải thích cho câu này. Multiple giải thích chọn đúng toàn bộ mới có điểm. Phiếu câu hỏi nhỏ giúp chuyển câu, pagination bounded Tải thêm; filter chỉ trên phần đã tải có nhãn. Review bị từ chối 403 có thông báo và Về kết quả, không giữ keys/explanations dưới card mờ/hidden. Responsive một cột; choices dùng text icon ngoài màu, không controls giả có thể sửa bài.

CA-08 — Lịch sử thi — /history. Rows title/fallback version ID, thời điểm bắt đầu, trạng thái, expired, score nullable, CTA Tiếp tục/Xem trạng thái/Xem kết quả theo lifecycle. No score dùng Chưa có điểm. Tải thêm cursor và Tải lại danh sách; không tổng số lượt/điểm trung bình từ page đầu. No global filters/search nếu chưa có; loaded filter phải ghi phạm vi. Empty có Khám phá đề thi; error không đổi thành empty. Long titles wrap, desktop columns/mobile stacked rows, old/unpublished attempt vẫn có link owned access.

CA-09 — Xếp hạng phiên bản — /exams/:examId/versions/:versionId/leaderboard. Title/version/scope rõ, bảng rank/pseudonym/earned–possible/completedAt. Dữ liệu tổng hợp bí danh, không avatar/email/displayName hoặc Bạn highlight vì DTO không có isMe. Notice opt-in dẫn CA-10; disabled/403 có thông báo riêng, empty chưa có người đủ điều kiện. Tải thêm và Tải lại đặt lại watermark. Không podium hoạt họa/gộp các versions. Không version picker có dữ liệu API chưa có; chỉ known authorized versions. Mobile bảng vùng cuộn có nhãn hoặc rows gọn.
```

## Nhóm F — Admin nội dung: 7 màn

```text
Tạo AD-01/02/03/04/05/06A/06B với Admin shell đồng bộ rail của dashboard. Menu Tổng quan/Đề thi/Ngân hàng câu/Nhập JSON/Giám sát/Số liệu/Nhật ký; item theo permission. Các API capability đang thiếu thì unavailable, không role switch. Dữ liệu demo phải có banner. Không thêm quản lý user/quyền/thanh toán.

AD-01 — Tổng quan quản trị — /admin. Hero compact giấy/phiếu có chiều sâu cùng style đã duyệt; shortcuts Soạn và phát hành đề/Ngân hàng câu/Nhập JSON/Theo dõi lượt thi. Metrics được cấp active/submitted/completed/failed với asOf, không revenue/growth/tổng đề suy từ một page. Permissions subsets có các shortcuts phù hợp. Variant live không nguồn quyền: khu nội dung unavailable + Về bảng làm việc; không dashboard số liệu giả. Overview vẫn rõ khi metrics unavailable.

AD-02 — Quản lý đề — /admin/exams. Table title/category/duration/published/archived/revision/currentVersion/schedule. CTA Tạo đề, row Edit/Publish/Unpublish/Archive/Monitor/Submissions/Statistics theo quyền. Filter chỉ dữ liệu đã tải có nhãn; cursor Tải thêm. Publish dialog giải thích tạo version immutable; Unpublish chặn start mới; Archive logical không xóa attempts. Draft/published/archived badges rõ. Không bulk delete/refund/sửa snapshot/force submit. Empty tạo đề, loading skeleton rows, network error và revision conflict giữ draft.

AD-03 — Soạn đề — /admin/exams/new và /admin/exams/:examId/edit. Một editor ba bước Thông tin → Các phần & câu hỏi → Kiểm tra & xuất bản, có Lưu bản nháp riêng với Xuất bản. Fields title/category/duration 1–240 phút/open/close/displayTimezone IANA/attemptLimit 1–10/explanationPolicy/leaderboardEnabled. Hint timezone và lịch đóng phải sau mở, không dùng timezone máy ngầm. Sections 1–20 nonempty; picker câu hỏi ngân hàng có cursor, bankQuestionId/position/points integer 1–1000, max 500 unique questions khi publication. Reorder bằng Lên/Xuống, optional drag không bắt buộc. Summary counts là bản nháp local. Save full replacement; revision conflict đối chiếu bản local/mới, không overwrite tự động. Tạo/sửa dùng cùng template; validation long title/schedule/empty sections/duplicate câu. Sticky footer không che fields, mobile stepper ngang cuộn có nhãn.

AD-04 — Ngân hàng câu hỏi — /admin/questions. List prompt preview/type/points/revision/archived, CTA Tạo câu hỏi, Sửa/Archive/Xem trước theo quyền. Plaintext preview có xuống dòng và không overflow. Cursor Tải thêm, loaded filter chỉ phần đã tải. Archive dialog giải thích chỉ thay tương lai, publication đã khóa không đổi. Empty tạo câu và link Nhập JSON; row errors/loading. Không làm Candidate bank có thể đọc keys.

AD-05 — Soạn câu hỏi — /admin/questions/new hoặc /admin/questions/:questionId/edit. Fields prompt/explanation plaintext ≤8000, type single/multiple/true-false, points integer 1–1000, options 2–10 position/text ≤2000. Single một key radio; multiple 1–N key checkboxes; true-false đúng hai options Đúng/Sai và một key. Type conversion có confirmation khi mất options/keys; không giữ hidden invalid key. Thêm/xóa/reorder options có native buttons; counter gần giới hạn. Candidate-safe preview riêng không key/explanation; Admin key editing region chỉ có quyền. Save full body/expectedRevision, 409 giữ draft, invalid inline summary. Mobile preview tab riêng, không pane ép chữ nhỏ.

AD-06A — Nhập JSON — /admin/imports/new. Stepper Chọn dữ liệu → Kiểm tra → Xác nhận nhập. File hoặc paste JSON, giới hạn 1MiB UTF-8, schemaVersion 1 và 1–100 entries. Download template tổng hợp hợp lệ, không CSV/XLSX/zip/remote URL. Chọn file không tự submit. Nút Kiểm tra dữ liệu tạo dry-run; report clientRef/field/message, highlight lỗi để sửa. Valid dry-run ghi Kiểm tra hợp lệ — chưa nhập vào ngân hàng. Nút Nhập câu hỏi mở confirmation thực; chỉ accepted committed mới success. Invalid import là atomic, không thông báo đã nhập một phần. Timeout/lost ACK là đang xác minh lần nhập, không khuyên nhập lại key mới. Không đưa raw keys ra report/payload log.

AD-06B — Báo cáo nhập — /admin/imports/:importId. Summary importId/createdAt/mode/committed/accepted count theo DTO; phân biệt dry-run valid, real committed, invalid atomic, pending/unavailable. Table issues clientRef/field/message, số dòng/IDs chỉ khi có nguồn đúng. Nút Về nhập JSON và Mở ngân hàng câu. Không fake progress/partial commit hoặc raw answer keys. Empty issues success rõ; pagination chỉ khi contract cấp, không tự tạo report export API. Mobile issue rows readable.
```

## Nhóm G — Admin giám sát và báo cáo: 7 màn

```text
Tạo AD-07A/07B/08/09/10/11/12 theo Admin shell đã duyệt. Content dense nhưng đọc được, bảng vùng cuộn có nhãn; không 3D phía sau bảng. Không live presence/camera/IP/device/tab-change columns. Ô chưa có data phải Chưa có dữ liệu, không 0.

AD-07A — Chọn đề theo dõi — /admin/monitor. Danh sách đề đã tải, title/category/version/schedule, CTA Theo dõi lượt đang làm, Xem bài nộp, Thống kê phiên bản theo quyền. Cursor và empty/error. Không suy số đang online từ lifecycle hoặc cộng một page thành tổng. Chọn đề đi AD-07B, không dashboard giám thị webcam.

AD-07B — Lượt thi đang làm — /admin/exams/:examId/monitor. Header exam/version context được cấp và lần tải gần nhất. Rows opaque candidateId/attemptId/status/startedAt/deadline. Label Đang làm bài là trạng thái lượt thi, không online presence. Refresh thủ công và indicator đang cập nhật; retained authorized rows khi stale error có nhãn. Poll pause khi tab hidden, UI không flash mỗi poll. Links bài nộp/thống kê. Không impersonate/force submit/pause timer hoặc tạo quyền giám thị.

AD-08 — Bài đã nộp — /admin/exams/:examId/submissions. Filter publishedVersionId từ IDs biết và được phép, rows opaque candidate/status/submittedAt/expired/nullable score, CTA Chi tiết. Score null Chưa có điểm; failed/replay pending/processing/expired labels riêng. Cursor Tải thêm; không filter toàn cục vượt query contract. Không count total/average suy từ trang. Empty/error/loading. Không download/export data chưa có API.

AD-09 — Chi tiết bài nộp — /admin/attempts/:attemptId. Header attempt opaque ID/status/timing/expired/result summary earned/possible khi available. Result cần reporting.read; keys/explanation review cần assessment.review.admin riêng: tạo cả authorized và denied section variants. Replay chỉ FAILED phù hợp + assessment.replay + current admin expectedRevision; dialog lý do bắt buộc, Xác nhận yêu cầu xử lý lại, cancel. Accepted 202 ghi Đã yêu cầu xử lý lại, không hoàn tất; replayPending không cho gửi lặp. Thiếu revision capability dùng unavailable; không candidate resume/impersonate, đổi answers/refund quota/tạo attempt mới. Failed, processing, completed states; dữ liệu review revoked phải biến mất.

AD-10 — Thống kê câu hỏi — /admin/exams/:examId/versions/:versionId/statistics. Frozen version/question scope, completedAttempts denominator, correct/incorrect/unanswered counts và bar có nhãn. Không difficulty/response time/average fields chưa có. Zero completed message Chưa có bài chấm xong, không NaN. Multiple option counts label Lượt lựa chọn, có thể vượt số attempts, không pie giả tổng 100%. Bảng và thanh một nguồn dữ liệu, cursor nếu nhiều câu. Version không từ current publication thay lượt cũ. Loading/unavailable/empty/error riêng.

AD-11 — Số liệu hệ thống — /admin/metrics. Ba nhóm Nghiệp vụ/HTTP/Xử lý, snapshot asOf, activeCandidates/submitted/completed/failed/httpRps/httpP95Ms/queueDepth/oldestJobSeconds khi được cấp. Thiếu p99/CPU/RDS/Redis/chi phí hiển thị Chưa có dữ liệu hoặc bỏ cards. Snapshot một lần không thành biểu đồ lịch sử. Không fake timeseries/AWS bill/growth. Manual refresh và indicator stale; update không giật layout. Permission denied và unavailable. Nội dung trong card có unit rõ, số monospace vừa phải.

AD-12 — Nhật ký hoạt động — /admin/audit. Read-only rows occurredAt/opaque actor/action/resource/outcome và Tải thêm. Drawer title sự kiện, reason/correlationId/changed-field names, explicit Sao chép mã đối chiếu, close/focus return. Không secret/raw request/body/answers/key/SQL/IP, edit/delete audit. Empty/query error/loading/denied variants. Mobile rows đủ timestamp/action/resource/outcome, drawer full width; copy success nhỏ sau thao tác chủ động.
```

## Nhóm H — mobile và state gallery

```text
Tạo state/mobile variants dựa trên các màn đã có, không tạo lại phong cách. Tên có ID + thiết bị + state. Mobile ưu tiên Home, AU-01 login, AU-04 verify, CA-01 dashboard, CA-03 detail, CA-04 exam, AD-03 exam editor và AD-08 submissions. Target 390px, reflow tới 320px; tablet 768px; desktop 1440px/zoom 200% không che focus hoặc body overflow.

CA-04 mobile: mini timer và save status sticky trên cùng, câu hỏi full width, answer row touch-friendly, Previous/current/Next/Phieu controls bottom dock; sheet Phiếu câu hỏi mở có title/close và legend, restore focus khi đóng. H1/title dài không đẩy đồng hồ khỏi màn hình. Câu nhiều lựa chọn native checkbox; true-false hai radio. No lateral admin rail. Offline/reauth không dừng countdown. Sheet/dialog/keyboard không che option/action cuối. Tạo riêng offline, 409 đối chiếu choices+mark, reauth giữ draft, submitting, mất ACK, deadline có 2 thay đổi chưa xác nhận. Không dùng animation timer.

Common states SY-01: Loading skeleton; empty có CTA; 401 đăng nhập lại; 403 không quyền + Về bảng làm việc, không login loop; 404 Không tìm thấy nội dung; capability unavailable + Thử tải lại/đường quay về; 429 cooldown/Retry-After; 503/network error; stale retained data có lần cập nhật; 409 giữ draft và comparison. Đừng in HTTP/API gap IDs lên câu copy thông thường.

Admin dialogs: publish immutable version, unpublish chặn start mới, archive logical, question type conversion mất options/keys, save conflict không overwrite, dry-run valid chưa committed, real import confirmation và atomic error, replay reason/revision/unavailable/accepted pending. Forms có inline errors + summary focus. Reporting snapshot missing fields không 0/charts. Tất cả đi cùng nhãn state/route trong handoff, nhưng demo labels không thành token/quyền giả.

Cuối nhóm, giao coverage matrix 32 loại trang + mobile/state variants. Chỉ đánh dấu ID đã có output thiết kế thật. Ghi rõ phần chưa tạo hoặc cần hỏi. Liên kết flow public sample→register→check-email→verify→login→dashboard→browse→detail→exam→status→result→review/history/leaderboard; Admin bank/import→draft→publish→monitor→submissions→detail/replay→statistics/audit. Giữ nguyên gốc ba mẫu đã duyệt để reviewer đối chiếu.
```

## Checklist khi nhận kết quả

- Mẫu mới dùng cùng design system; không drift sang layout/màu/fonts khác.
- Đủ 29 loại trang bổ sung, ba mẫu gốc có biến thể copy/state đúng contract; không đếm prototype và editor aliases hai lần.
- Handoff mỗi màn có route, fields/actions/states/mobile; không chỉ một poster tổng hợp.
- Những chỗ thiếu live capability có bản unavailable; không giả đã triển khai chức năng chỉ vì Stitch vẽ controls.
- UI giữ đúng nguồn quyền/ACK/deadline/immutable version/review privacy; prototype scripts không thay controller thật.
- Chiều sâu minh họa rõ hơn, controls dễ đọc, phòng thi tĩnh; không claim 3D runtime/hiệu năng khi chưa triển khai và đo.
