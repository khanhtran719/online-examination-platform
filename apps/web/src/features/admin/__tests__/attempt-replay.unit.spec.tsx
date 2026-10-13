import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@web/shared/api/errors";

import { useAttemptReplay } from "../use-attempt-replay";

const runtime = vi.hoisted(() => ({
  api: { replayFailedAttempt: vi.fn() },
  revision: 3,
  permissions: ["assessment.replay"],
}));
vi.mock("@web/app/runtime", () => ({
  useRuntime: () => ({
    api: runtime.api,
    mode: "demo",
    demo: { permissions: runtime.permissions, replayRevision: () => runtime.revision },
  }),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  runtime.revision = 3;
  runtime.permissions = ["assessment.replay"];
});
function setup() {
  const refresh = vi.fn().mockResolvedValue(undefined),
    deny = vi.fn();
  const view = renderHook(
    ({ readable }) => useAttemptReplay("attempt", readable, true, false, refresh, deny),
    { initialProps: { readable: true } },
  );
  act(() => view.result.current.setReason("Phụ thuộc đã khôi phục."));
  return { ...view, refresh, deny };
}
it("guards duplicate sends before the pending render and ignores ACK after access loss/regrant", async () => {
  let resolve!: () => void;
  runtime.api.replayFailedAttempt.mockImplementation(
    () =>
      new Promise<void>((r) => {
        resolve = r;
      }),
  );
  const view = setup();
  act(() => view.result.current.open());
  let send!: Promise<void>;
  act(() => {
    send = view.result.current.send();
    void view.result.current.send();
  });
  expect(runtime.api.replayFailedAttempt).toHaveBeenCalledTimes(1);
  view.rerender({ readable: false });
  expect(view.result.current.reason).toBe("");
  view.rerender({ readable: true });
  await act(async () => {
    resolve();
    await send;
  });
  expect(view.refresh).not.toHaveBeenCalled();
  expect(view.result.current.message).toBeNull();
  expect(view.result.current.phase).toBe("idle");
});
it.each(["network", "timeout", "malformed"] as const)(
  "keeps the frozen intent after %s",
  async (kind) => {
    runtime.api.replayFailedAttempt
      .mockRejectedValueOnce(new ApiError({ kind, status: 0, errorCode: kind, message: kind }))
      .mockResolvedValue({ data: { accepted: true } });
    const view = setup();
    act(() => view.result.current.open());
    await act(() => view.result.current.send());
    expect(view.result.current.phase).toBe("unknown");
    await act(() => view.result.current.send(true));
    expect(runtime.api.replayFailedAttempt.mock.calls[1]).toEqual(
      runtime.api.replayFailedAttempt.mock.calls[0],
    );
    expect(view.result.current.phase).toBe("acked");
  },
);
it("validates Unicode code points and keeps an invalid confirmation open", () => {
  const view = setup();
  act(() => view.result.current.setReason("😀".repeat(500)));
  expect(view.result.current.canOpen).toBe(true);
  act(() => view.result.current.open());
  act(() => view.result.current.setReason("short"));
  expect(view.result.current.confirm).toBe(true);
  expect(view.result.current.canOpen).toBe(false);
  act(() => view.result.current.setReason("😀".repeat(501)));
  expect(view.result.current.canOpen).toBe(false);
});
it("cannot replay without a real admin revision and routes 403 into protected clearing", async () => {
  runtime.revision = 0;
  const view = setup();
  expect(view.result.current.canOpen).toBe(false);
  runtime.revision = 3;
  view.rerender({ readable: true });
  act(() => view.result.current.open());
  runtime.api.replayFailedAttempt.mockRejectedValue(
    new ApiError({ kind: "http", status: 403, errorCode: "Forbidden", message: "Forbidden" }),
  );
  await act(() => view.result.current.send());
  expect(view.deny).toHaveBeenCalledOnce();
});
