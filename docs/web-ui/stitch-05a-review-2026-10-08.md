# Review 05A — Quản lý đề và hai bước editor desktop — 2026-10-08

Nguồn: [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955), đối chiếu [prompt 05A](stitch-page-prompts-v3/05a-admin-exams-desktop.md), [Dashboard V2](templates/dashboard-v2/README.md), [design spec AD-02/AD-03](design-spec.md), [OpenAPI](../contracts/openapi.yaml) và editor/picker/draft trong `apps/web/src/features/admin`. Phạm vi: đọc ảnh gốc, ghi đánh giá và lưu bằng chứng review. Không sửa ứng dụng, tạo/chỉnh frame trên Stitch hoặc chọn template thay người dùng.

## Kết luận

**Giữ hướng thiết kế của cả ba màn; không cần dựng lại phong cách.** Rail gọn, bảng năm cột, form có label và editor hai cột phù hợp nhóm Admin. Màn Phần & câu hỏi là phần có cấu trúc tốt nhất. Cần sửa nút Thêm phần bị cắt, cách wrap metadata/thao tác trong bảng và độ dài màn Thông tin trước khi nghiệm thu UI triển khai.

Theo cách làm đã thống nhất, có thể ghi các lỗi để xử lý lúc code rồi tiếp tục thiết kế 05B. Những claim tự thêm về tự lưu/AI Proctor phải bỏ hoặc đối chiếu đúng capability trước khi đưa vào sản phẩm; chúng không phải lý do đổi palette hoặc xây lại bố cục. Ba PNG lưu dưới evidence, **chưa được chọn thành template Admin** trong lượt chỉ yêu cầu review này.

## Coverage được xác minh

Inventory mới có **59 entry**, tăng đúng ba so với 04A. IDs, title, deviceType và dimensions của 56 entry trước không đổi; đây là so metadata, không phải kiểm tra lại bytes mọi ảnh remote cũ.

| Màn | Screen ID | PNG gốc / viewport thiết kế |
| --- | --- | --- |
| EP-19 — Đề thi quản trị — Loaded | `1642281b82914f34bba01f4569e7f41c` | 2560×2476 / desktop 1280px |
| EP-20 — Soạn đề — Edit Information | `59c8a6e4b05d4cbf8d54505d3f3303b8` | 2560×4068 / desktop 1280px |
| EP-20 — Soạn đề — Edit Sections and questions | `70f9bc116ec544f29510f7cf38ce8ff1` | 2560×2736 / desktop 1280px |

Đã xem đầy đủ ba ảnh và crop nguyên tỷ lệ vùng cột trạng thái/thao tác, thanh chọn phần, panel ngân hàng. Đúng ba frame của 05A; chưa có bước Kiểm tra & phát hành, Create, mobile và dialog/state bổ sung trong delta này. Các phần đó là backlog có chủ đích, không phải lỗi thiếu frame của lượt 05A.

## Đánh giá từng màn

**Danh sách đề:** tên đề có đủ khoảng đọc, tên dài nhất xuống hai dòng thay vì bị bóp thành nhiều dòng như Lịch sử 03B. Có sáu hàng đúng fixture, danh mục, số phút, lịch mở/đóng với UTC+7 và ba trạng thái. Phân biệt bản nháp chưa từng phát hành với bản nháp có phiên bản từng phát hành. Filter/search ghi rõ phạm vi đã tải; footer có “Đã tải 6 đề” và tải thêm, không số trang/tổng toàn hệ thống. Notice tách chỉnh nháp khỏi phát hành phù hợp contract. Điểm yếu: “Sửa đề” bị ngắt hai dòng, “bản sửa 4/2/8” xuống ba dòng; row có nhiều khoảng trắng nên mật độ chưa tối ưu. Menu đóng trong ảnh, chưa chứng minh đủ actions hoặc kiểm tra quyền.

**Thông tin:** đủ các field title/category/duration/open/close/timezone/attempt limit/explanation policy/leaderboard; label rõ, đơn vị phút dễ dùng. Mẫu 90 phút, ngày 15/11/2026 08:00–12:00, Giờ Việt Nam, 3 lượt, lời giải sau khi có kết quả, bảng xếp hạng bí danh bật khớp summary. Counter 42/200 khớp tên fixture 42 ký tự. Trạng thái chưa lưu và hai hành động Lưu nháp/Tiếp tách biệt, không CTA phát hành ở bước 1. Điểm yếu: hero và ba nhóm form có padding lớn, summary/callout lặp nhiều nội dung; toàn trang dài khoảng 2034px logic. Header/stepper khác rõ với bước 2, dù cùng editor. Có progress 33%, badge Live và card chống gian lận tự thêm ngoài brief.

**Phần & câu hỏi:** layout khoảng 2:1, không thêm sidebar summary thứ ba; ba phần và count/điểm đọc rõ. Tổng 3 phần, 6 câu, 100 điểm khớp 20 + 30 + 50; phần active có hai câu 10 điểm, subtotal 20. Đủ input tên phần, điểm trong đề, nút sắp xếp phần/câu và bỏ khỏi phần. Picker có phạm vi đã tải, type filter, điểm gốc, hai câu đã có trong đề với nút disabled và tải thêm. Điểm yếu: nút Thêm phần bị cắt ở cạnh phải, badge/điểm/nút picker xuống dòng không nhất quán. Ảnh thấy bốn hàng ngân hàng thay vì năm hàng như fixture yêu cầu; chưa thấy câu Đúng/Sai chưa chọn hoặc affordance cuộn nội bộ. Không suy ra các câu còn lại thực sự truy cập được chỉ từ nhãn “Đã tải 10 câu”. Footer tự thêm claim tự lưu trên trình duyệt.

## Findings còn mở

- [ ] **05A-01 — P2 — Thêm phần bị cắt.** Đưa Thêm phần ra khỏi hàng tab sang vị trí cố định luôn thấy đủ label và vùng bấm; cho các tab wrap hoặc dùng danh sách cuộn có affordance. Không dùng overflow hidden làm mất control. Giữ nhãn phần dài, active riêng với số câu/điểm; kiểm tra khi đủ 20 phần và tên 200 ký tự.
- [ ] **05A-02 — P2 — Wrap bảng Danh sách đề.** Dành đủ chiều rộng tối thiểu cho Sửa đề + menu, giữ nhãn action trên một dòng khi còn chỗ. Đặt “Bản sửa 4” thành dòng metadata riêng dưới version/status thay vì flex trong khoảng hẹp. Giảm padding hàng sau khi sửa phân bố cột, giữ tên tối đa hai dòng tự nhiên và lịch đầy đủ; không cắt tên hoặc thu chữ để ép bảng.
- [ ] **05A-03 — P2 — Thu gọn Thông tin và thống nhất editor.** Dùng một cấu trúc header/breadcrumb/stepper cho cả hai bước, ưu tiên header gọn của Phần & câu hỏi. Giữ ba nhóm field nhưng giảm padding/heading/helper lặp; summary chỉ giữ dữ liệu hỗ trợ quyết định, bỏ summary mini trùng trên hero. Không thu nhỏ body để giảm chiều cao. Nếu action bar sticky khi code, phải có khoảng bù và không che field/focus cuối trang. Nhãn bước 1 dùng cùng một tên, tránh Thông tin/Thông tin chung khác nhau; icon khóa bước 3 chỉ giữ khi có điều kiện chặn thật, không mặc định tạo gate mới.
- [ ] **05A-04 — P2 — Picker và trạng thái selection.** Tách prompt khỏi một hàng metadata/nút có bố cục ổn định; badge loại câu, điểm gốc và Thêm câu không bị bóp thành hai/ba dòng tùy hàng. Đổi “10 sẵn sàng” thành số đã tải; fixture có 6 câu trong số 10 đã thuộc đề nên không gọi toàn bộ 10 là có thể thêm. Bổ sung hàng thứ năm hoặc cuộn/hiển thị thêm rõ, có cách đọc prompt đầy đủ khi preview bị cắt. Dùng “Câu 1/Câu 2” nhất quán thay vì Q1/02. Kiểm tra thêm câu cập nhật tổng và chỉ chặn trùng trong toàn đề, không xóa câu gốc khi bỏ membership.
- [ ] **05A-05 — P1 trước khi đưa vào sản phẩm — Claim lưu dữ liệu.** Bỏ “Bản sửa tự động lưu trên trình duyệt 2 phút trước” ở footer bước 2: draft hiện tại giữ state trong editor, không có cơ chế browser persistence được chứng minh. Bỏ “Cập nhật 6 phút trước” nếu không có nguồn timestamp; `AdminExam` không cung cấp `updatedAt`. Đổi Live thành nhãn phản ánh tóm tắt local, bỏ tiến độ 33% tự thêm vì chỉ số bước không chứng minh hoàn tất thiết lập. Giữ “Có thay đổi chưa lưu”; chỉ đổi thành Đã lưu sau receipt của server, không sau chuyển bước hoặc đếm thời gian. Error/conflict phải giữ edits, không tự overwrite.
- [ ] **05A-06 — P2 trước khi đưa vào sản phẩm — Capability/copy tự thêm.** Bỏ card “Kiểm duyệt chống gian lận — Hỗ trợ AI Proctor & Chặn tab”; chưa có capability này trong phạm vi dự án. Không đưa “phân tích ma trận kiến thức” vào helper Danh mục khi chưa có luồng tương ứng. IANA timezone không phải “chuẩn định dạng ISO 8601”: giữ Asia/Ho_Chi_Minh là helper múi giờ, UTC Z thuộc payload. Bảng xếp hạng dùng bí danh/opt-in, không hứa UI nhận diện vị trí riêng của người dùng nếu response không có mapping; helper về kết quả cao nhất cũng phải đối chiếu đúng luật Reporting thay vì tự quyết định từ giới hạn lượt. Copy sửa sau, không lấy nó làm yêu cầu mở rộng backend.
- [ ] **05A-07 — P3 — Brand và chi tiết thị giác.** Rail đã gọn khoảng 72px, tốt hơn sidebar rộng V4 cũ; nhưng active Cobalt bo vuông khác tròn ink của Dashboard V2. Thống nhất khi port. Thay mũ tốt nghiệp bằng logo tạm phiếu thi; bỏ V4/EP-20 khỏi product UI. IDs EXM-8822 ở list và EXAM-9842 ở editor là placeholder không khớp cùng đề; dùng ID thực hoặc bỏ mã thừa. Minh họa ở list chỉ là icon phẳng có shadow, chưa thể hiện 2.5D/3D rõ; Admin có thể giữ trang trí nhẹ, không cần đồ vật nổi trong form. Motion vẫn chưa xác minh.
- [ ] **05A-08 — Coverage và behavior chưa xác minh.** Thiết kế 05B bước Kiểm tra & phát hành, publish/unpublish/archive, bỏ phần có câu, rời editor chưa lưu và 409 conflict theo nhóm nhỏ; sau đó Create/mobile/loading/empty/error/pending/saved/validation/permission states. Kiểm tra nút/mục menu theo permission, đúng target/version, không đổi frozen attempts. Input phút→integer seconds, IANA→UTC và điểm riêng trong đề; server publish authoritative. Prototype/keyboard/focus/contrast/reduced motion/scroll và live API cần evidence khi triển khai, không tick từ screenshot.

## Trạng thái và bước tiếp theo

Registry có **33 page families: 16 đã giữ template, 4 đã review chờ chọn, 13 chưa có frame coverage được kiểm chứng**. Có 17 page families ghi review, có thể trùng nhóm template đã giữ. EP-20 mới review hai bước Edit, không hoàn tất Create hoặc bước 3; count theo page family không thay thế coverage từng biến thể.

Đề xuất giữ style 05A, ghi các findings khi port và tiếp tục chuẩn bị **05B desktop — Kiểm tra & phát hành cùng các dialog thiết yếu** sau khi người dùng chọn hướng này. Chưa tạo prompt 05B hoặc gửi refinement trong lượt review. Không gửi lại 05A để tạo trùng; [brief 05 đầy đủ](stitch-page-prompts-v3/05-admin-exams.md) vẫn là backlog, không paste nguyên khối.

## Validation và giới hạn

[Bằng chứng/ba PNG gốc](evidence/stitch-05a-review-2026-10-08/README.md), [manifest/SHA-256](evidence/stitch-05a-review-2026-10-08/manifest.json), [inventory](evidence/stitch-05a-review-2026-10-08/inventory.json). Đã kiểm tra dimensions/hash, đúng ba ID mới, metadata delta 56→59, fixture totals/counter, JSON/registry/local links và whitespace diff. Không chạy test ứng dụng vì source không đổi. Ảnh tĩnh không chứng minh component DOM, prototype, accessibility, responsive, network, persistence hoặc motion đang hoạt động.
