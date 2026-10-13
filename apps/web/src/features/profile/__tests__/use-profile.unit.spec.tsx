import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { Profile } from "@web/shared/api/dto";
import { ApiError } from "@web/shared/api/errors";

import { displayNameError } from "../profile-model";
import { useProfile } from "../use-profile";

const fixture = vi.hoisted(() => ({
  api: { updateProfile: vi.fn(), getProfile: vi.fn() },
  profile: null as Profile | null,
  status: "authenticated",
  needsReauth: false,
  sync: vi.fn(),
  clear: vi.fn(),
  setUnconfirmed: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("@web/app/runtime", () => ({ useRuntime: () => ({ api: fixture.api }) }));
vi.mock("@web/app/memory", () => ({ useMemory: () => ({ clear: fixture.clear }) }));
vi.mock("@web/app/session", () => ({
  useSession: () => ({
    profile: fixture.profile,
    status: fixture.status,
    needsReauth: fixture.needsReauth,
    syncProfile: fixture.sync,
    setUnconfirmed: fixture.setUnconfirmed,
    logout: fixture.logout,
  }),
}));
const base: Profile = {
  id: "actor-a",
  email: "a@example.test",
  emailVerifiedAt: "2026-10-01T00:00:00Z",
  displayName: "Lan",
  leaderboardOptIn: false,
  revision: 1,
};
const failure = (status: number, kind: "http" | "network" = "http", retryAfterSeconds?: number) =>
  new ApiError({
    kind,
    status,
    errorCode: "Version conflict",
    message: "Safe error",
    retryAfterSeconds,
  });
beforeEach(() => {
  vi.resetAllMocks();
  fixture.profile = { ...base };
  fixture.status = "authenticated";
  fixture.needsReauth = false;
  fixture.api.getProfile.mockResolvedValue({
    data: { ...base, displayName: "Lan mới", revision: 2 },
  });
  fixture.api.updateProfile.mockResolvedValue({
    data: { resourceId: base.id, revision: 2, acceptedAt: "2026-10-13T00:00:00Z" },
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
function setup() {
  const hook = renderHook(() => useProfile());
  act(() => hook.result.current.changeName("Lan mới"));
  return hook;
}
it("keeps the captured revision and body when session projection changes before an unknown retry", async () => {
  fixture.api.updateProfile.mockRejectedValue(failure(503));
  const h = setup();
  await act(async () => h.result.current.save());
  fixture.profile = { ...base, revision: 7 };
  h.rerender();
  act(() => h.result.current.changeName("Different"));
  await act(async () => h.result.current.retry());
  expect(fixture.api.updateProfile.mock.calls[1]).toEqual(fixture.api.updateProfile.mock.calls[0]);
  expect(fixture.api.updateProfile.mock.calls[1]![1].expectedRevision).toBe(1);
  expect(h.result.current.name).toBe("Lan mới");
});
it("keeps write acknowledgement when the subsequent projection read fails and refreshes without another PUT", async () => {
  fixture.api.getProfile.mockRejectedValue(failure(503));
  const h = setup();
  await act(async () => h.result.current.save());
  expect(h.result.current.receipt?.revision).toBe(2);
  expect(h.result.current.phase).toBe("accepted");
  expect(h.result.current.base?.displayName).toBe("Lan mới");
  await act(async () => h.result.current.save());
  fixture.api.getProfile.mockResolvedValue({
    data: { ...base, displayName: "Lan mới", revision: 2 },
  });
  await act(async () => h.result.current.refresh());
  expect(h.result.current.phase).toBe("idle");
  expect(fixture.api.updateProfile).toHaveBeenCalledTimes(1);
});
it("rejects a projection that contradicts the acknowledged fields at the same revision", async () => {
  fixture.api.getProfile.mockResolvedValue({
    data: { ...base, displayName: "Wrong name", revision: 2 },
  });
  const h = setup();
  await act(async () => h.result.current.save());
  expect(h.result.current.base?.displayName).toBe("Lan mới");
  expect(h.result.current.readError).toBeInstanceOf(ApiError);
  expect(h.result.current.phase).toBe("accepted");
});
it("rejects a refreshed projection older than a revision already observed in the session", async () => {
  const h = setup();
  fixture.profile = { ...base, revision: 7, displayName: "Elsewhere" };
  h.rerender();
  await act(async () => h.result.current.save());
  expect(h.result.current.phase).toBe("accepted");
  expect(h.result.current.readError).toBeInstanceOf(ApiError);
});
it.each([
  { resourceId: "actor-b", revision: 2 },
  { resourceId: "actor-a", revision: 9 },
])("does not confirm an unrelated or unexpected write receipt %j", async (receipt) => {
  fixture.api.updateProfile.mockResolvedValue({
    data: { ...receipt, acceptedAt: "2026-10-13T00:00:00Z" },
  });
  const h = setup();
  await act(async () => h.result.current.save());
  expect(h.result.current.phase).toBe("unknown");
  expect(h.result.current.receipt).toBeNull();
  expect(fixture.sync).not.toHaveBeenCalled();
  expect(fixture.api.getProfile).not.toHaveBeenCalled();
});
it("requires a fresh conflict read and an explicit choice before adopting a new write revision", async () => {
  fixture.api.updateProfile.mockRejectedValueOnce(failure(409));
  fixture.api.getProfile.mockRejectedValueOnce(failure(503));
  const h = setup();
  await act(async () => h.result.current.save());
  act(() => h.result.current.keepMine());
  expect(h.result.current.phase).toBe("conflict");
  expect(h.result.current.base?.revision).toBe(1);
  fixture.api.getProfile.mockResolvedValue({
    data: { ...base, displayName: "Bản máy chủ", revision: 2 },
  });
  await act(async () => h.result.current.refresh());
  expect(h.result.current.base?.revision).toBe(1);
  expect(h.result.current.name).toBe("Lan mới");
  act(() => h.result.current.keepMine());
  expect(h.result.current.base?.revision).toBe(2);
  expect(fixture.api.updateProfile).toHaveBeenCalledTimes(1);
  fixture.api.updateProfile.mockResolvedValue({
    data: { resourceId: base.id, revision: 3, acceptedAt: "2026-10-13T00:00:00Z" },
  });
  fixture.api.getProfile.mockResolvedValue({
    data: { ...base, displayName: "Lan mới", revision: 3 },
  });
  await act(async () => h.result.current.save());
  const [first, second] = fixture.api.updateProfile.mock.calls;
  expect(second![0]).not.toBe(first![0]);
  expect(second![1].expectedRevision).toBe(2);
});
it("adopts both current server fields when choosing its conflict snapshot", async () => {
  fixture.api.updateProfile.mockRejectedValue(failure(409));
  fixture.api.getProfile.mockResolvedValue({
    data: { ...base, displayName: "Bản máy chủ", leaderboardOptIn: true, revision: 2 },
  });
  const h = setup();
  await act(async () => h.result.current.save());
  act(() => h.result.current.useServer());
  expect(h.result.current.name).toBe("Bản máy chủ");
  expect(h.result.current.optIn).toBe(true);
  expect(h.result.current.dirty).toBe(false);
});
it("does not revive another actor's draft or session from a late ACK", async () => {
  let resolve!: (value: unknown) => void;
  fixture.api.updateProfile.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const h = setup();
  act(() => {
    void h.result.current.save();
  });
  fixture.profile = { ...base, id: "actor-b", email: "b@example.test", displayName: "Minh" };
  h.rerender();
  await act(async () => resolve({ data: { resourceId: base.id, revision: 2 } }));
  expect(h.result.current.name).toBe("Minh");
  expect(fixture.sync).not.toHaveBeenCalled();
  expect(fixture.api.getProfile).not.toHaveBeenCalled();
});
it("clears and hides private state on reauth and ignores the pending write", async () => {
  let resolve!: (value: unknown) => void;
  fixture.api.updateProfile.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const h = setup();
  act(() => {
    void h.result.current.save();
  });
  fixture.needsReauth = true;
  h.rerender();
  expect(h.result.current.visible).toBe(false);
  expect(h.result.current.name).toBe("");
  await act(async () => resolve({ data: { resourceId: base.id, revision: 2 } }));
  expect(fixture.sync).not.toHaveBeenCalled();
});
it.each([401, 403])(
  "latches a protected %s write failure and blocks further requests",
  async (status) => {
    fixture.api.updateProfile.mockRejectedValue(failure(status));
    const h = setup();
    await act(async () => h.result.current.save());
    expect(h.result.current.visible).toBe(false);
    expect(h.result.current.intent).toBeNull();
    expect(fixture.clear).toHaveBeenCalled();
    await act(async () => h.result.current.save());
    expect(fixture.api.updateProfile).toHaveBeenCalledTimes(1);
  },
);
it("serializes explicit projection retries even before reading state renders", async () => {
  fixture.api.getProfile.mockRejectedValueOnce(failure(503));
  const h = setup();
  await act(async () => h.result.current.save());
  fixture.api.getProfile.mockImplementation(() => new Promise(() => undefined));
  act(() => {
    void h.result.current.refresh();
    void h.result.current.refresh();
  });
  expect(fixture.api.getProfile).toHaveBeenCalledTimes(2);
});
it("ignores a late write after unmount", async () => {
  let resolve!: (value: unknown) => void;
  fixture.api.updateProfile.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const h = setup();
  act(() => {
    void h.result.current.save();
  });
  h.unmount();
  await act(async () => resolve({ data: { resourceId: base.id, revision: 2 } }));
  expect(fixture.sync).not.toHaveBeenCalled();
});
it("does not silently advance the base of dirty fields on an external profile update", () => {
  const h = setup();
  fixture.profile = { ...base, revision: 6, displayName: "Elsewhere" };
  h.rerender();
  expect(h.result.current.base?.revision).toBe(1);
  expect(h.result.current.name).toBe("Lan mới");
});
it("honors server retry wait and replays the same immutable intent", async () => {
  vi.useFakeTimers();
  fixture.api.updateProfile.mockRejectedValue(failure(429, "http", 2));
  const h = setup();
  await act(async () => h.result.current.save());
  await act(async () => h.result.current.retry());
  expect(fixture.api.updateProfile).toHaveBeenCalledTimes(1);
  await act(async () => vi.advanceTimersByTimeAsync(2100));
  await act(async () => h.result.current.retry());
  expect(fixture.api.updateProfile).toHaveBeenCalledTimes(2);
  expect(fixture.api.updateProfile.mock.calls[1]).toEqual(fixture.api.updateProfile.mock.calls[0]);
});
it("rejects controls or more than 80 code points while allowing astral characters", () => {
  expect(displayNameError("🌱".repeat(80))).toBeNull();
  expect(displayNameError("🌱".repeat(81))).not.toBeNull();
  expect(displayNameError("Lan\nNguyễn")).not.toBeNull();
  expect(displayNameError("   ")).not.toBeNull();
});
