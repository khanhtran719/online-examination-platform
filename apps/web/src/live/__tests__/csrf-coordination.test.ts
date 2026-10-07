import { describe, expect, it } from "vitest";
import { createHttpApi } from "../create-http-api";

function envelope(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify({ data, errorCode: null, message: null, status: status < 400 }),
    { status },
  );
}

describe("CSRF coordination", () => {
  it("uses the cookie issued for the current request across two clients", async () => {
    let cookie = "";
    let issued = 0;
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/v1/auth/csrf") && method === "GET") {
        issued += 1;
        cookie = `synthetic-${issued}`;
        return envelope({ csrfToken: cookie, expiresAt: "2026-10-07T12:10:00.000Z" });
      }
      const headers = new Headers(init?.headers);
      if (headers.get("X-CSRF-Token") !== cookie) {
        return new Response(
          JSON.stringify({
            data: null,
            errorCode: "Forbidden",
            message: "Forbidden",
            status: false,
          }),
          { status: 403 },
        );
      }
      return envelope({
        resourceId: "00000000-0000-4000-8000-000000000001",
        revision: 2,
        acceptedAt: "2026-10-07T12:00:01.000Z",
      });
    };
    const first = createHttpApi(fetchImpl);
    const second = createHttpApi(fetchImpl);
    const body = { displayName: "Lan", leaderboardOptIn: false, expectedRevision: 1 };
    await first.api.updateProfile("018f4a3c-8c2e-7c3a-8f2a-111111111111", body);
    await second.api.updateProfile("018f4a3c-8c2e-7c3a-8f2a-222222222222", body);
    await expect(
      first.api.updateProfile("018f4a3c-8c2e-7c3a-8f2a-333333333333", body),
    ).resolves.toMatchObject({ data: { revision: 2 } });
  });

  it("does not refetch after a permission 403", async () => {
    let csrfReads = 0;
    let writes = 0;
    const fetchImpl: typeof fetch = async (input, _init) => {
      const url = String(input);
      if (url.endsWith("/v1/auth/csrf")) {
        csrfReads += 1;
        return envelope({ csrfToken: "token-a", expiresAt: "2026-10-07T12:10:00.000Z" });
      }
      writes += 1;
      return new Response(
        JSON.stringify({ data: null, errorCode: "Forbidden", message: "Forbidden", status: false }),
        { status: 403 },
      );
    };
    const api = createHttpApi(fetchImpl);
    await expect(
      api.api.updateProfile("018f4a3c-8c2e-7c3a-8f2a-111111111111", {
        displayName: "Lan",
        leaderboardOptIn: false,
        expectedRevision: 1,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(csrfReads).toBe(1);
    expect(writes).toBe(1);
  });
});
