# Prompt 03 — Status, Result, Review, History, Leaderboard

**Backlog đầy đủ, không gửi nguyên khối ở lượt hiện tại.** Theo yêu cầu mới ngày 2026-10-08, ưu tiên các trang web desktop trước. Gửi [03A — Status/Result/Review desktop](03a-results-desktop.md), review rồi đến [03B — History/Leaderboard desktop](03b-history-ranking-desktop.md). Mobile và critical variants bên dưới giữ để bổ sung sau; việc chuẩn bị prompt không xác nhận đã có frames.

```text
Trong project “ExamPlatform UI Design”, ID 18257628123124303955, tạo 5 page sau khi thi. Giữ nguyên mẫu đã chọn; không sửa lại các trang cũ hoặc tạo dự án mới.

Mẫu: Dashboard desktop V2 ID 927f2e0d87ce4f89be5d55c3cb81606b và mobile V3 ID 57c1dac4924d4d13b45d655c41dfc81c; Exam desktop V3 ID 222db89535964fb9bc183ab05a92bab6 cho typography câu hỏi/read-only review. Dùng cùng rail/capsule, card trắng mềm và logo tạm phiếu thi Cobalt/Apricot đính kèm.

Palette #F3F6FC/#FFFFFF/#315CF4/#FFB36B/#E8EEFF/#1B2540/#58627A; Be Vietnam Pro; JetBrains Mono cho số chọn lọc. Card radius 20–24px, nhịp 8px, gutter 16–24px, shadow nhẹ. Desktop 1280px / mobile 390px. Prototype tiếng Việt có dữ liệu mẫu. Không fake ETA, điểm chính thức, chart hoặc tính năng ngoài nội dung dưới đây.

EP-11 — Trạng thái bài nộp /attempts/:attemptId/status
- Card khoảng 640px trên desktop; thông tin đề/version, “Đã nhận bài”, thời gian nhận, trạng thái xử lý và bước tiếp theo. Không full-page spinner hoặc progress% giả.
- Các variants: đang xác minh bài nộp chưa có ACK; đã nhận và đang xử lý; hoàn tất với “Xem kết quả”; xử lý thất bại có trợ giúp/làm mới; đã yêu cầu xử lý lại; chưa có kết quả mới sau thời gian chờ với đường về lịch sử.
- “Nộp khi hết giờ” là nhãn thời điểm nộp, không tự biến thành failed. Candidate không có nút replay quản trị.

EP-12 — Kết quả /attempts/:attemptId/result
- Điểm đạt/tổng là trọng tâm; đúng/tổng câu, phần trăm, phiên bản và thời điểm hoàn thành. Label “Điểm bài trắc nghiệm”. Không IELTS band/TOEIC 990 hoặc gauge lớn.
- Table/card các phần: tên phần, điểm, số đúng/tổng; mobile từng hàng rõ. Không thêm thời gian từng câu hoặc percentile không có dữ liệu.
- CTA xem lại đáp án khi được mở; nếu chưa mở có vùng giải thích gọn. Links về lịch sử, leaderboard cùng version nếu bật; làm lại dẫn về chi tiết đề để kiểm tra giới hạn lượt.
- Variants pending, kết quả thường, nộp hết giờ, review chưa được mở và lỗi tải.

EP-13 — Xem lại /attempts/:attemptId/review
- Read-only workspace: tên đề, vị trí câu, điều hướng, “Bạn chọn” và “Đáp án đúng” phân biệt bằng icon/nhãn/màu. Nội dung câu dễ đọc, multiple choice hiển thị từng lựa chọn rõ.
- Explanation nằm sau đáp án; trường hợp trống có thông báo ngắn. Không nút sửa bài, countdown hoặc giả autosave.
- Filter kết quả trong phần đã tải phải ghi phạm vi; có “Tải thêm”/navigation có loading và retry. Mobile bảng câu vào sheet/drawer, chữ căn trái.
- Variant quyền xem bị thu hồi: thông báo và CTA về kết quả, không để đáp án/lời giải tiếp tục hiện phía sau.

EP-14 — Lịch sử /history
- Desktop table/list: tên đề, version, bắt đầu, trạng thái, nộp khi hết giờ, điểm nullable và action đúng trạng thái “Tiếp tục”/“Xem trạng thái”/“Xem kết quả”. Mobile rows/card một cột.
- Chưa có điểm phải ghi “Chưa có”, không 0. Không tổng/điểm trung bình suy từ một page. “Tải thêm” ở cuối và làm mới rõ.
- Empty, đang tải, stale có nhãn thời điểm và lỗi/retry; tên dài không đẩy CTA khỏi card.

EP-15 — Bảng xếp hạng /exams/:examId/versions/:versionId/leaderboard
- Đề/version và thông báo tham gia qua hồ sơ. Bảng rank, bí danh, điểm đạt/tổng, thời điểm hoàn thành; không avatar/email/displayName cá nhân, không “Bạn” highlight nếu không có dữ liệu xác định.
- Tập trung vào bảng đọc dễ, không podium hoạt họa hoặc hiệu ứng gamification lớn. Mobile chuyển row hợp lý, giữ rank/điểm dễ quét.
- Variants bật có dữ liệu, chưa có người tham gia, xếp hạng không được mở, quyền truy cập bị từ chối. Tải thêm và refresh; CTA quản lý opt-in dẫn profile.

Đầu ra: 5 page desktop 1280px / mobile 390px, critical variants đặt riêng và đặt tên EP-11 đến EP-15 — [tên] — V3. Không gộp thành một dashboard chứa tất cả; mỗi route có page riêng và đủ nội dung. Component/state showcase ở vùng handoff ngoài sản phẩm. Trả danh sách frame/ID thực tế, ghi phần thiếu.
```
