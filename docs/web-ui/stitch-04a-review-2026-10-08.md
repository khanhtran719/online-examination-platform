# Review 04A — Public desktop — 2026-10-08

Nguồn: [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955), đối chiếu [prompt 04A](stitch-page-prompts-v3/04a-public-desktop.md), [Home V3](templates/stitch-v3/home-desktop-v3.png), public shell/PU-02 trong [design spec](design-spec.md) và [state contract](api-and-state-contract.md). Phạm vi theo yêu cầu: review ba page, lưu template và note điều chỉnh. Không sửa ứng dụng hoặc gửi generation/refinement trên Stitch.

## Kết luận

**Giữ cả ba trang làm template thị giác. Không cần tạo lại toàn bộ 04A.** Cobalt–Apricot, capsule header, card trắng và hierarchy nhất quán; mỗi trang có bố cục phù hợp nhiệm vụ. Trải nghiệm mẫu gọn và tập trung nhất. Cách hoạt động có hành trình rõ nhưng dài và lặp nhiều khối card. Trợ giúp chia chủ đề/vùng đọc hợp lý, trạng thái accordion mở/đóng nhìn rõ.

Người dùng yêu cầu lưu template trực tiếp, nên ba PNG đã được giữ nguyên bytes trong [Public V4](templates/public-v4/README.md), chỉ một bản ảnh vật lý mỗi màn. Các findings bên dưới vẫn mở để xử lý lúc code. Lưu template không nhận các chức năng, lời hứa hoặc tương tác tự thêm trong ảnh.

## Coverage thực tế

Inventory lấy ngày 2026-10-08 có **56 entry**, tăng đúng ba từ snapshot 03B 53 entry. Metadata của 53 entry trước không đổi; không suy ra bytes remote của từng frame cũ đã được kiểm tra lại. Ba PNG đều ở chiều rộng 2560px, tương ứng thiết kế desktop 1280px.

| Page/state | Screen ID thật | Kích thước PNG |
| --- | --- | --- |
| EP-16 — Trải nghiệm 3 câu mẫu — Single choice selected | `11dd35a211ff436e94264be47c987e0c` | 2560×2232 |
| EP-17 — Cách hoạt động — Guide | `03d2737fbac3498e938eac8518b0ee3a` | 2560×6608 |
| EP-18 — Trợ giúp — FAQ expanded | `0a1597a8db7d4d3eb5626ccfdd740140` | 2560×3810 |

Đã xem đủ ba ảnh toàn trang và crop nguyên tỷ lệ vùng câu hỏi, hero, journey, khối lưu câu trả lời và cuối trang. Chưa có frame Multiple choice, True/false, rà soát/kết quả mẫu hoặc mobile trong nhóm 04A; đúng phạm vi ba trạng thái chính đã yêu cầu, tiếp tục backlog. Không coi số “3 câu mẫu” trong UI là bằng chứng toàn bộ luồng đã được dựng.

## Đánh giá từng trang

| Trang | Giữ lại | Điều chỉnh khi code |
| --- | --- | --- |
| Trải nghiệm mẫu | Câu hỏi là trọng tâm; main/sidebar khoảng 2:1; nhãn Bài mẫu và notice bắt đầu lại rõ. Câu 1 có A đã chọn, B/C/D trung tính, không lời giải/điểm kết quả sớm. Có đánh dấu, xóa, trước disabled/tiếp theo, rà soát và summary 1/3 chính xác | Radio chưa chọn rất nhạt; check phụ ở cuối đáp án A có thể bị đọc như đã chấm đúng. Navigator chưa tách rõ current/answered và phụ thuộc màu. CTA cuối thêm claim chứng chỉ/phân tích ngoài phạm vi |
| Cách hoạt động | Hero có điểm nhìn, năm bước đánh số theo thứ tự 1→5, bước cuối rộng tạo nhịp; có link tài khoản/xác thực/đăng nhập/đề/lịch sử và nhãn cần đăng nhập. Ba nguyên tắc và FAQ đọc rõ; CTA mẫu/tạo tài khoản | Trang dài 3304px logic; card/badge/callout nhiều khiến nhịp lặp. Minh họa là thẻ giấy chồng lớp nhẹ, chưa rõ mặt cạnh/khối 3D. Có nhãn kỹ thuật, route thô và nội dung tự thêm cần bỏ |
| Trợ giúp | Menu chủ đề tách khỏi vùng đọc; active chủ đề và một accordion mở rõ. Phân biệt Đang gửi/Đã lưu bằng nhãn và màu; năm FAQ phòng thi, nhóm khác và card liên hệ trung tính. Không hotline/form ticket giả | Sidebar active label wrap và badge “5 câu” hơi chật. Header/vùng đọc thêm nhiều badge kỹ thuật, có thể thu gọn. Thông báo sức khỏe máy chủ và bảo đảm dữ liệu chưa có nguồn; hướng dẫn phải khớp UI thật |

Không thấy nội dung chính bị che hoặc chồng lên nhau trong ba ảnh. Đây là nhận xét ở viewport đã xuất, chưa phải kiểm chứng responsive. Public không dùng Candidate rail; menu Trợ giúp là menu nội dung, phù hợp nhiệm vụ.

## Findings để xử lý khi triển khai

- [ ] **PUB-V4-01 — P2 — Làm rõ lựa chọn trong mẫu.** Tăng độ rõ của viền radio chưa chọn và state hover/focus, kiểm tra contrast khi dựng. Giữ radio/nền/nhãn chọn ở A; bỏ check tròn phụ cuối dòng hoặc dùng chữ “Đã chọn” để tránh cảm giác feedback đáp án đúng. Chỉ công bố đúng/sai khi đến kết quả mẫu. Nút Trước disabled ở câu đầu là đúng; không dùng disabled style đó cho action còn dùng được.
- [ ] **PUB-V4-02 — P2 — Navigator tách trạng thái đang xem và đã chọn.** Câu 1 hiện có nền xanh nhạt và chấm xanh, chưa có dấu current độc lập. Dùng outline/nhãn “Đang xem”, ✓ cho đã chọn và icon bookmark khi đánh dấu; accessible name mô tả đủ từng ô. Legend không chỉ các chấm màu. Progress 1/3 hiện biểu diễn số câu đã chọn, được giữ; không gọi đó là số câu đúng hoặc tiến độ xử lý.
- [ ] **PUB-V4-03 — P3 — Public header và thương hiệu nhất quán.** Cả ba có icon tài khoản bên cạnh Đăng nhập/Tạo tài khoản dù mẫu chưa đăng nhập. Bỏ icon thừa hoặc chỉ hiện khi session hợp lệ; khi authenticated dùng navigation phù hợp. Thay logo huy hiệu hiện tại bằng logo tạm chung lúc port. Giữ capsule/active nav đúng page, tránh ba lối cùng dẫn đăng ký/đăng nhập làm đầu trang rối.
- [ ] **PUB-V4-04 — P3 — Rút gọn nhịp Cách hoạt động và Trợ giúp.** Giảm khoảng trống trong hero/step cards, bỏ callout/badge lặp, làm “Ba điều cần nhớ” thành một dải có ba ý gọn thay vì ba card cao gần cùng cấu trúc journey. Giữ thứ tự năm bước và chữ đầy đủ. Thu gọn header Trợ giúp, để tên chủ đề đủ rộng và badge count một dòng; count chỉ lấy từ bộ FAQ cục bộ thực tế. Không thu nhỏ body để ép trang ngắn hơn.
- [ ] **PUB-V4-05 — P3 — Chiều sâu minh họa.** Giữ vị trí minh họa bên phải hero Cách hoạt động; có thể bổ sung cạnh giấy, phối cảnh nhẹ và bóng tiếp xúc để đọc được khối hơn. Thêm nhãn nhỏ “Minh họa giao diện”, không biến hình thành màn live. Trải nghiệm mẫu/FAQ không cần vật bay cạnh đáp án. Motion/reduced motion chưa được xác minh, không thêm chỉ để lấp khoảng trống.
- [ ] **PUB-V4-06 — Copy/chức năng phải sửa trước khi đưa vào sản phẩm.** Bỏ “LIVE SYNC”, “Chính trực 100%”, “an toàn tuyệt đối”, “không gián đoạn”, badge máy chủ hoạt động ổn định, chu kỳ “mili-giây”, cam kết bảo toàn nguyên vẹn trong mọi sự cố và claim chứng chỉ số/phân tích năng lực thiếu nguồn. Phần nhập tự luận chưa nằm trong bộ ba question types hiện tại. Giới hạn “1–3 lượt”/“tối đa 3 lượt” không được trình bày như quy tắc chung; tùy cấu hình đề. “Token 15 phút” sai so với policy link xác thực hiện tại 30 phút; nên bỏ thời lượng kỹ thuật khỏi hướng dẫn hoặc lấy đúng nguồn. Copy sau nộp không hứa backend tự đồng bộ mọi thay đổi chưa ACK.
- [ ] **PUB-V4-07 — Bỏ chi tiết triển khai khỏi hướng dẫn sản phẩm.** Đổi các link hiển thị `/register`, `/check-email`, `/login`, `/exams`, `/history` thành nhãn dễ hiểu, giữ URL ở đích link. Bỏ V4/DOC-V4, Server Handshake Required/Continuous Clock Enforced/Exact Match Scoring và “cập nhật kỳ thi 2025” nếu không có metadata. Biểu tượng mở tab ngoài chỉ dùng khi link thực sự làm vậy. Hướng dẫn đọc ổ khóa/dấu tích phải khớp SaveStatus thật, không dùng ổ khóa TLS như dấu đã lưu. Claim miễn phí/không phí ẩn chỉ giữ khi có chính sách được duyệt. Footer dùng năm phù hợp khi triển khai.
- [ ] **PUB-V4-08 — Hành vi và coverage còn mở.** Kiểm tra chuyển câu/đánh dấu/xóa/rà soát/kết quả mẫu; state chỉ ở bộ nhớ route, không gọi API nghiệp vụ/tạo attempt hay báo durable ACK. Phím tắt 1–3 tự thêm cần quyết định/kiểm chứng, tránh xung đột chọn đáp án hoặc nhập liệu. Accordion dùng nút/aria-expanded/keyboard/focus; chuyển chủ đề/link có đích thật. Kiểm tra auth nav, contrast, responsive, motion/reduced motion. Sample variants/mobile/states ở [backlog 04](stitch-page-prompts-v3/04-public-experience-help.md), không đóng vì đã lưu ba PNG.

Các điểm PUB-V4-06/07 là ghi chú nội dung/chức năng, không yêu cầu redesign phong cách. Quy tắc nhiều lựa chọn trong khối nguyên tắc hiện nói chọn thiếu/dư không có điểm từng phần, phù hợp exact-match; cần giữ ý đó và chính sách lời giải tùy đề. Copy không tự đăng nhập sau đăng ký và notice mẫu bắt đầu lại khi rời trang cũng phù hợp contract.

## Lưu mẫu và bước kế

Registry hiện có **33 page families: 16 đã lưu template, 2 desktop đã review chờ chọn (03B), 15 chưa có coverage được kiểm chứng**. 15 page families có review được ghi (có thể trùng nhóm đã lưu); Home/Dashboard/Exam dùng các reference đã chọn trước. Các count không đồng nghĩa đủ mobile, states hoặc triển khai xong.

Nhóm kế theo thứ tự desktop là Admin quản lý đề; [brief 05](stitch-page-prompts-v3/05-admin-exams.md) còn chứa desktop/mobile/variants/dialogs, cần tách thành lượt desktop nhỏ trước khi gửi. Lượt review này không tạo prompt mới hoặc gửi yêu cầu lên Stitch.

## Validation và giới hạn

[Ảnh gốc/template](templates/public-v4/README.md), [manifest/SHA-256](templates/public-v4/manifest.json), [inventory/bằng chứng](evidence/stitch-04a-review-2026-10-08/README.md). Đã kiểm tra dimensions/hash ba ảnh, inventory delta, các manifest template hiện có, registry counts/path, link local/JSON và `git diff --check`. Không chạy test ứng dụng vì không sửa source. Ảnh tĩnh chưa chứng minh prototype, bàn phím, accessibility, responsive, network, dữ liệu thật hoặc motion đã chạy.
