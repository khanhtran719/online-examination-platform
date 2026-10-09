# Prompt 04A — Ba page Public desktop

**Đã tạo đủ ba frame desktop chính, [đã review 04A](../stitch-04a-review-2026-10-08.md) và lưu [template Public V4](../templates/public-v4/README.md)** theo yêu cầu người dùng. Không gửi lại khối dưới để tạo trùng; giữ làm brief đối chiếu. [Findings PUB-V4-01–08](../templates/public-v4/implementation-notes.md) mở để sửa khi code. Mobile và sample variants/states tiếp tục [backlog 04](04-public-experience-help.md). Nhóm kế đã tách thành [05A — Ba frame Admin desktop](05a-admin-exams-desktop.md); [brief 05](05-admin-exams.md) giữ yêu cầu còn lại làm backlog.

```text
Tiếp tục trong dự án “ExamPlatform UI Design”, ID 18257628123124303955. Tạo ngay đúng 3 frame WEB DESKTOP ở viewport thiết kế 1280px: Trải nghiệm 3 câu mẫu, Cách hoạt động, Trợ giúp. Đây là yêu cầu dựng UI, không chỉ trả kế hoạch. Giữ nguyên tất cả frame cũ. Chưa tạo mobile hoặc các frame trạng thái phụ trong lượt này.

NGUỒN THỊ GIÁC — ĐỌC FRAME THẬT TRƯỚC KHI DỰNG
Home desktop V3 ID f5caae61539a43049ab56eea2b8b0c65 là chuẩn public capsule header, typography, CTA và nhịp section. Không lấy sidebar rộng của Lịch sử/Xếp hạng V4 làm chuẩn trang Public. Exam desktop V3 ID 222db89535964fb9bc183ab05a92bab6 chỉ tham khảo độ rõ của câu hỏi/lựa chọn, không sao chép timer hoặc trạng thái thi thật. Auth V3 và các page đã có chỉ là đích điều hướng, không sửa chúng. Nếu không đọc được nguồn, báo cụ thể, không tự thay toàn bộ phong cách.

PHONG CÁCH CHUNG
Soft Bento/Tactile: canvas #F3F6FC, surface #FFFFFF, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540, muted #58627A. Be Vietnam Pro cho title/body/labels; JetBrains Mono chọn lọc cho 1/3, số bước hoặc điểm mẫu. Card radius 20–24px, gutter 16–24px, spacing theo nhịp 8px. Body 16px, helper không dưới 14px; line-height thoáng. Tiêu đề dài wrap tự nhiên, không cắt thông tin. Shadow mềm tạo bề mặt có chiều sâu, tránh viền quá nhiều hoặc nền gradient phủ hết màn.
Mỗi trang có một điểm nhìn chính và bố cục riêng theo nhiệm vụ, cùng một hệ thiết kế. Sáng, tích cực, khiến người mới muốn thử học. Dùng một cụm giấy/phiếu thi/bút 2.5D hoặc 3D nhỏ ở hero hướng dẫn, có lớp trước/sau, mặt cạnh, ánh sáng trên trái và bóng tiếp xúc rõ; màu Cobalt–Apricot. Đồ vật không che chữ/CTA, không trôi trên đáp án hoặc FAQ. Illustration chỉ là trang trí, không giống control đang hoạt động. Chuyển động nếu hỗ trợ: hover nâng 2–4px, chuyển màu 150–200ms; floating rất nhẹ chỉ ở minh họa đầu trang, dừng với reduced motion. Không ghi chú kỹ thuật/chuyển động vào product UI, không claim đã có motion nếu chỉ xuất tĩnh.

PUBLIC SHELL
Header capsule theo Home, logo tạm nếu đã có trong project; nếu chưa có dùng wordmark ExamPlatform gọn, không tự tạo huy hiệu chứng nhận. Nav: “Trải nghiệm”, “Cách hoạt động”, “Trợ giúp”; logo về Trang chủ. Bên phải “Đăng nhập” và primary “Tạo tài khoản”. Mẫu là người chưa đăng nhập; không tên/avatar, Candidate rail, Admin navigation hoặc trạng thái server. Active nav đúng page. Footer nhỏ: ExamPlatform, link Trang chủ/Cách hoạt động/Trợ giúp; không legal page, hotline hoặc social link tự bịa.

FRAME 1 — “EP-16 — Trải nghiệm 3 câu mẫu — V4 — Desktop — Single choice selected”
Route /experience. Một trang thử độc lập, không lặp hero marketing cao của Home. Header ngắn “Thử nhịp làm bài của bạn”, helper “3 câu mẫu để làm quen trước khi bắt đầu”. Nhãn rõ “Bài mẫu · Không tính vào lượt thi thật”. Notice nhẹ “Lựa chọn chỉ giữ trong lần mở trang này. Tải lại hoặc rời trang sẽ bắt đầu lại.”
Bố cục dưới header: main câu hỏi khoảng 2/3, thẻ điều hướng ba câu khoảng 1/3; vùng nội dung rộng tối đa khoảng 1120px. Không dành quá nhiều chỗ cho sidebar hoặc illustration. Câu hỏi/đáp án là trọng tâm.
Thể hiện duy nhất câu 1 đang được xem, không xếp ba câu và mọi variants nối dài trên trang:
- “Câu 1/3”, nhãn “Một lựa chọn”, “1 điểm mẫu”.
- Câu hỏi: “Công thức nào tính diện tích hình chữ nhật?”
- A: “Chiều dài × chiều rộng”; B: “2 × (chiều dài + chiều rộng)”; C: “Chiều dài + chiều rộng”; D: “Chiều dài ÷ chiều rộng”.
- A đã được chọn. Radio thật rõ, thẻ A viền Cobalt/nền tint/chấm chọn; B/C/D trung tính. Chưa công bố đúng/sai hoặc lời giải trong lúc làm mẫu.
- Hành động “Đánh dấu xem lại” trạng thái chưa đánh dấu; “Xóa lựa chọn” có thể dùng vì A đang chọn. Nút Trước disabled vì câu đầu; primary “Câu tiếp theo”. Không nút nộp bài thật.
Thẻ “3 câu mẫu” có ba nút 1/2/3: câu 1 đã chọn và đang xem, câu 2/3 chưa trả lời. Dùng icon/nhãn cùng màu, viền current riêng; legend “Đã chọn”, “Chưa trả lời”, “Đánh dấu”. Summary đúng “1/3 câu đã chọn”, nút secondary “Rà soát bài mẫu”. Không đánh đồng đã chọn với đã trả lời đúng. Không tiến độ xử lý giả.
Giữ chỗ cho luồng đủ chức năng trong hệ component: câu 2 Nhiều lựa chọn, câu 3 Đúng/Sai, rà soát rồi kết quả mẫu. Chưa dựng thêm bốn frame đó trong lượt này. Các controls trong frame 1 không được tuyên bố đã hoạt động nếu chưa nối prototype. Không “Đã lưu máy chủ”, countdown, proctor/webcam, khóa tab, API status, điểm chính thức, chứng nhận hoặc band score.
Không đặt CTA tạo tài khoản lớn cạnh từng đáp án. CTA cuối trang nhỏ gọn “Sẵn sàng cho bài thi thật?” → “Tạo tài khoản”; người dùng vẫn hoàn thành mẫu mà không đăng ký.

FRAME 2 — “EP-17 — Cách hoạt động — V4 — Desktop — Guide”
Route /how-it-works. Hero ngắn “Bắt đầu rõ ràng. Làm bài tự tin.”, subtext nói về hành trình từ tài khoản tới kết quả. Illustration giấy/bút có chiều sâu nhỏ ở bên phải, CTA “Thử 3 câu mẫu” và link “Tạo tài khoản”. Không lặp toàn bộ hero Home hoặc biến trang thành dashboard.
Journey có thứ tự đọc rõ, gồm 5 bước chính; có thể bento bất đối xứng nhưng không đảo thứ tự:
1. Tạo tài khoản — nhập email, tên và mật khẩu. Link /register. Không tự đăng nhập sau đăng ký.
2. Xác thực email và đăng nhập — mở link trong hộp thư, đặt/xác nhận mật khẩu theo màn xác thực, sau đó đăng nhập. Link /check-email và /login; không tạo URL token giả.
3. Chọn đề, đọc hướng dẫn — xem số câu, thời lượng, lịch mở/đóng, giới hạn lượt và chính sách lời giải. Link /exams, có nhãn nhỏ cần đăng nhập; không tạo feed đề công khai.
4. Làm bài, rà soát — chọn đáp án, chuyển câu, đánh dấu câu cần xem lại; xem trạng thái lưu. Minh họa lưới 6 ô chỉ là hình hướng dẫn, không tạo navigator giả có vẻ điều khiển bài thi thật.
5. Nộp bài, theo dõi kết quả — xác nhận nộp, mở lịch sử/trạng thái rồi kết quả khi xử lý xong. Link /history, có nhãn cần đăng nhập. Không hứa có điểm tức thì hoặc luôn được xem lời giải.
Khối “Ba điều cần nhớ” sau journey, thay nhịp bố cục bằng một dải ngang thay vì thêm năm card giống nhau:
- “Đã lưu” chỉ sau xác nhận của máy chủ; chưa xác nhận không đồng nghĩa đã lưu bền vững.
- Thời gian bài thi thật vẫn chạy khi rời phòng thi; quay lại không bắt đầu lượt mới.
- Câu nhiều lựa chọn phải chọn đúng trọn bộ để có điểm; khả năng xem lời giải tùy chính sách đề.
FAQ ngắn 3 câu, một mục mở: “Có thể thử trước khi tạo tài khoản không?” → có, bộ 3 câu mẫu độc lập. Hai mục đóng: “Kết quả có ngay sau khi nộp không?”, “Vì sao chưa xem được đáp án?”. Nút/chevron mở đóng rõ. Cuối trang CTA tạo tài khoản và thử mẫu; không số người học, review, đối tác hoặc kết quả cam kết tự bịa.

FRAME 3 — “EP-18 — Trợ giúp — V4 — Desktop — FAQ expanded”
Route /help. Header “Bạn cần hướng dẫn gì?”, helper “Chọn chủ đề để tìm cách tiếp tục”. Không dùng illustration lớn đẩy nội dung quan trọng xuống dưới.
Layout nội dung khoảng 1120px: menu chủ đề bên trái khoảng 220px, vùng đọc bên phải linh hoạt. Đây là menu nội dung trong trang, không Candidate sidebar toàn cục. Nhóm: “Tài khoản”, “Chọn đề”, “Trong phòng thi”, “Nộp bài & Kết quả”. Active “Trong phòng thi”, các link là anchor hoặc bộ lọc tài liệu cục bộ. Không tổng ticket, bot AI, live chat hoặc search toàn nền tảng. Lượt này không thêm ô search khi chưa xác định bộ tài liệu tìm được.
FAQ dạng accordion trong vùng đọc, thể hiện 1 mục mở và các mục khác đóng, không trộn thành bảng showcase:
- Mục mở “Khi nào câu trả lời được xem là đã lưu?”; nội dung: chỉ sau xác nhận máy chủ. Nếu chưa xác nhận, giữ trang và kiểm tra trạng thái kết nối; không hứa tự phục hồi dữ liệu sau tải lại. Có callout ngắn phân biệt “Đang gửi” và “Đã được xác nhận”, là minh họa hướng dẫn, không telemetry đang chạy.
- Mục đóng: “Mất kết nối trong lúc làm bài thì sao?”, “Rời phòng thi có dừng đồng hồ không?”, “Hai nơi có lựa chọn khác nhau thì xử lý thế nào?”, “Điều gì xảy ra khi hết giờ?”.
Nhóm Tài khoản có nội dung nguồn cho tình huống không đăng nhập được, email xác thực hết hạn; link thật /login và /check-email. Không tự thêm reset password, OTP hoặc đổi email.
Nhóm Chọn đề giải thích điều kiện bắt đầu, giới hạn lượt và lịch thi; /exams cần đăng nhập.
Nhóm Nộp bài & Kết quả có trạng thái đang xử lý, xử lý thất bại và chưa được mở lời giải; /history cần đăng nhập. Không candidate replay hoặc gửi lại bài đã nhận.
Cuối vùng đọc có card trung tính “Vẫn cần hỗ trợ?” → “Liên hệ đơn vị tổ chức kỳ thi để được hướng dẫn.” Không địa chỉ email, hotline, cam kết 24/7, SLA hoặc form ticket giả. Link “Xem cách hoạt động” và “Thử 3 câu mẫu”. Bài hướng dẫn dài có line-height thoáng, độ dài dòng vừa đọc; không chia mọi đoạn thành card nhỏ.

ĐẦU RA VÀ GIỚI HẠN
Đúng 3 frame desktop độc lập với tên ở trên, mỗi frame một trạng thái chính. Không tạo mobile, page đích khác, sample variants/rà soát/kết quả riêng, empty/error hay designer handoff trong lượt này. Những phần đó được bổ sung sau để hoàn chỉnh luồng, không tuyên bố đã có đầy đủ.
Giữ các frame cũ nguyên vẹn. Nếu hỗ trợ prototype, dùng đích thật đã có cho Home/Login/Register/Check email; các phần chưa nối nói rõ. Trả tên và ID thật từng frame, không placeholder, không lấy tên frame làm ID. Không coi screenshot là bằng chứng keyboard, responsive hoặc motion đã chạy.
```
