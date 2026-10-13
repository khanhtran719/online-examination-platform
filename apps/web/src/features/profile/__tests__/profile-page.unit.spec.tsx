import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createContext, useContext } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@web/shared/api/errors";

import { ProfilePage } from "../profile-page";

const SessionTick = createContext(0);

const state = vi.hoisted(() => ({
  api: { updateProfile: vi.fn(), getProfile: vi.fn() },
  profile: {
    id: "actor-a",
    email: "a@example.test",
    emailVerifiedAt: "2026-10-01T00:00:00Z",
    displayName: "Lan",
    leaderboardOptIn: false,
    revision: 1,
  },
  adopt: vi.fn(),
  reload: vi.fn(),
  setUnconfirmed: vi.fn(),
  logout: vi.fn(),
  clear: vi.fn(),
}));
vi.mock("@web/app/runtime", () => ({ useRuntime: () => ({ api: state.api, mode: "demo" }) }));
vi.mock("@web/app/memory", () => ({ useMemory: () => ({ clear: state.clear }) }));
vi.mock("@web/app/session", () => ({
  useSession: () => {
    useContext(SessionTick);
    return {
      status: "authenticated",
      needsReauth: false,
      profile: state.profile,
      adoptProfile: state.adopt,
      reload: state.reload,
      setUnconfirmed: state.setUnconfirmed,
      logout: state.logout,
    };
  },
}));
beforeEach(() => {
  vi.resetAllMocks();
  state.profile = {
    id: "actor-a",
    email: "a@example.test",
    emailVerifiedAt: "2026-10-01T00:00:00Z",
    displayName: "Lan",
    leaderboardOptIn: false,
    revision: 1,
  };
  state.api.getProfile.mockImplementation(async () => ({ data: state.profile }));
  state.reload.mockResolvedValue(true);
});
afterEach(cleanup);
function mount() {
  const router = createMemoryRouter([{ path: "/profile", element: <ProfilePage /> }], {
    initialEntries: ["/profile"],
  });
  let tick = 0;
  const tree = () => (
    <SessionTick.Provider value={tick}>
      <RouterProvider router={router} />
    </SessionTick.Provider>
  );
  const view = render(tree());
  return {
    ...view,
    router,
    rerenderSession() {
      tick += 1;
      view.rerender(tree());
    },
  };
}
function saveButton() {
  return screen.getByRole("button", { name: /^Lưu (hồ sơ|thay đổi)$/ });
}
it("sends only one profile write for synchronous repeated save clicks", async () => {
  state.api.updateProfile.mockImplementation(() => new Promise(() => undefined));
  mount();
  fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: "Lan mới" } });
  const save = saveButton();
  act(() => {
    save.click();
    save.click();
  });
  expect(state.api.updateProfile).toHaveBeenCalledTimes(1);
});
it("does not carry an open discard dialog into another actor's profile", async () => {
  const h = mount();
  fireEvent.change(screen.getByLabelText("Tên hiển thị"), {
    target: { value: "Bản riêng đang sửa" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Hủy thay đổi" }));
  expect(screen.getByRole("dialog")).toBeVisible();
  state.profile = { ...state.profile, id: "actor-b", email: "b@example.test", displayName: "Minh" };
  h.rerenderSession();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByLabelText("Tên hiển thị")).toHaveValue("Minh");
});
it("accepts 80 astral Unicode code points as a valid display name", async () => {
  state.api.updateProfile.mockImplementation(() => new Promise(() => undefined));
  mount();
  fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: "🌱".repeat(80) } });
  fireEvent.click(saveButton());
  await waitFor(() => expect(state.api.updateProfile).toHaveBeenCalledTimes(1));
});
it("retains the same body, base revision and key after an unknown 503 result", async () => {
  state.api.updateProfile.mockRejectedValue(
    new ApiError({
      kind: "http",
      status: 503,
      errorCode: "Service unavailable",
      message: "Service unavailable",
    }),
  );
  mount();
  fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: "Lan mới" } });
  fireEvent.click(saveButton());
  const retry = await waitFor(() => {
    const button = screen.queryByRole("button", { name: "Thử lại cùng yêu cầu" }) ?? saveButton();
    expect(button).toBeEnabled();
    return button;
  });
  fireEvent.click(retry);
  await waitFor(() => expect(state.api.updateProfile).toHaveBeenCalledTimes(2));
  expect(state.api.updateProfile.mock.calls[1]).toEqual(state.api.updateProfile.mock.calls[0]);
});
