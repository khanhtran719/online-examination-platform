type HelpQuestion = { question: string; paragraphs: readonly string[] };
type HelpTopic = { id: string; label: string; summary: string; questions: readonly HelpQuestion[] };

// Authored public guidance, independent of private attempt/session data.
export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: "account",
    label: "Tài khoản",
    summary: "Email, xác thực và đăng nhập.",
    questions: [
      {
        question: "Tại sao đăng ký xong chưa đăng nhập được?",
        paragraphs: [
          "Đăng ký chỉ gửi yêu cầu tạo tài khoản. Bạn cần xác thực email trước khi đăng nhập bằng email và mật khẩu.",
          "Mở liên kết trong email, chọn mật khẩu cuối và bấm xác nhận. Chỉ mở liên kết không kích hoạt tài khoản và xác thực xong không tự đăng nhập. Nếu đang dùng một tài khoản khác, hãy đăng xuất trước khi xác thực.",
        ],
      },
      {
        question: "Không nhận được email hoặc liên kết đã hết hạn thì làm gì?",
        paragraphs: [
          "Kiểm tra địa chỉ email và thư mục thư rác. Ở trang kiểm tra email, bạn có thể gửi lại yêu cầu khi hết thời gian chờ được hiển thị.",
          "Liên kết xác thực chỉ dùng một lần và có thời hạn. Nếu liên kết không còn dùng được, hãy yêu cầu liên kết mới; không chia sẻ liên kết hoặc mật khẩu với người khác. Chưa có chức năng khôi phục mật khẩu trong giao diện này.",
        ],
      },
    ],
  },
  {
    id: "catalog",
    label: "Chọn đề",
    summary: "Điều kiện tham gia và nội dung đề.",
    questions: [
      {
        question: "Có thể thử trước khi tạo tài khoản không?",
        paragraphs: [
          "Có. Trải nghiệm công khai gồm ba câu mẫu, không cần tài khoản và không tạo lượt thi thật. Điểm mẫu không phải kết quả chính thức.",
          "Lựa chọn mẫu chỉ ở trong bộ nhớ của trang. Tải lại hoặc rời trải nghiệm sẽ bắt đầu lại. Đề thi thật cần đăng nhập.",
        ],
      },
      {
        question: "Cần kiểm tra gì trước khi bắt đầu?",
        paragraphs: [
          "Đọc thời lượng, thời gian mở và đóng, số lượt được phép, các phần thi và chính sách lời giải ở chi tiết đề. Điều kiện do từng đề quy định; không có một giới hạn lượt chung cho mọi đề.",
          "Chỉ bắt đầu khi đã sẵn sàng. Máy chủ quyết định bạn còn được tham gia hay không; đóng tab hoặc rời phòng thi không đặt lại thời gian của lượt đã bắt đầu.",
        ],
      },
      {
        question: "Có những loại câu hỏi nào?",
        paragraphs: [
          "Hiện hỗ trợ một lựa chọn, nhiều lựa chọn và đúng–sai. Với nhiều lựa chọn, cần chọn đúng toàn bộ tập đáp án để được điểm câu đó; chọn thiếu hoặc thừa không được điểm một phần.",
          "Nhãn TOEIC hoặc IELTS là nhóm đề ôn tập. Điểm trên nền tảng không tự quy đổi thành điểm chứng chỉ hoặc band chính thức.",
        ],
      },
    ],
  },
  {
    id: "room",
    label: "Trong phòng thi",
    summary: "Lưu câu trả lời, đồng hồ và xung đột.",
    questions: [
      {
        question: "Khi nào câu trả lời được xem là đã lưu?",
        paragraphs: [
          "Câu trả lời chỉ được xem là đã lưu khi máy chủ xác nhận và thanh trạng thái hiển thị “Đã lưu lúc …”. “Có … thay đổi chờ lưu” hoặc “Đang lưu…” chưa phải xác nhận đã lưu.",
          "Sau mỗi thay đổi, xem lại trạng thái lưu. Biểu tượng ổ khóa trên trình duyệt không xác nhận câu trả lời đã được lưu. Thay đổi chưa được xác nhận có thể mất khi tải lại, đóng tab hoặc rời phòng thi.",
        ],
      },
      {
        question: "Mất kết nối trong lúc làm bài thì xử lý như thế nào?",
        paragraphs: [
          "Giữ nguyên tab và kiểm tra kết nối. Quan sát thông báo; chỉ tiếp tục lưu hoặc thử lại theo hướng dẫn trong phòng thi. Nếu phiên đã hết, đăng nhập lại bằng tài khoản đang làm bài.",
          "Lựa chọn chưa được máy chủ xác nhận chỉ nằm trong bộ nhớ của tab. Kết nối trở lại không kéo dài thời gian thi và không bảo đảm những thay đổi chưa lưu sẽ được nhận sau hạn.",
        ],
      },
      {
        question: "Rời phòng thi có dừng đồng hồ đếm ngược không?",
        paragraphs: [
          "Không. Thời hạn của lượt thi dựa trên thời gian máy chủ. Đổi tab, mất mạng, đăng xuất hoặc rời phòng thi không làm dừng hay đặt lại thời gian.",
          "Khi quay lại cùng lượt thi, máy chủ cung cấp trạng thái và các câu trả lời đã được ghi nhận. Những thay đổi chưa lưu ở tab cũ có thể không có trong bản này.",
        ],
      },
      {
        question: "Hai nơi có lựa chọn khác nhau thì xử lý thế nào?",
        paragraphs: [
          "Nếu cùng câu hỏi thay đổi ở tab khác, phòng thi hiển thị đối chiếu. Bạn chọn giữ lựa chọn của mình hoặc dùng bản máy chủ; ứng dụng không tự ghi đè để giải quyết xung đột.",
          "Sau khi lựa chọn, tiếp tục kiểm tra trạng thái lưu. Nên làm bài trong một tab để hạn chế xung đột.",
        ],
      },
      {
        question: "Điều gì xảy ra khi hết giờ làm bài?",
        paragraphs: [
          "Hết thời hạn thì không lưu thêm câu trả lời. Bài được nộp theo các câu mà máy chủ đã ghi nhận; thay đổi chưa được xác nhận không mặc nhiên trở thành đáp án của bài nộp.",
          "Theo dõi trạng thái bài hoặc lịch sử để xem việc xử lý đã hoàn tất chưa. Đừng suy rằng đóng tab là đã nộp thành công.",
        ],
      },
    ],
  },
  {
    id: "result",
    label: "Nộp bài & Kết quả",
    summary: "Xác nhận nộp, xử lý và quyền xem lời giải.",
    questions: [
      {
        question: "Kết quả có ngay sau khi nộp bài không?",
        paragraphs: [
          "Không nhất thiết. Sau khi máy chủ xác nhận nộp, bài được xử lý để chấm điểm. Chỉ xem điểm khi kết quả đã hoàn tất; chưa có điểm khác với điểm bằng không.",
          "Bạn có thể theo dõi trạng thái xử lý và mở lại bài trong lịch sử. Điểm chính thức do máy chủ tính, không phải trình duyệt.",
        ],
      },
      {
        question: "Chưa nhận được xác nhận nộp bài thì làm gì?",
        paragraphs: [
          "Giữ nguyên trang và làm theo hướng dẫn kiểm tra trạng thái hoặc thử lại của phòng thi. Mất phản hồi chưa chứng minh bài đã nộp hoặc nộp thất bại.",
          "Nếu còn thay đổi chưa lưu, xem cảnh báo trước khi quyết định nộp. Nộp bài không bảo đảm lưu các lựa chọn chưa được máy chủ xác nhận.",
        ],
      },
      {
        question: "Vì sao chưa xem được đáp án, lời giải hoặc bảng xếp hạng?",
        paragraphs: [
          "Quyền xem đáp án và lời giải phụ thuộc chính sách của đề: có thể sau kết quả, sau khi kỳ thi đóng hoặc không công bố. Có kết quả không có nghĩa là luôn được xem lời giải.",
          "Bảng xếp hạng chỉ có khi đề cho phép và gắn với đúng phiên bản đề. Khi tham gia bảng xếp hạng, hệ thống dùng bí danh thay cho việc công khai email.",
        ],
      },
    ],
  },
];
