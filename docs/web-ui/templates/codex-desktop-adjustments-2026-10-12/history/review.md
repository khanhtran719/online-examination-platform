# EP-14 — Review bản điều chỉnh

**Trạng thái hiện hành:** người dùng đã tạm chốt ảnh điều chỉnh này làm main visual reference desktop Loaded, cho phép chỉnh thêm sau. [Quyết định](../selection.md). Findings khi port còn mở; các nhãn chờ chọn trong nội dung dưới đây giữ snapshot trước lựa chọn.

Ngày 2026-10-12. Status `adjusted_proposal_reviewed`, đang chờ người dùng chọn. [Ảnh](history-adjusted-desktop-v1.png), [brief](brief.md), [prompt chính xác](primary.prompt.txt), [request](generation-request-v1.json), [result](generation-result-v1.json), [metadata](metadata.json), [fixture](fixture.json).

Đã xem cả ảnh input trước generation. Root đã đọc prompt độc lập 1.351 whitespace words và cho phép generation. Một call built-in `image_gen.imagegen`, không CLI/API fallback, không correction call. PNG 1536×1024, SHA và source được giữ trong metadata; bản copy byte-identical được kiểm tra. Kích thước này là raster thực, không phải viewport trình duyệt đã test.

## Đối chiếu trực tiếp

- [x] Một page loaded, đúng 5 cột và 6 hàng, giữ thứ tự template gốc.
- [x] AWS title 2 dòng thay vì 5; tên dài hàng cuối 3 dòng thay vì 9, không cắt bằng ellipsis.
- [x] Sáu version/mã lượt/ngày/giờ khớp fixture; UTC+7 rõ.
- [x] Điểm lần lượt 772/1000, null, null, 640/1000, null, 810/1000; null là Chưa có điểm.
- [x] Expired=true + COMPLETED vẫn mở kết quả; FAILED chỉ xem trạng thái, không replay quản trị.
- [x] Header Candidate, logo paper/check, rail gọn, active Lịch sử; không Assessment Suite, mã người dùng, dữ liệu xác thực, sẵn sàng hoặc support 24/7.
- [x] Footer số đã tải 6, Tải thêm; không fake tổng/số trang/KPI.
- [x] Cobalt–Apricot, nền pale, white card, hierarchy rõ, không chart/podium/marketing.

## Findings nhỏ khi port

- `HIST-POLISH-01`: badge hoàn thành/thất bại còn 2 dòng có chủ ý; nên tăng width nếu muốn một dòng. Không còn ngắt từng từ thành 3 dòng.
- `HIST-POLISH-02`: cột tên nhìn khoảng 35–39% thay vì gợi ý 40–45%, nhưng đủ giữ toàn bộ tên và quét 6 hàng. Đo lại layout thực ở 1280px; chưa khẳng định ratio exact từ ảnh.
- `HIST-POLISH-03`: rail gọn có nhãn nhỏ giống preflight, chưa đúng icon-only tuyệt đối. Dùng shared Candidate navigation khi port.

Không thấy blocker dữ liệu/quyền/lifecycle trong review ảnh. Giữ bản này làm **đề xuất điều chỉnh**, không tự chốt template. Thực thi cursor, refresh, ownership, metadata đúng phiên bản, focus/contrast/accessibility và mobile chưa được kiểm chứng. Không sửa code ứng dụng, database, Architecture Contract hoặc resource AWS; không chạy runtime/load tests vì artifact-only.
