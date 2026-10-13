import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Profile, Session } from "@web/shared/api/dto";
import { ApiError } from "@web/shared/api/errors";

import { LoginPage, VerifyPage } from "../auth-pages";

const fixture = vi.hoisted(() => ({
  api: { login: vi.fn(), getProfile: vi.fn(), confirmEmailVerification: vi.fn() },
  profile: null as Profile | null,
  status: "anonymous",
  needsReauth: false,
  reload: vi.fn(),
  adoptProfile: vi.fn(),
  replaceActor: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("@web/app/runtime", () => ({
  useRuntime: () => ({ api: fixture.api, verifyToken: "A".repeat(43) }),
}));
vi.mock("@web/app/session", () => ({
  useSession: () => ({
    status: fixture.status,
    profile: fixture.profile,
    needsReauth: fixture.needsReauth,
    reload: fixture.reload,
    adoptProfile: fixture.adoptProfile,
    replaceActor: fixture.replaceActor,
    logout: fixture.logout,
  }),
}));

const profile: Profile = {
  id: "actor-a",
  email: "person@example.test",
  emailVerifiedAt: "2026-10-01T00:00:00Z",
  displayName: "Lan",
  leaderboardOptIn: false,
  revision: 1,
};
const loginReceipt: Session = {
  userId: profile.id,
  accessExpiresAt: "2026-10-13T12:15:00Z",
  refreshExpiresAt: "2026-10-14T12:00:00Z",
  absoluteExpiresAt: "2026-10-20T12:00:00Z",
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function failure(status: number) {
  return new ApiError({
    kind: "http",
    status,
    errorCode: "Safe error",
    message: "Không thực hiện được yêu cầu.",
  });
}
function Setup({ page }: { page: "login" | "verify" }) {
  return (
    <MemoryRouter initialEntries={[page === "login" ? "/login" : "/verify-email"]}>
      <Link to="/left">Leave this page</Link>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-email" element={<VerifyPage />} />
        <Route path="/dashboard" element={<h1>Destination after login</h1>} />
        <Route path="/left" element={<h1>Another public page</h1>} />
      </Routes>
    </MemoryRouter>
  );
}
function submitLogin() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: profile.email } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), {
    target: { value: "fixture-password-ok" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
}
function submitVerification() {
  fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
    target: { value: "fixture-password-ok" },
  });
  fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu"), {
    target: { value: "fixture-password-ok" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận email" }));
}
function expectNoAdoption() {
  expect(fixture.adoptProfile).not.toHaveBeenCalled();
  expect(fixture.replaceActor).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.resetAllMocks();
  fixture.status = "anonymous";
  fixture.profile = null;
  fixture.needsReauth = false;
  fixture.api.login.mockResolvedValue({ data: loginReceipt });
  fixture.api.getProfile.mockResolvedValue({ data: profile });
  fixture.api.confirmEmailVerification.mockResolvedValue({ data: { verified: true } });
  // Match the existing provider's authoritative read/adoption so page tests expose stale calls.
  fixture.reload.mockImplementation(async () => {
    try {
      const response = await fixture.api.getProfile();
      fixture.adoptProfile(response.data);
      return true;
    } catch {
      return false;
    }
  });
});
afterEach(cleanup);

describe("identity request and session fences", () => {
  it("retries only the profile read after acknowledged login and a failed profile read", async () => {
    fixture.api.getProfile.mockRejectedValueOnce(failure(503));
    render(<Setup page="login" />);
    submitLogin();
    const retry = await screen.findByRole("button", { name: /(?:Thử )?tải lại hồ sơ/i });
    expect(fixture.api.login).toHaveBeenCalledTimes(1);
    fireEvent.click(retry);
    expect(await screen.findByText("Destination after login")).toBeInTheDocument();
    expect(fixture.api.login).toHaveBeenCalledTimes(1);
    expect(fixture.api.getProfile).toHaveBeenCalledTimes(2);
  });

  it("does not read or adopt a profile after a late login acknowledgement on another route", async () => {
    const pending = deferred<{ data: Session }>();
    fixture.api.login.mockReturnValue(pending.promise);
    render(<Setup page="login" />);
    submitLogin();
    fireEvent.click(screen.getByRole("link", { name: "Leave this page" }));
    await act(async () => pending.resolve({ data: loginReceipt }));
    expect(fixture.api.getProfile).not.toHaveBeenCalled();
    expectNoAdoption();
    expect(screen.getByText("Another public page")).toBeInTheDocument();
  });

  it("ignores a pending profile response after the login page unmounts", async () => {
    const pending = deferred<{ data: Profile }>();
    fixture.api.getProfile.mockReturnValue(pending.promise);
    const view = render(<Setup page="login" />);
    submitLogin();
    await act(async () => undefined);
    expect(fixture.api.getProfile).toHaveBeenCalledTimes(1);
    view.unmount();
    await act(async () => pending.resolve({ data: profile }));
    expectNoAdoption();
  });

  it("does not replace a new actor when the previous login acknowledgement arrives", async () => {
    const pending = deferred<{ data: Session }>();
    fixture.api.login.mockReturnValue(pending.promise);
    const view = render(<Setup page="login" />);
    submitLogin();
    fixture.status = "authenticated";
    fixture.profile = { ...profile, id: "actor-b", email: "b@example.test" };
    view.rerender(<Setup page="login" />);
    await act(async () => pending.resolve({ data: loginReceipt }));
    expect(fixture.api.getProfile).not.toHaveBeenCalled();
    expectNoAdoption();
    expect(screen.queryByText("Destination after login")).toBeNull();
  });

  it("does not adopt a profile when another actor arrives during its pending read", async () => {
    const pending = deferred<{ data: Profile }>();
    fixture.api.getProfile.mockReturnValue(pending.promise);
    const view = render(<Setup page="login" />);
    submitLogin();
    await act(async () => undefined);
    fixture.status = "authenticated";
    fixture.profile = { ...profile, id: "actor-b", email: "b@example.test" };
    view.rerender(<Setup page="login" />);
    await act(async () => pending.resolve({ data: profile }));
    expectNoAdoption();
    expect(screen.queryByText("Destination after login")).toBeNull();
  });

  it("rejects a profile whose id differs from the acknowledged login user", async () => {
    fixture.api.getProfile.mockResolvedValue({ data: { ...profile, id: "actor-b" } });
    render(<Setup page="login" />);
    submitLogin();
    await act(async () => undefined);
    expectNoAdoption();
    expect(screen.queryByText("Destination after login")).toBeNull();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it.each(["loading", "unavailable"])(
    "does not expose or post the verification form while session status is %s",
    (status) => {
      fixture.status = status;
      render(<Setup page="verify" />);
      expect(screen.queryByLabelText("Mật khẩu mới")).toBeNull();
      expect(screen.queryByRole("button", { name: "Xác nhận email" })).toBeNull();
      expect(fixture.api.confirmEmailVerification).not.toHaveBeenCalled();
    },
  );

  it("does not expose verification while the anonymous session needs reauthentication", () => {
    fixture.needsReauth = true;
    render(<Setup page="verify" />);
    expect(screen.queryByLabelText("Mật khẩu mới")).toBeNull();
    expect(fixture.api.confirmEmailVerification).not.toHaveBeenCalled();
  });

  it("removes the active verification form after a rejected or expired link", async () => {
    fixture.api.confirmEmailVerification.mockRejectedValue(failure(400));
    render(<Setup page="verify" />);
    submitVerification();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByLabelText("Mật khẩu mới")).toBeNull();
    expect(screen.queryByRole("button", { name: "Xác nhận email" })).toBeNull();
    expect(fixture.api.confirmEmailVerification).toHaveBeenCalledTimes(1);
  });

  it("does not navigate back to login after verification finishes on a different route", async () => {
    const pending = deferred<{ data: { verified: true } }>();
    fixture.api.confirmEmailVerification.mockReturnValue(pending.promise);
    render(<Setup page="verify" />);
    submitVerification();
    fireEvent.click(screen.getByRole("link", { name: "Leave this page" }));
    await act(async () => pending.resolve({ data: { verified: true } }));
    expect(screen.getByText("Another public page")).toBeInTheDocument();
    expectNoAdoption();
  });
});
