# Prompt 08 — Attempt detail/replay, statistics, metrics, audit

```text
Trong “ExamPlatform UI Design”, project 18257628123124303955, tạo 4 page báo cáo Admin. Bám Dashboard desktop V2 ID 927f2e0d87ce4f89be5d55c3cb81606b và mobile V3 ID 57c1dac4924d4d13b45d655c41dfc81c; cùng Admin shell các nhóm trước. Không regenerate template đã chọn.

Canvas #F3F6FC / card trắng, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540, muted #58627A; Be Vietnam Pro, monospace chọn lọc cho metrics/mã; radius 20–24px/gutter 16–24px/shadow nhẹ. Desktop 1280px / mobile 390px, rail/menu trắng, logo tạm phiếu thi đính kèm. Prototype dữ liệu mẫu; không phát minh telemetry, chart hoặc thao tác ngoài phạm vi.

EP-29 — Chi tiết lượt thi /admin/attempts/:attemptId
- Breadcrumb về bài nộp; context đề/version/mã thí sinh/mã lượt thi; thời điểm bắt đầu/deadline/nộp; lifecycle/expired, điểm nếu có và các phần.
- Summary không lấn nội dung. Tabs hoặc sections “Tổng quan”, “Bài làm/đáp án được phép”, “Xử lý”. Quyền xem reporting và quyền xem keys khác nhau: variant thiếu quyền review vẫn có phần summary được phép, không lộ answer keys.
- Read-only review giữ typography của ExamV3, nhiều lựa chọn có nhãn bạn chọn/đúng/rõ loại; không cho sửa answer/điểm/quota hoặc làm bài thay người thi.
- Replay chỉ ở lượt FAILED và có quyền xử lý. Dialog “Yêu cầu xử lý lại”, lý do bắt buộc, giải thích không tạo lượt mới hoặc đổi câu trả lời; CTA confirm/cancel, pending/error.
- State đã nhận yêu cầu/replay pending không ghi đã chấm xong. Khi thiếu khả năng/quyền phải unavailable/disabled với lý do, không mô phỏng button hoạt động.
- Mobile sections dọc, replay dialog toàn chiều rộng, không ép bảng desktop.

EP-30 — Thống kê đề /admin/exams/:examId/versions/:versionId/statistics
- Chọn đúng version, cập nhật lúc; denominator số lượt đã chấm xong. Question rows có vị trí câu/frozen scope, đúng/sai/chưa trả lời; bars có nhãn số và legend rõ.
- Option-level multiple choice ghi “Lượt lựa chọn”, tổng có thể vượt số bài; không pie chart giả tất cả options là partition.
- Zero completed có empty state, không NaN/0% giả. Không invented difficulty, response time hoặc average fields.
- Table/chi tiết câu có loading/refresh/error; mobile chart label không cắt, cards và cuộn bảng trong vùng riêng.

EP-31 — Metrics /admin/metrics
- “Cập nhật lúc...” snapshot, nhóm Business/HTTP/Processing.
- Fields: activeCandidates, submitted/completed/failed, HTTP requests/second, HTTP p95 milliseconds, queueDepth, oldestJobSeconds. Labels dễ hiểu, units rõ.
- Thiết kế KPI cards có trọng lượng tương đương, chọn một trọng tâm; không chart lịch sử từ snapshot đơn. State missing data ghi “Chưa có dữ liệu”, không 0.
- Không thêm p99/CPU/RDS/Redis/cost hoặc chi phí AWS khi không có nguồn. Không suy uptime/SLO đã đạt chỉ từ screenshot.
- Refresh/lần tải cuối/stale/error; mobile sắp xếp theo nhóm, card không lấn controls.

EP-32 — Nhật ký audit /admin/audit
- Table thời điểm, actor dạng mã, action, resource, outcome; tải thêm và refresh. Không PII của người dùng hoặc công cụ xem secrets.
- Row mở detail drawer: reason, correlationId, changedFields và metadata an toàn. Nút sao chép rõ ràng cho correlationId.
- Read-only: không sửa/xóa log, SQL/raw payload/answers/token hoặc controls chỉ để lấp chỗ.
- Desktop drawer khoảng 400–480px bên phải, background page vẫn nhận diện; mobile drawer toàn chiều rộng với một header và nút đóng dễ tìm.
- Empty/loading/error/permission denied; field dài wrap/contained scroll, không tràn body.

Đầu ra: 4 page desktop/mobile, replay confirm và audit drawer mở có frame thật. EP-29–32 — [tên] — V3; state critical riêng, handoff ngoài product. Báo danh sách tên/ID các frame và điểm còn thiếu; không báo hoàn tất nếu chỉ có text spec.
```
