import { publicShell, paper, field, password, link, button, notice } from "./common.js";
const auth = (story, desc, content, step = 0) => publicShell(`<main class="auth-wrap"><section class="auth-story"><div><p class="eyebrow">VÀO NHỊP THI</p><h2>${story}</h2><p>${desc}</p></div>${paper}<div class="auth-bottom">Một không gian rõ ràng.<br>Để bạn tập trung vào từng câu trả lời.</div></section><section class="auth-form">${step ? `<p class="step-label">Bước ${step} / 3 · ${step === 1 ? "Tạo tài khoản" : "Xác nhận email"}</p><div class="steps-line"><span class="done"></span><span class="${step > 1 ? "done" : ""}"></span><span></span></div>` : ""}${content}</section></main>`);
export const authViews = {
  register: {
    label: "Đăng ký", group: "Bắt đầu", desc: "Form rõ ràng, chiều sâu từ phiếu thi 3D CSS và từng bước bắt đầu.",
    html: () => auth("Bắt đầu với<br>nhịp thi của bạn.", "Tạo tài khoản, xác nhận email và chọn đề khi bạn sẵn sàng.", `<h1>Tạo tài khoản</h1><p class="muted">Thông tin của bạn để bắt đầu làm bài.</p><form>${field("Email", "", "email", "Dùng email bạn có thể mở để xác nhận.")}${field("Tên hiển thị", "", "text", "Từ 1 đến 80 ký tự.")}${password("Mật khẩu")}<p class="password-hint">Ít nhất 15 ký tự. Bạn có thể dùng một cụm từ dễ nhớ.</p>${password("Nhập lại mật khẩu")}${link("check-email", "Tạo tài khoản →", "full")}<p class="lower muted">Đã có tài khoản? <a href="?screen=login">Đăng nhập</a></p></form><p class="small muted mt">Sau khi gửi, hãy kiểm tra hướng dẫn xác nhận trong email.</p>`, 1),
  },
  login: {
    label: "Đăng nhập", group: "Bắt đầu", desc: "Nối tiếp nhận diện homepage; hành động chính nổi bật, copy dễ hiểu.",
    html: () => auth("Tiếp tục<br>nhịp làm bài.", "Đăng nhập để mở đề thi, tiếp tục lượt đang làm và xem kết quả của bạn.", `<p class="eyebrow">CHÀO BẠN TRỞ LẠI</p><h1>Đăng nhập</h1><p class="muted">Tiếp tục với email và mật khẩu của bạn.</p><form>${field("Email", "", "email")}${password("Mật khẩu")}${link("dashboard", "Đăng nhập →", "full")}<p class="lower muted">Chưa có tài khoản? <a href="?screen=register">Tạo tài khoản</a></p></form><div class="mt">${notice("Chưa xác nhận email?", '<a href="?screen=check-email">Gửi lại hướng dẫn xác nhận</a> rồi mở liên kết trong hộp thư.')}</div>`),
  },
  mail: {
    label: "Kiểm tra email", group: "Bắt đầu", desc: "Phân biệt đã nhận yêu cầu với đã gửi email; hướng dẫn bước tiếp theo.",
    html: () => auth("Một bước nữa.<br>Kiểm tra hộp thư.", "Mở liên kết xác nhận trong email để thiết lập mật khẩu và tiếp tục.", `<div class="mail-icon" aria-hidden="true">✉</div><h1>Kiểm tra email</h1><p class="muted">Nếu email đủ điều kiện, hệ thống sẽ gửi hướng dẫn xác nhận. Kiểm tra cả thư rác.</p>${notice("Đã nhận yêu cầu", "Thông báo này không cho biết email đã có tài khoản hay chưa.")}<div class="mt">${field("Email cần gửi lại", "", "email")}${button("Gửi lại hướng dẫn", "full secondary")}</div><p class="small muted mt">Sau khi gửi lại, bạn cần chờ trước lần gửi tiếp theo.</p><div class="row mt">${link("login", "Về đăng nhập", "secondary")}<a href="?screen=register" class="link-button">Dùng email khác</a></div>`, 2),
  },
  verify: {
    label: "Xác nhận email", group: "Bắt đầu", desc: "Tách trạng thái liên kết hợp lệ, hết hạn và đã xác nhận; không tự kích hoạt.",
    html: () => auth("Thiết lập<br>mật khẩu của bạn.", "Hoàn tất xác nhận bằng thao tác chủ động. Sau đó đăng nhập để chọn đề thi.", `<h1>Xác nhận email</h1><p class="muted">Đặt mật khẩu cho tài khoản để hoàn tất xác nhận.</p>${password("Mật khẩu mới")}<p class="small muted mb">Ít nhất 15 ký tự. Hãy dùng mật khẩu bạn sẽ nhớ khi đăng nhập.</p>${password("Nhập lại mật khẩu")}${link("login", "Xác nhận email →", "full")}<div class="mt">${notice("Liên kết đã dùng?", "Gửi lại chỉ xác nhận trạng thái, không đổi mật khẩu đã thiết lập lần đầu.")}</div><p class="small muted mt">Minh họa bố cục khi liên kết hợp lệ.</p>`, 2),
  },
};
