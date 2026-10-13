import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it } from "vitest";

import { HelpPage } from "../help-page";
import { NotFoundPage } from "../not-found-page";

afterEach(cleanup);

it("starts with examination guidance and lets visitors switch topics without a session", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <HelpPage />
    </MemoryRouter>,
  );
  expect(screen.getByRole("button", { name: "Trong phòng thi 5 câu" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByText("Khi nào câu trả lời được xem là đã lưu?")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Tài khoản 2 câu" }));
  expect(screen.queryByText("Khi nào câu trả lời được xem là đã lưu?")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Tài khoản", level: 2 })).toBeVisible();
  expect(screen.getByText("Tại sao đăng ký xong chưa đăng nhập được?")).toBeVisible();
  expect(screen.getByRole("button", { name: "Tài khoản 2 câu" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await user.click(screen.getByRole("button", { name: "Nộp bài & Kết quả 3 câu" }));
  expect(screen.getByText("Kết quả có ngay sau khi nộp bài không?")).toBeVisible();
  expect(screen.queryByText("Tại sao đăng ký xong chưa đăng nhập được?")).not.toBeInTheDocument();
});

it("returns to an examination topic with a fresh disclosure instead of the previous topic answer", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <HelpPage />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole("button", { name: "Chọn đề 3 câu" }));
  expect(screen.getByText("Có những loại câu hỏi nào?")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Trong phòng thi 5 câu" }));
  const first = screen.getByText("Khi nào câu trả lời được xem là đã lưu?").closest("details")!;
  expect(first).toHaveAttribute("open");
  expect(within(first).getByText(/máy chủ xác nhận/)).toBeVisible();
  expect(screen.queryByText("Có những loại câu hỏi nào?")).not.toBeInTheDocument();
});

it("offers only explicit public recovery links without reflecting an unknown URL", () => {
  render(
    <MemoryRouter initialEntries={["/private-placeholder?token=synthetic-secret#fragment"]}>
      <NotFoundPage />
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading", { name: "Không có trang này" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Về trang chủ" })).toHaveAttribute("href", "/");
  expect(screen.getByRole("link", { name: "Thử trải nghiệm" })).toHaveAttribute(
    "href",
    "/experience",
  );
  expect(screen.getByRole("link", { name: "Trợ giúp" })).toHaveAttribute("href", "/help");
  expect(document.body.textContent).not.toMatch(/private-placeholder|synthetic-secret|fragment/);
});
