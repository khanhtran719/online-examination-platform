export type ApiErrorKind = "http" | "malformed" | "network" | "unavailable" | "timeout";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly errorCode: string;
  readonly retryAfterSeconds: number | null;
  readonly correlationId: string | null;

  constructor(input: {
    kind: ApiErrorKind;
    status: number;
    errorCode: string;
    message: string;
    retryAfterSeconds?: number | null;
    correlationId?: string | null;
  }) {
    super(input.message);
    this.name = "ApiError";
    this.kind = input.kind;
    this.status = input.status;
    this.errorCode = input.errorCode;
    this.retryAfterSeconds = input.retryAfterSeconds ?? null;
    this.correlationId = input.correlationId ?? null;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
