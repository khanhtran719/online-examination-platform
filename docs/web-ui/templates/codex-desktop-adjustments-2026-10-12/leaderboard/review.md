# EP-15 — Review đề xuất điều chỉnh V1

**Trạng thái hiện hành:** người dùng đã tạm chốt ảnh điều chỉnh này làm main visual reference desktop Loaded, cho phép chỉnh thêm sau. [Quyết định](../selection.md). Findings khi port còn mở; các nhãn chờ chọn trong nội dung dưới đây giữ snapshot trước lựa chọn.

Ngày 2026-10-12. Status `adjusted_proposal_reviewed`; **pending user selection**, không ghi là template đã được người dùng chọn.

## Kết quả

Một lần gọi image generation tích hợp, đúng [request lưu nguyên văn](generation-request-v1.json), hai ảnh đầu vào đã xem qua `view_image`. [PNG đề xuất](leaderboard-adjusted-v1.png) đã copy byte-identical vào repository, xem trực tiếp toàn ảnh bằng `view_image` sau copy. Không correction call, không CLI/API fallback. Source cũ giữ nguyên.

- [x] Một màn desktop Loaded độc lập, không collage/mobile/extra state.
- [x] ExamPlatform dùng mark phiếu thi/check, header Candidate không Admin badge/persona/identity; rail gọn, active Đề thi.
- [x] Canvas Cobalt–Apricot sáng, card trắng, bảng rộng và gọn hơn nguồn sidebar lớn; font/tokens là hướng thiết kế, không xác minh loại font từ raster.
- [x] Header “Bảng xếp hạng”, AWS Certified Solutions Architect Associate SAA-C03, v2.3 nguyên fixture, về Chi tiết đề, Làm mới.
- [x] Notice opt-in giữ đúng ý nghĩa, có Quản lý tham gia; không tự ghi danh/enrollment switch.
- [x] Bảng đúng bốn cột, đủ10 bí danh/ranks, điểm985,960,945,920,895,880,855,840,815,790/1000.
- [x] Đủ10 timestamps nguyên nguồn ngày15/11/2024 GMT+7 theo fixture; rank không bị xếp lại theo time.
- [x] Hạng1 Cobalt nổi hơn hạng3 Apricot, không podium/medals lớn/chart/percentile.
- [x] Footer “Đã tải10kết quả” và Tải thêm kết quả, không số tổng/số trang/freshness claim giả.
- [x] Không email/avatar/danh tính/userID/highlight Bạn trong rows; bỏ Assessment Suite/Sẵn sàng/Dữ liệu xác thực/24-7.
- [x] Exact primary prompt1,299 whitespace words, request equality, original/source-output hashes và PNG dimensions được ghi trong metadata/provenance/validation.

Ảnh thực1402×1122px; đây là dimensions raster, không chứng minh viewport1280px đã kiểm tra. Nhãn v2.3 chỉ fixture thị giác legacy, không API semantic version hoặc draft revision.

## Findings nhỏ khi port

- [ ] **LB-PORT-01 — Icon Lịch sử.** Generator dùng outline dấu hỏi ở rail dù nhãn Lịch sử đúng. Khi dựng component dùng icon history/clock chung thay dấu hỏi; không thay business navigation.
- [ ] **LB-PORT-02 — Shell, typography và tương phản.** Xác nhận rail72px/header68px logic trong CSS, nhịp8px, exact fonts, focus/keyboard và contrast bằng UI thật. Ảnh hiện có rail gọn nhưng không gọi đó là pixel-perfect token verification.
- [ ] **LB-PORT-03 — Metadata và hành vi.** Khi source thiếu frozen title/semantic version, dùng fallback được contract hỗ trợ; không suy ra v2.3 từ UUID. Cursor/loadmore/refresh/reset-watermark, protected denial/opt-in vẫn cần kiểm tra trong runtime khi port.

Không có finding mở về sai records/scores/timestamps/privileged capability/privacy meaning. Các finding nhỏ trên không yêu cầu dựng lại dữ liệu. Không sửa `apps`, API/schema/AWS; không chạy unit/integration/benchmark vì task chỉ tạo artifact. Acceptance visualReference/runtime/mobile/production đều false đến khi gate tương ứng được hoàn thành.
