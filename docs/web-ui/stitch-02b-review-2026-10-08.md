# Review 02B — Danh sách đề mobile V4 — 2026-10-08

Nguồn: [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955), đối chiếu nhóm 1 của [Prompt 02B](stitch-page-prompts-v3/02b-catalog-profile-states.md), [Normal V4](templates/catalog-profile-v4/README.md) và design spec CA-02. Phạm vi chỉ đọc, tải ảnh và ghi review; không gửi generation/refinement hoặc sửa ứng dụng.

**Quyết định sau review:** người dùng đã chọn cả bảy frame làm template và yêu cầu note lỗi để sửa khi code. Ảnh đã chuyển nguyên bytes vào [bộ template](templates/catalog-profile-v4/README.md), tổng 17 ảnh. Findings 02B-01–05 vẫn mở. Theo ưu tiên mới, làm đủ các trang desktop còn thiếu trước; prompt kế tiếp là [03A — Trạng thái/Kết quả/Xem lại](stitch-page-prompts-v3/03a-results-desktop.md), sau đó [03B — Lịch sử/Xếp hạng](stitch-page-prompts-v3/03b-history-ranking-desktop.md). Các states 02B chưa tạo giữ trong backlog, chưa bắt đầu port frontend.

## Kết luận

**Đã có đủ 7/7 frame Danh sách đề mobile; hướng thị giác đủ tốt để giữ và đi tiếp các trang còn lại.** Card, màu sắc, khoảng cách và CTA bám Normal V4. Các màn rỗng/lỗi có hành động tiếp theo rõ; lỗi tải thêm giữ danh sách đã tải; filter sheet có đủ bảy danh mục, close, xóa và áp dụng. Không cần regenerate cả bộ vì các điểm còn lại.

Hai nhóm cần sửa là cách phân biệt Loading lần đầu với tải thêm, và số đếm chưa đúng phạm vi dữ liệu. Có thể ghi lại để sửa khi code, phù hợp quyết định trước về các lỗi nhỏ. Nội dung/capabilities và branding kế thừa Normal vẫn thuộc checklist mở. Bảy ảnh được lưu làm template theo quyết định sau review, không phải nghiệm thu chức năng.

Lần kiểm tra trước chưa có frame 02B, chat Stitch mới xin xác nhận. Lần này inventory có **47 screen**, tăng đúng bảy; không thêm/xóa ID nào khác và metadata của 40 screen trước không đổi. Kiểm tra metadata không chứng minh nội dung remote của từng screen cũ không đổi; mười ảnh template cục bộ vẫn giữ hash đã lưu.

## Đánh giá từng trạng thái

| Frame | Đánh giá trên ảnh | Điểm cần ghi lại |
| --- | --- | --- |
| Loading | Skeleton giữ cấu trúc card, header/search/chips có ngữ cảnh; không hiển thị empty/error | Footer lại ghi “Đang tải thêm dữ liệu…”; chip “Tất cả (6)” xuất hiện khi tải lần đầu chưa có dữ liệu xác nhận |
| Empty category | Thông báo danh mục Nội bộ rỗng, icon nhẹ, CTA “Xóa bộ lọc”; không trộn lỗi mạng | Header “Đã tải 0 đề” nhưng chip vẫn “Tất cả (6)”; header nêu Nội bộ nhưng chưa thấy chip Nội bộ đang chọn trong phần hàng chips hiển thị |
| Search no match | Có query “Kỹ năng giao tiếp”, giới hạn rõ trong 6 đề đã tải; nút “Xóa tìm kiếm” nổi bật; không khẳng định toàn kho không có kết quả | Helper dài và dùng “bộ nhớ tạm”; rút về “Tìm trong 6 đề đã tải” khi code |
| Error | Thẻ lỗi riêng, icon/chữ đỏ và CTA “Thử lại”; không skeleton/empty cùng lúc | “Tất cả (6)” vẫn còn; copy chỉ mô tả mất kết nối, khi code phải dùng thông báo đúng lỗi thay vì quy mọi thất bại về mạng |
| Load more pending | Giữ đủ sáu card như Normal, phản hồi tại cuối danh sách, nút có spinner/nhãn đang tải | Vẫn có “Hiển thị 6 trên tổng số 24 đề khả dụng”; screenshot không xác minh nút thực sự chặn gửi lặp |
| Load more error | Giữ sáu card; alert và “Thử tải thêm” ở cuối, không thay toàn page bằng lỗi | Cùng dòng tổng 24 sai brief; CTA retry đỏ nên cân nhắc dùng Cobalt, dành đỏ cho icon/border/copy lỗi |
| Filter sheet | Backdrop rõ; một danh mục IELTS đang chọn; nền vẫn là Tất cả; đủ bảy danh mục, close và hai action; footer sheet không chồng nav trong ảnh | Chưa kiểm chứng áp dụng rồi mới đổi page, đóng không áp dụng, scroll/max-height trên màn thấp, safe area và focus |

## Findings còn mở

- [ ] **02B-01 — P2 — Phân biệt Loading lần đầu với tải thêm.** Ảnh Loading có ba skeleton nhưng footer “Đang tải thêm dữ liệu…”, làm người xem hiểu đây là phân trang đang chạy. Bỏ footer tải thêm ở frame này hoặc đổi thành thông báo tải danh sách duy nhất; chỉ Load more pending giữ nút đang tải thêm. Không cần đổi cấu trúc skeleton.
- [ ] **02B-02 — P2 — Số đếm phải theo đúng dữ liệu đã tải.** Load more pending/error vẫn ghi tổng 24, trái prompt và browse contract không cung cấp total. Đổi thành “Đã tải 6 đề” hoặc bỏ dòng lặp. Loading/Error không dựng count; Empty category đã reset sang Nội bộ/0 thì bỏ số 6 trên chip Tất cả, hoặc chỉ rõ nguồn/phạm vi nếu sản phẩm thực sự có count riêng. Ưu tiên chip đơn giản “Tất cả” cho cả bộ để tránh số không đồng bộ.
- [ ] **02B-03 — P3 — Chuẩn hóa chi tiết thị giác khi code.** Retry tải thêm là hành động khôi phục, có thể dùng Cobalt để nhất quán CTA; đỏ dành cho thông báo lỗi. Đưa chip danh mục đang chọn vào vùng nhìn thấy hoặc thêm badge “Nội bộ” rõ ràng; header hiện đã có ngữ cảnh này nên không phải lỗi chặn. Rút helper search dài thành ngôn ngữ quen thuộc. Các biểu tượng cảnh báo/placeholder có cấu trúc tốt, không cần tăng hiệu ứng cho màn lỗi.
- [ ] **02B-04 — Kế thừa CP-V4-05–07, không tính là regression mới.** Hai màn tải thêm vẫn giữ các copy tự thêm từ Normal: Pro, AI, chứng chỉ, video/transcript, gửi HR; card mô tả không có field trong contract, thiếu chuẩn hóa schedule/timezone. Không coi việc lặp lại trong state là chấp nhận capabilities. Theo quyết định trước, xử lý trong code và đối chiếu contract, không đổi phong cách đã chọn.
- [ ] **02B-05 — Kiểm chứng khi triển khai.** Ảnh không xác minh 360px/viewport thấp/text zoom, vùng chạm, chips scroll, focus/keyboard, contrast đo được, reduced motion, retry/backoff, ngăn gửi lặp, giữ cursor/list hay apply/reset filter. Sheet trong export toàn trang 5314px không đủ để kết luận vị trí của sheet trên viewport thật; cần kiểm tra max-height/body scroll/footer/safe area. Không có lỗi tương tác nào được khẳng định chỉ từ màu nút.

## Coverage và bước tiếp theo

| Nhóm 02B | Frame mới có thật | Review này |
| --- | --- | --- |
| EP-08 mobile | 7/7 | Đã xem đủ ảnh, findings trên |
| EP-09 mobile | 0/7 | Chưa có Resume/Not open/Closed/Attempt limit/Start pending/error/unconfirmed mới |
| EP-10 mobile | 0/7 | Chưa có Edited/Saving/Saved/Save error/validation/unconfirmed/exit mới |
| Desktop đối ứng | 0/21 | Chưa tạo; làm từng page sau review mobile |

Bốn dialog 02A là mẫu đã chọn riêng, không được tính thay cho 14 state mobile còn thiếu. Đề xuất lúc review là tiếp tục Chi tiết đề/Hồ sơ mobile; **ưu tiên mới của người dùng thay đổi thứ tự này sang các page desktop trong 03A/03B trước**. Những states còn thiếu vẫn chưa tạo, không được đóng checklist. Các page-family count giữ nguyên: 33 tổng, 10 có template, 23 mới có prompt; bảy frame state không tăng số page-family.

## Bằng chứng và validation

[Bảy PNG gốc/IDs](evidence/stitch-02b-review-2026-10-08/README.md), [manifest/SHA-256](evidence/stitch-02b-review-2026-10-08/manifest.json), [inventory 47 screen](evidence/stitch-02b-review-2026-10-08/inventory.json). Đã xem toàn bộ bảy ảnh và crop nguyên tỷ lệ các footer/sheet; đối chiếu Normal. Kiểm tra kích thước/hash bảy PNG, hash mười template đã chọn, JSON/coverage/links và `git diff --check`. Không chạy test ứng dụng vì không sửa source. Review ảnh tĩnh, chưa nghiệm thu responsive thật, click/network/persistence, motion hoặc accessibility.
