import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PasswordField, TextArea, TextField } from "../ui";

afterEach(cleanup);

describe("shared form fields", () => {
  it("keeps a supplied input id associated with its visible label and helper", () => {
    render(
      createElement(TextField, {
        id: "display-name",
        label: "Tên hiển thị",
        "aria-describedby": "name-help",
        error: "Tên quá dài",
      }),
    );
    const field = screen.getByLabelText("Tên hiển thị");
    expect(field.id).toBe("display-name");
    expect(field.getAttribute("aria-describedby")?.split(" ")).toContain("name-help");
    expect(field.getAttribute("aria-describedby")?.split(" ")).toContain(
      screen.getByText("Tên quá dài").id,
    );
  });

  it("associates a textarea validation error with its field", () => {
    render(createElement(TextArea, { label: "Nội dung", error: "Nội dung vượt giới hạn" }));
    const error = screen.getByText("Nội dung vượt giới hạn");
    expect(error.id).not.toBe("");
    expect(screen.getByLabelText("Nội dung").getAttribute("aria-describedby")).toBe(error.id);
  });

  it("keeps the password visibility control disabled with the field", () => {
    render(createElement(PasswordField, { label: "Mật khẩu", disabled: true }));
    expect(screen.getByRole("button", { name: "Hiện mật khẩu" }).hasAttribute("disabled")).toBe(
      true,
    );
  });
});
