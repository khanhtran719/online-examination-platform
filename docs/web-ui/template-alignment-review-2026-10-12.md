# Review UI so với template đã lưu — 2026-10-12

**Cập nhật sau review:** [Inventory màn hình](screen-inventory-2026-10-12.md) đã xác nhận3 preview05B-1 đang có trên Stitch, chưa lưu/chọn template. Bước kế là review chúng, thay cho đề xuất gửi prompt05B-1 ở checklist ban đầu bên dưới. Kết luận UI đang chạy chưa aligned không thay đổi.

**Kết luận: UI đang chạy chưa khớp bộ template hiện hành.** Ứng dụng vẫn mang hướng navy/teal/mint của lần port cũ; bộ Cobalt–Apricot được chọn sau đó mới được lưu làm tham chiếu, chưa được port. Không đóng nghiệm thu thị giác mới hoặc WEB-03 từ các kết quả test trước đây.

Phạm vi lượt này là kiểm tra và ghi nhận, không sửa application. Source baseline: commit `08f17dc`, working tree sạch trước review. Chạy Vite demo của source hiện tại, đối chiếu Home, Login, Dashboard, danh sách đề và chi tiết đề tại viewport `1280 × 900`; kiểm tra thêm danh sách đề tại `390 × 844`. [Ảnh thực tế, runtime CSS và manifest](evidence/template-alignment-review-2026-10-12/README.md) lưu bằng chứng. Dữ liệu là fixture tổng hợp; banner/kịch bản demo không tính là lỗi thiết kế production.

## 1. Bộ nào là chuẩn?

[Quyết định thiết kế hiện hành](README.md) và [template registry](stitch-page-prompts-v3/README.md) xác định:

- [Dashboard desktop V2](templates/dashboard-v2/README.md) làm chuẩn Candidate workspace: rail trắng dạng viên nang, bento mềm; rail lấy khoảng 72px làm mốc.
- [Home/Exam và mobile V3](templates/stitch-v3/README.md), [Auth V3](templates/auth-v3/README.md), [Catalog/Profile V4](templates/catalog-profile-v4/README.md), [Results V4](templates/results-v4/README.md), [Public V4](templates/public-v4/README.md).
- Cobalt–Apricot, Be Vietnam Pro và JetBrains Mono chọn lọc; logo trong [brand assets](templates/stitch-v3/brand/README.md).
- Riêng sidebar rộng trong ảnh Catalog/Profile V4 phải thống nhất lại theo Dashboard V2/mobile V3 khi code, theo [CP-V4-02](templates/catalog-profile-v4/implementation-notes.md). Không lấy từng ảnh rời làm quyết định thay shell toàn hệ thống.

Các bản lưu là ảnh/đặc tả/asset tham chiếu, không phải toàn bộ component React sẵn dùng. Dashboard V2 ghi rõ ZIP chưa xác nhận tải thành công và HTML yêu cầu đăng nhập. Lưu template không đồng nghĩa ứng dụng đã thay đổi.

## 2. Những điểm lệch đã xác nhận

| Hạng mục | Template được chọn | Ứng dụng hiện tại | Phạm vi cần chỉnh |
| --- | --- | --- | --- |
| Màu | Primary `#315CF4`, accent `#FFB36B`, canvas `#F3F6FC` | Primary `#0f766e`, mint `#a3f2d0`, canvas `#f8f9ff` | Shared tokens và các style sử dụng màu cũ |
| Font/brand | Be Vietnam Pro, logo xanh/apricot đã lưu | Source Sans 3/Noto Sans; glyph phiếu trả lời cũ | Font self-host, brand component và typography |
| Candidate rail | Trắng, mảnh, nổi khỏi canvas, active icon tròn tối; mốc khoảng 72px | Navy `#081c25`, rộng **224px đo từ DOM**, gắn sát mép, có nhãn menu đầy đủ | Workspace frame, navigation, responsive |
| Dashboard | Lượt đang làm + hướng dẫn ở hàng đầu khoảng 2/3–1/3; lịch sử full-width; ba card gợi ý | Lượt đang làm full-width có viền trái xanh; hướng dẫn cùng hàng lịch sử; grid gợi ý bốn cột | Phải đổi bố cục, không chỉ thay màu |
| Home | Hero, floating navigation, hình khối và artwork theo V3 | Còn bố cục/artwork của lần port cũ, màu mint/teal | Public shell, hero và illustration |
| Login | Split desktop sáng, artwork paper 2.5D, form trắng theo Auth V3 | Story panel navy và artwork xanh cũ, panel ghép khác mẫu | Auth frame, form geometry, asset |
| Danh sách đề desktop | Header minh họa, search/filter, grid card hai cột V4 | Các hàng nằm ngang một cột; category chips và select “Số dòng mỗi trang”; chưa có ô tìm trên dữ liệu đã tải | Browse page và card/filter presentation; search phải tuân contract |
| Chi tiết đề | Các khối thông tin, hướng dẫn và CTA theo V4 | Metadata nằm thành dải trên nội dung; sections/lịch mở bên trái, CTA minh họa mint bên phải | Detail layout và hierarchy; giữ lịch/múi giờ/quyền thật |
| Danh sách đề mobile | Header gọn, chips/search/filter sheet và card theo mẫu mobile; shell thống nhất Dashboard mobile V3 | Header navy/Menu, account bar, chips xuống nhiều dòng và page-size select | Mobile shell và bố cục list/filter |

Giá trị kích thước/radius trong tokens tham chiếu là hướng dẫn thiết kế, không phải CSS đã trích xuất đầy đủ. Review này không tính phần trăm pixel sai lệch: template có frame dài và nội dung mẫu khác fixture ứng dụng. Sai khác về màu, font, rail và cấu trúc đủ rõ để kết luận chưa aligned.

Đối chiếu source tương ứng: [tokens](../../apps/web/src/shared/styles/tokens.css), [font imports](../../apps/web/src/shared/styles/fonts.css), [workspace styles](../../apps/web/src/app/workspace-frame.module.css), [Dashboard styles](../../apps/web/src/features/catalog/dashboard.module.css), [Browse page](../../apps/web/src/features/catalog/browse-page.tsx), [Catalog styles](../../apps/web/src/features/catalog/catalog.module.css), [Auth frame](../../apps/web/src/features/auth/auth-frame.module.css), [Home](../../apps/web/src/features/experience/home-page.tsx).

## 3. Vì sao có tình trạng này?

[Báo cáo port 2026-10-08](stitch-port-2026-10-08.md) ghi project Stitch **`11777231516922865355`**, ba mẫu Home/Dashboard/Exam và palette navy/teal/mint. Code và runtime hiện tại khớp mô tả đó.

Bộ được chọn sau nằm trong project **`18257628123124303955`**, có Dashboard V2 và các nhóm V3/V4. Các README của bản lưu nói rõ chỉ lưu để port sau. Vì vậy báo cáo cũ có giá trị cho phạm vi lịch sử của nó, không chứng minh đã triển khai template mới. CSS đang render xác nhận đây là khoảng trống triển khai, không có cơ sở quy cho browser cache.

Đề xuất chuyển ngay sang WEB-03 ở lượt trước đã bỏ qua khoảng trống này. WEB-03 là tích hợp API Catalog; tự nó không sửa được art direction hoặc bố cục. Test chức năng, import normalization và backend checks cũng không chứng minh visual fidelity.

## 4. Checklist và thứ tự tiếp theo

- [x] ALIGN-R01 — Xác định bộ template hiện hành và những ngoại lệ shell đã chốt.
- [x] ALIGN-R02 — Đối chiếu source tokens/font/layout với mẫu được lưu.
- [x] ALIGN-R03 — Mở ứng dụng và lưu năm màn desktop, một màn mobile cùng runtime CSS.
- [x] ALIGN-R04 — Ghi nguyên nhân, phạm vi chưa port và thứ tự công việc đề xuất.
- [ ] ALIGN-I01 — Hoàn thiện/chốt coverage thiết kế còn thiếu theo ưu tiên trước đó: đủ desktop trước, rồi mobile/dialogs/states. Registry lưu local hiện có **16/33 page families có template, 4 đã review chờ chọn, 13 coverage chưa được kiểm chứng**; không suy ra trạng thái remote mới nhất. Nhóm đã chuẩn bị tiếp theo là [05B-1 Admin preflight/publish/validation](stitch-page-prompts-v3/05b-admin-preflight-dialogs-desktop.md).
- [ ] ALIGN-I02 — Lập kế hoạch port theo page/state và chuẩn hóa shared foundation: tokens, font, logo, control states, Candidate/Public/Auth shells. Chốt ảnh chuẩn cho từng increment trước khi sửa.
- [ ] ALIGN-I03 — Port Home, Dashboard và Auth theo bộ được chọn; xử lý findings đã lưu, keyboard/focus, validation và responsive.
- [ ] ALIGN-I04 — Port Catalog/Profile V4, start/conflict dialogs và states; dùng Candidate shell chuẩn, không chép sidebar rộng V4 thành quyết định mới.
- [ ] ALIGN-I05 — Port Exam/Results/Public theo các mẫu đã chọn; History/Ranking/Admin/shared pages cần có mẫu được chọn trước khi coi là aligned.
- [ ] ALIGN-I06 — Hoàn thiện WEB-03 và các tích hợp API theo increment; xác minh visual bằng ảnh cùng viewport, trạng thái tải/lỗi/rỗng, keyboard/accessibility và regression chức năng. Tích hợp API và nghiệm thu thị giác phải có bằng chứng riêng.

Đây là thứ tự đề xuất theo quyết định đã ghi của người dùng: hoàn thiện thiết kế trước khi port. Không bắt đầu tạo/chỉnh Stitch, port hoặc tích hợp API trong lượt kiểm tra này. Các nhóm việc trên chưa được cộng vào số task hoàn tất của roadmap. Những checklist cũ vẫn giữ đúng phạm vi lịch sử; chưa có acceptance mới bị tick nhầm cần thu hồi.

## 5. Ranh giới khi triển khai

Chủ sở hữu thay đổi thị giác là frontend presentation/shared UI trong `apps/web`; API, DB/migration, events, scoring và auth contracts không cần thay chỉ để khớp template. Không đổi coordinator/state correctness để làm giống prototype.

Không port các claim/capability không được hỗ trợ: AI proctor, camera, ISO/chứng nhận, latency giả, official TOEIC/IELTS scale, quyền/quota suy đoán hoặc bảo đảm lưu offline. “Đã lưu” vẫn cần ACK, timer vẫn theo deadline có thẩm quyền. Handoff/system-spec boards và mã UI-GAP trong ảnh không phải nội dung sản phẩm. Giữ findings [V3](templates/stitch-v3/implementation-notes.md), [Auth](templates/auth-v3/implementation-notes.md) và [Catalog/Profile](templates/catalog-profile-v4/implementation-notes.md) làm điều kiện port.

## 6. Validation và giới hạn

Review bằng browser demo và đọc source/template; không sửa code ứng dụng hoặc cài dependency. Không chạy lại unit/integration/E2E/axe toàn bộ vì không thay hành vi. Các viewport khác, Profile, Results, phòng thi và Admin chưa được review trực tiếp trong lượt này; shared token mismatch không thay thế page-level review. Không có số đo performance/cost hoặc production acceptance mới.

Kiểm tra tài liệu/contracts và whitespace được ghi tại [evidence](evidence/template-alignment-review-2026-10-12/README.md). Các file mẫu và evidence lịch sử được giữ nguyên.
