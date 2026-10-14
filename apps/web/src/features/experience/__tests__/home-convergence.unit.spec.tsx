import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { HomePage } from "../home-page";

const session = vi.hoisted(() => ({ status: "anonymous" }));
vi.mock("@web/app/session", () => ({ useSession: () => session }));
vi.mock("../hero-scene", () => ({ HeroScene: () => <div>Minh họa giao diện</div> }));
afterEach(cleanup);
beforeEach(() => {
  session.status = "anonymous";
});
function home() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

it("follows the selected Home journey with catalog before benefits and a compact guide before FAQ", () => {
  home();
  const headings = screen.getAllByRole("heading", { level: 2 }).map((n) => n.textContent);
  expect(headings).toEqual([
    "Thử ngay 3 câu mẫu.",
    "Danh mục đề thi",
    "Một nhịp thi. Ba điều rõ ràng.",
    "Biết từng bước trước khi bắt đầu.",
    "Những điều bạn có thể muốn biết.",
    "Sẵn sàng cho câu đầu tiên?",
  ]);
  const guide = screen.getByRole("region", { name: "Biết từng bước trước khi bắt đầu." });
  expect(within(guide).getByRole("link", { name: "Xem hướng dẫn 5 bước" })).toHaveAttribute(
    "href",
    "/how-it-works",
  );
  expect(within(guide).queryByRole("list")).not.toBeInTheDocument();
});

it("explains server deadline and asynchronous results in native FAQ disclosures", () => {
  home();
  const faq = screen.getByRole("region", { name: "Những điều bạn có thể muốn biết." });
  const disclosures = faq.querySelectorAll("details");
  expect(disclosures).toHaveLength(4);
  const deadline = [...disclosures].find(
    (n) => n.querySelector("summary")?.textContent === "Rời phòng thi có dừng đồng hồ không?",
  );
  expect(deadline).toHaveTextContent("Thời hạn do máy chủ đặt vẫn tiếp tục");
  const result = [...disclosures].find(
    (n) => n.querySelector("summary")?.textContent === "Vì sao chưa có kết quả ngay sau khi nộp?",
  );
  expect(result).toHaveTextContent("Chưa có điểm không phải điểm bằng không");
  expect(result).toHaveTextContent("chính sách của đề");
});

it("keeps all six catalog destinations and switches the hero CTA with the actual session state", () => {
  home();
  const catalog = screen.getByRole("region", { name: "Danh mục đề thi" });
  const routes = within(catalog)
    .getAllByRole("link")
    .map((n) => n.getAttribute("href"));
  expect(routes).toEqual([
    "/exams",
    ...["TOEIC", "IELTS", "IT_CERTIFICATION", "UNIVERSITY", "RECRUITMENT", "CORPORATE"].map(
      (c) => `/exams?category=${c}`,
    ),
  ]);
  expect(screen.getByRole("link", { name: "Tạo tài khoản thí sinh" })).toHaveAttribute(
    "href",
    "/register",
  );
  cleanup();
  session.status = "authenticated";
  home();
  expect(screen.getByRole("link", { name: "Đi tới đề thi" })).toHaveAttribute("href", "/exams");
  expect(screen.queryByRole("link", { name: "Tạo tài khoản thí sinh" })).not.toBeInTheDocument();
});
