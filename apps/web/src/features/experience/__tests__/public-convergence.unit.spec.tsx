import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";

import { PublicFrame } from "../public-chrome";
import { SampleExperience, SampleExperiencePanel } from "../sample-experience";

const session = vi.hoisted(() => ({ status: "anonymous" }));
vi.mock("@web/app/session", () => ({ useSession: () => session }));
afterEach(() => {
  cleanup();
  session.status = "anonymous";
});

it("does not describe an internal account link as opening outside the application", () => {
  render(
    <MemoryRouter>
      <PublicFrame>
        <h1>Public</h1>
      </PublicFrame>
    </MemoryRouter>,
  );
  const link = within(screen.getByRole("banner")).getByRole("link", { name: "Tạo tài khoản" });
  expect(link).toHaveAttribute("href", "/register");
  expect(link.textContent).not.toContain("↗");
});

it("replaces account destinations when the session becomes authenticated", () => {
  const tree = (
    <MemoryRouter>
      <PublicFrame>
        <h1>Public</h1>
      </PublicFrame>
    </MemoryRouter>
  );
  const view = render(tree);
  expect(
    within(screen.getByRole("banner")).getByRole("link", { name: "Đăng nhập" }),
  ).toHaveAttribute("href", "/login");
  session.status = "authenticated";
  view.rerender(
    <MemoryRouter>
      <PublicFrame>
        <h1>Public</h1>
      </PublicFrame>
    </MemoryRouter>,
  );
  const header = within(screen.getByRole("banner"));
  expect(header.queryByRole("link", { name: "Đăng nhập" })).toBeNull();
  expect(header.getByRole("link", { name: "Bảng làm việc" })).toHaveAttribute("href", "/dashboard");
  expect(header.getByRole("link", { name: "Đề thi" })).toHaveAttribute("href", "/exams");
});

it("reads the question before progress navigation in the standalone sample", () => {
  render(
    <MemoryRouter>
      <SampleExperience />
    </MemoryRouter>,
  );
  const question = screen.getByRole("region", { name: /Dãy số 2/ });
  const progress = screen.getByRole("complementary", { name: "Tiến độ làm bài" });
  expect(question.compareDocumentPosition(progress) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
});

it("keeps inline question and review headings below the host section heading", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <h1>Home</h1>
      <section>
        <h2>Thử câu mẫu</h2>
        <SampleExperiencePanel embedded />
      </section>
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading", { name: /Dãy số 2/ })).toHaveProperty("tagName", "H3");
  await user.click(screen.getByRole("button", { name: "Rà soát bài mẫu" }));
  expect(screen.getByRole("heading", { name: "Xem lại trước khi kết thúc" })).toHaveProperty(
    "tagName",
    "H3",
  );
  expect(screen.getByRole("heading", { name: /Câu 1 ·/ })).toHaveProperty("tagName", "H4");
});

it("opens review from the first question and retains choices, marks and focus on returning", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <SampleExperience />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole("radio", { name: "C 32" }));
  await user.click(screen.getByRole("button", { name: "Đánh dấu" }));
  await user.click(screen.getByRole("button", { name: "Rà soát bài mẫu" }));
  expect(screen.getByRole("heading", { name: "Xem lại trước khi kết thúc" })).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Sửa câu 1" }));
  expect(screen.getByRole("radio", { name: "C 32" })).toBeChecked();
  expect(screen.getByRole("button", { name: "Đã đánh dấu" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("heading", { name: /Dãy số 2/ })).toHaveFocus();
});
