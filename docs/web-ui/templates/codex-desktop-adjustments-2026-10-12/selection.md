# Quyết định giữ mẫu UI — 2026-10-12

Người dùng xác nhận: “Tạm thời chốt UI như vậy đi, có gì sửa thêm sau”. Giữ ba ảnh điều chỉnh hiện tại làm **main visual reference cho desktop Loaded**, cho phép tiếp tục chỉnh sau. Không tạo lại ảnh hoặc thay bytes của PNG/prompt trong lượt chốt này.

| Màn | Main reference đã chọn | Phạm vi |
| --- | --- | --- |
| EP-14 — Lịch sử thi | [History V1](history/history-adjusted-desktop-v1.png) | Candidate desktop Loaded |
| EP-15 — Bảng xếp hạng | [Leaderboard V1](leaderboard/leaderboard-adjusted-v1.png) | Candidate desktop Loaded, một frozen version |
| EP-19 — Danh sách đề Admin | [Admin list V1](admin-exams/admin-exams-adjusted-v1.png) | Admin desktop Loaded, sáu đề mẫu |

Ảnh Stitch cũ là nguồn đối chiếu lịch sử; dùng các ảnh điều chỉnh đã chọn khi triển khai ba màn này. Hai dialog EP-19 đã giữ trước tiếp tục dùng riêng. Bộ Codex Desktop V1 giữ nguyên 35 references; ba ảnh mới được giữ trong bundle này, không gộp thành claim tổng số ảnh toàn repository.

- [x] **SEL-01:** Ghi nhận quyết định người dùng cho đúng ba ảnh hiện tại.
- [x] **SEL-02:** Cập nhật manifest/metadata/registry/main reference và đóng ADJ-07, DESIGN-NEXT-01.
- [x] **SEL-03:** Giữ findings nhỏ trong [review](review.md), không gọi là đã sửa trong ứng dụng.
- [x] **SEL-04:** Kiểm PNG/prompt hashes không đổi, status/links/checklist nhất quán, repository quality và diff check; [bằng chứng](selection-validation.json).
- [ ] **SEL-05:** Port vào ứng dụng, kiểm desktop/mobile, accessibility và hành vi bằng evidence riêng.

Registry sau lựa chọn: **33/33 page families có ít nhất một named visual reference**, 0 main references chờ chọn, 0 families chỉ có prompt. Con số này không có nghĩa mọi mobile/variant/state hoặc application port đã hoàn thành. SY-05/SY-07 vẫn chỉ có partial desktop references.

Giữ ADJ-P01–04 và findings từng màn để xử lý khi port: icon Lịch sử, shell/avatar chung, widths/badge wrap, revision stack, archived read-only/save guard và metadata/runtime contracts. Không thay API/schema/Architecture Contract, không tick implementation roadmap hoặc production acceptance từ quyết định thị giác.

[Validation tạo ảnh](validation.json) là snapshot trước khi người dùng chọn; các checks “pending selection” trong file đó là lịch sử. [Validation lựa chọn](selection-validation.json) là snapshot mới cho status đã giữ. Không viết lại evidence cũ thành kết quả của lượt này.
