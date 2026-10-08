# Prompt tiếp theo — chốt UI trên Stitch trước khi triển khai

Theo yêu cầu người dùng ngày 2026-10-08: **ưu tiên thiết kế và duyệt UI trên Stitch; dừng sửa code cho đến khi người dùng chốt UI**. Các diff frontend đã có được giữ nguyên tại local, chưa được coi là UI đã duyệt cuối cùng.

Project: [ExamPlatform UI/UX Redesign](https://stitch.withgoogle.com/projects/11777231516922865355), ID `11777231516922865355`. Design system gốc `assets/fc11c9370fdb41e5b12e4b4ed727d8b3`.

## Phần đã có và phần cần tạo

Inventory MCP mới nhất trả 26 resources: **25 mẫu trang desktop + một prototype**. Trong 25 mẫu: Public 4, Identity 4, Candidate 10, Admin nội dung 7. Chưa xác nhận đủ mobile/state variants hoặc chất lượng từng mẫu. [Danh sách IDs thực tế](evidence/stitch-port-2026-10-08/stitch-inventory.json).

Request tạo Admin nội dung trả lỗi dịch vụ, nhưng kiểm tra inventory sau đó xác nhận cả bảy mẫu đã xuất hiện. Không gửi lại nhóm đó để tránh trùng.

Bảy mẫu desktop còn thiếu: AD-07A, AD-07B, AD-08, AD-09, AD-10, AD-11, AD-12. Gửi lần lượt Prompt 1 → 2 → 3; mỗi prompt dưới đây đã có chỉ dẫn style riêng. Sau đó gửi Prompt 4–6 để chốt responsive, states và hình ảnh. Không gửi lại toàn bộ nhóm B–F trong [bộ prompt ban đầu](stitch-completion-prompts-2026-10-08.md).

## Prompt 1 — Giám sát và danh sách bài nộp: ba trang

```text
Tiếp tục dự án ExamPlatform UI/UX Redesign hiện tại. Chỉ thiết kế UI/prototype trong Stitch, chưa triển khai ứng dụng. Giữ nguyên tất cả màn đã có. Tạo ba trang desktop độc lập AD-07A, AD-07B, AD-08; không ghép chúng thành một dashboard dài.

Kế thừa đúng phong cách của Trang chủ - ExamPlatform, Bảng làm việc Thí sinh, Phòng thi - Exam Room và bảy màn Admin nội dung đã có. Dùng design system Vào Nhịp Thi: canvas #F8F9FF, thẻ trắng, navy #081C25, primary teal #0F766E, mint #A3F2D0, border mảnh, shadow nhẹ. Source Sans 3 cho headings, Noto Sans cho body, JetBrains Mono cho mã/thời gian. Desktop 1440px, spacing theo 4/8px. Dùng cùng rail Admin, header, độ cao input/button, radius và icon system; không tạo một theme mới. Nội dung tiếng Việt có dấu; dữ liệu tổng hợp có nhãn Dữ liệu mẫu.

AD-07A — Chọn đề theo dõi
Route bàn giao: /admin/monitor.
- Header: Theo dõi kỳ thi; mô tả ngắn, nút tải lại và thời điểm dữ liệu được cập nhật.
- Danh sách đề dạng bảng hoặc cards gọn: tên đề, danh mục, mã phiên bản, lịch mở/đóng nếu có.
- Mỗi đề có các đường đi Theo dõi lượt thi, Xem bài nộp, Thống kê phiên bản theo quyền.
- Đề dài vẫn đọc được; phiên bản khác nhau có nhãn rõ. Chỉ dùng dữ liệu đã tải, không tự tính tổng toàn hệ thống.
- Tải thêm ở cuối. Tạo các variants loading, danh sách trống có đường về quản lý đề, lỗi có Thử lại, không có quyền.
- Không hiển thị camera, số người online hay trạng thái kết nối suy ra từ trạng thái bài thi.

AD-07B — Lượt thi đang làm
Route: /admin/exams/:examId/monitor.
- Breadcrumb về Chọn đề theo dõi; tên đề và phiên bản được cung cấp, lần cập nhật gần nhất, nút Tải lại.
- Bảng gồm mã lượt thi, mã thí sinh ẩn danh, trạng thái lượt, giờ bắt đầu, hạn nộp; mã dài có cách xem đủ.
- Chữ Đang làm bài mô tả trạng thái lượt thi, không đồng nghĩa đang online.
- Khi refresh giữ bảng ổn định, chỉ indicator nhỏ; khi lỗi dữ liệu cũ có nhãn cập nhật chưa thành công và thời điểm cũ.
- Liên kết tới bài nộp/chi tiết theo quyền. Không có thao tác ép nộp, dừng timer, sửa đáp án hoặc đăng nhập thay thí sinh.
- Tạo populated, empty, stale-error và permission-denied variants riêng.

AD-08 — Danh sách bài nộp
Route: /admin/exams/:examId/submissions.
- Header tên đề, ngữ cảnh phiên bản, navigation cùng AD-07B.
- Filter phiên bản chỉ gồm các IDs đã biết và được phép xem; không thêm search/sort/filter toàn hệ thống chưa có dữ liệu hỗ trợ.
- Bảng: mã lượt, bí danh hoặc mã thí sinh được cấp, phiên bản, thời gian nộp, trạng thái, điểm earned/possible, CTA Chi tiết.
- Phân biệt Đang xử lý, Đã có kết quả, Xử lý thất bại, Đã yêu cầu xử lý lại; Hết giờ là dấu hiệu riêng, không tự đồng nhất thất bại.
- Điểm chưa có ghi Chưa có điểm, không 0. Không tính average/tổng từ một trang.
- Có Tải thêm, loading tiếp, empty, network error và unavailable. Không tự thêm xuất Excel/CSV hay bulk actions.

Chung: bảng có vùng cuộn và scrollbar nhìn thấy, labels rõ, focus rõ, touch target tối thiểu 44px, trạng thái có chữ/icon ngoài màu. Phần dữ liệu giữ tĩnh; chỉ illustration nhỏ ở empty state nếu cần, không 3D phía sau bảng. Mỗi trang một H1. Tên route/permission là ghi chú handoff, không in thành copy kỹ thuật trên UI. Trả về từng screen ID thực tế và nối flow AD-07A → AD-07B/AD-08.
```

## Prompt 2 — Chi tiết bài nộp và thống kê: hai trang

```text
Trong cùng dự án ExamPlatform UI/UX Redesign, tạo riêng AD-09 và AD-10 desktop 1440px. Giữ nguyên mọi màn đã có. Kế thừa đúng Admin shell và design system Vào Nhịp Thi: canvas #F8F9FF, white cards, navy #081C25, teal #0F766E, mint #A3F2D0; Source Sans 3/Noto Sans/JetBrains Mono, hairline borders, khoảng cách 4/8px. Không redesign thương hiệu hoặc thêm tính năng ngoài mô tả. Dữ liệu minh họa có nhãn Dữ liệu mẫu; toàn bộ copy tiếng Việt.

AD-09 — Chi tiết bài nộp
Route: /admin/attempts/:attemptId.
- Breadcrumb về danh sách bài nộp, header mã lượt/tên đề/phiên bản khi có dữ liệu hợp lệ.
- Summary có trạng thái, bắt đầu/nộp/hạn nộp, dấu Hết giờ nếu áp dụng, điểm earned/possible khi đã được cấp.
- Khu kết quả và khu xem đáp án là hai vùng quyền riêng. Variant được xem điểm nhưng không được xem đáp án phải có thông báo riêng ở vùng review; không đặt keys/lời giải phía sau overlay hoặc blur.
- Review được phép: câu hỏi plaintext, lựa chọn thí sinh, đáp án đúng, giải thích, đúng/sai/chưa trả lời với icon và chữ; nhiều lựa chọn đúng toàn bộ mới có điểm. Không có controls sửa bài đã nộp.
- Variant FAILED có action Yêu cầu xử lý lại khi đủ quyền và có revision hợp lệ. Dialog gồm lý do bắt buộc, giải thích tác động, Hủy và Xác nhận yêu cầu xử lý lại.
- Sau accepted: Đã yêu cầu xử lý lại; trạng thái vẫn chờ xử lý, không success chấm xong. Không cho gửi lặp khi đang pending. Thiếu capability/revision thì hiển thị unavailable rõ ràng.
- Tạo riêng processing, completed, failed, replay-pending, denied-review và missing-metadata variants.
- Không đổi đáp án, tạo attempt thay thế, hoàn lượt hoặc giả làm thí sinh.

AD-10 — Thống kê câu hỏi theo phiên bản
Route: /admin/exams/:examId/versions/:versionId/statistics.
- Header tên đề, mã phiên bản đã khóa, thời điểm cập nhật và số bài đã chấm xong dùng làm mẫu số.
- Bảng mỗi câu: thứ tự/mã câu, prompt preview, số đúng/sai/chưa trả lời; thanh ngang có labels và số tương ứng cùng nguồn dữ liệu.
- Không tự thêm thời gian trả lời trung bình, độ khó hoặc khả năng phân loại nếu chưa có dữ liệu.
- Với multiple choice: lượt chọn từng option có thể vượt số bài; ghi rõ Lượt lựa chọn, không dùng pie giả tổng 100%.
- Chưa có bài chấm xong: empty state rõ, không NaN hoặc biểu đồ thành tích giả.
- Phiên bản cũ vẫn giữ đúng ngữ cảnh, không tự đổi sang publication mới. Có Tải thêm nếu dữ liệu phân trang và Tải lại.
- Tạo populated, zero-completed, loading, network error, unavailable và denied variants.

Chung: ưu tiên nội dung đọc được và vùng cuộn bảng có nhãn; controls >=44px, native form controls, focus rõ. Không animation/3D trong dữ liệu báo cáo. Mỗi route là screen độc lập có H1, states độc lập và flow về danh sách bài nộp/đề tương ứng. Trả IDs từng output; chưa tạo được màn nào thì ghi rõ màn đó.
```

## Prompt 3 — Số liệu hệ thống và nhật ký: hai trang

```text
Tiếp tục cùng dự án ExamPlatform UI/UX Redesign. Tạo hai trang độc lập AD-11 và AD-12 desktop 1440px theo đúng shell các màn Admin hiện có. Giữ canvas #F8F9FF, white surfaces, navy #081C25, teal #0F766E, mint #A3F2D0, borders mảnh và shadows nhẹ. Headings Source Sans 3, body Noto Sans, số/mã JetBrains Mono. Giữ layout, navigation, spacing, buttons và states nhất quán; không tạo theme mới. Copy tiếng Việt và nhãn Dữ liệu mẫu cho fixture.

AD-11 — Số liệu hệ thống
Route: /admin/metrics.
- Header Số liệu hệ thống, mốc snapshot và nút Tải lại. Bố cục ba vùng Nghiệp vụ / HTTP / Xử lý.
- Nghiệp vụ: activeCandidates, submitted, completed, failed khi được cấp.
- HTTP: httpRps và httpP95Ms, có đơn vị dễ hiểu.
- Xử lý: queueDepth và oldestJobSeconds; ghi rõ ý nghĩa và đơn vị.
- Ô thiếu dữ liệu ghi Chưa có dữ liệu hoặc được bỏ, không chuyển null thành 0.
- Một snapshot không trở thành đường biểu đồ lịch sử. Không tự thêm CPU/RDS/Redis/p99/AWS bill/chi phí tiết kiệm/tăng trưởng.
- Trong refresh giữ layout, indicator nhẹ. Khi lỗi giữ snapshot cũ với nhãn cũ và thời điểm; cho tải lại.
- Có variants đầy đủ dữ liệu, một phần unavailable, loading, stale-error và không có quyền. Không vẽ các cards trống như dữ liệu thật.

AD-12 — Nhật ký hoạt động
Route: /admin/audit.
- Header Nhật ký hoạt động, mô tả read-only, action Tải lại.
- Bảng gồm thời điểm, mã người thực hiện, hành động, đối tượng và kết quả. Cursor Tải thêm ở cuối; không page-number hoặc search toàn hệ thống khi chưa có query tương ứng.
- Click row mở drawer có tên sự kiện, thời điểm, actor/resource, lý do khi được cấp, mã đối chiếu và tên các trường đã đổi.
- Nút Sao chép mã đối chiếu chỉ thông báo đã sao chép sau thao tác chủ động; đóng drawer trả focus về row đã mở.
- Không lộ token, raw request/body, mật khẩu, answers/keys, SQL, IP hoặc thông tin cá nhân không cần thiết. Không có nút sửa/xóa audit.
- Có populated, empty, loading, network-error và denied variants. Trên mobile drawer full width, rows vẫn đọc được timestamp/action/resource/outcome.

Chung: content tĩnh, không 3D/parallax phía sau số liệu, tables có vùng cuộn gắn nhãn và scrollbar nhìn thấy. Trạng thái có text/icon ngoài màu, focus rõ, targets >=44px. Mỗi màn một H1. Giao screen IDs, state names và flow links về Admin; giữ nguyên tất cả các màn khác.
```

## Prompt 4 — Bản mobile và tablet để duyệt bố cục

```text
Tạo responsive variants từ các thiết kế hiện có của ExamPlatform UI/UX Redesign. Giữ nguyên desktop và cùng design system Vào Nhịp Thi; đây là bước chốt bố cục trên thiết bị nhỏ, không phát minh một UI khác.

Tạo từng screen MOBILE 390px, ghi chú reflow 320px và TABLET 768px cho tám màn: Home, AU-01 Đăng nhập, AU-04 Xác thực email, CA-01 Dashboard, CA-03 Chi tiết đề, CA-04 Phòng thi, AD-03 Soạn đề và AD-08 Bài nộp. Mỗi màn có tên ID + thiết bị; không poster ghép tám màn.

- Home: headline và CTA trước illustration, typography có dấu rõ, giấy/bút không che text; mẫu ba câu đủ chỗ thao tác.
- Auth: form trước, art thu nhỏ hoặc ẩn; labels luôn hiện; bàn phím không che CTA/lỗi. Giữ flow /check-email, không /resend-verification.
- Dashboard: thẻ tiếp tục trước, lịch sử gọn, danh mục chuyển hàng/cuộn có chỉ dẫn; navigation dạng menu đóng được bằng Escape và trả focus.
- Chi tiết đề: thời gian/lịch/luật trước CTA; summary card một cột; dialog bắt đầu không vượt màn.
- Phòng thi: timer và save status gọn, câu hỏi toàn chiều ngang; native radio/checkbox >=44px. Dock điều hướng và mở Phiếu câu hỏi không che option cuối. Phiếu dạng sheet có title/đóng/legend; đóng trả focus. Không có Admin rail.
- Soạn đề: stepper rõ, field một cột, reorder bằng Lên/Xuống, preview tab riêng. Sticky footer không che lỗi/input cuối.
- Bài nộp: bảng cuộn trong vùng có nhãn hoặc stacked rows; mã dài xem được, không body overflow. Drawer/dialog full width hợp lý.

Kiểm tra long titles, chữ phóng 200%, text wrap và focus. Bảng phải có scrollbar nhìn thấy. Giữ một H1 và semantic controls. Bàn giao từng screen ID, device, route và ghi chú thứ tự nội dung. Nếu cần, tạo theo từng nhóm 2–3 màn để dễ review; không tự nhận đủ khi chưa có output.
```

## Prompt 5 — States và dialogs của luồng thi

```text
Bổ sung state variants độc lập vào Phòng thi - Exam Room và các trang kết quả hiện có trong ExamPlatform UI/UX Redesign. Giữ nguyên mẫu chính, typography, teal/navy/mint và layout đã duyệt. Tên output phải ghi route + state + desktop/mobile. Không gộp lỗi, empty và populated cùng lúc lên một màn.

Phòng thi cần các variants:
1. Pending/Saving/Saved: phân biệt Đã chọn với Đã lưu; chỉ Saved sau xác nhận máy chủ. Có timestamp nếu có nguồn, không check xanh ngay khi vừa click.
2. Offline/Retrying: lựa chọn chưa xác nhận còn trong bộ nhớ; reload có thể mất, đồng hồ vẫn chạy. Không hứa lưu local/offline bền vững.
3. Conflict: dialog đối chiếu lựa chọn và đánh dấu local/server, cho Dùng bản máy chủ hoặc Giữ thay đổi của tôi. Không ghi đè ngầm.
4. Reauth: đăng nhập lại trong ngữ cảnh lượt thi, giữ draft, thời gian tiếp tục. Không hiện timer mới/reset.
5. Leave warning: giải thích thay đổi chưa lưu và thời gian vẫn chạy; hành động rõ phù hợp trạng thái.
6. Submit confirmation: tóm tắt phần đã tải, câu chưa trả lời/chưa xác nhận; lựa chọn Hủy/tiếp tục lưu/nộp theo dữ liệu thực. Không giả biết toàn bộ bài khi chưa tải đủ.
7. Lost acknowledgement: Đang xác minh bài nộp, không khuyên tạo lượt mới hoặc nộp lặp bằng khóa mới.
8. Deadline: khóa sửa, giữ cách xem bài; chỉ đáp án được máy chủ nhận đúng hạn mới được tính. Có ví dụ hai thay đổi chưa được xác nhận, không nói mất mọi đáp án.
9. Frozen metadata thiếu: nhãn version/mã ngắn, scope đã tải; không lấy tiêu đề/current publication thay phiên bản cũ.

Kết quả cần states: đang xử lý không phần trăm/ETA giả; FAILED; replay đã yêu cầu nhưng chưa hoàn tất; hết giờ có kết quả; điểm null; review được phép và bị từ chối; history trống; leaderboard tắt hoặc chưa có người đủ điều kiện. Review denied không có keys/explanations bị blur phía sau.

Dialog có title, focus rõ, cancel khi hợp lệ, không che nội dung khi bàn phím mở. Không animate timer hoặc announce mỗi giây. Tạo desktop và mobile đại diện cho offline/conflict/reauth/deadline; giao danh sách states đã tạo cùng IDs.
```

## Prompt 6 — Đồng bộ visual, 2D/3D và handoff cuối

```text
Review toàn bộ màn của dự án ExamPlatform UI/UX Redesign để chuẩn bị chủ sản phẩm duyệt UI trước khi viết code tiếp. Giữ ba mẫu gốc làm mốc đối chiếu và giữ bản hiện có; tạo bản chỉnh/variants riêng khi cần.

Đồng bộ canvas sáng, white cards, navy text/chrome, teal primary và mint accent; Source Sans 3/Noto Sans/JetBrains Mono. Dùng cùng logo phiếu trả lời OMR, icons, spacing, radius, buttons, input/focus, error messages và nav shells. Không drift sang primary đen hoặc một theme mới ở các trang sinh bổ sung.

Làm chiều sâu illustration rõ hơn ở Home/auth/onboarding: phiếu giấy có 2–3 lớp cách nhau, cạnh có độ dày, phối cảnh dễ nhận ra, một nguồn sáng thống nhất, contact shadow và ambient shadow riêng. Bút và đồng hồ có highlight/khối rõ. Giữ graphic ở vùng riêng, không che headline/form. Float chỉ nhẹ 5–7s và có nút Dừng; reduced-motion tĩnh. Dashboard chỉ art nhỏ; phòng thi/editor/bảng báo cáo tĩnh. Không dùng glow/confetti/parallax dày để thay nội dung.

Sửa nội dung vượt chức năng: bỏ claims 0.05s/60FPS/100% sao lưu/ISO/WCAG AA+/SSL chứng nhận khi chưa có evidence; bỏ webcam/AI giám sát, social login/reset password, dừng/hủy lượt, official TOEIC/IELTS band. FAQ nói rõ máy chủ xác nhận mới được lưu; không hứa LocalStorage/Dual-Cache. Route gửi lại email là /check-email. Dùng đúng sáu danh mục gồm Tuyển dụng và Nội bộ. Dữ liệu minh họa có nhãn Dữ liệu mẫu.

Thêm common states theo cùng style: loading, empty có CTA, không có quyền, không tìm thấy, network/unavailable, cooldown do server cung cấp, stale data có thời điểm. Admin dialogs gồm publish snapshot, unpublish, archive logical, đổi loại câu làm mất options/keys, conflict giữ draft, dry-run chưa committed, xác nhận import thật và replay pending. Chỉ tạo states còn thiếu, không nhân bản các trang đã đủ.

Giao coverage matrix 32 loại trang: ID, tên, route, screen ID, desktop/mobile/tablet, states, flow links và ô Chủ sản phẩm duyệt để trống. Không đánh dấu duyệt thay chủ sản phẩm; prototype không tính như một trang chức năng. Giao clickable flows public → auth → dashboard → browse → detail → exam → status → result/review/history/leaderboard; Admin bank/import → draft → publish → monitor → submissions → detail/replay → statistics/audit. Ghi rõ màn/state còn thiếu. Đây là thiết kế để duyệt, không chứng minh backend hoặc nghiệm thu production.
```

## Cách chốt trước khi port

Chủ sản phẩm duyệt ba lớp: (1) desktop layout và style từng nhóm, (2) mobile cùng các dialogs/states quan trọng, (3) flow và bảng độ phủ. Chỉ sau khi có xác nhận chốt UI mới tiếp tục điều chỉnh code. Không tự tính output vừa sinh là đã duyệt.
