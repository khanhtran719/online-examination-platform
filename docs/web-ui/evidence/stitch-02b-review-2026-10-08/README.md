# Bằng chứng review 02B — EP-08 mobile

Ngày 2026-10-08, đọc từ [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955). Inventory 47 screen, tăng bảy so với review dialog. Chỉ EP-08 mobile có states mới; EP-09/10 mobile và desktop đối ứng chưa có. Không gửi generation/refinement trong lượt review.

| State | PNG gốc | Screen ID |
| --- | --- | --- |
| Loading | [PNG](../../templates/catalog-profile-v4/states/exam-list-loading-mobile-v4.png) | `6e975d9e733b47f89afb289d6cfe3e43` |
| Empty category | [PNG](../../templates/catalog-profile-v4/states/exam-list-empty-category-mobile-v4.png) | `d7012a2deb2544a5ac95ff3703775d93` |
| Search no match | [PNG](../../templates/catalog-profile-v4/states/exam-list-search-no-match-mobile-v4.png) | `be78ab4fda0b458284e934594bf6bea7` |
| Error | [PNG](../../templates/catalog-profile-v4/states/exam-list-error-mobile-v4.png) | `6c1a7c576fa5422d96d31646567eb8b2` |
| Load more pending | [PNG](../../templates/catalog-profile-v4/states/exam-list-load-more-pending-mobile-v4.png) | `0c9a086ba6524959ad3579e27739e6c2` |
| Load more error | [PNG](../../templates/catalog-profile-v4/states/exam-list-load-more-error-mobile-v4.png) | `8def7bf52098434bbfbb0faa339323fe` |
| Filter sheet | [PNG](../../templates/catalog-profile-v4/states/exam-list-filter-sheet-mobile-v4.png) | `8234d78b01bd456c843aa8890f117ca2` |

[Manifest](manifest.json) ghi dimensions, SHA-256 và nguồn từng PNG. [Inventory](inventory.json) chỉ giữ metadata screen, không lưu credentials hoặc URL tải ảnh. Ảnh gốc chưa chỉnh sửa; crop QA nằm trong thư mục tạm. Sau review, người dùng chọn cả bảy frame làm template. Các PNG đã chuyển nguyên bytes vào `templates/catalog-profile-v4/states/`; bảng/manifest tham chiếu đến cùng file, không lưu trùng. Các mẫu Normal/dialog được giữ và findings 02B-01–05 vẫn mở để xử lý khi code.

[Báo cáo review](../../stitch-02b-review-2026-10-08.md). Giới hạn: screenshot tĩnh; chưa xác minh tương tác, motion, responsive và accessibility.
