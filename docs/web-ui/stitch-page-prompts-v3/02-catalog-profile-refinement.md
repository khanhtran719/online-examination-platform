# Prompt điều chỉnh Catalog/Profile sau review — 2026-10-08

Dán nguyên khối dưới vào chat của [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955). Prompt nhắm sáu màn EP-08–10 đã review; tạo bản chỉnh V4 để so sánh với V3. Chỉ chuẩn bị prompt, chưa gửi lên Stitch và chưa sửa ứng dụng. [Review nguồn](../stitch-catalog-profile-review-2026-10-08.md).

**Trạng thái tiếp theo:** sáu Normal V4 đã được người dùng tạo, review và chọn làm [template](../templates/catalog-profile-v4/README.md). Giữ prompt này làm lịch sử brief; không gửi lại toàn bộ. Dùng [02A — Bốn dialog](02a-catalog-profile-dialogs.md), rồi [02B — States](02b-catalog-profile-states.md) để bổ sung phần thiếu.

```text
Trong dự án “ExamPlatform UI Design”, ID 18257628123124303955, hãy điều chỉnh đúng 3 page hiện có: Danh sách đề, Chi tiết đề và Hồ sơ, gồm bản desktop/mobile của từng page.

Đây là refinement của thiết kế hiện có. Giữ hướng thị giác V3 và tạo bản chỉnh V4 để so sánh. Giữ nguyên các frame V3 nguồn và các page Home, Dashboard, Exam room, Auth. Không tạo dự án mới. Chỉ tạo những page/dialog/state thuộc ba page được chỉ định dưới đây.

1. XÁC ĐỊNH ĐÚNG CÁC FRAME NGUỒN

EP-08 — Danh sách đề — V3 — Desktop
ID: 865b476df5f244d0aa900a600c63904b
EP-08 — Danh sách đề — V3 — Mobile
ID: 3537e804e5914137bcd90abb5aa1fe65

EP-09 — Chi tiết đề — V3 — Desktop
ID: 7ff70086394f4098bdd2db7f861895e5
EP-09 — Chi tiết đề — V3 — Mobile
ID: 72f4be0283b24508ac3815790e63eee2

EP-10 — Hồ sơ — V3 — Desktop
ID: c7dd0bb481c54fe2ab92ee0b9ca1032d
EP-10 — Hồ sơ — V3 — Mobile
ID: a01a65a69dcd4e7db2e54e7f7651336b

Đọc các frame này trước khi điều chỉnh. Nếu công cụ không resolve ID, tìm theo đúng tên trong dự án; báo rõ nếu vẫn không tìm được thay vì dùng page khác làm nguồn.

Tham chiếu sự nhất quán: Dashboard desktop V2 ID 927f2e0d87ce4f89be5d55c3cb81606b và Dashboard mobile V3 ID 57c1dac4924d4d13b45d655c41dfc81c.

2. MỤC TIÊU VÀ HƯỚNG THỊ GIÁC

Giữ cảm giác sáng, tích cực, có năng lượng học tập: canvas xanh rất nhạt, card trắng, rail viên nang, Cobalt làm hành động chính, Apricot làm điểm nhấn. Nâng độ chỉn chu và chiều sâu bằng spacing, typography, phân lớp và micro-interaction. Không đổi sang một phong cách mới.

Tokens dùng nhất quán:
- Canvas #F3F6FC; surface #FFFFFF; tint #E8EEFF.
- Primary Cobalt #315CF4; accent Apricot #FFB36B.
- Text chính #1B2540; text phụ #58627A.
- Card radius 20–24px; khoảng cách giữa khối 16–24px; shadow nhẹ, có contact shadow rõ ở illustration.
- Be Vietnam Pro cho heading/body; JetBrains Mono chỉ cho mã, giờ và số liệu cần phân biệt. Body khoảng 16px, helper khoảng 14px. H1 desktop 30–34px, mobile 26–28px; hierarchy nhất quán giữa các page.
- Desktop canvas 1280px; mobile 390px. Dàn lại bố cục cho mobile, kiểm tra không tràn ngang khi thu còn 360px.

Điểm nhấn 2.5D: dùng một cụm giấy thi xếp lớp, góc giấy gấp Apricot và bút Cobalt, phối cảnh nhẹ, ánh sáng cùng một hướng. Desktop đặt nhỏ ở phần mở đầu; mobile giản lược để không đẩy nội dung chính xuống quá xa. Card nội dung vẫn ổn định và dễ đọc. Không dùng ảnh chứng nhận/PSI/Pearson VUE làm illustration. Không thêm decoration vào mọi card.

Nếu hỗ trợ prototype/motion: hover card nâng khoảng 2px trong 160–200ms; button có phản hồi hover/pressed; dialog xuất hiện nhẹ trong 180–220ms. Illustration có thể floating biên độ 3–5px trong 5–7s, không làm chữ hoặc controls di chuyển. Respect reduced motion. Nếu chỉ tạo ảnh tĩnh, thể hiện chiều sâu bằng hình khối và ghi thông số motion ở handoff riêng, không tuyên bố ảnh đã có animation hoạt động.

3. CHUẨN HÓA SHELL VÀ KHẢ NĂNG ĐỌC

- Desktop dùng rail trắng như mẫu, active icon rõ cho Đề thi hoặc Hồ sơ. Header gọn với tên trang và menu tài khoản.
- Mobile chỉ có một header. Tên trang có dấu: “Danh sách đề”, “Chi tiết đề”, “Hồ sơ”. Dùng một logo phiếu thi nhất quán; có thể sử dụng asset tạm đính kèm. Logo chưa hoàn hảo không được làm chậm refinement chính.
- Danh sách đề/Hồ sơ có bottom nav Tổng quan, Đề thi, Lịch sử, Hồ sơ; icon, nhãn và vùng chạm đồng đều. Chi tiết đề dùng back và thanh CTA cuối trang; tránh hai thanh cố định chồng lên nhau.
- Vùng chạm tối thiểu 44×44px; label rõ, focus visible, disabled vẫn đọc được. Không phân biệt trạng thái chỉ bằng màu.
- Tên đề, tên phần, tên người dùng và email quan trọng được wrap; tránh ellipsis khiến mất thông tin. Dùng dữ liệu dài thật để kiểm tra geometry.
- CTA sticky có vùng đệm tương ứng dưới nội dung và safe area mobile; không che dòng cuối, lỗi hoặc nút trong dialog.
- Tiếng Việt có dấu, sentence case. Bỏ monospace/all-caps cho đoạn giải thích dài.

4. EP-08 — DANH SÁCH ĐỀ /exams

Giữ hero và grid hai cột trên desktop, một cột trên mobile. Nội dung mở đầu ngắn, giúp người dùng chọn đề; illustration là điểm nhấn phụ.

Thanh tìm và lọc:
- Search desktop đủ rộng, khoảng 320px trở lên khi layout cho phép; mobile chiếm chiều ngang khả dụng. Không để placeholder bị ép thành “Tìm th”.
- Search là “Tìm trong các đề đã tải”, có helper ngắn thể hiện đúng phạm vi; không diễn đạt là tìm toàn bộ hệ thống. Nếu giao diện trở nên rối, ưu tiên loại bỏ search thay vì tạo global search giả.
- Category gồm Tất cả, TOEIC, IELTS, CNTT, Đại học, Tuyển dụng, Nội bộ. Active rõ, có cách xóa bộ lọc.
- Mobile giữ hàng chips cuộn ngang trong vùng riêng. Nếu giữ nút “Bộ lọc”, tạo sheet thật: tiêu đề, lựa chọn danh mục, “Xóa bộ lọc”, “Áp dụng”, close. Chỉ có bộ lọc danh mục; không thêm difficulty/sort/status/date filter chưa có chức năng.
- Bỏ badge số lượng ở category và tổng “18/24 đề” khi chưa có nguồn tổng. Nếu cần số lượng, dùng “Đã tải 6 đề” đúng với số card đã tải, không suy ra tổng.

Chuẩn hóa card thành một component duy nhất:
1) Category badge nhỏ.
2) Tên đề đầy đủ, được xuống dòng; không cắt tên để giữ card thấp.
3) Thời lượng và số câu, nhãn/icon gọn.
4) Lịch mở/đóng có ngày giờ dễ đọc; timezone dùng nhất quán.
5) Chính sách xem lời giải bằng một dòng dễ hiểu.
6) CTA “Xem đề” ở cuối card.

Desktop các card trong cùng hàng căn đáy CTA; mobile tất cả dùng cùng CTA toàn chiều ngang, cùng chiều cao. Bỏ bookmark, số người tham gia, audio HD, chấm coding, AI/giám sát và các huy hiệu chứng nhận không thuộc chức năng hiện tại. Không dùng các thông tin phụ đó để lấp khoảng trống.

Cuối danh sách dùng “Tải thêm đề”. Không số trang hoặc “còn 20 đề” giả. Đang tải thêm thì giữ card hiện có, button đổi “Đang tải…”; lỗi tải thêm có retry tại cuối danh sách.

Frame trạng thái cần thể hiện:
- Loading ban đầu: skeleton giữ chiều cao/layout của card và controls.
- Empty category: “Chưa có đề trong danh mục này”, CTA “Xóa bộ lọc”.
- Search không khớp trong dữ liệu đã tải: thông báo đúng phạm vi, CTA “Xóa tìm kiếm”; không kết luận toàn hệ thống không có đề.
- Error ban đầu: thông báo ngắn, “Thử lại”; không render như danh sách rỗng.
- Loading/error khi tải thêm: danh sách đã tải vẫn còn, phản hồi ngay cạnh nút tải thêm.

5. EP-09 — CHI TIẾT ĐỀ /exams/:examId

Desktop giữ cột nội dung rộng và summary bên phải. Mobile đặt summary sớm, sau title/category/version; tiếp theo là cấu trúc, chính sách và hướng dẫn. Thanh CTA cuối trang dễ nhận biết.

Thông tin chính:
- Back “Danh sách đề”, tên đề dài được wrap, danh mục, version rõ trên cả desktop/mobile.
- Thời lượng danh định, tổng số câu, tổng điểm từ dữ liệu các phần, giới hạn số lượt, ngày giờ mở/đóng và múi giờ.
- Thay “Còn 2/3 lượt” bằng “Giới hạn 3 lượt” khi chỉ có giới hạn. Helper: “Số lượt còn lại được kiểm tra khi bắt đầu.” Không dựng quota từ một phần lịch sử.
- Cấu trúc từng phần có tên đầy đủ, số câu và điểm tối đa, căn cột dễ quét. Mobile dùng mỗi phần một card/row; không ép tên và số liệu cùng một dòng.
- Ưu tiên số câu và điểm; bỏ biểu đồ/tỷ trọng trang trí nếu không có nguồn hoặc khiến thông tin khó đọc.
- Chính sách xem đáp án và quy tắc chấm đặt trong vùng riêng, gọn. Không thêm câu hỏi preview trước khi có lượt thi của người dùng.
- Bảng xếp hạng chỉ có link khi được bật cho version hiện tại; không thêm phân tích phổ điểm ở page này.
- Bỏ banner ảnh PSI/Pearson VUE. Giữ tên đề minh họa nếu cần, nhưng không khẳng định chứng nhận, điểm thi chính thức hoặc ngưỡng đạt không thuộc nền tảng.

CTA và eligibility states:
- Có thể bắt đầu: CTA “Bắt đầu làm bài”, mở dialog xác nhận trước khi gửi yêu cầu bắt đầu.
- Có lượt đang làm hợp lệ: CTA “Tiếp tục làm bài”, dẫn về cùng lượt; không tạo lượt mới.
- Chưa mở: ngày giờ mở rõ và CTA quay về danh sách; không có nút bắt đầu có vẻ đang hoạt động.
- Đã đóng: lý do và giờ đóng, CTA quay về danh sách.
- Hết lượt: phản hồi sau khi hệ thống xác nhận, CTA “Xem lịch sử thi” hoặc quay về danh sách; không bán/thêm lượt.
- Thời lượng danh định không đồng nghĩa luôn được đủ thời gian: có notice vào muộn có thể ít thời gian hơn.

START-CONFIRMATION DIALOG — phải tạo frame thật trên desktop và mobile:
- Title “Sẵn sàng bắt đầu?”; tên đề và version; summary thời lượng, giờ đóng, giới hạn lượt.
- Nội dung ngắn có hierarchy: vào muộn có thể ít thời gian; câu nhiều lựa chọn chỉ có điểm khi chọn đúng trọn bộ; lượt được sử dụng sau khi bắt đầu thành công; hết giờ nộp các đáp án đã lưu đúng hạn.
- Checkbox “Tôi đã đọc hướng dẫn”. Chưa tick thì CTA bắt đầu disabled.
- Hai CTA “Quay lại” và “Bắt đầu làm bài”. Có close/cancel trước khi gửi.
- Pending: giữ dialog, CTA đổi “Đang bắt đầu…”, ngăn gửi lặp; không hiện đồng thời thông báo thành công.
- Lỗi xác định: alert trong dialog và hành động retry/quay lại thích hợp.
- Kết quả chưa xác nhận do mất kết nối: “Chưa xác nhận được lượt thi. Thử lại để kiểm tra cùng yêu cầu.” Không khẳng định đã bắt đầu hay chưa tiêu thụ lượt; retry không được tạo logical attempt mới.
- Sau khi bắt đầu được xác nhận, chuyển phòng thi; không có nút “Hủy để lấy lại lượt”.
- Desktop dialog khoảng 520–600px, backdrop, title, body và footer rõ. Mobile dialog/sheet theo chiều ngang khả dụng, scroll trong body nếu dài, CTA vẫn đọc/chạm được. Khi pending/unconfirmed, đóng dialog không đồng nghĩa hủy lượt; trạng thái cần xác nhận vẫn phải được thể hiện trên page.

Nội dung hành vi bắt buộc đúng: không tiết lộ số đáp án đúng và không yêu cầu chọn đủ số lượng trước khi chuyển câu; không hứa nộp mọi draft chưa lưu; deadline không dừng khi offline/đăng xuất.

6. EP-10 — HỒ SƠ /profile

Desktop giữ card tài khoản bên trái và form bên phải; mobile xếp card tài khoản, form, vùng đăng xuất. Giảm khoảng trống dư nhưng giữ nhịp đọc thoáng.

Card tài khoản:
- Avatar/initials, tên hiển thị, email và trạng thái xác thực.
- Email chỉ đọc và có thể đọc đầy đủ; khóa nhỏ đủ để thể hiện không sửa được.
- Bỏ các thẻ tổng số kỳ thi/điểm trung bình/Top 5%/chứng chỉ/role không có nguồn từ hồ sơ. Có thể giữ một link nhẹ “Xem lịch sử thi” để dẫn tới chức năng đã có; không tạo dashboard thống kê mới trong Hồ sơ.

Form:
- “Tên hiển thị”, giới hạn 1–80 ký tự; counter /80 nếu dùng. Label/helper và lỗi sát field. Không ghi /60.
- Switch có cùng label trên desktop/mobile: “Tham gia bảng xếp hạng”. Normal minh họa tài khoản chưa opt-in thì switch tắt.
- Helper: “Khi bật, kết quả tốt nhất của bạn có thể xuất hiện với bí danh trên bảng xếp hạng được mở.” Đây là lựa chọn tham gia, không phải lựa chọn giấu tên thật. Không dùng label “Ẩn danh” hoặc icon con mắt làm sai ý nghĩa.
- CTA “Lưu thay đổi”. Chưa sửa gì thì disabled; đã sửa hợp lệ thì enabled. Secondary “Hủy thay đổi” chỉ khôi phục bản đã xác nhận lưu, không tự lấy dữ liệu mới rồi xóa draft.
- Pending: “Đang lưu…”, ngăn gửi lặp. Success inline sau xác nhận: “Đã lưu thay đổi”. Error form gần CTA, giữ input đang sửa.
- Tên rỗng/quá dài: field error rõ, không dùng banner đỏ cho hướng dẫn bình thường.
- Kết quả lưu chưa xác nhận: giữ đúng bản đã gửi, báo “Chưa xác nhận được thay đổi” và “Thử lại”; không trình bày như đã lưu hoặc yêu cầu gửi một bản nội dung khác.
- Không thêm sửa email/password, phân quyền, upload avatar, subscriptions hoặc huy hiệu.

PROFILE-CONFLICT DIALOG — phải tạo frame thật trên desktop và mobile:
- Title “Hồ sơ đã thay đổi ở nơi khác”; giải thích bản người dùng đang sửa vẫn được giữ.
- Đối chiếu hai vùng: “Bản hiện tại” và “Bản bạn đang sửa”, mỗi vùng có tên hiển thị và trạng thái tham gia bảng xếp hạng. Desktop hai cột, mobile hai khối dọc.
- Action “Dùng bản hiện tại” có lời nhắc thay thế nội dung đang sửa; “Giữ bản của tôi” cần xác nhận áp dụng lại với bản hiện tại. Close quay về form, giữ draft.
- Không tự ghi đè, không tự refetch xóa input, không dùng badge kỹ thuật/revision làm nội dung chính cho người dùng.

Đăng xuất/rời trang:
- Vùng đăng xuất riêng, CTA rõ nhưng không cạnh tranh với nút lưu. Normal state không luôn có banner đỏ.
- Nếu có thay đổi chưa lưu, dialog “Bạn có thay đổi chưa lưu” với “Ở lại chỉnh sửa” và hành động rời/bỏ thay đổi rõ. Không tự lưu mà chưa xác nhận thành công.
- Nếu đang có yêu cầu lưu chưa xác nhận, thông báo đúng trạng thái; không dùng copy quả quyết rằng thay đổi đã bị hủy.
- Không nói đăng xuất làm tạm dừng bài thi hoặc cần giám thị cấp mã. Nếu nhắc lượt đang làm, phải nói thời gian thi vẫn tiếp tục và thay đổi chưa lưu có thể mất.

7. QUY TẮC TRẠNG THÁI VÀ DỮ LIỆU MINH HỌA

- Mỗi frame chỉ có một trạng thái đang diễn ra: normal/loading/error/success/conflict không xuất hiện đồng thời.
- States phải hiện ngay trong page/form/dialog thật, có controls và bước tiếp theo. Không thay bằng card chỉ kể tên các states.
- Không đặt “Critical State Variants”, “Mô phỏng”, mã EP, checklist designer, thông số API/revision/idempotency hoặc bảng thử lỗi vào product page. Handoff ở frame riêng.
- Dữ liệu minh họa thống nhất giữa list/detail và desktop/mobile: cùng tên đề/version, thời lượng, số câu, lịch và policy; tổng số câu/điểm phải khớp các phần. Dùng mốc ngày giờ minh họa hợp lý và cùng múi giờ. Không thêm social proof hay chức năng để trang trông đầy hơn.
- Ưu tiên refinement UI và trình bày trạng thái. Chỉ chỉnh copy cần thiết để control/hành vi không hiểu sai; việc biên tập nội dung marketing dài sẽ làm sau.

8. ĐẦU RA VÀ THỨ TỰ ƯU TIÊN

Thực hiện theo ba nhóm trong cùng brief, giữ nhất quán với các frame nguồn:

A — Sáu page chính đã chỉnh:
“EP-08 — Danh sách đề — V4 — Desktop/Mobile — Normal”
“EP-09 — Chi tiết đề — V4 — Desktop/Mobile — Normal”
“EP-10 — Hồ sơ — V4 — Desktop/Mobile — Normal”

B — Bốn frame dialog thiết yếu:
“EP-09 — Chi tiết đề — V4 — Desktop/Mobile — Start confirmation”
“EP-10 — Hồ sơ — V4 — Desktop/Mobile — Profile conflict”
Mỗi frame có page nền và dialog đang mở thực sự; không chỉ một modal rời không có ngữ cảnh.

C — Frame riêng cho states còn lại, ưu tiên mobile trước, sau đó desktop:
EP-08: Loading, Empty category, Search no match, Error, Load more pending/error, Filter sheet mobile.
EP-09: Resume, Not open, Closed, Attempt limit, Start pending, Start error, Start unconfirmed.
EP-10: Edited, Saving, Saved, Save error, Name validation error, Save unconfirmed, Unsaved exit confirmation. Normal ở nhóm A đã thể hiện tài khoản chưa sửa, CTA lưu disabled.
Các trạng thái chỉ khác nội dung có thể reuse component, nhưng vẫn cần frame của state để review. Không ghép nhiều state vào một product frame. Trạng thái switch ON có thể thể hiện trong Profile Edited.

Nếu giới hạn lượt tạo, hoàn thành A trước, rồi B, rồi C. Giữ nguyên frame đã hoàn thành và báo rõ phần chưa tạo để tiếp tục từ đó, không regenerate lại toàn bộ. Không tuyên bố đủ bộ UI khi mới tạo sáu màn Normal.

Cuối lượt, trả danh sách frame thực sự đã tạo gồm: tên, ID, page, viewport, state; liệt kê các mục còn thiếu riêng. Nếu có prototype, thể hiện được list → detail → start confirmation và profile edit → save/conflict. Không tạo những page đích ngoài phạm vi brief này chỉ để nối prototype.

Tự kiểm tra trước khi trả kết quả: title dài không bị cắt; search không bị ép nhỏ; card/CTA thống nhất; Profile switch đúng nghĩa opt-in; points/schedule/version đủ; dialog không tràn; bottom bars không che nội dung; states không lẫn nhau; six source frames và các nhóm đã chốt vẫn được giữ nguyên.
```
