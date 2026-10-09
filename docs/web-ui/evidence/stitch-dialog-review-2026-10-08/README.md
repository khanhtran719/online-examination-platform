# Bằng chứng review dialog V4 — 2026-10-08

Dự án [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955). Bốn PNG gốc lấy bằng kết nối chỉ đọc theo [Prompt 02A](../../stitch-page-prompts-v3/02a-catalog-profile-dialogs.md), dùng cho [review dialog](../../stitch-dialog-review-2026-10-08.md). Người dùng đã chọn bốn dialog làm [template thị giác](../../templates/catalog-profile-v4/README.md); các findings DLG và kiểm chứng tương tác vẫn mở. Không gửi generation/refinement.

| Dialog | Desktop | Mobile |
| --- | --- | --- |
| EP-09 — Start confirmation | [PNG gốc](../../templates/catalog-profile-v4/dialogs/start-confirmation-desktop-v4.png) — `18c214c1cc6d40f987cd3b71e2b04cb3`, 2560×2048 | [PNG gốc](../../templates/catalog-profile-v4/dialogs/start-confirmation-mobile-v4.png) — `294c18aa1dc1432bbdb8cc882de54bdb`, 780×1768 |
| EP-10 — Profile conflict | [PNG gốc](../../templates/catalog-profile-v4/dialogs/profile-conflict-desktop-v4.png) — `03de693b67424fddb8e902207dc0315c`, 2560×2048 | [PNG gốc](../../templates/catalog-profile-v4/dialogs/profile-conflict-mobile-v4.png) — `0c2c28b743a1452f9a9f1dacc769c9d6`, 780×1768 |

[Manifest](manifest.json) giữ nguồn, dimensions, SHA-256 và đường dẫn ảnh đã chuyển nguyên bytes sang template; [inventory](inventory.json) giữ ID/tên/viewport của 40 screen, không lưu credential/download URLs. Bốn dialog là bốn ID mới so với inventory review Normal V4; các Normal vẫn được giữ.

Review tĩnh không xác minh click, lưu dữ liệu, responsive/overflow, focus, contrast được đo hay motion. Các frames pending/error/unconfirmed thuộc lượt 02B, không phải yêu cầu bổ sung vào cùng frame ready/conflict.
