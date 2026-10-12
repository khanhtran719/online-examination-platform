# Review05B-1 — Rà soát và phát hành đề — 2026-10-12

**Đã có đủ3 preview desktop1280px; đã review và có findings cần sửa trước khi port vào sản phẩm.** Giữ được hướng Cobalt–Apricot/card trắng/rail gọn, nhưng chưa đạt đầy đủ [brief05B-1](stitch-page-prompts-v3/05b-admin-preflight-dialogs-desktop.md). Không đánh dấu template được chọn hoặc nghiệm thu application từ lượt review này.

Nguồn: tab Stitch project `18257628123124303955`, DOM iframe thực và ảnh canvas chụp khi zoom tới từng frame. Đối chiếu [05A review](stitch-05a-review-2026-10-08.md), [tokens chuẩn](templates/dashboard-v2/tokens.json), [editor](../../apps/web/src/features/admin/exam-editor-page.tsx), [write flow](../../apps/web/src/features/admin/use-exam-draft.ts), [structure controls](../../apps/web/src/features/admin/exam-structure.tsx) và [OpenAPI](../contracts/openapi.yaml). [Evidence](evidence/stitch-05b1-review-2026-10-12/README.md) chứa ảnh/DOM/metadata.

## 1. Coverage đã xác nhận

| Màn | Screen ID | Logical frame | Kết quả |
| --- | --- | --- | --- |
| Edit Preflight ready | `bef67930ab4e4b5e93f17f82d06d7193` | 1280×1482 | Có thật, đã review |
| Publish confirmation | `8bdb6a1a0a4c4814a9017994e6f05355` | 1280×1024 | Có thật, đã review |
| Preflight validation blocked | `3a591de37dfc4248b3151e7ffe17725d` | 1280×1492 | Có thật, đã review |

Logical dimensions lấy từ iframe. Ảnh evidence là browser canvas ở khoảng47%/69%, không phải PNG xuất gốc hoặc ảnh1280px1:1. Canvas còn nhãn “Generating Screen...” nhưng ba iframe có nội dung; không dùng nhãn này hoặc câu trả lời của chat để suy coverage. Chưa có bằng chứng mới cho05B-2/05B-3, Create/mobile hoặc pending/success/unconfirmed states.

## 2. Phần đã làm đúng

- **Ready:** đủ tên đề, category,90 phút, lịch08:00–12:00 ngày15/11/2026, Giờ Việt Nam/UTC+7,3 lượt, policy lời giải và bảng xếp hạng bí danh. Ba phần2 câu/20 điểm,2/30,2/50 khớp tổng6 câu/100 điểm. Có đường sửa thông tin/cấu trúc, checklist có icon/chữ và lời nhắc máy chủ kiểm tra lại khi phát hành. Không đưa answer keys lên summary.
- **Dialog foreground:** đúng tên đề và summary90 phút/3 phần/6 câu/100 điểm, lịch thi. Đủ ba ý: lưu edits trước, lượt mới dùng phiên bản mới, lượt đang làm không đổi. Có Hủy, đóng và CTA rõ; helper phân biệt lưu nháp với phát hành. Chưa có success toast giả trong foreground.
- **Validation:** đúng hai lỗi có chủ đích: đóng07:30 trước mở08:00; phần2 không có câu. Summary đổi thành3 phần/4 câu/70 điểm, không giữ6/100. Còn đường sửa lịch/bổ sung câu; DOM xác nhận hai nút Lưu nháp/Lưu và phát hành có `disabled`, còn Quay lại enabled. Chỉ hai checklist rows có dấu lỗi, những mục còn lại có dấu đạt.
- Cả ba body khai báo Be Vietnam Pro16px; primary đọc được ở Ready/Dialog là `rgb(49,92,244)` tương ứng Cobalt chuẩn. Không có cảnh3D làm rối vùng form/dialog.

## 3. Findings cần xử lý

- [ ] **05B1-01 — P1 trước khi vào sản phẩm — Dialog dùng sai page nền.** Foreground đúng đề “Nền tảng điện toán đám mây — Bài ôn tập01”, nhưng background DOM là “Kỳ thi Đánh giá Năng lực Kỹ thuật2026”, mã `#EXM-9481`, các phần Cloud Core/VPC/DevOps và điểm30/30/40. Header, stepper, checklist và bố cục cũng khác Ready. Tái sử dụng đúng Ready làm nền, giữ cùng draft/fixture, chỉ thêm backdrop và dialog. Blur không làm dữ liệu sai thành chấp nhận được. Không cần thiết kế lại phần nội dung dialog đang đúng.

- [ ] **05B1-02 — P1 trước khi vào sản phẩm — Capability và claim tự thêm.** Background dialog có “2 câu tự luận”, khóa sao chép/fullscreen “Đã kích hoạt”,342 thí sinh ghi danh, lịch sử phiên bản và claim hệ thống đã xác minh dữ liệu toàn vẹn/“Preflight ready: Đạt100%”. Validation cũng gán phần3 thành “2 câu hỏi tự luận phân tích case study”. Phạm vi hiện tại chỉ có Single Choice/Multiple Choice/True-False; chưa có các control hoặc provider kể trên. Bỏ các nội dung tự thêm, dùng fixture ba loại trắc nghiệm, diễn đạt kiểm tra cục bộ và giữ server là nguồn quyết định phát hành. Không mở rộng API vì mockup.

- [ ] **05B1-03 — P2 — Checklist validation không nhất quán.** Badge ghi “2/5” trong khi có3 dấu đạt và2 dấu lỗi. Đổi thành “3/5 mục đạt” hoặc “2 mục cần sửa” để rõ nghĩa, bỏ thanh “Mức độ sẵn sàng” dễ bị hiểu là tiến độ xử lý. “Thang điểm10–25đ/câu” ở Ready và “Phạm vi10–35đ/câu” ở Validation không phải quy tắc hệ thống. UI hiện tại/contract dùng điểm mỗi câu1–1000; fixture validation vẫn là10,10,25,25. Bỏ các range tự tạo hoặc ghi đúng phạm vi dữ liệu đang mô tả, không trộn fixture min/max với invariant.

- [ ] **05B1-04 — P2 — Metadata không có nguồn và cách gọi revision.** Validation có “Lần sửa cuối2 phút trước”, “Bản nháp#01”; background dialog có v4-draft/v3-published, tên người sửa và thời điểm tự thêm. Brief dùng bản sửa4, chưa có publication; không có nguồn cho các metadata mới. Bỏ timestamp/version history giả, dùng revision thật nếu cần hiển thị. Nhãn “Tài liệu xác thực pre-flight” và “Trạng thái tự động kiểm thử tiêu chuẩn” nên thành “Rà soát bản nháp”/“Kiểm tra trên nội dung đang sửa”, tránh ngụ ý chứng nhận hoặc server đã duyệt.

- [ ] **05B1-05 — P2 — Thống nhất editor giữa Ready/Validation/Dialog.** Ready có tên đề ở đầu và stepper “Thông tin / Phần & câu hỏi / Kiểm tra & phát hành”; Validation chuyển thành “Thông tin & Cài đặt”, giảm nhận diện tên đề đầu trang và thay hierarchy của phần thông tin/cấu trúc. Dùng một shared editor shell; state lỗi chỉ thêm banner/field feedback/disabled controls, giữ vị trí và nhãn còn lại. Mỗi mục lỗi có một đường sửa rõ, tránh lặp “Đến vị trí”, “Sửa lịch thi” và “Về Bước1 chỉnh giờ” cùng diễn đạt một hành động. Dialog lấy lại shell Ready theo05B1-01.

- [ ] **05B1-06 — P3 — Chuẩn hóa tokens/brand và mật độ.** Body canvas cả ba là `rgb(250,248,255)`/`#FAF8FF`, khác canvas chuẩn `#F3F6FC`. Rail còn icon mũ tốt nghiệp thay logo phiếu thi đã lưu. Primary Ready bo pill9999px, Dialog bo12px; thống nhất theo shared controls. Card thông tin Ready lặp tên đề vào ô hẹp khiến xuống nhiều dòng dù heading đã có tên đầy đủ; bỏ lặp hoặc cho tên chiếm hàng rộng. Phần trăm từng phần cần ghi “tổng điểm” thay “tổng số”; sửa typo “câu trúc”. Giữ Cobalt, Apricot và card trắng, không cần đổi art direction.

- [ ] **05B1-07 — Coverage/interaction khi port.** Dialog HTML preview chưa có `dialog`/`role="dialog"`; chưa kiểm tra focus trap/restore, Escape/Hủy giữ edits, action order, permission, retry/idempotency và outcome mất xác nhận. Khi triển khai dùng dialog semantics/accessibility thật, khóa gửi lặp ở pending, chỉ báo thành công sau save receipt rồi publish receipt. Nếu lưu thành công nhưng publish lỗi, phải nói rõ hai kết quả. Không lấy ảnh hoặc nút mockup làm bằng chứng nghiệp vụ đã chạy.

## 4. Phân biệt brief với ứng dụng hiện tại

Brief yêu cầu hai nút disabled khi local validation không đạt, và preview Validation đã thể hiện đúng yêu cầu đó. Ứng dụng hiện tại trong `exam-editor-page.tsx` chỉ disable theo pending; `buildBody()` trong `use-exam-draft.ts` từ chối dữ liệu không hợp lệ khi gọi lưu. Vì vậy pre-disable theo validation là **yêu cầu UX khi port**, không phải behavior đã có được chứng minh bởi screenshot. Không đổi backend rule hoặc contract trong lượt review này.

Những con số/claim từ background prototype không phải dữ liệu vận hành, performance metrics hoặc yêu cầu nghiệp vụ mới. Mẫu được review để giữ hướng bố cục và xử lý findings có chủ đích, không sao chép tất cả text/HTML sang sản phẩm.

## 5. Kết luận và checklist

- [x] Xác nhận3/3 frame thật với ID và logical dimensions.
- [x] Review ảnh Ready/Validation/Dialog và đối chiếu DOM/nội dung/disabled controls.
- [x] Ghi findings05B1-01–07, tách yêu cầu lúc port khỏi behavior hiện tại.
- [ ] Người dùng chọn các mẫu làm template hoặc yêu cầu refinement; chưa tự nâng trạng thái template.
- [ ] Sửa findings trước khi đưa vào sản phẩm; lỗi chức năng/capability không được port nguyên trạng.
- [ ]05B-2 và05B-3; Create/mobile/pending/error/unconfirmed/success, permissions và các state khác.

**Đề xuất giữ hướng thị giác và nội dung foreground của dialog**, sửa/reuse page nền và chuẩn hóa Ready/Validation khi triển khai theo cách hoãn fixes đến lúc code đã ghi trước đó. Không cần gửi lại prompt tạo05B-1. Nhóm thiết kế kế tiếp vẫn là05B-2; chưa gửi generation/refinement trong lượt này.

Registry vẫn33 page families:16 template retained/4 reviewed awaiting selection/13 prompt-prepared coverage unverified. Review thêm05B-1 là bổ sung cho EP-20, không tăng tổng hoặc đóng implementation roadmap.

## 6. Validation và giới hạn

DOM read và screenshot canvas được lưu ở [evidence](evidence/stitch-05b1-review-2026-10-12/README.md). Đã thử xuấtZIP qua UI, nhưng không nhận được download và không thấy ZIP mới trong thư mục Downloads khi kiểm tra; không khẳng định đã tải PNG/HTML gốc. Không tạo artifact giả thay bản xuất, không sửa canvas/template hiện hành hoặc application code.

Kiểm tra static links/contracts/JSON/whitespace và protected files theo evidence. Không chạy unit/integration/E2E/axe/load tests mới vì không sửa code; không kiểm tra thật API publish, keyboard, mobile hoặc persistence từ prototype này. Không có production/FinOps acceptance mới.
