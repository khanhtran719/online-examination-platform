import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../errors";
import { requestJson } from "../http";
import { parseData, parseProfile, parseResult, parseSession } from "../parse";
import { isUuidV7, uuidV7 } from "../uuid";

function jsonResponse(status: number, body: unknown, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

describe("HTTP envelope", () => {
  it("accepts 202 without treating it as an error and omits JSON content type for an empty body", async () => {
    const seen: { contentType: string | null; body: string | null }[] = [];
    const result = await requestJson({
      path: "/v1/attempts/00000000-0000-4000-8000-000000000004/submit",
      method: "POST",
      idempotencyKey: "018f4a3c-8c2e-7c3a-8f2a-111111111111",
      csrfToken: "csrf-token-value-0123456789abcdef",
      fetchImpl: async (_url, init) => {
        const headers = new Headers(init?.headers);
        seen.push({
          contentType: headers.get("content-type"),
          body: init?.body ? String(init.body) : null,
        });
        return jsonResponse(
          202,
          {
            data: { accepted: true },
            errorCode: null,
            message: null,
            status: true,
          },
          { "Retry-After": "2", "X-Correlation-Id": "00000000-0000-4000-8000-000000000099" },
        );
      },
    });
    expect(result.httpStatus).toBe(202);
    expect(result.meta.retryAfterSeconds).toBe(2);
    expect(seen[0]).toEqual({ contentType: null, body: null });
  });

  it("rejects a malformed success instead of rendering it as empty data", async () => {
    await expect(
      requestJson({
        path: "/v1/me",
        method: "GET",
        fetchImpl: async () => jsonResponse(200, { data: [], status: true }),
      }),
    ).rejects.toMatchObject({ kind: "malformed" });
  });

  it("keeps a null score null and rejects a profile that invents permissions", () => {
    const result = parseData(
      {
        data: {
          attemptId: "00000000-0000-4000-8000-000000000004",
          publishedVersionId: "00000000-0000-4000-8000-000000000002",
          submissionId: "00000000-0000-4000-8000-000000000005",
          completedAt: "2026-10-06T13:45:10.000Z",
          earned: 5,
          possible: 6,
          correct: 2,
          total: 3,
          percentageBasisPoints: 8333,
          expired: false,
          scoringPolicy: "EXACT_MATCH_V1",
          sections: [
            {
              sectionId: "00000000-0000-4000-8000-000000000011",
              earned: 5,
              possible: 6,
              correct: 2,
              total: 3,
            },
          ],
          review: null,
        },
        errorCode: null,
        message: null,
        status: true,
      },
      parseResult,
    );
    expect(result.earned).toBe(5);
    expect(result.review).toBeNull();
    expect(() =>
      parseData(
        {
          data: {
            id: "00000000-0000-4000-8000-0000000000a1",
            email: "candidate@example.test",
            emailVerifiedAt: "2026-10-06T12:00:00.000Z",
            displayName: "Lan",
            leaderboardOptIn: false,
            revision: 1,
            permissions: ["catalog.manage"],
          },
          errorCode: null,
          message: null,
          status: true,
        },
        parseProfile,
      ),
    ).toThrow(ApiError);
    expect(() =>
      parseData(
        {
          data: {
            userId: "00000000-0000-4000-8000-0000000000a1",
            accessExpiresAt: "2026-10-06T13:15:00.000Z",
            refreshExpiresAt: "2026-10-06T14:00:00.000Z",
            absoluteExpiresAt: "2026-10-07T13:00:00.000Z",
            accessToken: "secret",
          },
          errorCode: null,
          message: null,
          status: true,
        },
        parseSession,
      ),
    ).toThrow(ApiError);
  });

  it("creates canonical UUIDv7 keys", () => {
    const key = uuidV7(Date.parse("2026-10-06T13:00:00.000Z"), new Uint8Array(16).fill(1));
    expect(isUuidV7(key)).toBe(true);
    expect(key[14]).toBe("7");
  });

  it("classifies an aborted wait as timeout and does not call it a network miss", async () => {
    vi.useFakeTimers();
    const pending = requestJson({
      path: "/v1/me",
      method: "GET",
      timeoutMs: 25,
      fetchImpl: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    });
    const assertion = expect(pending).rejects.toMatchObject({ kind: "timeout", status: 0 });
    await vi.advanceTimersByTimeAsync(30);
    await assertion;
    vi.useRealTimers();
  });
});
