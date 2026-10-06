import { ExecutionContext } from "@nestjs/common";
import { firstValueFrom, of } from "rxjs";
import {
  ApiResponseInterceptor,
  isHealthPath,
  toSuccessEnvelope,
} from "../api-response.interceptor";

function context(url: string): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => ({ url }) }) } as ExecutionContext;
}

describe("API response interceptor", () => {
  const interceptor = new ApiResponseInterceptor();

  it("wraps a response DTO and leaves health outside the envelope", async () => {
    await expect(
      firstValueFrom(
        interceptor.intercept(context("/v1/me"), { handle: () => of({ email: "a@b.test" }) }),
      ),
    ).resolves.toEqual(toSuccessEnvelope({ email: "a@b.test" }));
    await expect(
      firstValueFrom(
        interceptor.intercept(context("/live?ignored=1"), { handle: () => of({ status: "ok" }) }),
      ),
    ).resolves.toEqual({
      status: "ok",
    });
    expect(isHealthPath("/ready")).toBe(true);
    expect(toSuccessEnvelope(undefined)).toEqual({
      data: null,
      errorCode: null,
      message: null,
      status: true,
    });
  });
});
