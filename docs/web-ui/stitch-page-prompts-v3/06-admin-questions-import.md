# Prompt 06 — Question bank/editor và JSON import/report

```text
Trong project “ExamPlatform UI Design”, ID 18257628123124303955, tạo 4 page Admin ngân hàng câu hỏi/import. Chuẩn Dashboard desktop V2 ID 927f2e0d87ce4f89be5d55c3cb81606b và mobile V3 ID 57c1dac4924d4d13b45d655c41dfc81c; dùng cùng Admin shell của nhóm quản lý đề nếu đã có. Giữ nguyên mẫu trước.

Canvas #F3F6FC, card trắng, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540, muted #58627A. Be Vietnam Pro, monospace cho mã/JSON chọn lọc. Card radius 20–24px, shadow nhẹ, spacing 8px; desktop 1280px / mobile 390px. Logo tạm phiếu thi đính kèm; không dùng logo remote. Prototype tiếng Việt với dữ liệu mẫu.

EP-21 — Ngân hàng câu hỏi /admin/questions
- Title, CTA tạo câu, link import, refresh. Table/list prompt preview, loại, điểm, revision, archived; menu sửa/lưu trữ theo quyền.
- Tải thêm, loading, empty, lỗi và thiếu quyền. Lọc trong dữ liệu đã tải ghi rõ phạm vi; không tự thêm global search API.
- Mỗi row vừa đủ nhận ra nội dung câu; không phơi toàn bộ đáp án đúng trong list. Mobile prompt preview và type/points ở card, action menu riêng.

EP-22 — Editor câu hỏi /admin/questions/new và /admin/questions/:questionId/edit
- Form prompt plaintext và explanation plaintext; type select Một lựa chọn/Nhiều lựa chọn/Đúng–Sai; điểm 1–1000.
- Single choice: 2–10 options, một đáp án đúng. Multiple choice: 2–10 options, có thể chọn nhiều đáp án đúng. True/false: đúng 2 options Đúng/Sai, một key.
- Option row có số thứ tự, text, key radio/checkbox đúng loại, Lên/Xuống và xóa. Thêm option khi hợp lệ; states không cho xóa xuống dưới số tối thiểu.
- Counter gần giới hạn: prompt/explanation 8000, option 2000 ký tự; label/validation rõ. Không WYSIWYG, audio, attachments hoặc AI sinh câu ngoài phạm vi.
- Preview Candidate trong tab/drawer riêng, không hiển thị key/explanation khi preview chế độ làm bài. Admin form vẫn quản lý key rõ.
- “Lưu câu hỏi”; Create/Edit cùng family; pending/error/success/conflict giữ draft. Chuyển type làm mất options/keys phải confirmation.
- Archive confirmation nêu thay đổi ngân hàng tương lai, không sửa snapshot đã xuất bản. Mobile form một cột, option controls không đè text.

EP-23 — Nhập câu hỏi /admin/imports/new
- Bước 1 chọn file JSON hoặc paste JSON; giới hạn 1 MiB, schemaVersion 1, tối đa 100 entries; nút tải mẫu tổng hợp hợp lệ. File chọn chưa tự import.
- Bước 2 preview hợp lệ: số entries/type và bảng clientRef, prompt preview, points; data/keys chỉ hiển thị theo quyền quản trị, không dump thừa.
- CTA “Kiểm tra dữ liệu” chạy dry-run về mặt luồng UX. Kết quả có count/valid, issues clientRef/field/message. Dry-run valid phải rõ “Chưa nhập vào ngân hàng”.
- Bước 3 “Nhập câu hỏi” là hành động xác nhận khác, thể hiện pending và sau đó đi report.
- Variants JSON sai cú pháp, file quá lớn, entry thiếu fields, dry-run lỗi, valid chưa commit, timeout cần xác minh kết quả. Không tự retry tạo lô mới hoặc cho nút import nhiều lần như không có hậu quả.
- Chỉ JSON, không CSV/XLSX/ZIP hoặc URL remote. Mobile paste/preview có cuộn nội bộ, không body overflow.

EP-24 — Báo cáo import /admin/imports/:importId
- Summary trạng thái, dry-run hay import thật, committed hay chưa, số câu được nhận, thời điểm và mã lô ngắn.
- Thành công với link ngân hàng; không hợp lệ có bảng issues và “Quay lại sửa dữ liệu”; pending/không xác định có refresh rõ.
- Import thật atomic; không UI “đã nhập một phần” trái luồng. Không lặp lại toàn raw JSON hoặc secret/key trong report nếu không cần.
- Mobile issues dạng cards field/message, dễ quay lại bước nhập.

Đầu ra: 4 page desktop 1280px / mobile 390px; editor đủ 3 type và Create/Edit; import đủ 3 bước và critical variants; archive/type-change/conflict dialogs riêng. Đặt tên EP-21–24 — [tên] — V3. Handoff ngoài product. Liệt kê frame/ID thật, không báo xong nếu thiếu bước hoặc chỉ vẽ empty shell.
```
