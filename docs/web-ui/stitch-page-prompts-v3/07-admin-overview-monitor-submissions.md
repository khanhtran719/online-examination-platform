# Prompt 07 — Admin overview, monitor index, exam monitor, submissions

```text
Trong “ExamPlatform UI Design”, ID 18257628123124303955, tạo nhóm 4 page vận hành Admin theo Dashboard desktop V2 ID 927f2e0d87ce4f89be5d55c3cb81606b và mobile V3 ID 57c1dac4924d4d13b45d655c41dfc81c. Cùng Admin shell đã có; không thay các template cũ.

Canvas #F3F6FC / card trắng, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540, muted #58627A; Be Vietnam Pro/JetBrains Mono chọn lọc; radius 20–24px, gutter 16–24px, shadow nhẹ. Desktop 1280px / mobile 390px, rail trắng và menu cấp 2 có nhãn, logo tạm phiếu thi đính kèm. Prototype dữ liệu mẫu, không giả dữ liệu live.

EP-25 — Tổng quan Admin /admin
- Greeting/title ngoài card; các chỉ số snapshot Đang làm, Đã nộp, Hoàn tất, Thất bại; “Cập nhật lúc...” và trạng thái dữ liệu rõ.
- Bento ưu tiên hành động: quản lý đề, giám sát kỳ thi, xem bài nộp, ngân hàng câu hỏi/import. Illustration giấy 2.5D nhỏ hỗ trợ một card, không xuất hiện mọi nơi.
- Không chart tăng trưởng, doanh thu, chi phí AWS, học viên online hoặc lịch sử số liệu chưa có. Không biến một snapshot thành đồ thị trend giả.
- Variants zero-data, loading, stale/retry, permission unavailable. Mobile stats 2 cột nếu còn đọc rõ; action cards một cột.

EP-26 — Chọn đề để giám sát /admin/monitor
- Page độc lập với overview, list đề phù hợp cho việc chọn giám sát; tên/category/version/lịch và CTA “Mở giám sát”.
- Nếu dữ liệu không có số lượt active theo từng đề, không tự thêm số đó. Tải thêm, refresh và nhãn phạm vi các đề đã tải.
- Empty/lỗi tải; mobile cards rõ, tên dài không che CTA.

EP-27 — Giám sát một đề /admin/exams/:examId/monitor
- Header/breadcrumb tên đề, version/ngữ cảnh, lần tải gần nhất, refresh. Table candidateId dạng mã, attemptId, lifecycle/status, bắt đầu, deadline và action xem lượt theo quyền.
- Nhãn “Đang làm bài” là trạng thái bài, không suy ra người đó đang online. Không chấm xanh live presence, webcam/IP/location/device/tab violations hoặc force-submit/impersonate.
- Có visible-scope note nếu chỉ tải một phần; polling/loading minh họa tinh tế, stale không làm dữ liệu hiện có biến mất.
- Variants không có lượt phù hợp, có nhiều rows/tên dài, tải thất bại, thiếu quyền. Mobile rows thành cards với deadline rõ.

EP-28 — Danh sách bài nộp /admin/exams/:examId/submissions
- Header tên đề/version filter, refresh. Rows mã thí sinh, mã lượt thi, lifecycle, submittedAt, nhãn nộp khi hết giờ và nullable score. CTA “Xem chi tiết”.
- Điểm chưa có ghi “Chưa có điểm”; không 0 hoặc tự suy gradedfail. Version filter giữ ngữ cảnh; không tổng/số trang giả hoặc server filters chưa có.
- Các trạng thái SUBMITTED/EXPIRED/COMPLETED/FAILED có icon/text và màu nhẹ; không tô mỗi row một màu bão hòa.
- Empty/loading/stale/error/permission denied. Tải thêm cuối bảng; mobile có tên ngữ cảnh, trạng thái và action rõ, table cuộn trong vùng riêng nếu cần.

Đầu ra: 4 page desktop/mobile hoàn chỉnh, tên EP-25–28 — [tên] — V3. Các state variant đủ để review trong frame riêng. Table dense nhưng text vẫn đọc được, action menu không che row; UI trạng thái có text ngoài màu. Không tạo dashboards có stats không có nguồn. Handoff riêng ngoài product. Trả tên/ID các frame đã tạo và phần thiếu.
```
