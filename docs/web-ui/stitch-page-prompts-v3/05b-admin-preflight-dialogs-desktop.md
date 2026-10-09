# Prompt 05B — Kiểm tra, phát hành và dialog Admin desktop

Chuẩn bị ngày **2026-10-09**. Dùng trong chat [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955), project `18257628123124303955`. **Gửi khối 05B-1 trước; sau khi kiểm tra frame thật mới gửi 05B-2 rồi 05B-3. Không paste cả file một lần.** Tổng 8 frame desktop, chia 3 + 3 + 2. [05A đã review](../stitch-05a-review-2026-10-08.md); giữ các frame cũ, không yêu cầu dựng lại chúng.

Đối chiếu [design spec AD-02/AD-03](../design-spec.md), [OpenAPI](../../contracts/openapi.yaml), [editor](../../../apps/web/src/features/admin/exam-editor-page.tsx), [save/action](../../../apps/web/src/features/admin/use-exam-draft.ts) và [test workflow hiện có](../../../apps/web/src/features/admin/__tests__/admin-workflows.unit.spec.ts). Đây là thiết kế UI cho Catalog/Admin; chưa gửi generation/refinement, chưa tạo frame 05B hoặc sửa ứng dụng. Các dialog rời editor/đối chiếu/bỏ phần là yêu cầu UX khi port, không khẳng định frontend hiện tại đã có đầy đủ.

## 05B-1 — Bước kiểm tra, xác nhận phát hành và lỗi cần sửa

```text
Tiếp tục trong “ExamPlatform UI Design”, project ID 18257628123124303955. Tạo đúng 3 frame DESKTOP 1280px cho nhóm 05B-1. Giữ nguyên tất cả frame cũ. Chưa tạo mobile hoặc nhóm dialog 05B-2/05B-3 ở lượt này.

ĐỌC NGUỒN THẬT
Editor Phần & câu hỏi: ID 70f9bc116ec544f29510f7cf38ce8ff1.
Editor Thông tin: ID 59c8a6e4b05d4cbf8d54505d3f3303b8.
Dashboard desktop V2: ID 927f2e0d87ce4f89be5d55c3cb81606b.
Dùng bố cục header gọn của editor Phần & câu hỏi và rail khoảng 72px; không sao chép hero quá cao của editor Thông tin. Nếu không tìm được nguồn, báo rõ. Không tạo project khác.

PHONG CÁCH VÀ SHELL
Soft Bento/Tactile Cobalt–Apricot: canvas #F3F6FC, surface #FFFFFF, primary #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540, muted #58627A. Be Vietnam Pro; JetBrains Mono chọn lọc cho số điểm/thời lượng. Card radius 20–24px, gutter 16–24px, spacing nhịp 8px, shadow mềm. Body 16px, helper tối thiểu 14px; controls 40–44px, chữ dài wrap rõ. Admin rail trắng gọn, active Đề thi, header ExamPlatform/Quản trị/Minh Anh như 05A. Dùng logo tạm phiếu thi nếu đã có; wordmark gọn nếu chưa có. Không thêm 3D/đồ vật bay trong vùng kiểm tra hoặc dialog; chiều sâu đến từ surface, overlay và shadow.
Ở các frame MỚI bỏ V4/EP-20 khỏi product UI, bỏ AI Proctor/chặn tab, Live badge, tiến độ 33%, cập nhật phút trước và claim tự lưu trình duyệt. Không chỉnh các frame 05A trong lượt này. Stepper cùng tên: “1 Thông tin”, “2 Phần & câu hỏi”, “3 Kiểm tra & phát hành”; active bước 3. Số bước không chứng minh đã lưu/phát hành.

FIXTURE CHUNG
Đang sửa “Nền tảng điện toán đám mây — Bài ôn tập 01”, IT Certification, bản sửa đã tải 4, chưa có phiên bản phát hành. Mẫu có thay đổi chưa lưu. Thời lượng 90 phút; Asia/Ho_Chi_Minh, mở 15/11/2026 08:00, đóng 15/11/2026 12:00; tối đa 3 lượt; lời giải “Mở sau khi có kết quả”; bảng xếp hạng bí danh bật.
3 phần, 6 câu, 100 điểm: Kiến thức nền 2 câu/20 điểm; Quyền truy cập & bảo mật 2 câu/30 điểm; Tình huống triển khai 2 câu/50 điểm. Điểm từng câu: 10,10 / 15,15 / 25,25. Mỗi câu duy nhất trong toàn đề. Giữ dữ liệu này ở hai frame đầu; frame lỗi có hai khác biệt cụ thể nêu sau.

FRAME 1 — “EP-20 — Soạn đề — V4 — Desktop — Edit Preflight ready”
Route editor /admin/exams/:examId/edit, bước 3. Breadcrumb Quản trị / Đề thi / Sửa bản nháp, link “← Danh sách đề”, title tên đề và badge Bản nháp. Header gọn, không lặp một hero lớn hoặc KPI decorative.
Layout khoảng 2:1. Cột chính có card “Rà soát trước khi phát hành”:
- Thông tin cơ bản: tên, danh mục, 90 phút; link “Sửa thông tin” về bước 1.
- Lịch và chính sách: mở/đóng đầy đủ, Giờ Việt Nam UTC+7, 3 lượt, Mở sau khi có kết quả, bảng xếp hạng bí danh bật. Không ẩn timezone hoặc đổi sang giờ máy.
- Cấu trúc: ba hàng phần có tên đầy đủ/số câu/điểm, footer 3 phần · 6 câu · 100 điểm, link “Sửa cấu trúc” về bước 2. Không đổ sáu đáp án đúng lên summary.
Card sidebar “Kiểm tra bản nháp” gồm checklist có icon + chữ, phản ánh kiểm tra cục bộ: Thông tin bắt buộc đầy đủ; Lịch đóng sau lịch mở; Mỗi phần có câu hỏi; 6 câu không trùng; Điểm từng câu trong phạm vi. Không hiển thị “Máy chủ đã duyệt”, “Đạt mọi kiểm tra” hoặc chứng nhận an toàn. Helper “Máy chủ sẽ kiểm tra lại khi phát hành”. Notice “Phiên bản phát hành giữ nội dung cố định cho các lượt thi bắt đầu với phiên bản đó”.
Action bar dưới nội dung: chấm Apricot + “Có thay đổi chưa lưu”, Quay lại: Phần & câu hỏi, secondary “Lưu nháp”, primary “Lưu và phát hành”. Primary mở dialog frame 2, không phát hành ngay. Không nút “Phát hành bản đã lưu” song song trong fixture đang có edits chưa lưu, tránh phát hành nhầm bản cũ.

FRAME 2 — “EP-20 — Soạn đề — V4 — Desktop — Publish confirmation”
Page nền đúng frame 1, backdrop vừa đủ giảm độ nổi, dialog trắng giữa màn khoảng 560–600px. Không modal rời thiếu ngữ cảnh, không nền bị đổi layout hoặc panel showcase.
Title “Lưu và phát hành đề này?”. Tên đề wrap đầy đủ. Summary ngắn: 90 phút · 3 phần · 6 câu · 100 điểm, lịch 15/11/2026 08:00–12:00, Giờ Việt Nam.
Nội dung ba ý dễ hiểu:
1. Các chỉnh sửa đang có sẽ được lưu trước khi phát hành.
2. Sau khi phát hành thành công, các lượt thi mới sẽ dùng phiên bản này.
3. Nội dung của các lượt đã bắt đầu không bị thay đổi.
Helper “Lưu nháp thành công chưa đồng nghĩa phát hành thành công”. Không v2.3/version số giả, không checkbox cam kết pháp lý hoặc countdown.
Footer secondary “Hủy”, primary “Lưu và phát hành”; close rõ. Đây là trạng thái chờ xác nhận, chưa có toast success. Nếu nối prototype: Hủy/close/Escape quay về frame 1, giữ edits; xác nhận chỉ mô phỏng pending khi hỗ trợ, không gọi API thật hoặc giả vờ đã có receipt. Khi code, pending vô hiệu hóa gửi lặp và không làm mất dữ liệu; chỉ báo phát hành thành công sau receipt. Nếu lưu xong nhưng phát hành thất bại, phải nói rõ phần lưu đã thành công, phần phát hành chưa xong.

FRAME 3 — “EP-20 — Soạn đề — V4 — Desktop — Preflight validation blocked”
Cùng layout bước 3, cùng đề và edits chưa lưu, nhưng chỉ có hai lỗi cụ thể:
- Giờ mở 15/11/2026 08:00; giờ đóng 15/11/2026 07:30, cùng Giờ Việt Nam. Lỗi “Thời điểm đóng phải sau thời điểm mở”; link “Sửa lịch thi” về bước 1.
- Phần “Quyền truy cập & bảo mật” hiện chưa có câu. Phần 1 vẫn 2 câu/20 điểm, phần 3 vẫn 2 câu/50 điểm. Summary phải đổi thành 3 phần · 4 câu · 70 điểm, không giữ số 6/100 của bản hợp lệ. Lỗi “Phần Quyền truy cập & bảo mật cần ít nhất một câu hỏi”; link “Bổ sung câu hỏi” về bước 2.
Banner đầu vùng đọc “Cần sửa 2 mục trước khi lưu và phát hành”, icon + chữ dễ thấy; không đánh dấu cả checklist thành đỏ. Các thông tin còn lại vẫn hợp lệ, không tự xóa field hoặc reset cấu trúc. Lưu nháp và Lưu và phát hành disabled trong fixture này theo kiểm tra frontend hiện tại; Quay lại/Sửa mục vẫn enabled. Không báo đã lưu, không lỗi số điểm 0 thay cho 70, không raw HTTP 422/stack trace trong product UI. Fixture này thể hiện lỗi kiểm tra cục bộ; không giả định server trả danh sách lỗi field nếu response không có.

ĐẦU RA
Đúng 3 frame theo tên trên, một state chính/frame. Các controls có label, disabled/focus rõ, badge không chỉ dựa vào màu. Dialog có title và vùng thao tác đầy đủ; khi triển khai cần focus trap/restore. Giữ tất cả frame cũ; không tạo nhóm dialog khác, mobile, Create, pending/success riêng, 403 hoặc handoff. Trả ID thật/tên/viewport, nói rõ prototype chưa nối; không coi screenshot là bằng chứng keyboard/API/motion. Không thêm chức năng AI, webcam, chứng chỉ, thanh toán hoặc chỉnh điểm kết quả.
```

## 05B-2 — Gỡ phát hành, lưu trữ và bỏ phần

```text
Tiếp tục trong “ExamPlatform UI Design”, ID 18257628123124303955. Đây là nhóm 05B-2: tạo đúng 3 frame DESKTOP 1280px, chỉ dialog dưới đây. Giữ toàn bộ frame cũ, kể cả 05A và 05B-1 nếu đã có. Không tạo lại page Normal hoặc bước kiểm tra, không mobile.

NGUỒN VÀ STYLE
Danh sách đề ID 1642281b82914f34bba01f4569e7f41c; editor Phần & câu hỏi ID 70f9bc116ec544f29510f7cf38ce8ff1. Đọc frame thật. Dùng rail/header gọn và Soft Bento/Tactile: canvas #F3F6FC, card trắng, primary #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540, muted #58627A, Be Vietnam Pro. Card/dialog radius 20–24px, shadow mềm, body 16px/helper từ 14px, control 40–44px. Dialog centered 520–600px có page nền + backdrop; không tạo modal rời. Icon trạng thái có nhãn chữ. Không đồ vật nổi/3D trong dialog. Ở frame mới bỏ mã V4/EP, AI Proctor, Live, timestamp phút trước và claim browser autosave; không sửa frame nguồn.

FRAME 1 — “EP-19 — Đề thi quản trị — V4 — Desktop — Unpublish confirmation”
Nền là Danh sách đề, đúng hàng “TOEIC Reading — Luyện tập 01” đang phát hành, 75 phút, bản sửa 7, lịch 14/11/2026 08:00–12:00 Giờ Việt Nam. Dialog mở từ action Gỡ phát hành của hàng này.
Title “Gỡ phát hành đề này?”. Tên đề hiển thị đầy đủ. Nội dung “Thí sinh sẽ không thể bắt đầu lượt mới cho đề này. Các lượt đã bắt đầu và kết quả đã có vẫn được giữ.” Không nói hủy lượt đang làm, hoàn lại lượt, xóa phiên bản hoặc dừng đồng hồ. Helper “Bạn có thể phát hành lại khi đề đủ điều kiện”. Không thêm toggle tự động phát hành lại.
Footer secondary “Hủy”, primary “Gỡ phát hành”, close rõ. Fixture chờ xác nhận, không success/pending trộn trong dialog. Nếu prototype, Hủy đóng về page nền. State đổi sau receipt thật, không chỉ sau click.

FRAME 2 — “EP-19 — Đề thi quản trị — V4 — Desktop — Archive confirmation”
Nền Danh sách đề, action Lưu trữ của “Cơ sở dữ liệu — Kiểm tra giữa kỳ”, 45 phút, đang phát hành, bản sửa 6, lịch 17/11/2026 13:30–16:00 Giờ Việt Nam.
Title “Lưu trữ đề này?”. Nội dung “Đề sẽ ngừng nhận lượt thi mới. Những lượt đã bắt đầu và kết quả hiện có không bị xóa.” Notice trung tính “Đây là lưu trữ đề, không phải xóa dữ liệu”. Không hứa có khôi phục/Unarchive vì chưa có capability đó.
Footer secondary “Hủy”, action “Lưu trữ đề” dùng màu nguy hiểm tiết chế và chữ rõ; không toàn modal đỏ, không yêu cầu nhập DELETE hoặc tên đề. Không nút xóa vĩnh viễn. Không làm như lưu trữ đã thành công trong frame chờ xác nhận.

FRAME 3 — “EP-20 — Soạn đề — V4 — Desktop — Remove section confirmation”
Nền editor bước 2 của “Nền tảng điện toán đám mây — Bài ôn tập 01”: 3 phần/6 câu/100 điểm, phần active “Kiến thức nền” có 2 câu/20 điểm. Dialog mở từ Bỏ phần; không dùng nền bank question editor.
Title “Bỏ phần Kiến thức nền?”. Nội dung “Hai câu của phần này sẽ được bỏ khỏi cấu trúc bản nháp. Các câu gốc trong ngân hàng vẫn được giữ.” Summary “Sau khi bỏ: 2 phần · 4 câu · 80 điểm”. Nền phía sau vẫn là 3/6/100 vì chưa xác nhận; không cập nhật sớm.
Helper “Thay đổi chỉ áp dụng cho bản đang sửa; cần lưu nháp để ghi lại.” Footer secondary “Giữ phần”, action “Bỏ phần”. Hủy/close giữ cấu trúc; xác nhận chỉ thay membership local, không gọi archive câu hoặc xóa ngân hàng và không làm đổi frozen attempts. Không thêm backend endpoint mới. Không cho bỏ phần cuối làm mất cấu trúc hợp lệ mà không có hướng dẫn bổ sung; chưa tạo riêng state đó trong lượt này.

ĐẦU RA
Chỉ 3 frame dialog trên, cùng hệ kích thước/typography/overlay. Hủy/close không thực hiện mutation; khi code pending chặn gửi lặp, lỗi giữ ngữ cảnh để thử lại đúng thao tác, thành công cần receipt. UI không lộ expectedRevision/idempotency/HTTP code. Trả tên/ID/viewport thật, nói rõ prototype chưa nối. Không tạo mobile, states phụ, dialog rời editor/conflict hoặc page khác trong lượt này.
```

## 05B-3 — Rời editor và đối chiếu xung đột

```text
Tiếp tục trong “ExamPlatform UI Design”, project ID 18257628123124303955. Đây là nhóm 05B-3: tạo đúng 2 frame DESKTOP 1280px. Giữ toàn bộ frame cũ. Chỉ tạo Rời editor và Đối chiếu xung đột, không page Normal/mobile mới.

NGUỒN VÀ STYLE
Editor Thông tin ID 59c8a6e4b05d4cbf8d54505d3f3303b8 và Phần & câu hỏi ID 70f9bc116ec544f29510f7cf38ce8ff1. Dùng header gọn, rail 72px, palette canvas #F3F6FC/surface trắng/Cobalt #315CF4/Apricot #FFB36B/tint #E8EEFF/ink #1B2540/muted #58627A. Be Vietnam Pro, body 16px/helper từ 14px, radius 20–24px, shadow mềm. Dialog có backdrop và page nền, không panel showcase. Bỏ mã EP/V4, Live, AI Proctor và claim tự lưu trong các frame mới; giữ frame nguồn nguyên vẹn.
Fixture đề “Nền tảng điện toán đám mây — Bài ôn tập 01”, IT Certification, chưa phát hành; local 90 phút, 3 phần/6 câu/100 điểm, lịch 15/11/2026 08:00–12:00 Giờ Việt Nam, 3 lượt, lời giải sau khi có kết quả, bảng xếp hạng bí danh bật.

FRAME 1 — “EP-20 — Soạn đề — V4 — Desktop — Leave unsaved confirmation”
Nền editor bước 2, trạng thái Có thay đổi chưa lưu, người dùng vừa chọn Danh sách đề hoặc điều hướng nội bộ khác. Dialog rộng khoảng 520px.
Title “Rời bản nháp đang sửa?”. Nội dung “Các thay đổi chưa lưu trên màn hình này sẽ bị bỏ nếu bạn rời đi.” Helper “Bạn có thể ở lại và lưu nháp trước khi rời.” Không nói dữ liệu đã lưu máy chủ bị xóa, không hứa khôi phục bản local sau tải lại.
Primary “Ở lại chỉnh sửa”, secondary action “Rời và bỏ thay đổi”; close/Escape tương đương ở lại, trả focus về control mở dialog. Không thêm Lưu và rời làm như mọi lỗi lưu đã được giải quyết; không tự lưu khi đóng dialog. Fixture chưa bấm quyết định, không success toast. Native browser reload/close cần xử lý riêng lúc code; không giả vẽ browser dialog như một frame app bổ sung.

FRAME 2 — “EP-20 — Soạn đề — V4 — Desktop — Draft conflict comparison”
Nền editor với local edits còn nguyên. Dialog/panel giữa màn rộng khoảng 780–840px, đủ hai cột; title “Bản nháp đã thay đổi ở nơi khác”. Helper “Bản bạn đang sửa vẫn được giữ. Đối chiếu trước khi tiếp tục.” Không dùng HTTP 409 làm title hoặc bịa tên người sửa/timestamp.
Hai cột có label thường trực:
- “Bản đã lưu mới nhất”: bản sửa 5, 75 phút, 3 phần/6 câu/80 điểm. Các phần lần lượt 16/24/40 điểm, mỗi phần 2 câu; điểm từng câu 8,8 / 12,12 / 20,20.
- “Bản bạn đang sửa”: dựa trên bản sửa 4, 90 phút, 3 phần/6 câu/100 điểm; các phần 20/30/50 điểm, điểm từng câu 10,10 / 15,15 / 25,25.
Tên đề, danh mục, lịch, giới hạn lượt và chính sách như fixture, không khác; hiển thị nhóm “Thông tin không đổi” gọn. Làm nổi hai khác biệt thật: thời lượng và điểm cấu trúc; không làm đỏ tất cả field. Tổng điểm/điểm từng phần phải khớp. Bản sửa chỉ là metadata đọc, không input cho người dùng chỉnh revision.
Actions: primary “Quay lại đối chiếu” giữ local edits và tiếp tục rà soát; secondary “Bỏ sửa và dùng bản mới” với helper “Thay thế nội dung đang sửa bằng bản đã lưu mới nhất”. Label phải nói rõ bỏ edits, không chỉ “Tải lại”. Close giữ edits, không refetch rồi làm mất input.
Không tự hợp nhất/ghi đè khi modal xuất hiện, không nút “Force save”, không coi giữ edits là đã giải quyết revision. Áp dụng lại các thay đổi phải là quyết định rõ sau đối chiếu với dữ liệu mới nhất; server vẫn kiểm tra revision khi save. Không bịa merge API hoặc field history API. Đây là thiết kế xử lý conflict, không tuyên bố prototype đã thực hiện cơ chế đó.

ĐẦU RA
Chỉ 2 frame nêu trên. Tên dài wrap, hai cột đủ rộng, dialog body có thể cuộn với footer luôn truy cập được; không che nội dung hoặc chồng CTA. Controls có label/focus rõ, quyết định không chỉ phân biệt bằng màu. Không tạo màn merge tự động, mobile, loading/error/pending hoặc handoff. Trả tên/ID/viewport thật và phần prototype chưa nối; không khẳng định save/persistence/keyboard/API đã chạy từ ảnh tĩnh.
```

## Ghi chú khi review và port

- Ba khối là ba lượt gửi nhỏ; tổng 8 frame, không tăng page-family count. EP-19/20 và shared dialog/save families vẫn giữ trạng thái hiện có đến khi lấy được frame thật. Chuẩn bị prompt không đồng nghĩa template đã được chọn hoặc UI đã hoàn tất.
- Lưu nháp gửi full replacement và revision đã tải; Lưu và phát hành cần receipt lưu trước rồi dùng revision mới để phát hành. Khi kết quả mạng chưa rõ, giữ intent/body/key cho retry cùng thao tác; không suy ra timeout là thất bại, không tự phát hành lại bằng key mới. Các pending/unknown-outcome/success frame bổ sung sau, không trộn vào ready/confirmation.
- Việc gỡ phát hành/lưu trữ theo quyền và contract, không đổi deadline/answers của frozen attempts. Bỏ phần là thay đổi cấu trúc local, không xóa bank question. Không tạo API hay migration vì mockup có thêm control.
- Fixtures: Ready 6 câu/100 điểm; Validation 4 câu/70 điểm; sau bỏ phần 4 câu/80 điểm; conflict bản mới 6 câu/80 điểm và local 6 câu/100 điểm. Lịch và timezone giữ nhất quán trừ lỗi giờ đóng 07:30 có chủ đích.
- Create, mobile, missing permissions, loading/error/pending/saved, publication success/unknown-outcome, server validation và các trạng thái nhiều phần/câu vẫn backlog. Đối chiếu [findings 05A-01–08](../stitch-05a-review-2026-10-08.md) khi port, không gửi refinement các frame 05A trong prompt này.
