# EP-15 — Bảng xếp hạng: đề xuất điều chỉnh

**Trạng thái hiện hành:** người dùng đã tạm chốt ảnh điều chỉnh này làm main visual reference desktop Loaded, cho phép chỉnh thêm sau. [Quyết định](../selection.md). Findings khi port còn mở; các nhãn chờ chọn trong nội dung dưới đây giữ snapshot trước lựa chọn.

Ngày 2026-10-12. Phạm vi: một ảnh desktop Loaded dựa trên template hiện tại; chưa chọn thay template cũ, chưa port ứng dụng và không xác nhận mobile/interaction/production.

## Mục tiêu và nguồn

- Route `/exams/:examId/versions/:versionId/leaderboard`, actor Candidate đã đăng nhập, quyền `leaderboard.read`; read-side exact frozen version, không mutation/transaction/event mới.
- [Edit target](../../../evidence/stitch-03b-review-2026-10-08/leaderboard-desktop-v4-b91abc13.png), [review 03B](../../../stitch-03b-review-2026-10-08.md), [prompt gốc 03B](../../../stitch-page-prompts-v3/03b-history-ranking-desktop.md).
- [Style reference](../../codex-desktop-v1/images/preflight-ready-v1.png), [design contract](../../codex-desktop-v1/design-contract.md), [Dashboard V2 tokens](../../dashboard-v2/tokens.json).
- Nguồn đọc: [LeaderboardPage](../../../../../apps/web/src/features/results/leaderboard-page.tsx), [OpenAPI](../../../../../docs/contracts/openapi.yaml) `getLeaderboard` và `LeaderboardEntry`.

## Điều chỉnh thị giác

- Thu sidebar thành rail khoảng 72px logic, header trắng khoảng 68px, main gutter 24–32px. Active Đề thi. Dùng logo phiếu thi/check, wordmark ExamPlatform.
- Giữ canvas #F3F6FC, trắng, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540, muted #58627A; 8px rhythm, radius 20–24px, border/shadow nhẹ.
- Một table card rộng, bốn cột; nhãn Be Vietnam Pro, Mono chọn lọc cho số/time. Dòng 58–64px dự kiến, không coi ảnh raster là chứng minh đúng font/viewport.
- Hạng 1 Cobalt ít nhất mạnh bằng hạng 3 Apricot; không podium/chart/identity avatar.
- Bỏ copy không có contract: Sẵn sàng, Dữ liệu xác thực, Assessment Suite, hỗ trợ 24/7. Header có account outline thay persona không cần thiết; table chỉ bí danh.

## UI và chức năng giữ nguyên

- Heading Bảng xếp hạng, đề AWS Certified Solutions Architect Associate SAA-C03, badge v2.3, về Chi tiết đề, Làm mới.
- Notice opt-in gọn: kết quả tốt nhất có thể xuất hiện với bí danh; xem trang không tự ghi danh. Quản lý tham gia dẫn Hồ sơ, không bật setting khi xem.
- Cột Hạng / Bí danh / Điểm đạt–tối đa / Hoàn thành lúc. 10 records như fixture.json, scores 985→790 trên thang1000; timestamps nguyên bản15/11/2024 GMT+7, không sửa theo năm hiện tại.
- Footer Đã tải10kết quả, Tải thêm kết quả khi có continuation; không tổng giả, không tự join identity/xếp lại rank/historical snapshot.
- Source hỗ trợ refresh, cursor scope và protected denial. Nút back/copy title trong ảnh là specification từ prompt đã review, không phát minh endpoint. Có thể dùng metadata frozen hợp lệ khi port; source không biết metadata thì fallback version ngắn.
- Nhãn v2.3 chỉ là fixture thị giác legacy của ảnh gốc; không suy ra từ `publishedVersionId` hoặc draft revision, không tuyên bố API cung cấp semantic version. Cách hiển thị nhãn thực khi port phải lấy từ contract metadata hợp lệ.

## Review bắt buộc

- Kiểm tra đủ10row/ranks/aliases/scores/timestamps, exact exam/version, bốn cột và footer loaded-only.
- Kiểm tra rail/shell, logo, palette, rank emphasis, chữ tiếng Việt, không lộ identity hoặc thêm capability.
- Save PNG versioned, SHA-256/dimensions/provenance và exact prompt/request; status sau xem ảnh `adjusted_proposal_reviewed`, vẫn pending user selection.
- Không sửa app/schema/API/AWS, không chạy test runtime. Sau generation lưu findings nhỏ về typography/spacing để kiểm chứng khi port.
