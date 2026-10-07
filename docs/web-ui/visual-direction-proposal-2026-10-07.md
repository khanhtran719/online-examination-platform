# Đề xuất nâng cấp thị giác Web UI

Ngày: 2026-10-07. Trạng thái: **đề xuất để người dùng chọn hướng trước khi triển khai**. Phạm vi lượt này: đọc tài liệu/source, khảo sát nguồn tham chiếu và dựng mẫu tách biệt. Chưa thay đổi giao diện trong `apps/web`, dependency hay các quy tắc API/state.

## Nhận định

UI hiện tại có nội dung và các luồng chức năng, nhưng cách trình bày chưa tạo cảm giác một sản phẩm được thiết kế riêng. Source trang chủ tại `apps/web/src/features/auth/auth-pages.tsx` đã có preview và ba bước; chúng vẫn được dựng bằng các khối/bố cục cơ bản. Bộ tokens hiện dùng radius 6/8px, viền trung tính và shadow chỉ cho overlay. Vì vậy, tăng màu hay thêm animation vào các khối hiện có sẽ chưa giải quyết được hierarchy, chiều sâu và hình ảnh nhận diện.

Yêu cầu mới của người dùng là bắt mắt, có hiệu ứng 2D/3D và cảm giác bay nhẹ. Đề xuất cần thay đổi art direction, bố cục, typography, vật liệu và motion cùng nhau. Chủ đề vẫn là nền tảng thi: phiếu trả lời, thời gian, câu hỏi và tiến độ tạo thành hình ảnh nhận diện.

## Các hướng cân nhắc

| Hướng | Hình ảnh và bố cục | Phù hợp | Đánh đổi |
| --- | --- | --- | --- |
| **Không gian nổi — khuyến nghị** | Nền sáng navy/teal; tiêu đề lớn lệch trái; cụm phiếu trả lời xếp lớp, nghiêng theo phối cảnh, badge thời gian/lưu bay nhẹ bên phải | Toàn bộ sản phẩm, đa đối tượng | Cần thiết kế kỹ ánh sáng, spacing và chuyển động để chiều sâu rõ mà vẫn gọn |
| **Cổng ánh sáng** | Hero đối xứng nền navy tối; quầng sáng teal; phiếu trả lời nổi ở trung tâm | Trang giới thiệu, chiến dịch hoặc một biến thể thương hiệu | Dễ tạo ấn tượng mạnh; cần thêm công sức cho contrast và sự liên tục với workspace sáng |
| **Xưởng tri thức** | Illustration 2D, khối giấy và icon 3D có màu ấm; typography thân thiện | Sản phẩm hướng học sinh/sinh viên | Cần bộ illustration riêng; cảm giác vui hơn, ít trung tính với tuyển dụng/nội bộ |

Mẫu tương tác đã dựng hai hướng đầu. Mỗi hướng có trang chủ và mẫu phòng thi; có thể chọn đáp án, đánh dấu, chuyển câu và xem phản hồi lưu/nộp minh họa. Các con số, câu hỏi và trạng thái trong mẫu đều là tổng hợp. Hướng thứ ba mới ở mức ý tưởng, chưa dựng.

**Khuyến nghị:** dùng Không gian nổi làm ngôn ngữ chung. Chọn phiếu trả lời có chiều sâu làm điểm nhớ chính. Để đáp ứng mong muốn 3D rõ hơn, đề xuất thử một hero 3D thật với phiếu trả lời/bút/đồng hồ, ánh sáng mềm và chuyển động theo chuột; giữ CSS 2.5D làm fallback. Cổng ánh sáng là lựa chọn thay thế nếu người dùng thích một trang chủ nổi bật với nền tối; dark theme toàn ứng dụng là một phạm vi riêng.

## Thiết kế theo khu vực

| Khu vực | Đề xuất hình ảnh | Chuyển động |
| --- | --- | --- |
| Trang chủ | Hero hai vùng; typography 48–64px desktop, 36–44px mobile; phiếu trả lời có 3 lớp; ánh sáng mềm; CTA rõ; ba bước thật | Cụm minh họa xuất hiện theo lớp; badge bay 8–12px trong chu kỳ 5–7s; phối cảnh thay đổi nhẹ khi hover; có điều khiển dừng |
| Đăng nhập/đăng ký | Form rõ trên một bề mặt đặc; minh họa nhỏ nối tiếp hero trên desktop | Chuyển form/validation 160–220ms; giảm ambient trên mobile |
| Candidate/đề thi | Bố cục theo nhiệm vụ; thẻ đề có nhãn danh mục, thời gian và trạng thái; thumbnail mang nét phiếu trả lời | Hover nâng 2–4px; chọn/filter chuyển trạng thái 160–220ms; tránh floating liên tục |
| Phòng thi | Câu hỏi là trọng tâm; bảng câu trả lời có legend; timer và trạng thái lưu luôn rõ; nền tĩnh có chiều sâu nhẹ | Lựa chọn đổi nền/viền 160–200ms; không animate timer; không parallax/floating trong lúc làm bài |
| Kết quả | Phân cấp điểm, trạng thái và giải thích rõ; hình minh họa hoàn thành nhỏ nếu phù hợp | Reveal ngắn; trạng thái xử lý giải thích bằng chữ; không dùng confetti mặc định |
| Admin | Sidebar/nav rõ; bảng có mật độ hợp lý; editor chia vùng; shadow/radius cùng hệ thống | Hover, drawer, dialog và reorder có phản hồi; tránh cảnh 3D phía sau bảng |

Trong mẫu, navigation “Trang chủ/Phòng thi/Đăng nhập” dùng để xem các màn hình đề xuất. Production vẫn dùng các shell riêng và navigation theo quyền như API/state contract. Mobile production cần timer/action sticky và answer-sheet bottom sheet; mẫu hiện reflow navigator xuống dưới để xem thiết kế, chưa mô phỏng toàn bộ shell mobile.

## Tokens và motion đề xuất

- Giữ nền tảng nhận diện: ink navy `#14283F`, primary teal `#08786F`, surface `#FFFFFF`, canvas `#F3F8FA`; bổ sung mint `#BCEADF`, sky `#D9ECFF` cho illustration. Amber/red giữ ý nghĩa cảnh báo/lỗi, không dùng làm trang trí tuỳ tiện.
- Giữ Source Sans 3 cho heading và Noto Sans cho body, self-host đủ glyph tiếng Việt. Tăng tương phản về scale/weight thay vì thêm nhiều font. Mẫu dùng system fallback, chưa chứng minh typography sau khi nối font của ứng dụng.
- Radius có phân cấp: controls 8–10px, surface 14–18px, pill chỉ cho badge. Shadow rõ hơn ở hero; shadow workspace nhẹ hơn. Các giá trị phải đi vào semantic tokens thay vì lặp raw màu trong component.
- Motion chỉ tác động lên `transform`/`opacity` khi có thể; nền blur/glow lớn giữ tĩnh. Dừng ambient khi tab ẩn hoặc minh họa ra ngoài màn hình. Có nút dừng animation kéo dài và tôn trọng `prefers-reduced-motion`; tắt parallax trên touch/reduced-motion.
- Không để chuyển động điều khiển timer, ACK, deadline, quyền hoặc trạng thái nộp. “Đã lưu” của ứng dụng thật vẫn chỉ đến từ ACK của máy chủ.

Đây là thay đổi đề xuất so với [design-spec](design-spec.md) §1–2 và [ADR-007](../adr/007-web-ui-implementation-direction.md). Tài liệu hiện giới hạn radius/motion và giữ trang trí tiết chế; README còn loại gradient lớn/dark theme. Khi người dùng chọn hướng, cập nhật các tài liệu này cùng tokens và tiêu chí nghiệm thu. Đề xuất hiện tại chưa thay thế spec được chấp nhận.

## MCP và nguồn hỗ trợ

- **Figma MCP có sẵn trong phiên:** có thể dựng frame/component/tokens để duyệt và bàn giao editable nếu cần. Lượt này chưa tạo file Figma; mẫu trong hội thoại giúp xem chuyển động trực tiếp mà không cần thiết lập file thiết kế trước.
- **Spline:** nguồn tham chiếu và lựa chọn author một cảnh 3D thật, có vật liệu, ánh sáng và tương tác. [Trang chính thức](https://spline.design/), [thư viện mẫu](https://spline.design/examples), [hệ icon 3D](https://spline.design/solutions/3d-icons). Lượt này chưa gọi Spline, chưa mua plan hay nhập asset community.
- **Motion:** ứng viên cho chuyển cảnh, layout và interaction trong React. [Ví dụ scroll](https://motion.dev/examples?category=scroll), [hướng dẫn reduced motion](https://motion.dev/docs/react-accessibility). Chỉ thêm nếu các chuyển động đã chọn cần thư viện; hover/float đơn giản có thể dùng CSS.
- **React Three Fiber:** ứng viên khi cần cảnh 3D tự kiểm soát trong React. Tài liệu [scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance) mô tả on-demand rendering, reuse và tối ưu scene. Cần kiểm tra compatibility với stack hiện tại và đo trên thiết bị trước khi chọn.

**Phân biệt kỹ thuật:** mẫu hiện dùng CSS perspective/transforms/shadow để tạo **2.5D**. Chưa có mesh, camera, WebGL hoặc vật liệu 3D thật. Nếu người dùng muốn 3D thật, dựng một cảnh phiếu trả lời/bút/đồng hồ ở hero bằng Spline hoặc Three.js/R3F; lazy-load scene, có poster tĩnh và giới hạn rendering khi không cần. Không mặc định nhúng một runtime 3D vào mọi route.

## Trình tự triển khai sau khi chọn hướng

1. Chốt hướng và motion bằng mẫu trang chủ, auth, Candidate, phòng thi và Admin; hoàn thiện cả mobile trước khi đổi toàn bộ ứng dụng.
2. Cập nhật design-spec/ADR/tokens theo yêu cầu mới; tạo primitives dùng chung cho button, surface, nav, status và typography.
3. Triển khai home/auth để chốt chất lượng thị giác; tiếp tục Candidate/results rồi exam/Admin. Giữ API/state semantics và chứng minh các regression của review trước vẫn đạt sau khi đổi presentation.
4. Nếu chọn 3D thật, làm một thử nghiệm hero riêng rồi đo payload, startup, FPS và tác động LCP. Quyết định giữ runtime 3D dựa trên kết quả thử nghiệm và lợi ích thị giác.
5. Nghiệm thu screenshot 320/390/768/1024/1440, bàn phím, zoom 200%, contrast, reduced-motion, các trạng thái offline/error/long content và fixture 500 câu. Giữ budgets ở checklist hiện có; đo lại khi thêm asset/runtime. Không cộng task FE hoàn thành chỉ vì mẫu đẹp.

## Kiểm tra mẫu và giới hạn

Mẫu có thể xem trực tiếp trong hội thoại. Source tách biệt nằm ở thư mục visualization của chat, tên `exam-spatial-design.html`; raw kết quả `preview-checks.json` và screenshot `home-1024.png`, `home-390.png`, `room-1024.png`, `room-390.png`, `portal-1024.png`, `home-dark-1024.png` ở cùng thư mục.

Kiểm tra bằng Chromium headless: home/phòng thi/portal tại 320,390,768,1024,1440 không tràn ngang; tương tác chọn đáp án/đánh dấu/đổi câu/giữ lựa chọn/phản hồi nộp/carousel hoạt động; nút dừng hiệu ứng bay pause animation; không có JavaScript page error; CSS ambient ngừng với reduced-motion. Đã sửa contrast của biến thể tối sau khi xem screenshot. [Raw checks](/Users/trankhanh/.codex/visualizations/2026/10/07/01a1140f-e5a0-7ae2-b13f-314cef2559ed/preview-checks.json) ghi kết quả sau sửa. [Ảnh home desktop](/Users/trankhanh/.codex/visualizations/2026/10/07/01a1140f-e5a0-7ae2-b13f-314cef2559ed/home-1024.png) và [home mobile](/Users/trankhanh/.codex/visualizations/2026/10/07/01a1140f-e5a0-7ae2-b13f-314cef2559ed/home-390.png) lưu cùng nguồn mẫu.

Đây là kiểm tra mẫu thị giác, chưa phải nghiệm thu UI thật. Chưa đo FPS/LCP/CLS/INP, chưa tích hợp font production, chưa chạy Firefox/WebKit, chưa kiểm chứng đầy đủ WCAG hoặc live HTTPS. Chưa dựng mẫu Candidate/results/Admin; các mục đó là đề xuất phạm vi tiếp theo. Không có API request, deploy hoặc thay đổi backend trong lượt này.
