import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { HomePage } from "../home-page";

vi.mock("../../../app/session", () => ({ useSession: () => ({ status: "anonymous" }) }));
vi.mock("../hero-scene", () => ({ HeroScene: () => <div>Minh họa giao diện</div> }));
afterEach(cleanup);

it("does not move initial focus into the embedded sample in Strict Mode", () => {
  render(
    <StrictMode>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </StrictMode>,
  );
  expect(screen.getByRole("heading", { name: /Dãy số 2/ })).not.toHaveFocus();
});

it("lets a visitor try questions inline while retaining the home heading, title and selections", () => {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(document.title).toBe("Vào nhịp thi · Phòng thi");
  const first = screen.getAllByRole("radio")[0]!;
  fireEvent.click(first);
  fireEvent.click(screen.getByRole("button", { name: /Câu tiếp theo/ }));
  expect(screen.getAllByRole("checkbox")).toHaveLength(4);
  fireEvent.click(screen.getAllByRole("checkbox")[0]!);
  fireEvent.click(screen.getByRole("button", { name: /Câu trước/ }));
  expect(screen.getAllByRole("radio")[0]).toBeChecked();
  expect(document.title).toBe("Vào nhịp thi · Phòng thi");
});
