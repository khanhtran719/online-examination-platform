# Prompt 02B — Bổ sung states theo nhóm nhỏ

Gửi sau khi review [bốn dialog](02a-catalog-profile-dialogs.md). Mỗi khối bên dưới là một prompt độc lập, gửi lần lượt, kiểm tra frame rồi mới gửi khối kế. Không gửi lại [refinement đầy đủ](02-catalog-profile-refinement.md), vì sáu Normal V4 đã được chọn. Trạng thái tạo/review thực tế được ghi ở đoạn tiếp theo; không suy ra toàn bộ frames đã có từ việc chuẩn bị prompt.

[Bốn dialog đã được review](../stitch-dialog-review-2026-10-08.md) và được người dùng chọn làm template. Ngày 2026-10-08, [review 02B](../stitch-02b-review-2026-10-08.md) xác minh **7/7 states EP-08 mobile có thật**, sau đó người dùng chọn cả bảy làm template. EP-09/10 mobile và desktop chưa có states mới. **Theo ưu tiên mới, tạm hoãn các khối 02B còn thiếu để làm đủ các trang desktop trước: [03A](03a-results-desktop.md), rồi [03B](03b-history-ranking-desktop.md).** Các prompt bên dưới giữ làm backlog; không gửi lại khối 1 để tạo trùng. Nguồn Start confirmation: desktop `18c214c1cc6d40f987cd3b71e2b04cb3`, mobile `294c18aa1dc1432bbdb8cc882de54bdb`. Nguồn Profile conflict: desktop `03de693b67424fddb8e902207dc0315c`, mobile `0c2c28b743a1452f9a9f1dacc769c9d6`. Các findings DLG/02B vẫn mở; không coi trạng thái nhìn đúng là tương tác đã được nghiệm thu.

## 1. Danh sách đề — states mobile

```text
Trong dự án “ExamPlatform UI Design”, ID 18257628123124303955, giữ toàn bộ Normal V4 và các dialog đã có. Chỉ bổ sung states MOBILE của EP-08, dựa trên “EP-08 — Danh sách đề — V4 — Mobile — Normal”, ID a8f1d91a47684aae84dee5d66222eef3. Không tạo lại Normal hoặc page khác.

Bám hình thức V4: Cobalt #315CF4, Apricot #FFB36B, canvas #F3F6FC, card trắng bo 20–24px, Be Vietnam Pro. Canvas 390px, không tràn ở 360px, vùng chạm 44px. Title dài wrap, CTA đồng nhất. Một frame chỉ có một state hợp lý; không thêm bảng mô phỏng/handoff/mã EP vào page. Không thêm global search/sort/bookmark/AI/chứng chỉ/tổng số đề.

Tạo đúng bảy frame, tên theo “EP-08 — Danh sách đề — V4 — Mobile — [State]”:
1) Loading: skeleton card giữ geometry; header và bộ lọc vẫn có ngữ cảnh, không hiển thị danh sách rỗng giả.
2) Empty category: danh mục đã chọn, “Chưa có đề trong danh mục này”, CTA “Xóa bộ lọc”.
3) Search no match: input có truy vấn, “Chưa tìm thấy đề phù hợp trong các đề đã tải”, CTA “Xóa tìm kiếm”. Không nói toàn hệ thống không có đề.
4) Error: thông báo tải danh sách thất bại và “Thử lại”, không cùng lúc hiện empty hoặc loading.
5) Load more pending: giữ các card đã tải, nút cuối danh sách “Đang tải…”, ngăn click lặp. Không ghi tổng 24/còn bao nhiêu đề.
6) Load more error: giữ danh sách, alert ngắn tại cuối và “Thử tải thêm”.
7) Filter sheet: page nền/backdrop, title “Lọc theo danh mục”, lựa chọn Tất cả/TOEIC/IELTS/CNTT/Đại học/Tuyển dụng/Nội bộ; “Xóa bộ lọc”, “Áp dụng”, close. Có một lựa chọn đang chọn; chips/page chỉ đổi sau Áp dụng. Không thêm bộ lọc chưa có chức năng.

Search ghi đúng phạm vi “Tìm trong các đề đã tải”. Counts nếu dùng chỉ là số đã tải, không tổng. Card giữ duration/count/schedule/policy/CTA, không thêm mô tả hoặc capabilities để lấp khoảng trống. Bottom nav không che nội dung; sheet trên cùng, không chồng CTA của page lên footer sheet.

Trả tên/ID/state của các frame thực sự tạo và phần còn thiếu. Chỉ MOBILE ở lượt này; desktop sẽ làm sau, không tự regenerate cả bộ.
```

## 2. Chi tiết đề — states mobile

```text
Trong dự án “ExamPlatform UI Design”, ID 18257628123124303955, chỉ tạo states MOBILE của EP-09. Dùng Normal V4 mobile ID e01b2d07979b4378aeebb98c1d7005d2 và dialog “EP-09 — Chi tiết đề — V4 — Mobile — Start confirmation”, ID 294c18aa1dc1432bbdb8cc882de54bdb, làm nguồn. Nếu chưa tìm được dialog, báo thiếu, không dùng Normal để giả làm dialog. Giữ toàn bộ page/frame hiện có.

Bám palette/card/typography V4: Cobalt #315CF4, Apricot #FFB36B, canvas #F3F6FC, trắng, radius 20–24px, Be Vietnam Pro. Mobile 390px, không tràn ở 360px, vùng chạm 44px, title dài wrap. Giữ cùng đề/version/65 câu/130 phút/1000 điểm và schedule của nguồn. Không thêm chart/AI/chứng chỉ/preview questions. Một frame chỉ có một state.

Tạo đúng bảy frame, tên “EP-09 — Chi tiết đề — V4 — Mobile — [State]”:
1) Resume: có lượt đang làm hợp lệ, primary “Tiếp tục làm bài”; helper cho biết tiếp tục cùng lượt, không tiêu thụ một lượt mới. Không dựng thời gian còn lại nếu chưa có nguồn.
2) Not open: lịch mở rõ kèm GMT+7, notice “Đề thi chưa mở”; không có CTA bắt đầu enabled. Secondary về danh sách.
3) Closed: giờ đóng rõ kèm GMT+7, “Đề thi đã đóng”, CTA về danh sách.
4) Attempt limit: “Bạn đã đạt giới hạn lượt thi của đề này” sau khi hệ thống xác nhận; CTA “Xem lịch sử thi” và về danh sách. Không bán/thêm lượt.
5) Start pending: dialog đang mở trên page nền, checkbox đã tick, CTA “Đang bắt đầu…”, ngăn gửi lặp. Không hiển thị đã bắt đầu hoặc lỗi cùng lúc.
6) Start error: dialog giữ nội dung, alert “Chưa bắt đầu được lượt thi. Vui lòng thử lại”, “Thử lại” và “Quay lại” cho lỗi xác định có thể retry. Không dùng copy này cho kết quả mất kết nối chưa rõ.
7) Start unconfirmed: dialog/page có “Chưa xác nhận được lượt thi. Thử lại để kiểm tra cùng yêu cầu.” Giữ lựa chọn và thông tin đã gửi; retry cùng yêu cầu, không tạo lượt mới. Đóng dialog không đồng nghĩa hủy lượt, page vẫn có trạng thái chưa xác nhận.

Các state eligibility là riêng biệt, không gom bốn banner vào một page. Summary vẫn đủ tên/version, duration, points, giới hạn lượt, schedule/timezone. Giữ lời nhắc vào muộn có thể ít thời gian; không hứa pause deadline hoặc trả lại lượt. Chỉ báo bắt đầu sau xác nhận của hệ thống. Sticky CTA/dialog footer không che nội dung.

Nếu hỗ trợ prototype, nối từ nguồn tới states tương ứng; không tạo phòng thi/lịch sử mới. Trả danh sách tên/ID/state thực tế và mục thiếu. Chỉ MOBILE ở lượt này.
```

## 3. Hồ sơ — states mobile

```text
Trong dự án “ExamPlatform UI Design”, ID 18257628123124303955, chỉ bổ sung states MOBILE của EP-10 từ Normal V4 mobile ID 81b4051100354c12b2b15363cb77b0d6. Giữ Normal, Profile conflict mobile ID 0c2c28b743a1452f9a9f1dacc769c9d6 và mọi page khác. Không tạo lại conflict ở lượt này.

Bám palette V4 Cobalt #315CF4/Apricot #FFB36B/canvas #F3F6FC/card trắng, Be Vietnam Pro, radius 20–24px. Mobile 390px, không tràn ở 360px, touch 44px, email/tên dài wrap. Không thêm thống kê, Pro, certificate, sửa email/password/role hoặc upload avatar. Mỗi frame chỉ có một state; phản hồi đặt sát form/CTA, không thêm bảng mô phỏng.

Tạo đúng bảy frame, tên “EP-10 — Hồ sơ — V4 — Mobile — [State]”:
1) Edited: tên đã sửa, switch “Tham gia bảng xếp hạng” bật, CTA “Lưu thay đổi” enabled, secondary “Hủy thay đổi”. Helper bí danh/kết quả tốt nhất như nguồn, giới hạn tên 1–80. Không có success trước khi lưu.
2) Saving: giữ đúng nội dung đang gửi, CTA “Đang lưu…”, ngăn gửi lặp; không cùng lúc cho phép thao tác ghi đè hoặc hủy như đã hoàn tất.
3) Saved: sau xác nhận, inline “Đã lưu thay đổi”; form phản ánh bản đã lưu, nút lưu disabled khi không có chỉnh sửa mới.
4) Save error: lỗi xác định “Chưa lưu được thay đổi”, giữ input, CTA retry phù hợp, không báo đã lưu.
5) Name validation error: field tên chỉ có khoảng trắng, error “Tên hiển thị từ 1 đến 80 ký tự”; CTA lưu disabled. Không thêm error switch hoặc lỗi mạng vào cùng frame. Layout cũng cần chịu được tên dài khi triển khai.
6) Save unconfirmed: “Chưa xác nhận được thay đổi”, CTA “Thử lại”; giữ bản đã gửi và không gửi nội dung mới trong lúc chưa rõ kết quả. Không nói thay đổi đã bị hủy hoặc đã lưu.
7) Unsaved exit confirmation: page edited làm nền, dialog “Bạn có thay đổi chưa lưu”; “Ở lại chỉnh sửa” và “Bỏ thay đổi và đăng xuất”. Copy giải thích mất phần sửa chưa lưu; không nói đăng xuất tạm dừng thi. Dialog/sheet có close, không che CTA bởi bottom nav.

Normal đã có nút lưu disabled nên không tạo lại. Hủy thay đổi chỉ khôi phục bản đã xác nhận, không silent refetch xóa draft. Sau conflict giữ local draft và cho lựa chọn có xác nhận theo dialog đã có. Nếu prototype nối được edited→saving→saved/error/conflict thì dùng nguồn hiện có; không tạo page đích ngoài phạm vi.

Trả tên/ID/state các frame thực sự tạo và mục thiếu. Chỉ MOBILE ở lượt này.
```

## 4. Đối ứng desktop — gửi từng page một

Sau khi review nhóm mobile, dùng khối này **ba lượt**, thay `[PAGE]` bằng `EP-08`, rồi `EP-09`, rồi `EP-10`. Đây là việc chuyển các states đã review sang desktop, không phải sinh lại Normal. Chỉ yêu cầu states mobile đã thực sự có và đã được review; nếu có frame thiếu, Stitch cần báo thiếu.

```text
Trong dự án “ExamPlatform UI Design”, ID 18257628123124303955, chỉ tạo các bản DESKTOP 1280px đối ứng những state MOBILE V4 đã review của [PAGE]. Giữ toàn bộ Normal và dialog đã tạo. Đọc các state mobile có thật trước, không tạo trạng thái mới theo phỏng đoán.

Nguồn Normal desktop theo page được chọn:
EP-08 — Danh sách đề: 801fc02aa8bd4586b0b1ee821d5fd009
EP-09 — Chi tiết đề: d709369eada140eca5083cb1e8b40865
EP-10 — Hồ sơ: 4d096315e9994045b67307d0530f5ea4

Chỉ dùng nguồn của [PAGE]. Bám nội dung/state/actions đã review trên mobile; reflow theo desktop V4, không phóng to ảnh mobile. Card/form/tables/dialog giữ hierarchy, text dài wrap, CTA rõ, khoảng cách và palette đồng bộ. Loading/empty/error không trộn với nhau. Dialog có page nền/backdrop; email, tên, thời gian và policy đủ đọc. Giữ counts/schedule/points thống nhất với mobile. Không thêm capabilities, total, bảng mô phỏng hoặc mã designer vào product.

Đặt tên “EP-xx — [tên page] — V4 — Desktop — [State]” tương ứng state mobile. Filter sheet mobile có thể chuyển thành desktop filter popover hợp lý, cùng lựa chọn danh mục và action áp dụng/xóa; không thêm bộ lọc mới. Start confirmation/Profile conflict desktop đã có thì giữ nguyên, không tạo bản trùng.

Trả bảng tên/ID/state mobile nguồn → tên/ID desktop mới và nêu state chưa có nguồn để đối chiếu. Chỉ xử lý [PAGE] trong lượt này.
```
