import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { validateLogin, validateRegister } from "@web/shared/validation";

import { LoginForm, RegisterForm, VerifyForm } from "../auth-pages";

afterEach(cleanup);
describe("Identity form request boundaries", () => {
  it.each(["a@localhost", "é@example.test", "a@@b.test", "a@b.test\nX"])(
    "rejects an email outside the API contract: %s",
    (email) => {
      expect(validateLogin({ email, password: "short" }).body).toBeNull();
    },
  );
  it("counts Unicode code points for names and login passwords", () => {
    const result = validateRegister({
      email: "a@b.test",
      displayName: "😀".repeat(80),
      password: "valid-password-here",
      confirmPassword: "valid-password-here",
    });
    expect(result.body?.displayName).toBe("😀".repeat(80));
    expect(validateLogin({ email: "a@b.test", password: "😀".repeat(128) }).body).not.toBeNull();
  });
  it("rejects controls in display names", () => {
    expect(
      validateRegister({
        email: "a@b.test",
        displayName: "Name\nAnother",
        password: "valid-password-here",
        confirmPassword: "valid-password-here",
      }).body,
    ).toBeNull();
  });
  it.each(["login", "register", "verify"])(
    "serializes synchronous %s submissions and freezes inputs",
    async (kind) => {
      let release!: () => void;
      const pending = new Promise<void>((done) => {
        release = done;
      });
      const submit = vi.fn(() => pending);
      const Component =
        kind === "login" ? LoginForm : kind === "register" ? RegisterForm : VerifyForm;
      const view = render(<Component onSubmit={submit} />);
      if (kind !== "verify")
        fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.test" } });
      if (kind === "register")
        fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: "Lan" } });
      fireEvent.change(screen.getByLabelText(kind === "verify" ? "Mật khẩu mới" : "Mật khẩu"), {
        target: { value: "valid-password-here" },
      });
      if (kind !== "login")
        fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu"), {
          target: { value: "valid-password-here" },
        });
      const form = view.container.querySelector("form")!;
      act(() => {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      });
      expect(submit).toHaveBeenCalledTimes(1);
      for (const input of view.container.querySelectorAll("input")) expect(input).toBeDisabled();
      await act(async () => release());
    },
  );
});
