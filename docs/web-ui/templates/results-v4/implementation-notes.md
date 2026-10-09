# Ghi chú triển khai Results V4

[Review đầy đủ 03A](../../stitch-03a-review-2026-10-08.md) là nguồn findings. Việc lưu template không đóng các mục dưới đây.

- [ ] **03A-01:** Navigator có icon/nhãn ngoài màu; current state riêng, tránh dấu cam gây nhầm với Sai.
- [ ] **03A-02:** Đặt trước/sau gần heading hoặc thanh điều hướng gọn khi lời giải dài; kiểm tra sticky/scroll/focus.
- [ ] **03A-03:** Đổi “Không chọn (Sai)” thành “Bạn không chọn”; kết luận điểm đúng/sai ở cấp câu.
- [ ] **03A-04:** Bỏ 77,20% lặp, cân chiều cao card, thống nhất rail active/brand. Review tập trung không cần rail.
- [ ] **03A-05:** Thống nhất fixture cùng attempt, bỏ duration/copy ký số/thông báo/proctor/SSL thiếu nguồn. Không suy “Chọn 2” từ keys.
- [ ] **03A-06:** Render đúng frozen payload, không tự sinh diagram/reference link hoặc mở rộng contract vì mockup.
- [ ] **03A-07:** Kiểm chứng quyền xem, cache, ACK/polling/paging/filter, keyboard/focus/contrast, responsive/reduced motion và các states còn thiếu khi triển khai.

03A chỉ có ba desktop states. [Brief 03 đầy đủ](../../stitch-page-prompts-v3/03-results-history-ranking.md) giữ backlog; ưu tiên page desktop trước.
