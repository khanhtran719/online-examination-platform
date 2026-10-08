import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../shared/api/errors";
import { CheckEmailPage } from "../auth-pages";

const request = vi.hoisted(() => vi.fn());
vi.mock("../../../app/runtime", () => ({
  useRuntime: () => ({ api: { requestEmailVerification: request }, demo: null }),
}));
afterEach(() => {
  cleanup();
  request.mockReset();
});

describe("email resend feedback", () => {
  it("does not announce acceptance when the server cannot be reached", async () => {
    request.mockRejectedValue(
      new ApiError({ kind: "network", status: 0, errorCode: "NETWORK", message: "Mất kết nối" }),
    );
    render(
      <MemoryRouter>
        <CheckEmailPage />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText("Email cần gửi lại"), "Person@Example.test");
    await userEvent.click(screen.getByRole("button", { name: "Gửi lại hướng dẫn" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Chưa gửi lại được");
    expect(screen.queryByText("Đã nhận yêu cầu")).toBeNull();
    expect(screen.getByRole("button", { name: "Gửi lại hướng dẫn" })).toBeEnabled();
  });

  it("uses the server cooldown without announcing acceptance", async () => {
    request.mockRejectedValueOnce(
      new ApiError({
        kind: "http",
        status: 429,
        errorCode: "RATE_LIMIT",
        message: "Chờ",
        retryAfterSeconds: 90,
      }),
    );
    render(
      <MemoryRouter>
        <CheckEmailPage />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Gửi lại hướng dẫn" }));
    expect(await screen.findByText("Hãy chờ trước khi gửi lại")).toBeInTheDocument();
    expect(screen.queryByText("Đã nhận yêu cầu")).toBeNull();
    expect(screen.getByRole("button", { name: /Gửi lại sau 90 giây/ })).toBeDisabled();
  });
});
