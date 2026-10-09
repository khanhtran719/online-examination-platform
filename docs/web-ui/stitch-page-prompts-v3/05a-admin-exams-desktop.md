# Prompt 05A — Quản lý đề và hai bước soạn đề desktop

**Đã tạo đúng ba frame desktop và [đã review 05A](../stitch-05a-review-2026-10-08.md). Không gửi lại khối dưới để tạo trùng; giữ làm brief đối chiếu.** [Ba PNG/IDs](../evidence/stitch-05a-review-2026-10-08/README.md) được lưu làm bằng chứng, chưa chọn thành template Admin. Findings còn mở; đề xuất giữ style, sửa lúc port và chuẩn bị 05B sau khi chọn hướng. Chưa sửa ứng dụng hoặc gửi lệnh tạo/refinement trong lượt review.

Prompt chuẩn bị ngày 2026-10-08 cho [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955), gồm một Danh sách đề và hai bước của cùng editor Edit. Phần còn lại vẫn backlog, không coi ba frame là hoàn tất nhóm Admin.

Đối chiếu [design spec AD-02/AD-03](../design-spec.md), [OpenAPI](../../contracts/openapi.yaml), [danh sách đề hiện tại](../../../apps/web/src/features/admin/exam-list-page.tsx), [editor](../../../apps/web/src/features/admin/exam-editor-page.tsx), [form thông tin](../../../apps/web/src/features/admin/exam-information.tsx), [cấu trúc và picker](../../../apps/web/src/features/admin/exam-structure.tsx), [draft/save](../../../apps/web/src/features/admin/use-exam-draft.ts). Phạm vi giao diện thuộc Catalog/Admin; không đổi hợp đồng API, nghiệp vụ, transaction, migration hoặc integration.

```text
Tiếp tục trong dự án “ExamPlatform UI Design”, project ID 18257628123124303955. Tạo ngay đúng 3 frame DESKTOP độc lập, viewport thiết kế 1280px, cho nhóm Admin quản lý đề. Đây là yêu cầu dựng UI thật để review. Giữ nguyên các frame cũ và các template đã chốt. Chưa tạo mobile, bước Kiểm tra & phát hành, biến thể Create hoặc dialog trong lượt 05A này.

NGUỒN THỊ GIÁC — ĐỌC FRAME THẬT TRƯỚC KHI DỰNG
Dashboard desktop V2 ID 927f2e0d87ce4f89be5d55c3cb81606b là chuẩn workspace: rail trắng gọn, active tròn màu ink, bento mềm, màu Cobalt–Apricot, typography và nhịp khoảng trắng. Catalog desktop V4 ID 801fc02aa8bd4586b0b1ee821d5fd009 chỉ tham khảo card/badge và cách phân cấp nội dung. Không lấy sidebar rộng của các page V4 làm chuẩn shell. Dùng logo tạm ExamPlatform nếu đã có trong project; nếu chưa có dùng wordmark gọn cùng một hình dấu phiếu thi cho cả ba frame. Không tự đổi thành hoa thị hoặc huy hiệu chứng nhận. Nếu không đọc được nguồn, báo rõ trước khi thay phong cách.

PHONG CÁCH VÀ MẬT ĐỘ
Soft Bento/Tactile, sáng và tích cực: canvas #F3F6FC, surface #FFFFFF, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540, muted #58627A. Be Vietnam Pro cho toàn bộ tiếng Việt; JetBrains Mono chọn lọc cho số điểm, thời lượng và số bước. Radius card 20–24px, input 12–14px, gutter 16–24px, spacing theo nhịp 8px. Body 16px; bảng/helper tối thiểu 14px. Nhãn và nội dung có dấu phải rõ; không ép chữ nhỏ để nhét nhiều cột.
Admin có mật độ cao hơn Dashboard nhưng giữ chiều sâu bề mặt: shadow mềm, viền nhẹ, nền trắng và tint theo cấp. Có thể đặt một icon phiếu thi 2.5D/3D nhỏ ở header Danh sách đề, với mặt cạnh, lớp trước/sau, ánh sáng và bóng tiếp xúc rõ. Không minh họa lớn trong editor, không đồ vật nổi che field, question hoặc thao tác. Nếu hỗ trợ motion: hover nâng 2px/chuyển màu 150–200ms; reduced motion phải dừng hiệu ứng. Không ghi các thông số motion vào product UI hoặc tuyên bố screenshot đã có animation chạy.
Mỗi frame thể hiện một màn sử dụng thật. Không xếp loading/error/dialog/component showcase bên dưới màn chính. Chiều cao theo nội dung, tránh hero cao, khoảng trống lớn hoặc hàng loạt thẻ KPI giả.

ADMIN SHELL DÙNG CHUNG
Rail trắng khoảng 72px theo Dashboard V2, icon dễ nhận biết và tooltip nhãn đầy đủ. Nhóm điều hướng: Tổng quan, Đề thi, Câu hỏi, Nhập dữ liệu, Giám sát, Báo cáo. Active Đề thi. Header nhỏ có wordmark, nhãn “Quản trị”, tài khoản demo “Minh Anh” và menu tài khoản; không role switcher, global search hoặc notification count giả. Navigation cần nhiều mục con thì dùng menu mở theo nhóm, không mở sidebar thứ hai thường trực.
Nội dung còn lại có lề khoảng 24–32px, chiều rộng khoảng 1120px ở viewport 1280. Breadcrumb, tên trang và hành động chính nằm trên cùng; bảng/form là trọng tâm. Không đặt breadcrumb chiếm một card riêng. Cùng shell, cùng chiều cao input, cùng badge và cùng cách thể hiện active step trên cả ba frame.
Ngôn ngữ UI là tiếng Việt. Route/ID/API/revision/idempotency và ghi chú bàn giao chỉ là yêu cầu thiết kế, không đổ nguyên vào màn người dùng. Các dữ liệu dưới đây là fixture thiết kế, không phải telemetry thật.

FRAME 1 — “EP-19 — Đề thi quản trị — V4 — Desktop — Loaded”
Route /admin/exams. Breadcrumb “Quản trị / Đề thi”. Title “Đề thi”, helper “Quản lý bản nháp, lịch thi và phiên bản phát hành”. Primary “Tạo bản nháp”; secondary icon/nút “Làm mới”. Không banner marketing hoặc bốn thẻ tổng doanh thu/số thí sinh trên đầu.

Một card bảng lớn với toolbar gọn:
- Search placeholder “Tìm trong các đề đã tải”; select trạng thái “Tất cả trạng thái”; select danh mục “Tất cả danh mục”. Helper ngay dưới: “Tìm kiếm và lọc chỉ áp dụng cho các đề đã tải”. Đây là xử lý cục bộ, không làm như API đã có tìm kiếm/lọc toàn bộ.
- Fixture đang có 6 đề đã tải, còn cursor để tải thêm; trạng thái chưa lọc. Không checkbox bulk action, xóa hàng loạt, tổng toàn hệ thống, page 1/10 hoặc số kết quả toàn bộ tự bịa.

Bảng có đúng 5 cột, phân bố đủ chỗ ở 1280px:
1. “Đề thi” khoảng 34%: tên là link lớn vừa phải, tối đa hai dòng tự nhiên; danh mục ở dòng phụ. Không cột tên bị bóp còn vài ký tự.
2. “Thời lượng” khoảng 10%: số phút và đơn vị rõ.
3. “Lịch thi” khoảng 25%: Mở/Đóng trên hai dòng, ngày + giờ; nhãn nhỏ “Giờ Việt Nam · UTC+7”. Các dòng mẫu dùng cùng Asia/Ho_Chi_Minh, không chuyển theo múi giờ máy.
4. “Trạng thái” khoảng 18%: badge có icon và chữ, dưới là thông tin bản sửa/phiên bản đọc được. Trạng thái phát hành độc lập với lịch đang mở hay chưa mở.
5. “Thao tác” khoảng 13%: link “Sửa đề” và menu dấu ba chấm, không nhét tám nút trong một hàng. Menu đóng trong frame chính.

Sáu hàng mẫu:
- “TOEIC Reading — Luyện tập 01”; TOEIC; 75 phút; 14/11/2026 08:00–12:00; “Đang phát hành”, có phiên bản đã phát hành; bản sửa 7.
- “Nền tảng điện toán đám mây — Bài ôn tập 01”; IT Certification; 90 phút; 15/11/2026 08:00–12:00; “Bản nháp”, chưa có phiên bản phát hành; bản sửa 4. Đây là đề được mở ở cả hai frame editor phía sau.
- “Python cơ bản — Vòng tuyển dụng”; Tuyển dụng; 60 phút; 16/11/2026 09:00–11:00; “Bản nháp”, chưa có phiên bản phát hành; bản sửa 2.
- “Cơ sở dữ liệu — Kiểm tra giữa kỳ”; Đại học; 45 phút; 17/11/2026 13:30–16:00; “Đang phát hành”, có phiên bản đã phát hành; bản sửa 6.
- “An toàn thông tin nội bộ — Đợt 01”; Nội bộ; 30 phút; 01/10/2026 08:00–17:00; “Đã lưu trữ”; bản sửa 5. Dùng badge trung tính, không nút xóa vĩnh viễn.
- “IELTS Reading — Bộ luyện tập 02”; IELTS; 60 phút; 18/11/2026 08:00–12:00; “Bản nháp”, có phiên bản từng phát hành; bản sửa 8. Không làm như phiên bản cũ vẫn đang được phát hành.

Published version là định danh do hệ thống trả về, không tự bịa tên v2.3/v4 hoặc số thứ tự phiên bản. Có thể để ID rút gọn trong tooltip/metadata khi cần; chưa có phiên bản thì nói rõ, không dùng mã giả. Bản sửa là metadata chỉ đọc, không field nhập và không thời điểm cập nhật.
Menu hành động có chỗ cho Sửa đề, Phát hành/Gỡ phát hành, Lưu trữ, Giám sát, Bài nộp, Thống kê phiên bản. Hiển thị theo quyền và trạng thái thực tế; Thống kê chỉ có đích khi có version ID. Phát hành/Gỡ phát hành/Lưu trữ cần xác nhận ở đợt sau, không mô phỏng click thành công trong 05A. Không cho đề lưu trữ bắt đầu lượt mới.
Footer bảng: “Đã tải 6 đề” và “Tải thêm đề”. Khi hết cursor mới dùng “Đã tải hết các đề”; không show đồng thời hai trạng thái. Notice cuối trang nhỏ: “Chỉnh bản nháp không đổi nội dung các lượt thi đã bắt đầu. Phát hành là một thao tác riêng.”

FIXTURE EDITOR CHUNG CHO FRAME 2 VÀ 3
Đang sửa một bản nháp đã tồn tại, chưa phát hành: “Nền tảng điện toán đám mây — Bài ôn tập 01”, danh mục IT Certification, bản sửa đang tải 4. Không dựng form Create rỗng trong lượt này.
Thông tin: thời lượng 90 phút; múi giờ Asia/Ho_Chi_Minh; mở 15/11/2026 08:00; đóng 15/11/2026 12:00; tối đa 3 lượt; lời giải “Mở sau khi có kết quả”; bảng xếp hạng bí danh bật.
Cấu trúc: 3 phần, mỗi phần 2 câu, tổng 6 câu và 100 điểm. Cùng dữ liệu và cùng trạng thái “Có thay đổi chưa lưu” ở cả hai frame. Chuyển bước giữ thay đổi trong editor; không gắn nhãn “Đã lưu” chỉ vì chuyển bước, và không hứa tự khôi phục sau tải lại.
- Phần 1 “Kiến thức nền”: Q1 Một lựa chọn 10 điểm, Q2 Đúng/Sai 10 điểm → 20 điểm.
- Phần 2 “Quyền truy cập & bảo mật”: Q3 Một lựa chọn 15 điểm, Q4 Nhiều lựa chọn 15 điểm → 30 điểm.
- Phần 3 “Tình huống triển khai”: Q5 Nhiều lựa chọn 25 điểm, Q6 Đúng/Sai 25 điểm → 50 điểm.
Tên phần, số câu và tổng điểm phải khớp ở mọi card, tab và summary. Không hiện 60 câu/100 điểm ở một nơi rồi 6 câu/120 điểm ở nơi khác.

FRAME 2 — “EP-20 — Soạn đề — V4 — Desktop — Edit Information”
Route /admin/exams/:examId/edit. Breadcrumb “Quản trị / Đề thi / Sửa bản nháp”, có link “← Danh sách đề”. Title là tên đề, badge “Bản nháp”; helper “Chuẩn bị thông tin và cấu trúc trước khi phát hành”. Tên dài được wrap rõ. Metadata nhỏ “Chưa có phiên bản phát hành”.
Stepper ngang ba bước: “1 Thông tin”, “2 Phần & câu hỏi”, “3 Kiểm tra & phát hành”. Bước 1 active Cobalt; các bước sau trung tính có số/nhãn, không làm như đã hoàn tất hoặc đã phát hành. Bước 3 là bước của luồng, chưa tạo frame của bước này trong lượt hiện tại.

Layout hai cột: form khoảng 2/3, summary khoảng 1/3, gap 24px. Form có ba nhóm rõ, không chia từng input thành card riêng:
A. “Thông tin cơ bản”: Tiêu đề full width; Danh mục và Thời lượng (phút) cùng hàng. Danh mục có đúng 6 lựa chọn: TOEIC, IELTS, IT Certification, Đại học, Tuyển dụng, Nội bộ. Thời lượng số nguyên 1–240 phút; fixture 90. Không input giây để người soạn tự tính.
B. “Lịch thi & lượt làm”: select Múi giờ full width, label thân thiện “Giờ Việt Nam (UTC+7)” và helper “Asia/Ho_Chi_Minh”. Mở đề/Đóng đề hai input ngày + giờ riêng rõ ràng, cùng timezone vừa chọn. Giới hạn lượt số nguyên 1–10, fixture 3. Helper “Thời điểm đóng phải sau thời điểm mở”. Không dùng lịch date-only hoặc làm như đổi timezone đổi luôn thời điểm thực của lịch đã nhập hợp lệ.
C. “Kết quả & quyền xem”: select “Khi nào mở đáp án và lời giải” với đúng ba lựa chọn “Không mở đáp án”, “Mở sau khi có kết quả”, “Mở sau khi đề đóng”. Fixture chọn Mở sau khi có kết quả; không gọi là mở ngay khi bấm Nộp. Toggle “Bảng xếp hạng bí danh”, trạng thái bật, helper “Xếp hạng dùng bí danh; không công khai email”.
Mỗi field có label thường trực, dấu bắt buộc nhất quán và helper đặt dưới. Frame đang hợp lệ nên không vẽ lỗi đỏ giả. Hệ component cần chỗ cho lỗi gần field khi tên thiếu/quá 200 ký tự, thời lượng/giới hạn lượt ngoài phạm vi hoặc giờ đóng không sau mở; các error frame bổ sung sau.

Sidebar “Tóm tắt bản nháp”: 90 phút, 3 phần, 6 câu, 100 điểm; lịch 15/11/2026 08:00–12:00, Giờ Việt Nam; 3 lượt tối đa. Đây là dữ liệu bản nháp đang sửa, không số thí sinh hoặc kết quả. Notice tint gọn “Lưu nháp và phát hành là hai bước riêng”. Không progress bar phần trăm hoặc score donut giả.
Action bar dưới nội dung, đủ khoảng không che input: trạng thái có chấm Apricot + chữ “Có thay đổi chưa lưu”; secondary “Lưu nháp”; primary “Tiếp: Phần & câu hỏi”. Lưu cần xác nhận máy chủ mới đổi sang đã lưu. Tiếp chỉ chuyển bước và giữ chỉnh sửa, không tự phát hành. Không primary Xuất bản tại bước 1, không autosave badge hoặc “Đã đồng bộ” giả.
Không thêm mô tả dài, cover upload, audio, essay, điểm đạt, cấp chứng chỉ, webcam, AI hoặc reset giới hạn lượt khi contract chưa có.

FRAME 3 — “EP-20 — Soạn đề — V4 — Desktop — Edit Sections and questions”
Cùng editor, cùng tên và lịch với frame 2. Stepper active bước 2 “Phần & câu hỏi”. Header không lặp toàn bộ form Thông tin. Một dải summary gọn “3 phần · 6 câu · 100 điểm”, dưới là hai cột: cấu trúc đã chọn khoảng 2/3, panel ngân hàng khoảng 1/3. Không thêm sidebar summary thứ ba làm vùng câu hỏi bị hẹp.

Cột chính “Cấu trúc đề”:
- Thanh chọn ba phần với nhãn đầy đủ hoặc wrap hai dòng: “Kiến thức nền · 2 câu · 20 điểm”, “Quyền truy cập & bảo mật · 2 câu · 30 điểm”, “Tình huống triển khai · 2 câu · 50 điểm”. Phần 1 active rõ bằng màu + viền/nhãn, không chỉ chấm màu.
- Có nút “Thêm phần”, giới hạn 20; tên phần active là input có label “Tên phần”. Metadata “Phần 1/3”. Có vị trí cho Lên/Xuống phần và “Bỏ phần”; Lên disabled ở phần đầu. Bỏ phần có câu phải xác nhận ở 05B; không dựng dialog trong frame này.
- Chỉ render hai câu của phần đang chọn, không trải 500 câu trên trang. Mỗi câu là row/card dễ đọc: số thứ tự trong phần, prompt, badge loại câu, input “Điểm trong đề”, thao tác Lên/Xuống và “Bỏ khỏi phần”. Input điểm số nguyên 1–1000, không phần trăm; bỏ khỏi phần không xóa câu trong ngân hàng.
- Câu 1: “Đặc điểm nào mô tả đúng mô hình điện toán đám mây?”; Một lựa chọn; 10 điểm. Lên disabled, Xuống enabled.
- Câu 2: “Tài nguyên đám mây có thể được điều chỉnh theo nhu cầu sử dụng.”; Đúng/Sai; 10 điểm. Lên enabled, Xuống disabled.
- Footer phần “2 câu · 20 điểm”. Nút “Chọn thêm câu” có thể đưa focus vào panel ngân hàng. Không nút chỉnh đáp án gốc ngay trong membership row; question editor là page khác.
- Câu của các phần chưa active vẫn thuộc fixture: Q3 “Cấu hình nào phù hợp để giới hạn quyền truy cập theo nhiệm vụ?” Một lựa chọn 15; Q4 “Những biện pháp nào hỗ trợ bảo vệ tài khoản quản trị?” Nhiều lựa chọn 15; Q5 “Chọn các bước cần kiểm tra trước khi triển khai một ứng dụng.” Nhiều lựa chọn 25; Q6 “Một bản sao lưu chỉ hữu ích khi có thể khôi phục dữ liệu từ nó.” Đúng/Sai 25. Không chèn tất cả chúng vào phần 1.

Panel “Chọn từ ngân hàng” đang mở trong chính frame 3:
- Helper “Thêm vào: Kiến thức nền”; “Chỉ các câu đã tải”. Ô tìm cục bộ “Tìm trong câu đã tải”, filter loại với Một lựa chọn/Nhiều lựa chọn/Đúng/Sai. Không category/tags/difficulty/global search tự bịa vì dữ liệu ngân hàng chưa có các field đó.
- Fixture 10 câu ngân hàng đã tải; 6 trong số đó đã có trong đề, còn cursor. Có 5 hàng nhìn thấy, phần còn lại cuộn trong panel có affordance rõ; không ghi 5 câu là tổng ngân hàng.
- Hai hàng đầu là đúng Q1/Q2 nêu trên, cùng loại và 10 điểm ngân hàng, nút disabled “Đã có trong đề”. Không cho thêm lại vào phần khác.
- Ba hàng kế chưa chọn: “Chọn nguyên tắc phù hợp khi đặt mật khẩu cho tài khoản quản trị.” Một lựa chọn, 5 điểm ngân hàng; “Những thông tin nào cần có khi lập kế hoạch sao lưu?” Nhiều lựa chọn, 10 điểm ngân hàng; “Kiểm tra khả năng khôi phục là một phần của kế hoạch sao lưu.” Đúng/Sai, 20 điểm ngân hàng. Mỗi hàng có “+ Thêm câu”, không checkbox batch giả.
- Điểm ngân hàng là giá trị ban đầu khi thêm; điểm trong đề ở cột chính có thể chỉnh riêng, không sửa điểm gốc. Chỉ những câu chưa lưu trữ mới có thể thêm. Tổng toàn đề tối đa 500 câu duy nhất; giới hạn dựa trên toàn đề, không từng phần.
- Footer panel “10 câu đã tải” và “Tải thêm câu”; không số trang/tổng toàn ngân hàng. Thêm câu cập nhật count/điểm bản nháp, chưa đồng nghĩa đã lưu máy chủ. Khi nội dung đã chọn chưa tải được, có fallback đọc được và retry, không để blank; chưa tạo error frame ở 05A.

Action bar chung dưới layout: “Có thay đổi chưa lưu”, nút “Quay lại: Thông tin”, “Lưu nháp” secondary và “Tiếp: Kiểm tra & phát hành” primary. Không chồng action bar lên hàng cuối hoặc panel footer. Nút Tiếp chuyển bước, không làm như publication đã xong. Frontend hiện tại yêu cầu mỗi phần có ít nhất một câu khi lưu; tình huống thiếu câu sẽ chỉ rõ phần cần sửa ở đợt sau. Đây không phải bằng chứng đã lưu hay kiểm tra toàn bộ trên server. Publish vẫn cần server kiểm tra, không badge “Đạt mọi kiểm tra” chỉ từ tổng điểm.

QUY TẮC SỬ DỤNG VÀ ĐẦU RA
Tất cả input/label/disabled/selected states phải nhìn được, focus ring rõ, icon-only có tên truy cập hoặc tooltip. Badge phải có chữ/icon ngoài màu. Control khoảng 40–44px; Lên/Xuống là cách sắp xếp có thể dùng bàn phím, drag chỉ bổ sung. Table không tràn ngang body ở desktop 1280; tên dài wrap trong cột, thao tác không che chữ. Error/pending/conflict khi code phải giữ thay đổi chưa lưu; không ghi chú kỹ thuật này vào màn sản phẩm.
Chỉ tạo đúng 3 frame có tên nêu trên, mỗi frame một trạng thái chính. Không tạo lại Dashboard/Auth/Public/Catalog/Profile hoặc dự án mới. Không thêm bước 3, Create, mobile, empty/loading/error, publish/unpublish/archive/leave/conflict dialog hay handoff frame trong lượt này; chúng thuộc các lượt kế tiếp.
Nếu hỗ trợ prototype, nối Danh sách → Edit Information → Edit Sections and questions, và quay lại giữa các frame này. Chỉ nối các page khác nếu có frame đích thật; bước 3 chưa có thì báo chưa nối, không bịa ID/đích. Trả tên và ID thật từng frame, viewport và những phần prototype chưa nối. Không coi ảnh tĩnh là bằng chứng motion, keyboard hoặc API đã hoạt động.
```

## Phần bổ sung ở lượt kế tiếp

- **05B chưa chuẩn bị:** bước Kiểm tra & phát hành desktop, xác nhận phát hành/gỡ phát hành/lưu trữ, bỏ phần có câu, rời editor chưa lưu và đối chiếu khi conflict. Chia nhóm nhỏ theo số frame thực tế, không gửi nguyên [brief 05](05-admin-exams.md).
- Biến thể Create, mobile, loading/empty/error/pending/saved/validation và permission states tiếp tục backlog; ba frame 05A không hoàn tất EP-19/EP-20.
- Các đề xuất UX như input phút, tìm/lọc cục bộ, panel picker trong trang, bỏ/sắp xếp phần, dirty indicator và đặt publication ở bước 3 là yêu cầu thiết kế để đối chiếu khi port. Không khẳng định frontend hiện tại đã có các tương tác này; phải kiểm tra quyền, focus, confirmation và payload save khi triển khai.
- `expectedRevision` và thời gian UTC vẫn theo contract, không nhập bằng tay. Mẫu Edit dùng bản sửa tải từ server; Create sẽ dùng revision 0. Tổng fixture đã đối chiếu: 3 phần × 2 câu, 20 + 30 + 50 = 100 điểm; không bịa semantic version từ `publishedVersionId`.

## Kiểm tra trước và sau khi gửi

Checklist gốc khi gửi: đúng project, chỉ một khối prompt, nguồn Dashboard V2 đọc được; sau khi tạo kiểm tra đủ ba ID/frame thật, shell/palette, cột/field, dữ liệu hai bước và không phát hành tự động. Hiện đã lưu PNG/manifest/findings; registry chuyển EP-19/EP-20 sang `design_reviewed_with_open_findings`. Chưa chọn template hoặc đóng các bước/biến thể còn thiếu.
