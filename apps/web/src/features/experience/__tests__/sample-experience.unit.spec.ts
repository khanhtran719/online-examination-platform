import { createElement } from "react";
import { MemoryRouter } from "react-router";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { SampleExperience } from "../sample-experience";

afterEach(cleanup);

function mount() {
  render(createElement(MemoryRouter, null, createElement(SampleExperience)));
  return userEvent.setup();
}

describe("public sample experience", () => {
  it("completes all three question types and links to the real registration route", async () => {
    const user = mount();
    await user.click(screen.getByRole("radio", { name: "C 32" }));
    await user.click(screen.getByRole("button", { name: "Đánh dấu" }));
    await user.click(screen.getByRole("button", { name: "Câu tiếp theo" }));
    await user.click(screen.getByRole("checkbox", { name: "A 12" }));
    await user.click(screen.getByRole("checkbox", { name: "C 28" }));
    await user.click(screen.getByRole("button", { name: "Câu tiếp theo" }));
    await user.click(screen.getByRole("radio", { name: "A Đúng" }));
    await user.click(screen.getByRole("button", { name: "Xem lại lựa chọn" }));
    expect(screen.getByRole("heading", { name: "Xem lại trước khi kết thúc" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Xem kết quả mẫu" }));
    expect(screen.getByText("3 / 3")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tạo tài khoản" }).getAttribute("href")).toBe(
      "/register",
    );
    await user.click(screen.getByRole("button", { name: "Thử lại 3 câu" }));
    expect(screen.getByRole("radio", { name: "C 32" }).getAttribute("checked")).toBeNull();
  });

  it("keeps the answer and mark when returning, and clears the answer on request", async () => {
    const user = mount();
    await user.click(screen.getByRole("radio", { name: "C 32" }));
    await user.click(screen.getByRole("button", { name: "Đánh dấu" }));
    await user.click(screen.getByRole("button", { name: "Câu tiếp theo" }));
    await user.click(screen.getByRole("button", { name: "Câu trước" }));
    expect((screen.getByRole("radio", { name: "C 32" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("button", { name: "Đã đánh dấu" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Xóa lựa chọn" }));
    expect((screen.getByRole("radio", { name: "C 32" }) as HTMLInputElement).checked).toBe(false);
  });
});
