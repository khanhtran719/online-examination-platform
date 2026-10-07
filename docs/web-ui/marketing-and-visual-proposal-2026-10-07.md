# ExamPlatform: đề xuất marketing kết hợp thiết kế 3D

Ngày: 2026-10-07. Trạng thái: **đề xuất trước khi triển khai**. Kết hợp [đề xuất thị giác](visual-direction-proposal-2026-10-07.md) với thông điệp, trải nghiệm đầu tiên và nội dung quảng bá. Phương án này chưa được áp dụng vào `apps/web` hoặc phát hành thành chiến dịch.

Cập nhật sau khi người dùng duyệt demo: homepage3D và luồng ba câu đã được tích hợp vào `apps/web` theo [báo cáo triển khai](vao-nhip-thi-implementation-2026-10-07.md). Các nhận xét “chưa triển khai” bên dưới ghi trạng thái tại bước đề xuất. Chưa phát hành chiến dịch hoặc đo hiệu quả chuyển đổi.

## Nguồn skill và bối cảnh

Đã tìm và đọc trực tiếp các SKILL.md công khai của `coreyhaines31/marketingskills`: [copywriting v2.1](https://github.com/coreyhaines31/marketingskills/blob/main/skills/copywriting/SKILL.md), [cro v2.0](https://github.com/coreyhaines31/marketingskills/blob/main/skills/cro/SKILL.md), [marketing-psychology v2.0](https://github.com/coreyhaines31/marketingskills/blob/main/skills/marketing-psychology/SKILL.md). Các skill được áp dụng như hướng dẫn cho đề xuất này; chưa cài vào môi trường. `page-cro` trong kết quả tìm kiếm là tên cũ; source hiện tại được đọc là `cro`. Kết hợp với `frontend-design` đã dùng trong lượt thiết kế trước.

Không có file product-marketing context trong repository. Bối cảnh lấy từ product specification, Web UI contract và source hiện có:

- Người xem chính tạm giả định là người làm bài trắc nghiệm trong các danh mục đã có. Chưa có phỏng vấn để xác nhận nhu cầu hoặc chọn phân khúc hẹp.
- Trang đích là homepage cho người lần đầu biết sản phẩm, có thể đến từ liên kết chia sẻ hoặc nội dung giới thiệu. Chưa có dữ liệu kênh, ngân sách quảng cáo hoặc conversion baseline.
- Hành động đầu tiên đề xuất: bắt đầu một trải nghiệm mẫu ngắn. Hành động tiếp theo: tạo tài khoản và xác nhận email theo luồng hiện hành.
- Nền tảng có nhiều khả năng mới ở mức contract/demo. Copy launch cho hệ thống thật cần đối chiếu capability đã kiểm chứng trước khi phát hành.

## Một phương án thống nhất: “Vào nhịp thi”

Giữ tên sản phẩm ExamPlatform. “Vào nhịp thi” là ý tưởng cho trang giới thiệu và nội dung quảng bá, không đổi thương hiệu hoặc mở thêm module nghiệp vụ.

Người xem thấy một không gian thi được chăm chút, hiểu cách làm bài và có thể thử một thao tác ngay. Cảm giác hướng tới là bình tĩnh, chủ động và muốn bắt đầu. Đây là giả thuyết thiết kế cần thử với người dùng.

Hình ảnh chủ đạo: phiếu trả lời 3D nổi trong một vòng ánh sáng mint trên nền navy, cạnh bút và đồng hồ. Giấy/kính mờ có cạnh sáng; cảnh có phản hồi nghiêng nhẹ theo chuột. Các yếu tố đều liên quan đến việc thi. Workspace tiếp tục dùng bề mặt sáng và nền tĩnh để đọc lâu.

### Hero đề xuất

Nhãn nhỏ: **Nền tảng thi trắc nghiệm trực tuyến**

Headline khuyến nghị:

> Một phòng thi rõ ràng,
> để bạn tập trung làm bài.

Subheadline:

> Theo dõi thời gian, chuyển câu và xem trạng thái lưu ngay trong phòng thi. Thử cách làm bài qua một trải nghiệm mẫu.

CTA chính: **Trải nghiệm 3 câu mẫu**

CTA phụ: **Tạo tài khoản**

Microcopy cho CTA mẫu: **Bản minh họa. Câu hỏi và kết quả mẫu.**

CTA chính cần nổi bật và xuất hiện trước khi cuộn. Cảnh 3D không trì hoãn chữ/nút khi tải. Mobile đặt thông điệp và CTA trước cảnh minh họa.

Lý do: headline gắn trực tiếp với công việc người dùng; subheadline cho thấy các thao tác cụ thể; CTA giúp hiểu chính xác bước tiếp theo. Đây là định vị trải nghiệm, chưa có bằng chứng lợi thế độc quyền so với một đối thủ đã nghiên cứu. Cần bổ sung nghiên cứu cạnh tranh trước khi dùng các tuyên bố “tốt nhất”, “nhanh hơn” hoặc “khác biệt duy nhất”.

Hai copy để thử riêng, giữ nguyên visual và CTA khi so sánh:

- **Tập trung từng câu. Theo dõi bài thi rõ ràng.** Nhấn mạnh cảm giác kiểm soát trong lúc làm bài.
- **Thử phòng thi trước khi bắt đầu bài thật.** Nhấn mạnh việc trải nghiệm trước quyết định đăng ký.

## Từ 3D đến lần sử dụng đầu tiên

| Đoạn trải nghiệm | Nội dung và tương tác                                                                                         | Vai trò                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Nhìn thấy        | Hero 3D có một chuyển động mở đầu ngắn; chữ và CTA có mặt ngay                                                | Tạo dấu nhớ cho thương hiệu     |
| Hiểu             | Phiếu minh họa cho thấy câu hỏi, lựa chọn, timer và trạng thái lưu; có nhãn minh họa                          | Làm rõ sản phẩm và giá trị      |
| Thử              | Bấm CTA, cảnh giấy chuyển về một form 2D; người xem chọn đáp án, chuyển câu và đánh dấu trong ba câu tổng hợp | Tạo cơ hội tự cảm nhận thao tác |
| Kết thúc mẫu     | Hiển thị số câu đã chọn và một kết quả minh họa có nhãn rõ; CTA tạo tài khoản                                 | Dẫn tới bước sử dụng thật       |

Trải nghiệm mẫu công khai là **một phần mới được đề xuất**, chưa có trong luồng production được chấp nhận. Nó dùng fixture công khai, không đọc ngân hàng đề, attempt hoặc đáp án riêng. Phản hồi lưu là mô phỏng có nhãn; điểm/kết quả mẫu không phải kết quả thi thật. Attempt thật vẫn cần đăng nhập và giữ quyền, deadline, ACK, scoring từ backend. Bổ sung phần mẫu phải cập nhật Web UI spec trước khi đưa vào app.

Trong mẫu, luôn có đường “Bỏ qua trải nghiệm, tạo tài khoản”. Sau khi dùng mẫu, chỉ mời đăng ký; không báo đã xác thực email, đã lưu bền vững hay đã tạo lượt thi thật. Luồng xác nhận email và chọn mật khẩu cuối vẫn được giữ.

## Cấu trúc trang hỗ trợ quyết định

1. **Hero:** thông điệp trên, cảnh 3D và một CTA chính.
2. **Preview tương tác:** cho xem chọn đáp án, đánh dấu và phiếu câu hỏi. Các chi tiết cần nhìn rõ như UI thật.
3. **Lợi ích có thể kiểm tra:** “Biết câu nào cần xem lại”, “Theo dõi thời gian trong lúc làm bài”, “Phân biệt đang lưu và đã lưu”. Mỗi câu đi cùng một đoạn UI minh họa tương ứng.
4. **Danh mục phù hợp:** trình bày các danh mục hiện có; dẫn tới browse sau đăng nhập. Nhãn TOEIC/IELTS không ngụ ý điểm quy đổi hoặc chứng nhận chính thức.
5. **Cách bắt đầu:** tạo tài khoản, xác nhận email, chọn đề rồi làm bài. Giải thích đủ bước thay vì hứa bắt đầu bài thật bằng một lần bấm.
6. **FAQ:** giải đáp cách đăng nhập, lưu, nộp và xem kết quả theo capability thực tế. Lời giải chỉ hiển thị khi chính sách đề cho phép.
7. **CTA cuối:** “Trải nghiệm 3 câu mẫu”, kèm lựa chọn tạo tài khoản cho người đã sẵn sàng.

Dùng preview đúng sản phẩm và nội dung được phép công khai làm bằng chứng ban đầu. Khi có khách hàng thực và quyền sử dụng, bổ sung feedback/case study có nguồn. Hiện không có cơ sở cho logo đối tác, rating, số người dùng, tăng điểm hoặc tỷ lệ đỗ.

## Cách áp dụng các skill

- `copywriting`: chuyển thông điệp sang thao tác/lợi ích của người thi; viết headline, subheadline và CTA cụ thể; chuẩn bị hai copy thay thế. Đã rà các câu ngắn, từ quảng cáo chung chung, đối lập giả và claim thiếu bằng chứng theo reference `ai-tells`.
- `cro`: đặt một hành động chính, cho xem sản phẩm trước đăng ký, làm rõ bước tiếp theo, tổ chức nội dung theo câu hỏi người xem cần giải đáp. Tách thay đổi nhanh ở copy/CTA khỏi phần lớn hơn là demo và 3D.
- `marketing-psychology`: dùng AIDA để sắp xếp hành trình, Jobs to Be Done để bám công việc làm bài, và giảm công sức bước đầu bằng một mẫu ngắn. Những nguyên lý này là khung thiết kế, không phải bằng chứng rằng phương án chắc chắn tăng đăng ký.
- `frontend-design`: dành điểm nhấn cho cảnh phiếu trả lời; giữ typography, khoảng cách, vật liệu và ánh sáng cùng một hệ thống. Giao diện thao tác chính vẫn dễ đọc và có trạng thái rõ.

Hướng này cũng phù hợp với khuyến nghị NN/g về [làm rõ mục đích và lối vào trên homepage](https://www.nngroup.com/articles/top-ten-guidelines-for-homepage-usability/). Khi đánh giá, cần quan sát thao tác thật: [giao diện đẹp có thể làm người dùng đánh giá cao sự dễ dùng dù còn gặp khó khăn](https://www.nngroup.com/articles/aesthetic-usability-effect/).

## Một bộ nội dung quảng bá đi cùng website

Đề xuất chuẩn bị assets để review, chưa chạy quảng cáo hoặc đăng bài:

- Video dọc 12–15 giây: cảnh phiếu 3D mở ra, người dùng chọn một đáp án, chuyển câu/đánh dấu, kết thúc bằng CTA “Trải nghiệm 3 câu mẫu”. Nhãn mẫu xuất hiện ở cảnh minh họa.
- Ảnh giới thiệu dùng cùng góc camera, vật liệu và font của hero. Nút/URL dẫn tới đúng trải nghiệm được giới thiệu.
- Open Graph preview dùng tên ExamPlatform, hình phiếu 3D và headline đã chọn. Hình chia sẻ không chứa dữ liệu cá nhân.
- Nội dung cho từng nhóm như ngoại ngữ hoặc CNTT dùng ví dụ phù hợp và giữ cùng nhận diện. Chỉ mở landing riêng khi có nội dung, nhu cầu và đường dùng đã sẵn sàng.

Copy bài giới thiệu để duyệt:

> Chọn đáp án, đánh dấu câu cần xem lại và theo dõi trạng thái lưu trong phòng thi mẫu của ExamPlatform. Trải nghiệm 3 câu mẫu để xem cách làm bài.

Đề xuất caption này chỉ phát hành sau khi public demo có thật. Hiện có thể dùng “Xem mẫu giao diện” cho link tới một preview được gắn nhãn đúng. Copy và destination phải khớp nhau.

## Ưu tiên và cách kiểm chứng

**Ưu tiên thấp công sức:** chỉnh thông điệp hero, hierarchy CTA, preview và nội dung FAQ; thống nhất tên hành động. Có thể duyệt copy trước khi dựng scene.

**Ưu tiên tạo ảnh hưởng lớn:** dựng prototype 3 câu mẫu và hero 3D thật có một cảnh nhận diện riêng; thiết kế cả mobile, form và các trạng thái kết thúc mẫu. Hoàn thiện chất lượng runtime trước khi quảng bá sử dụng thật.

**Thử nghiệm đề xuất:** cho 5–8 người thuộc nhóm mục tiêu xem trang trong năm giây rồi hỏi sản phẩm dùng để làm gì và họ sẽ bấm đâu. Tiếp tục giao nhiệm vụ thử mẫu; quan sát khả năng bắt đầu/hoàn thành, chỗ nhầm lẫn và phản ứng với lời mời đăng ký. Đây là thử nghiệm định tính dự kiến, chưa được thực hiện và không chứng minh mức tăng conversion.

Khi có traffic thật, đo các tỷ lệ theo định nghĩa rõ: bắt đầu mẫu trên lượt xem trang, hoàn thành mẫu trên lượt bắt đầu, bắt đầu đăng ký sau mẫu, tài khoản xác thực và lượt thi thật đầu tiên đã hoàn thành. Kết quả thi/activation thật dựa vào trạng thái backend. Chưa có analytics baseline hoặc A/B result; cần lập measurement plan phù hợp trước khi tích hợp tracking. Không thu câu trả lời, email, token hoặc dữ liệu bài thi vào telemetry marketing.

Nếu chạy A/B, thử từng giả thuyết riêng: CTA trải nghiệm so với đăng ký; headline kiểm soát bài thi so với headline tập trung; hero 3D so với poster tĩnh có cùng nội dung. Chọn theo việc người dùng hiểu và hoàn thành thao tác, đồng thời kiểm tra tốc độ tải, reduced-motion và lỗi. Không đặt mục tiêu tăng conversion bằng con số khi chưa có baseline.

## Điểm cần chốt trước triển khai

Phương án thống nhất đề xuất là **Cổng ánh sáng cho trang giới thiệu + workspace sáng, rõ + public demo ngắn + thông điệp “Vào nhịp thi”**. Cần xác nhận phân khúc khách hàng chính để refine copy và asset. Nếu đối tượng ưu tiên là trường/trung tâm hoặc doanh nghiệp tổ chức thi, thông điệp sẽ chuyển sang quản lý và theo dõi kỳ thi thay vì trải nghiệm của Candidate.

Chưa sửa UI, chưa cài marketing skill, chưa phát hành nội dung và chưa kiểm chứng hiệu quả thu hút/chuyển đổi. Các tài liệu/spec owning design và acceptance cần được cập nhật cùng một increment được chọn sau bước đề xuất.
