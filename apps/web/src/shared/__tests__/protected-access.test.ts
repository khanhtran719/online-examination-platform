import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/errors";
import { isForbidden, useProtectedAccess, visibleProtected } from "../protected-access";

function forbidden(status: number): ApiError {
  return new ApiError({
    kind: "http",
    status,
    errorCode: status === 403 ? "Forbidden" : "Other",
    message: "no",
  });
}

describe("protected cache", () => {
  it("treats only HTTP 403 as a reason to drop protected rows", () => {
    const rows = [{ prompt: "secret" }];
    expect(isForbidden(forbidden(403))).toBe(true);
    expect(isForbidden(forbidden(404))).toBe(false);
    expect(
      isForbidden(new ApiError({ kind: "timeout", status: 0, errorCode: "Timeout", message: "t" })),
    ).toBe(false);
    expect(visibleProtected(rows, forbidden(403))).toEqual([]);
    expect(visibleProtected(rows, forbidden(503))).toEqual(rows);
    expect(visibleProtected(rows, null)).toEqual(rows);
  });

  it("evicts the named cache only after access is blocked", () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, "removeQueries");
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);
    const { rerender } = renderHook(
      ({ blocked }: { blocked: boolean }) =>
        useProtectedAccess(forbidden(403), [["review", "attempt"]], blocked, () => undefined),
      { initialProps: { blocked: false }, wrapper },
    );
    expect(spy).not.toHaveBeenCalled();
    rerender({ blocked: true });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["review", "attempt"] });
  });
});
