# Review 03A — Trạng thái, Kết quả, Xem lại bài desktop — 2026-10-08

Nguồn: [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955), đối chiếu [Prompt 03A](stitch-page-prompts-v3/03a-results-desktop.md), [Dashboard V2](templates/dashboard-v2/README.md), [Catalog/Profile V4](templates/catalog-profile-v4/README.md), design spec CA-05–07 và DTO Result/ReviewQuestion. Phạm vi chỉ đọc và lưu review; không gửi generation/refinement hoặc sửa ứng dụng.

## Kết luận

**Đủ ba trang desktop để review. Đề xuất giữ hướng thiết kế và tiếp tục desktop; không cần tạo lại toàn bộ 03A.** Kết quả là trang hoàn thiện nhất về phân cấp thông tin; Trạng thái bài nộp rõ mục đích, CTA dễ thấy. Xem lại bài có workspace chỉ đọc hợp lý nhưng cần hoàn thiện điều hướng và cách phân biệt trạng thái câu hỏi. Các vấn đề dữ liệu/copy có thể note để xử lý khi code theo yêu cầu trước.

Sau review, người dùng đồng ý giữ hướng thiết kế và tiếp tục phần kế. Ba ảnh đã chuyển nguyên bytes thành [template Results V4](templates/results-v4/README.md); findings 03A-01–07 vẫn mở. Entry EP-11 thiếu ảnh chưa được chọn. Chiều sâu hiện tại chủ yếu từ shadow/tint và icon nhiều lớp nhẹ; chưa có cảnh 3D nổi bật hoặc bằng chứng animation chạy.

## Coverage thực tế

Inventory chụp lúc bắt đầu review có **51 entry**, tăng bốn so với inventory 02B 47 entry. Có ba page families EP-11/12/13, trong đó EP-11 có hai entry trùng tên. Ba entry có ảnh PNG 2560px, tương ứng desktop 1280px; entry EP-11 `5afee71803b8443cba85abd5cc77b667` kích thước metadata 1280×1024 không có screenshot URL nên chưa được review thị giác. Không coi entry này là bản tốt hơn hoặc đã hoàn thiện từ tên frame.

| Page/state | Screen ID đã xem | PNG |
| --- | --- | --- |
| EP-11 — Processing | `e6bf4c9f5a5b4abcaa6973835a3721cd` | 2560×2048 |
| EP-12 — Completed | `ada6f9265a0e4e41ba2c139fbdc927a1` | 2560×2782 |
| EP-13 — Released review | `f8be22a0bbe840bb83fb3332770ab04e` | 2560×4600 |

Metadata của 47 entry trước không đổi trong inventory này; đó không phải kiểm tra nội dung remote từng ảnh cũ. Mười bảy template Catalog/Profile cục bộ vẫn khớp hash. Không có mobile mới trong snapshot 03A, đúng ưu tiên desktop. Các states phụ được hoãn có chủ ý, không phải lỗi thiếu của lượt 03A.

## Đánh giá từng trang

| Trang | Điểm tốt | Điều chỉnh nên giữ lại |
| --- | --- | --- |
| Trạng thái bài nộp | Card trung tâm khoảng 640px, icon/heading rõ; đủ tên/version, thời điểm GMT+7, trạng thái đang xử lý, về lịch sử và refresh. Không điểm, ETA hoặc progress xử lý giả; không nút xem kết quả sớm | Rail đang active Đề thi, khác Result active Lịch sử. Logo mũ tốt nghiệp khác logo tạm. Copy ký số/thông báo tự thêm cần bỏ hoặc xác minh capability; tên đề thiếu hậu tố SAA-C03 |
| Kết quả | 772/1000 là trọng tâm; 50/65 câu và 77,20% theo điểm được phân biệt. Bốn phần có tên đầy đủ, điểm và số đúng khớp tổng. CTA xem lại/về lịch sử/leaderboard/chọn đề và về detail khi làm lại rõ | 77,20% lặp trong hai vị trí gần nhau; card điểm khá nhiều khoảng trống. Card “118 phút / còn dư 12 phút” tự thêm không có nguồn fixture. Giảm khối metadata dư sẽ làm phần trên gọn hơn |
| Xem lại bài | Tách thành workspace tập trung, không sidebar marketing/countdown/autosave/sửa đáp án. A/C có nhãn Bạn đã chọn/Đáp án đúng; kết quả câu Đúng, lời giải rõ phần. Có 20 câu đã tải/65, filter phạm vi đã tải, tải thêm và trước/sau | Navigator phân loại từng ô chủ yếu bằng màu; dấu cam ở câu 14 đang xem dễ lẫn trạng thái Sai. B/D ghi “Không chọn (Sai)” dễ khiến người đọc hiểu mình làm sai dù bỏ chúng là đúng. Nút trước/sau nằm sau lời giải rất dài; nên có điều hướng gần header hoặc thanh gọn bám khi cuộn |

## Findings để xử lý

- [ ] **03A-01 — P2 — Navigator cần dấu hiệu ngoài màu và current state riêng.** Giữ bảng câu hỏi, bổ sung icon ✓/×/— hoặc nhãn trạng thái tương ứng từng ô cùng accessible name. Câu đang xem dùng outline/nhãn “Đang xem” độc lập với Đúng/Sai; bỏ dấu cam không có chú giải hoặc nêu rõ nếu thật sự là trạng thái khác. Bỏ tên màu “Cobalt/Đỏ cam” khỏi legend sản phẩm, giữ Đúng/Sai/Chưa trả lời. Các nhãn trong legend hiện có chưa giúp phân biệt từng ô khi không nhận ra màu.
- [ ] **03A-02 — P2 — Điều hướng review phải dễ tiếp cận khi lời giải dài.** Ảnh review dài 2300px theo kích thước thiết kế logic, trước/sau chỉ xuất hiện sau toàn bộ câu và lời giải. Thêm một hàng điều hướng gọn gần heading câu, hoặc thanh bám trong vùng nội dung; có thể giữ hàng cuối. Navigator có thể sticky nhưng phải kiểm tra max-height/scroll/focus, không che nội dung. Chưa xác minh phím tắt hoặc sticky thực từ ảnh.
- [ ] **03A-03 — P2 — Nhãn lựa chọn chưa chọn tránh gây hiểu nhầm.** B/D hiện ghi “Không chọn (Sai)” trong một câu được chấm Đúng. Đổi thành “Bạn không chọn”; nếu cần phân loại option, diễn đạt riêng “Không thuộc đáp án đúng”. Giữ A/C “Bạn đã chọn” và “Đáp án đúng”, kết luận đúng/sai ở cấp câu, không biến mỗi lựa chọn thành điểm riêng.
- [ ] **03A-04 — P3 — Gọn hierarchy và thống nhất shell/brand.** Result đang lặp 77,20%; bỏ một chỗ và cân lại chiều cao card điểm/thông tin phụ. Status/Result thống nhất rail active theo hành trình sau khi thi, breadcrumb và logo tạm. Review không có Candidate rail là lựa chọn phù hợp workspace tập trung, không phải lỗi thiếu navigation toàn cục. Chỉ một điểm nhấn 2.5D nhỏ là đủ; không cần tăng chuyển động ở bảng hay lời giải.
- [ ] **03A-05 — Copy/dữ liệu hoãn khi code.** Result tự dựng 118 phút/còn dư 12; Review lại ghi 112 phút và nộp 10:42 ngày 24/10/2024, khác fixture Status/Result ngày 15/11/2024, mã lượt cũng khác. Bỏ số thiếu nguồn và thống nhất cùng attempt. Bỏ copy ký số, “khi có thông báo”, mã AWS-PROCTOR và footer “khảo thí chuẩn quốc tế/SSL 256-bit” nếu chưa có capability/evidence tương ứng. “Chọn 2 đáp án” không được tự suy từ answer key để hiện trong câu hỏi. Đây là ghi chú dữ liệu/copy, không yêu cầu redesign style.
- [ ] **03A-06 — Nội dung question/review phải bám payload.** Diagram kiến trúc nằm trước đáp án và reference-link card được tự thêm; DTO hiện cung cấp prompt/options/explanation dạng text, chưa có field asset/reference link tương ứng. Không tự tạo hình/link theo đáp án, không tự coi bản mẫu là lý do mở rộng contract. Khi code dùng nội dung được phép của frozen version; nếu muốn hỗ trợ media/rich content thì cần yêu cầu riêng. Review này không kiểm chứng kiến thức AWS hoặc nhận các bảo đảm kỹ thuật trong lời giải mẫu.
- [ ] **03A-07 — Kiểm chứng implementation còn mở.** Chưa xác minh click/prototype, paging/filter scope, permission/review cache, ACK/polling, keyboard/focus/contrast, responsive hoặc reduced motion. Result chỉ cho xem lại khi quyền thật sự được mở; Status chỉ nói đã nhận sau ACK; loading/error/forbidden phải làm riêng khi đến lượt states. Screenshot không xác nhận các hành vi này đã hoạt động.

Các thanh ngang theo điểm từng phần và “đã tải 20/65 câu” biểu diễn số có nguồn trong fixture, không phải phần trăm xử lý/ETA giả. Tỷ lệ 50/65 = 76,92% theo số câu khác 772/1000 = 77,20% theo điểm; bản hiện tại phân biệt đúng, cần giữ khi code.

## Bước tiếp theo

Ưu tiên desktop giữ nguyên. Đề xuất giữ ba bố cục, lưu các findings để hoàn thiện lúc code, rồi review **03B — Lịch sử/Bảng xếp hạng**. Trong lần đọc browser tiếp tục đã thấy chat và nội dung render đề cập 03B; lượt này chưa tải inventory/PNG hoặc review hai page đó, vì yêu cầu hiện tại chỉ là 03A. Không đề nghị gửi lại prompt 03B để tránh tạo trùng.

Tại thời điểm review ban đầu, ba page 03A chuyển từ prompt_prepared sang design_reviewed_with_open_findings; registry khi đó có 33 page families, 10 template đã chọn, 3 đã review chờ chọn và 20 còn ở prompt_prepared. Sau khi người dùng đồng ý, 03A đã thành template_retained. [Review 03B](stitch-03b-review-2026-10-08.md) ghi coverage/counts tiếp theo; các page cần mobile và supplementary states vẫn giữ backlog, không đóng chỉ vì desktop có ảnh.

## Bằng chứng và validation

[PNG gốc và IDs](evidence/stitch-03a-review-2026-10-08/README.md), [manifest/SHA-256](evidence/stitch-03a-review-2026-10-08/manifest.json), [inventory tại thời điểm lấy 03A](evidence/stitch-03a-review-2026-10-08/inventory.json). Đã xem cả ba PNG và crop nguyên tỷ lệ các vùng quan trọng; xác minh dimensions/hash, snapshot delta, 17 template cũ, registry/links/JSON và `git diff --check`. Không chạy test ứng dụng vì không sửa source. Entry EP-11 thiếu ảnh vẫn được ghi riêng, không bỏ khỏi inventory hoặc tự chọn/xóa trên Stitch.
