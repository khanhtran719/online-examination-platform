# Review ảnh EP-19 điều chỉnh — 2026-10-12

**Trạng thái hiện hành:** người dùng đã tạm chốt ảnh điều chỉnh này làm main visual reference desktop Loaded, cho phép chỉnh thêm sau. [Quyết định](../selection.md). Findings khi port còn mở; các nhãn chờ chọn trong nội dung dưới đây giữ snapshot trước lựa chọn.

[Ảnh đề xuất v1](admin-exams-adjusted-v1.png), [brief](brief.md),
[prompt nguyên văn](primary.prompt.txt), [metadata](metadata.json),
[preflight](preflight.json). Công cụ image generation tích hợp, một lần edit;
không fallback CLI, không sửa ảnh bằng code. Đã xem cả hai input trước generation
và xem trực tiếp PNG đầu ra saved với detail original. Chưa được người dùng chọn
làm main template; không runtime/mobile/production acceptance.
Root cũng đã xem trực tiếp v1 và kết luận PASS với minor port findings; giữ v1,
không cần gọi sửa ảnh thêm. Metadata ghi source/copy SHA bằng nhau và exact
generation request dùng nguyên văn prompt 1.322 whitespace words.

## Kết quả

- Đúng sáu đề theo brief; revision 7/4/2/6/5/8, phút 75/90/60/45/30/60,
  ngày/giờ mở/đóng và UTC+7, danh mục/trạng thái/publication history khớp.
- Tất cả Sửa đề trên một dòng, menu đóng. Không còn metadata bản sửa ba dòng.
  Tên dài nhất hai dòng; lịch đầy đủ, không thu nhỏ chữ để cắt dữ liệu.
- Logo phiếu thi/check, ExamPlatform/Quản trị/Minh Anh; bỏ V4 và IDs placeholder.
  Rail gọn, header trắng, bảng ít khoảng trắng hơn bản Stitch gốc, Cobalt–Apricot.
- Search/filter giữ phạm vi phần đã tải; footer Đã tải 6 đề và Tải thêm đề.
  Notice tách chỉnh bản nháp/phát hành; không thêm total/AI/proctor/autosave.
- Archived khác draft/published, draft IELTS giữ lịch sử phiên bản nhưng không
  nói đang phát hành. Revision không biến thành published version.

## Findings khi port

1. **P3 — Revision layout:** v1 đặt Bản sửa N bên cạnh metadata publication
   thay vì dòng dưới riêng như prompt. Nhãn vẫn một dòng và không nhầm semantic;
   nên đặt dòng riêng trong implementation để ổn định ở tên/metadata dài.
2. **Behavior caution:** Sửa đề ở archived giữ theo source và fixture gốc.
   Catalog save không mutate archived records; port phải thể hiện xem/disabled
   save đúng trạng thái và quyền, không hứa sửa/lưu mọi row chỉ từ link.
3. **Runtime chưa kiểm:** local search/filter là design requirement 05A, hiện
   component list chưa có toolbar này. Keyboard/menu permission/load more/error/
   live API, exact font và responsive cần evidence riêng.

Mật độ/cột cải thiện qua quan sát trực tiếp, không tuyên bố benchmark usability.
Kích thước raster được ghi theo PNG thực; không gọi là viewport 1280 đã test.
Output resample/re-layout của công cụ, không pixel-identical overlay.
Không sửa ứng dụng/API/schema/AWS hoặc ảnh gốc, không deploy/commit.
