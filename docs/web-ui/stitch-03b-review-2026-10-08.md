# Review 03B — Lịch sử thi và Bảng xếp hạng desktop — 2026-10-08

Nguồn: [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955), đối chiếu [prompt 03B](stitch-page-prompts-v3/03b-history-ranking-desktop.md), [Dashboard V2](templates/dashboard-v2/README.md), design spec CA-08/09 và HistoryItem/LeaderboardEntry trong OpenAPI. Phạm vi: đọc ảnh, ghi review, lưu 03A theo đồng ý của người dùng và chuẩn bị nhóm Public desktop. Không sửa ứng dụng hoặc gửi lệnh tạo/chỉnh trên Stitch.

## Kết luận

**Giữ hướng thiết kế hai màn. Bảng xếp hạng khá hoàn chỉnh về bố cục; Lịch sử cần chia lại độ rộng cột trước khi triển khai.** Palette sáng, card trắng, typography và CTA cùng family đã chọn. Không cần dựng lại toàn bộ; các lỗi bố cục được ghi để sửa lúc code theo cách làm đã thống nhất.

03B mới được review, chưa tự chọn làm template. 03A được lưu riêng thành [template Results V4](templates/results-v4/README.md) theo câu “Oke làm phần tiếp theo luôn đi”; chỉ chốt hướng thị giác, findings 03A vẫn mở. Bước kế là [prompt 04A — Public desktop](stitch-page-prompts-v3/04a-public-desktop.md).

## Coverage

Inventory có **53 entry**, tăng đúng hai so với 03A; metadata của 51 entry cũ không đổi. Hai ảnh đã xem đầy đủ và crop nguyên tỷ lệ các vùng bảng. Đây không phải kiểm tra lại bytes của mọi ảnh remote cũ.

| Page/state | Screen ID | PNG gốc / viewport thiết kế |
| --- | --- | --- |
| EP-14 — Lịch sử — Loaded | `34514bb3f3e5425c9eb4252958064aa9` | 2560×3432 / desktop 1280px |
| EP-15 — Bảng xếp hạng — Loaded | `b91abc139e804b7b859bf9a071518b1e` | 2560×2358 / desktop 1280px |

Mobile và loading/empty/error/disabled/forbidden chưa nằm trong hai frame này, tiếp tục backlog; không phải thiếu sót của lượt tạo desktop Loaded. Chat Stitch vẫn trả ID placeholder, nhưng IDs thật ở trên đã được xác minh bằng inventory, không lấy tên frame làm ID.

## Đánh giá

**Lịch sử:** đủ sáu lượt, năm cột, version/mã rút gọn, GMT+7 và hành động theo trạng thái. Điểm chưa có không bị đổi thành 0. Lượt nộp khi hết giờ vẫn có kết quả, tách badge phụ; FAILED chỉ dẫn xem trạng thái, không có replay quản trị. Footer ghi số đã tải và tải thêm, không tổng/số trang giả. Trạng thái có icon/chữ cùng màu.

Điểm yếu nằm ở phân bổ không gian: tên AWS xuống **5 dòng**, tên lượt cũ xuống **9 dòng**, badge “Đã hoàn thành” bị ngắt thành 3 dòng; trong khi giữa Điểm và Hành động còn nhiều khoảng trống. Sáu hàng kéo toàn trang tới khoảng 1716px thiết kế logic. Tên không bị cắt mất, nhưng khó quét danh sách và so sánh các hàng. Chú thích dưới “Tiếp tục” trải rất rộng, làm cột hành động chiếm chỗ quá mức.

**Bảng xếp hạng:** header tên đề/version rõ, có về Chi tiết đề và refresh. Notice opt-in cùng link quản lý tham gia dễ thấy. Đủ bốn cột, mười bí danh, không avatar/email/displayName hoặc highlight “Bạn” trong bảng. Các điểm 985, 960, 945, 920, 895, 880, 855, 840, 815, 790 đều trên thang 1000, giảm dần theo hạng 1–10; thời điểm có GMT+7. Footer có số đã tải, không tổng giả hoặc podium lớn. Badge hạng 3 cam đậm hơn hạng 1 nên hơi lệch ưu tiên, nhưng là polish nhỏ.

## Findings mở khi code

- [ ] **03B-01 — P2 — Chia lại cột Lịch sử.** Ưu tiên khoảng 40–45% vùng bảng cho tên đề; giữ wrap đầy đủ, không giải quyết bằng cách cắt tên. Cột thời gian/điểm gọn và có giới hạn, action đủ nút khoảng 150–180px; đây là gợi ý phân bổ, cần kiểm chứng khi dựng ở 1280px. Chuyển helper “Tiếp tục cùng lượt…” thành dòng ngắn trong vùng phù hợp, cho wrap, tránh khiến cột action phình rộng. Căn nội dung trên ở hàng dài và giảm padding dư sau khi cột đã hợp lý.
- [ ] **03B-02 — P2 — Badge trạng thái dễ đọc.** Tăng vùng trạng thái hoặc dùng icon + nhãn gọn với wrap có chủ ý; tránh từng từ rơi thành 3 dòng như hiện tại. Badge “Nộp khi hết giờ” là trạng thái phụ của lượt, không dùng màu/biểu tượng khiến người đọc hiểu đó là FAILED. Giữ icon/chữ, không chỉ màu.
- [ ] **03B-03 — P2 — Thống nhất Candidate shell.** Cả hai frame dùng sidebar khoảng 256px logic, thay vì rail gọn theo Dashboard V2. Dùng lại rail chuẩn sẽ trả thêm không gian cho bảng, nhưng vẫn phải sửa cách chia cột, không chỉ thu sidebar. History active Lịch sử, ranking active Đề thi là hợp ngữ cảnh; giữ điều hướng rõ. Thống nhất logo tạm, bỏ chữ thương hiệu tự thêm khi port.
- [ ] **03B-04 — P3 — Polish hierarchy.** Table header Lịch sử dùng uppercase mono/letter-spacing nhiều và wrap hai dòng, khác header dễ đọc hơn của ranking. Dùng Be Vietnam Pro cho nhãn cột; Mono chỉ ở số/mốc thời gian. Top 1 nên ít nhất nổi bật bằng top 3, điều chỉnh sắc độ nhỏ, giữ bảng là trọng tâm. Chiều sâu hiện chủ yếu shadow/card; không cần cảnh 3D hoặc vật bay trên dữ liệu.
- [ ] **03B-05 — Copy/dữ liệu xử lý sau.** Các nhãn “Trạng thái: Sẵn sàng”, “Dữ liệu xác thực”, “Assessment Suite” và hỗ trợ “24/7” tự thêm chưa có nguồn. Bỏ hoặc thay bằng nội dung được duyệt. HistoryItem chưa có title/version label/mã thí sinh; dùng nguồn metadata hợp lệ cho phiên bản đã thi hoặc fallback tên/mã lượt, không ghép publication hiện hành/N+1. Các điểm/tên trong mockup là fixture thị giác, không phải dữ liệu thật.
- [ ] **03B-06 — Hành vi chưa kiểm chứng.** Khi code phải kiểm tra cursor/loadmore/refresh, nullable score, resume cùng lượt, ownership, opt-in và version scope. Không frontend tự xếp hạng, join danh tính hoặc đổi opt-in khi mở trang. Kiểm tra bàn phím, focus, contrast, responsive và reduced motion; ảnh không chứng minh các nút/prototype đã hoạt động. Không coi câu “Sẵn sàng kết nối” trong chat là đã nối link thật.

## Bước tiếp theo và validation

Đã chuẩn bị 04A cho đúng **ba page desktop**: Trải nghiệm mẫu, Cách hoạt động, Trợ giúp. Chỉ một trạng thái chính mỗi page; các dạng câu/rà soát/kết quả của sample, mobile và states phụ tiếp tục backlog. Người dùng paste khối prompt trong 04A vào chat dự án, assistant chưa gửi thay.

Registry sau lượt này: 33 page families, **13 có template thị giác**, **2 desktop đã review chờ chọn** và **18 chưa có coverage được kiểm chứng**. Các con số không xác nhận đủ mobile/states hoặc triển khai xong.

[Ảnh và IDs](evidence/stitch-03b-review-2026-10-08/README.md), [manifest/SHA-256](evidence/stitch-03b-review-2026-10-08/manifest.json), [inventory](evidence/stitch-03b-review-2026-10-08/inventory.json). Kiểm tra dimensions/hash của hai ảnh 03B và ba template 03A, các manifest template hiện có, delta inventory, JSON/registry/local links và `git diff --check`. Không chạy test ứng dụng vì không sửa source; review giới hạn ở ảnh tĩnh.
