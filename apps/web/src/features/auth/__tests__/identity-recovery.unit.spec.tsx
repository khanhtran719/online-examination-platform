import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@web/shared/api/errors";

import { CheckEmailPage, RegisterPage, VerifyPage } from "../auth-pages";

const fixture = vi.hoisted(() => ({
  request: vi.fn(),
  confirm: vi.fn(),
  register: vi.fn(),
  status: "anonymous",
  epoch: 0,
}));
vi.mock("@web/app/runtime", () => ({
  useRuntime: () => ({
    api: {
      requestEmailVerification: fixture.request,
      confirmEmailVerification: fixture.confirm,
      register: fixture.register,
    },
    verifyToken: "A".repeat(43),
  }),
}));
vi.mock("@web/app/session", () => ({
  useSession: () => ({
    status: fixture.status,
    epoch: fixture.epoch,
    profile: null,
    needsReauth: false,
  }),
}));
function failure(status: number, wait = 2) {
  return new ApiError({
    kind: "http",
    status,
    errorCode: "Safe error",
    message: "Safe error",
    retryAfterSeconds: wait,
  });
}
function Setup({ path }: { path: string }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Link to="/left">Leave</Link>
      <Routes>
        <Route path="/verify-email" element={<VerifyPage />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<h1>Login destination</h1>} />
        <Route path="/left" element={<h1>Left</h1>} />
      </Routes>
    </MemoryRouter>
  );
}
function verify() {
  fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
    target: { value: "fixture-password-ok" },
  });
  fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu"), {
    target: { value: "fixture-password-ok" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận email" }));
}
beforeEach(() => {
  vi.resetAllMocks();
  fixture.status = "anonymous";
  fixture.epoch = 0;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe("Identity explicit recovery", () => {
  it("keeps verification retry immutable after an unknown acknowledgement and never retries automatically", async () => {
    fixture.confirm
      .mockRejectedValueOnce(failure(503))
      .mockResolvedValueOnce({ data: { verified: true } });
    render(<Setup path="/verify-email" />);
    verify();
    const retry = await screen.findByRole("button", { name: "Thử xác nhận lại" });
    expect(fixture.confirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Mật khẩu mới")).toBeNull();
    fireEvent.click(retry);
    expect(await screen.findByText("Login destination")).toBeInTheDocument();
    expect(fixture.confirm.mock.calls[1]).toEqual(fixture.confirm.mock.calls[0]);
  });
  it("clears an unknown verification intent on session-epoch change", async () => {
    fixture.confirm.mockRejectedValueOnce(failure(503));
    const view = render(<Setup path="/verify-email" />);
    verify();
    await screen.findByRole("button", { name: "Thử xác nhận lại" });
    fixture.epoch += 1;
    view.rerender(<Setup path="/verify-email" />);
    expect(screen.queryByRole("button", { name: "Thử xác nhận lại" })).toBeNull();
    expect(screen.getByLabelText("Mật khẩu mới")).toHaveValue("");
    expect(fixture.confirm).toHaveBeenCalledTimes(1);
  });
  it("does not bypass server verification wait and uses a minimum 60-second cooldown", async () => {
    fixture.confirm.mockRejectedValueOnce(failure(429, 2));
    render(<Setup path="/verify-email" />);
    verify();
    expect(await screen.findByRole("button", { name: "Xác nhận lại sau 60 giây" })).toBeDisabled();
    expect(fixture.confirm).toHaveBeenCalledTimes(1);
  });
  it("checks session explicitly after a forbidden verification response", async () => {
    fixture.confirm.mockRejectedValueOnce(failure(403));
    render(<Setup path="/verify-email" />);
    verify();
    expect(await screen.findByRole("button", { name: "Kiểm tra lại phiên" })).toBeEnabled();
    expect(screen.queryByLabelText("Mật khẩu mới")).toBeNull();
    expect(fixture.confirm).toHaveBeenCalledTimes(1);
  });
  it("never sends an empty resend email or announces initial acceptance", async () => {
    render(<Setup path="/check-email" />);
    expect(screen.queryByText("Đã nhận yêu cầu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Gửi lại hướng dẫn" }));
    expect(screen.getByLabelText("Email cần gửi lại")).toHaveAttribute("aria-invalid", "true");
    expect(fixture.request).not.toHaveBeenCalled();
  });
  it("serializes resend clicks and does not use an edited email while pending", async () => {
    let done!: (value: unknown) => void;
    fixture.request.mockReturnValue(
      new Promise((resolve) => {
        done = resolve;
      }),
    );
    const view = render(<Setup path="/check-email" />);
    fireEvent.change(screen.getByLabelText("Email cần gửi lại"), {
      target: { value: "Person@Example.test" },
    });
    const button = screen.getByRole("button", { name: "Gửi lại hướng dẫn" });
    act(() => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(fixture.request).toHaveBeenCalledTimes(1);
    expect(fixture.request).toHaveBeenCalledWith({ email: "person@example.test" });
    expect(screen.getByLabelText("Email cần gửi lại")).toBeDisabled();
    view.unmount();
    await act(async () => done({ data: { accepted: true } }));
    expect(screen.queryByText("Đã nhận yêu cầu")).toBeNull();
  });
  it("changing resend email does not remove the cooldown", async () => {
    fixture.request.mockResolvedValue({ data: { accepted: true } });
    render(<Setup path="/check-email" />);
    fireEvent.change(screen.getByLabelText("Email cần gửi lại"), { target: { value: "a@b.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi lại hướng dẫn" }));
    await screen.findByText("Đã nhận yêu cầu");
    fireEvent.change(screen.getByLabelText("Email cần gửi lại"), {
      target: { value: "other@b.test" },
    });
    expect(screen.getByRole("button", { name: "Gửi lại sau 60 giây" })).toBeDisabled();
    expect(fixture.request).toHaveBeenCalledTimes(1);
  });
  it("monotonic resend wait survives wall-clock jumps and unlocks only after its duration", async () => {
    vi.useFakeTimers();
    let monotonic = 100;
    vi.spyOn(performance, "now").mockImplementation(() => monotonic);
    fixture.request.mockResolvedValue({ data: { accepted: true } });
    render(<Setup path="/check-email" />);
    fireEvent.change(screen.getByLabelText("Email cần gửi lại"), { target: { value: "a@b.test" } });
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Gửi lại hướng dẫn" })),
    );
    vi.setSystemTime(Date.now() + 9999999);
    await act(async () => vi.advanceTimersByTime(500));
    expect(screen.getByRole("button", { name: "Gửi lại sau 60 giây" })).toBeDisabled();
    monotonic += 60001;
    await act(async () => vi.advanceTimersByTime(500));
    expect(screen.getByRole("button", { name: "Gửi lại hướng dẫn" })).toBeEnabled();
    vi.restoreAllMocks();
  });
  it("register does not put email or password in browser history and does not log in", async () => {
    fixture.register.mockResolvedValue({ data: { accepted: true } });
    let state: unknown;
    function Destination() {
      state = useLocation().state;
      return <h1>Check inbox</h1>;
    }
    render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/check-email" element={<Destination />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.test" } });
    fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: "Lan" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), {
      target: { value: "fixture-password-ok" },
    });
    fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu"), {
      target: { value: "fixture-password-ok" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    expect(await screen.findByText("Check inbox")).toBeInTheDocument();
    expect(state).toEqual({ accepted: true });
    expect(fixture.request).not.toHaveBeenCalled();
    expect(fixture.confirm).not.toHaveBeenCalled();
  });
});

it("clears resend identity and pending state when an anonymous session epoch changes", async () => {
  let done!: (value: unknown) => void;
  fixture.request.mockReturnValue(
    new Promise((resolve) => {
      done = resolve;
    }),
  );
  const view = render(<Setup path="/check-email" />);
  fireEvent.change(screen.getByLabelText("Email cần gửi lại"), {
    target: { value: "private@example.test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Gửi lại hướng dẫn" }));
  fixture.epoch++;
  view.rerender(<Setup path="/check-email" />);
  expect(screen.getByLabelText("Email cần gửi lại")).toHaveValue("");
  expect(screen.getByLabelText("Email cần gửi lại")).toBeEnabled();
  await act(async () => done({ data: { accepted: true } }));
  expect(screen.queryByText("Đã nhận yêu cầu")).toBeNull();
});
