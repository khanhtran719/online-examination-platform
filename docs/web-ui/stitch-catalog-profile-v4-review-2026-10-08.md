# Review Catalog/Profile V4 — 2026-10-08

Dự án [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955). Review sáu screen V4 mới của Danh sách đề, Chi tiết đề và Hồ sơ, đối chiếu [V3](stitch-catalog-profile-review-2026-10-08.md), [prompt refinement](stitch-page-prompts-v3/02-catalog-profile-refinement.md) và [design spec](design-spec.md) CA-02/03/10. Chỉ đọc Stitch, lưu bằng chứng và ghi review; không sửa ứng dụng, không gửi lệnh tạo/chỉnh thiết kế.

**Quyết định sau review:** người dùng đồng ý theo đề xuất, giữ sáu Normal làm [template Catalog/Profile V4](templates/catalog-profile-v4/README.md). Các findings CP-V4-01–07 vẫn mở trong [checklist triển khai](templates/catalog-profile-v4/implementation-notes.md). Chuẩn bị prompt bổ sung riêng dialog/states; chưa gửi lên Stitch và chưa nghiệm thu interactions/capabilities từ việc chọn hình thức thiết kế.

## Kết luận

**V4 cải thiện rõ một số vấn đề của V3, nhất là Hồ sơ. Đề xuất giữ hướng để tham khảo, nhưng chưa đủ UI của các luồng thao tác.** Sáu frame mới đều được đặt tên Normal. Inventory hiện có 36 screen, tăng sáu so với lần review V3; không có frame riêng Start confirmation, Profile conflict hay các state bổ sung của nhóm này. Số màn chính đã đủ; yêu cầu dialog/state trong nhóm B/C của prompt vẫn chưa có bằng chứng để review.

Các sửa đổi tốt thấy trên ảnh: switch Hồ sơ desktop/mobile cùng nghĩa “Tham gia bảng xếp hạng”, mặc định tắt và giải thích bí danh; tên hiển thị dùng /80; nút lưu disabled khi chưa có thay đổi; search Danh sách đề được mở rộng và ghi đúng phạm vi đã tải; CTA các card đồng nhất; Chi tiết đề dùng giới hạn lượt thay số lượt còn lại, có điểm từng phần và version mobile. Ảnh PSI/Pearson VUE đã được bỏ.

Điểm mới cần chú ý: desktop cả ba page chuyển sang sidebar rộng có nhãn chữ thay rail viên nang mảnh của Dashboard V2. Shell trong batch nhất quán với nhau nhưng chưa khớp baseline đã chọn. Một số text quan trọng vẫn bị cắt; metadata và dữ liệu minh họa chưa nhất quán. 2.5D chủ yếu là shadow và icon giấy/bút nhỏ, chưa tạo chiều sâu nổi bật như mong muốn.

## Review từng page

| Page | Đã cải thiện | Còn cần xử lý |
| --- | --- | --- |
| EP-08 — Danh sách đề | Search desktop rộng, có phạm vi đã tải; title dài wrap; tất cả card desktop/mobile có CTA rộng cùng cách trình bày; bỏ bookmark; metadata và policy dễ quét | Mobile vẫn ghi tổng 24 đề không có nguồn; chưa có frame filter sheet/loading/empty/error/load-more pending; card có hạn đóng nhưng thiếu lịch mở và múi giờ; bộ dữ liệu giữa desktop/mobile khác nhau |
| EP-09 — Chi tiết đề | Giới hạn 3 lượt và helper kiểm tra khi bắt đầu đúng hơn; điểm từng phần đã có, tổng 65 câu/1000 điểm khớp bốn phần; mobile title đề đầy đủ, section gọn; có notice vào muộn | Tên phần desktop còn ellipsis; lịch mở chưa rõ, timezone mobile thiếu; mobile không thấy link leaderboard; chưa có start dialog/pending/error/unconfirmed/resume/eligibility states |
| EP-10 — Hồ sơ | Switch opt-in đúng trên cả hai viewport; /80; bỏ khối average/Top5%; normal CTA lưu disabled; mobile email đầy đủ; thêm link lịch sử; bỏ cảnh báo đăng xuất tạm dừng thi trên mobile | Email desktop bị cắt; vẫn có badge tổng 12 bài trên mobile; chưa có edited/saving/success/error/unconfirmed/conflict/exit confirmation; có mã EP/V4/khóa phiên và nội dung chứng chỉ trong sản phẩm |

## Đối chiếu findings V3

Các trạng thái dưới đây chỉ nói về thiết kế trong ảnh, không phải xác nhận code hoặc tương tác đã chạy đúng.

| Finding V3 | Kết quả V4 |
| --- | --- |
| CP-01 — Ý nghĩa switch Hồ sơ | **Đã sửa trên ảnh**: hai viewport dùng “Tham gia bảng xếp hạng”, helper bí danh và switch tắt |
| CP-02 — Start dialog và eligibility | **Chưa có frame riêng để review** |
| CP-03 — Save/conflict Hồ sơ | **Một phần**: normal chưa sửa có nút lưu disabled; các trạng thái thao tác/conflict vẫn thiếu |
| CP-04 — Browse states/card | **Một phần**: cấu trúc card/CTA tốt hơn; states và filter sheet vẫn thiếu |
| CP-05 — Nguồn dữ liệu/capabilities | **Một phần**: giới hạn lượt đúng hơn, bỏ average/Top5%; vẫn có tổng 24 đề, 12 bài và capabilities tự thêm |
| CP-06 — Long text/CTA/navigation | **Một phần**: search/title/card CTA tốt hơn; email desktop/tên phần bị cắt; shell desktop đổi hướng |
| CP-07 — Points/version/name/schedule | **Một phần**: points/version mobile và /80 đã có; lịch mở/múi giờ chưa đầy đủ |
| CP-08 — Nội dung hành vi | **Một phần**: bỏ copy đăng xuất tạm dừng trên mobile; vẫn có các lời hứa lưu và rule nhiều lựa chọn không đúng spec |
| CP-09 — Depth/branding | **Một phần**: bỏ ảnh vendor, có icon giấy/bút nhỏ; chiều sâu còn nhẹ, mobile detail vẫn thiếu dấu title, mã designer còn trong UI |

## Findings V4 còn mở

1. **CP-V4-01 — P1 — Chưa đủ frame của các luồng thiết yếu.** Chưa thấy bốn frame Start confirmation/Profile conflict desktop/mobile trong inventory. Cũng chưa thấy variants tải/rỗng/lỗi/lọc của list, eligibility/resume/start pending-error-unconfirmed của detail, edited/save feedback/validation/unconfirmed/exit confirmation của profile. Normal không cần hiển thị các lỗi này cùng lúc; phải bổ sung frame state thật thay vì dồn chúng vào trang. Inventory không chứng minh modal không tồn tại trong bất kỳ HTML/prototype nào, nhưng chưa có bằng chứng hình ảnh để review.
2. **CP-V4-02 — P2 — Shell desktop lệch baseline.** Sidebar rộng, active hàng Cobalt và nhãn chữ thay rail mảnh/active tròn ink của Dashboard V2. Header còn “Máy chủ: Ổn định (24ms)”, “Proctor AI Active” và “V4 ENTERPRISE”. Khi chốt/port, dùng một Candidate shell chung. Các badge kỹ thuật hoặc capabilities không có nguồn phải bỏ khỏi product header. Không cần regenerate sáu Normal chỉ để sửa branding nhỏ.
3. **CP-V4-03 — P2 — Nội dung quan trọng vẫn ellipsis.** Bốn tên phần trên detail desktop bị cắt dù prompt yêu cầu đầy đủ; email profile desktop hiện `lan.nguyen@example.c...`. Cho wrap hoặc dàn lại cột. Mobile list title và tên phần detail dễ đọc hơn; không cần áp lại lỗi cắt từ desktop vào mobile.
4. **CP-V4-04 — P2 — Schedule và navigation chưa đầy đủ.** List chủ yếu có hạn đóng; detail desktop ghi “Mở tự do đến…” thay lịch mở cụ thể, mobile chỉ có hạn đóng và chưa có timezone. Thời gian phải phản ánh `openAt`, `closeAt`, `displayTimezone`. Link leaderboard đã có desktop nhưng không thấy trên mobile; cần cả trạng thái bật/tắt theo version. Một screenshot Normal không xác minh được điều kiện hiển thị.
5. **CP-V4-05 — P2 — Dữ liệu minh họa chưa nhất quán.** Footer list mobile vẫn ghi “Hiển thị 6 trên tổng số 24 đề khả dụng”; profile mobile có “12 bài thi”, chưa có nguồn tổng từ API tương ứng. Desktop/mobile list dùng khác bộ đề và metadata: ví dụ desktop TOEIC 120 phút/200 câu, mobile TOEIC 60 phút/100 câu. AWS list desktop đóng 20/11/2024, detail desktop/mobile đóng 15/11/2024. Chỉnh fixture thống nhất; không suy ra tổng từ cursor page. Các mốc 2024 kèm “Đang mở/Còn 2 ngày” phải là fixture có mốc thời gian rõ, không copy làm trạng thái live.
6. **CP-V4-06 — P2 — Copy hành vi/capabilities để sửa khi code.** Detail desktop còn nói nhiều lựa chọn có ghi số đáp án cần chọn; detail mobile nói lưu ngay khi tick và giữ tiến trình cục bộ khi offline; profile desktop nói tất cả dữ liệu tạm đã lưu trên server. UI chỉ được báo lưu sau ACK, không bảo đảm mọi draft đã bền vững. Video/transcript lời giải, gửi HR, chứng chỉ, AI proctor, Enterprise/Pro và điểm chuẩn chính thức vẫn là phần Stitch tự thêm. Theo yêu cầu trước, ghi riêng cho giai đoạn nội dung/implementation; không xem chúng là chức năng đã được duyệt.
7. **CP-V4-07 — P3 — Độ nổi và chi tiết thị giác hoãn lúc code.** List desktop có giấy/bút nhỏ nhưng còn gần icon phẳng; mobile chủ yếu là card/shadow. Có thể tăng layering/contact shadow của một illustration, giữ form ổn định. Mobile detail vẫn ghi “Chi Tiet De Thi”; profile có EP-10, khóa phiên và “Quy chuẩn dữ liệu V4”. Chuẩn hóa typography/mark, bỏ metadata designer khỏi product. Chưa kiểm chứng motion, focus, kích thước vùng chạm hoặc contrast được đo.

## Đề xuất bước tiếp theo

Giữ V4 làm hướng tham khảo tốt hơn cho card/form. Ưu tiên [bốn frame Start confirmation/Profile conflict](stitch-page-prompts-v3/02a-catalog-profile-dialogs.md), rồi [states theo nhóm nhỏ](stitch-page-prompts-v3/02b-catalog-profile-states.md), tránh chạy lại toàn bộ sáu Normal. Việc chuẩn hóa shell, logo, text wrap và copy được ghi để xử lý khi code theo quyết định hiện hành. Các ảnh đã chọn được lưu nguyên bản; bộ dialog/state vẫn cần tạo và review riêng.

## Bằng chứng và giới hạn

[Sáu screenshot gốc và IDs](evidence/stitch-catalog-profile-v4-review-2026-10-08/README.md), [manifest/hash](evidence/stitch-catalog-profile-v4-review-2026-10-08/manifest.json), [inventory 36 screen](evidence/stitch-catalog-profile-v4-review-2026-10-08/inventory.json). Đã xem đủ sáu PNG và crop kiểm tra list mobile, xác minh dimensions/SHA-256, liên kết tài liệu và cập nhật registry trỏ review V4 trong khi giữ link review V3. Không chạy test ứng dụng vì không đổi source.

Review từ ảnh tĩnh; chưa xác minh click, focus/keyboard, responsive thực, điều kiện dữ liệu, sticky behavior hoặc animation. Nút/switch nhìn đúng không xác nhận backend và tương tác đã đúng.
