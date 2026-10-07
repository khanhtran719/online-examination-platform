import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm, RegisterForm, VerifyForm } from "../auth-pages";

afterEach(() => {
  cleanup();
});

describe("auth forms", () => {
  it("omits confirmPassword from the register body", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<RegisterForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Email"), "Person@Example.test");
    await userEvent.type(screen.getByLabelText("Tên hiển thị"), "Lan Nguyễn");
    await userEvent.type(screen.getByLabelText("Mật khẩu"), "fixture-password-ok");
    await userEvent.type(screen.getByLabelText("Nhập lại mật khẩu"), "fixture-password-ok");
    await userEvent.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    expect(onSubmit).toHaveBeenCalledWith({
      email: "person@example.test",
      displayName: "Lan Nguyễn",
      password: "fixture-password-ok",
    });
  });

  it("does not post verification when the form mounts", () => {
    const onSubmit = vi.fn();
    render(<VerifyForm onSubmit={onSubmit} />);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Xác nhận email" })).toBeTruthy();
  });

  it("keeps a short login password instead of the register minimum", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Email"), "person@example.test");
    await userEvent.type(screen.getByLabelText("Mật khẩu"), "short-secret");
    await userEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(onSubmit).toHaveBeenCalledWith({
      email: "person@example.test",
      password: "short-secret",
    });
  });
});
