import type { HttpMeta } from "./dto";
import { ApiError } from "./errors";
import { parseErrorEnvelope } from "./parse";

export const REQUEST_TIMEOUT_MS = 10_000;

export interface RequestInput {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  csrfToken?: string | null;
  idempotencyKey?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface RawResponse {
  httpStatus: number;
  payload: unknown;
  meta: HttpMeta;
}

function header(response: Response, name: string): string | null {
  const value = response.headers.get(name);
  return value && value.trim() ? value : null;
}

function assertSuccessEnvelope(
  payload: unknown,
  meta: { httpStatus: number; correlationId: string | null },
): void {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError({
      kind: "malformed",
      status: meta.httpStatus,
      errorCode: "Malformed response",
      message: "Phản hồi không đúng định dạng.",
      correlationId: meta.correlationId,
    });
  }
  const record = payload as Record<string, unknown>;
  if (
    record.status !== true ||
    record.errorCode !== null ||
    record.message !== null ||
    !("data" in record)
  ) {
    throw new ApiError({
      kind: "malformed",
      status: meta.httpStatus,
      errorCode: "Malformed response",
      message: "Phản hồi không đúng định dạng.",
      correlationId: meta.correlationId,
    });
  }
}

function retryAfter(response: Response): number | null {
  const value = header(response, "Retry-After");
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  return parsed;
}

export async function requestJson(input: RequestInput): Promise<RawResponse> {
  const headers = new Headers();
  if (input.csrfToken) headers.set("X-CSRF-Token", input.csrfToken);
  if (input.idempotencyKey) headers.set("Idempotency-Key", input.idempotencyKey);
  const hasBody = input.body !== undefined;
  if (hasBody) headers.set("Content-Type", "application/json");
  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? REQUEST_TIMEOUT_MS);
  let response: Response;
  let textBody: string;
  try {
    response = await fetchImpl(input.path, {
      method: input.method,
      credentials: "include",
      headers,
      body: hasBody ? JSON.stringify(input.body) : undefined,
      signal: controller.signal,
    });
    // A mutation can commit before its body arrives. Keep the original timeout and
    // unknown-outcome classification through the complete response, not only headers.
    textBody = await response.text();
  } catch {
    if (controller.signal.aborted) {
      throw new ApiError({
        kind: "timeout",
        status: 0,
        errorCode: "Timeout",
        message: "Hết thời gian chờ. Chưa rõ máy chủ đã ghi nhận yêu cầu chưa.",
      });
    }
    throw new ApiError({
      kind: "network",
      status: 0,
      errorCode: "Network",
      message: "Không kết nối được máy chủ",
    });
  } finally {
    clearTimeout(timer);
  }
  const meta: HttpMeta = {
    httpStatus: response.status,
    correlationId: header(response, "X-Correlation-Id"),
    retryAfterSeconds: retryAfter(response),
    idempotencyReplayed: header(response, "Idempotency-Replayed") === "true",
  };
  let payload: unknown = null;
  if (textBody) {
    try {
      payload = JSON.parse(textBody) as unknown;
    } catch {
      throw new ApiError({
        kind: "malformed",
        status: response.status,
        errorCode: "Malformed response",
        message: "Phản hồi không đúng định dạng.",
        correlationId: meta.correlationId,
        retryAfterSeconds: meta.retryAfterSeconds,
      });
    }
  }
  if (response.status >= 400) {
    let errorCode = "Request failed";
    let message = "Request failed";
    try {
      const parsed = parseErrorEnvelope(payload);
      errorCode = parsed.errorCode;
      message = parsed.message;
    } catch {
      throw new ApiError({
        kind: "malformed",
        status: response.status,
        errorCode: "Malformed response",
        message: "Phản hồi không đúng định dạng.",
        correlationId: meta.correlationId,
        retryAfterSeconds: meta.retryAfterSeconds,
      });
    }
    throw new ApiError({
      kind: "http",
      status: response.status,
      errorCode,
      message,
      correlationId: meta.correlationId,
      retryAfterSeconds: meta.retryAfterSeconds,
    });
  }
  assertSuccessEnvelope(payload, meta);
  return { httpStatus: response.status, payload, meta };
}

export function withMeta<T>(data: T, meta: HttpMeta): { data: T; meta: HttpMeta } {
  return { data, meta };
}
