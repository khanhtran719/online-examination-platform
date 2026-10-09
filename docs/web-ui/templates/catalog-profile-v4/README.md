# Template Catalog/Profile V4 — đã chọn hướng thị giác

Ngày 2026-10-08, người dùng đồng ý theo đề xuất sau [review V4](../../stitch-catalog-profile-v4-review-2026-10-08.md): giữ sáu màn Normal làm tham khảo, bổ sung dialog/trạng thái trước khi làm lại frontend. Phạm vi được chọn là phong cách và bố cục nội dung; chưa nghiệm thu chức năng, các tính năng tự thêm hay hành vi tương tác.

Sau [review dialog](../../stitch-dialog-review-2026-10-08.md), người dùng chọn thêm bốn dialog V4; sau [review 02B](../../stitch-02b-review-2026-10-08.md), chọn tiếp bảy states Danh sách đề mobile. Tổng bộ này có **17 ảnh: 6 Normal, 4 dialog và 7 states**. Các findings CP-V4/DLG/02B vẫn mở để xử lý khi code. Theo yêu cầu mới nhất, ưu tiên hoàn thiện các page desktop còn thiếu trước mobile/states bổ sung.

## Sáu ảnh gốc

| Page | Desktop | Mobile |
| --- | --- | --- |
| EP-08 — Danh sách đề | [PNG gốc](exam-list-desktop-v4.png) | [PNG gốc](exam-list-mobile-v4.png) |
| EP-09 — Chi tiết đề | [PNG gốc](exam-detail-desktop-v4.png) | [PNG gốc](exam-detail-mobile-v4.png) |
| EP-10 — Hồ sơ | [PNG gốc](profile-desktop-v4.png) | [PNG gốc](profile-mobile-v4.png) |

[Manifest](manifest.json) giữ screen ID, nguồn, dimensions và SHA-256. Ảnh được chuyển nguyên bytes từ bộ review, không tạo bản trùng; [bằng chứng review](../../evidence/stitch-catalog-profile-v4-review-2026-10-08/README.md) tham chiếu lại cùng các file này. Ảnh V3 vẫn là bằng chứng lịch sử, không dùng thay V4 cho ba page này.

## Bốn dialog đã chọn

| Dialog | Desktop | Mobile |
| --- | --- | --- |
| EP-09 — Start confirmation | [PNG gốc](dialogs/start-confirmation-desktop-v4.png) | [PNG gốc](dialogs/start-confirmation-mobile-v4.png) |
| EP-10 — Profile conflict | [PNG gốc](dialogs/profile-conflict-desktop-v4.png) | [PNG gốc](dialogs/profile-conflict-mobile-v4.png) |

Ảnh dialog giữ nguyên bytes từ [bằng chứng review](../../evidence/stitch-dialog-review-2026-10-08/README.md); manifest chung ghi hash và nguồn của cả 17 ảnh.

## Bảy states Danh sách đề mobile đã chọn

| State | Ảnh gốc |
| --- | --- |
| Loading | [PNG](states/exam-list-loading-mobile-v4.png) |
| Empty category | [PNG](states/exam-list-empty-category-mobile-v4.png) |
| Search no match | [PNG](states/exam-list-search-no-match-mobile-v4.png) |
| Error | [PNG](states/exam-list-error-mobile-v4.png) |
| Load more pending | [PNG](states/exam-list-load-more-pending-mobile-v4.png) |
| Load more error | [PNG](states/exam-list-load-more-error-mobile-v4.png) |
| Filter sheet | [PNG](states/exam-list-filter-sheet-mobile-v4.png) |

Giữ nguyên bytes từ [bằng chứng review 02B](../../evidence/stitch-02b-review-2026-10-08/README.md), chuyển vào `states/`, không tạo bản trùng. [Ghi chú cần sửa](implementation-notes.md) gồm Loading/tải thêm, count giả/khác phạm vi, CTA/helper/active category, copy kế thừa và kiểm chứng tương tác. Việc chọn template chỉ chốt hướng thị giác.

## Khi dùng để code

- Giữ palette, form/card hierarchy, bố cục desktop/mobile và CTA của V4. Dùng [tokens Dashboard V2](../dashboard-v2/tokens.json) và [logo tạm](../stitch-v3/brand/README.md).
- Shell Candidate toàn bộ web vẫn theo Dashboard V2/mobile V3; sidebar rộng V4 là khác biệt đã ghi để thống nhất khi code, không phải quyết định đổi shell toàn hệ thống.
- Thực hiện [checklist còn mở](implementation-notes.md). Text wrap, schedule/timezone, nguồn dữ liệu và copy phải đối chiếu product/API contract.
- Switch Hồ sơ là opt-in tham gia bảng xếp hạng; điểm từng phần và giới hạn lượt lấy từ dữ liệu thật. Không coi mockup là nguồn mở rộng API.
- 2.5D/motion, responsive, focus và tương tác chưa được xác minh từ screenshot.

## Hoàn thiện bộ thiết kế

Bảy states 02B đã được người dùng chọn làm template. EP-09/10 mobile và 21 desktop states chưa có, được giữ trong backlog [02B](../../stitch-page-prompts-v3/02b-catalog-profile-states.md). Theo yêu cầu mới, chuyển sang các page desktop còn thiếu: [03A — Trạng thái/Kết quả/Xem lại](../../stitch-page-prompts-v3/03a-results-desktop.md), sau đó [03B — Lịch sử/Xếp hạng](../../stitch-page-prompts-v3/03b-history-ranking-desktop.md). Assistant lưu asset/chuẩn bị prompt, chưa gửi lệnh tạo/chỉnh Stitch hoặc port ứng dụng; findings tiếp tục mở.
