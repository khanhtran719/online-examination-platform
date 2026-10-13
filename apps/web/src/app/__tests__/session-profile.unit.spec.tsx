import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { SessionProvider, useSession } from "../session";

const input = vi.hoisted(() => ({
  api: { getProfile: vi.fn(), logout: vi.fn() },
  clear: vi.fn(),
  transport: { probe: vi.fn(), refresh: vi.fn() },
}));
vi.mock("../runtime", () => ({ useRuntime: () => input }));
vi.mock("../memory", () => ({ useMemory: () => ({ clear: input.clear }) }));
afterEach(cleanup);
it("updates only the current profile projection without authenticating another actor or regressing its revision", async () => {
  const base = {
    id: "actor-a",
    email: "a@example.test",
    displayName: "Lan",
    leaderboardOptIn: false,
    emailVerifiedAt: "2026-10-01T00:00:00Z",
    revision: 1,
  };
  input.api.getProfile.mockResolvedValue({ data: base });
  input.api.logout.mockResolvedValue({ data: { revoked: true } });
  const client = new QueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <SessionProvider>{children}</SessionProvider>
      </QueryClientProvider>
    );
  }
  const h = renderHook(() => useSession(), { wrapper: Wrapper });
  await waitFor(() => expect(h.result.current.status).toBe("authenticated"));
  act(() => h.result.current.syncProfile({ ...base, displayName: "Lan mới", revision: 2 }));
  act(() => h.result.current.syncProfile({ ...base, id: "actor-b", revision: 10 }));
  act(() => h.result.current.syncProfile(base));
  expect(h.result.current.profile?.displayName).toBe("Lan mới");
  expect(h.result.current.profile?.revision).toBe(2);
  await act(async () => h.result.current.logout());
  act(() => h.result.current.syncProfile({ ...base, revision: 20 }));
  expect(h.result.current.profile).toBeNull();
  expect(h.result.current.status).toBe("anonymous");
});

it("does not restore the principal from a profile read that completes after logout", async () => {
  let resolve!: (value: { data: import("../../shared/api/dto").Profile }) => void;
  input.api.getProfile.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  input.api.logout.mockResolvedValue({ data: { revoked: true } });
  const client = new QueryClient();
  const h = renderHook(() => useSession(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <SessionProvider>{children}</SessionProvider>
      </QueryClientProvider>
    ),
  });
  await act(async () => h.result.current.logout());
  await act(async () =>
    resolve({
      data: {
        id: "late-actor",
        email: "a@example.test",
        displayName: "Lan",
        leaderboardOptIn: false,
        emailVerifiedAt: "2026-10-01T00:00:00Z",
        revision: 1,
      },
    }),
  );
  expect(h.result.current.status).toBe("anonymous");
  expect(h.result.current.profile).toBeNull();
});

it("finishes anonymous bootstrap when refresh broadcasts reauth without an established principal", async () => {
  const listeners: { onmessage: ((event: { data: { type: string } }) => void) | null }[] = [];
  class Channel {
    onmessage = null;
    constructor() {
      listeners.push(this);
    }
    postMessage() {}
    close() {}
  }
  vi.stubGlobal("BroadcastChannel", Channel);
  let reject!: (error: unknown) => void;
  input.api.getProfile.mockReturnValue(
    new Promise((_done, fail) => {
      reject = fail;
    }),
  );
  const client = new QueryClient();
  const h = renderHook(() => useSession(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <SessionProvider>{children}</SessionProvider>
      </QueryClientProvider>
    ),
  });
  act(() =>
    listeners.find((channel) => channel.onmessage)?.onmessage?.({ data: { type: "reauth" } }),
  );
  const { ApiError } = await import("../../shared/api/errors");
  await act(async () =>
    reject(
      new ApiError({
        kind: "http",
        status: 401,
        errorCode: "Unauthenticated",
        message: "Unauthenticated",
      }),
    ),
  );
  expect(h.result.current.status).toBe("anonymous");
  expect(h.result.current.needsReauth).toBe(false);
  vi.unstubAllGlobals();
});
