import { ApiError, isApiError } from "@web/shared/api/errors";

export function isClosedResultRead(error: unknown): boolean {
  return (
    isApiError(error) && (error.kind === "malformed" || [401, 403, 404].includes(error.status))
  );
}

export function mismatchedResultRead(): ApiError {
  return new ApiError({
    kind: "malformed",
    status: 0,
    errorCode: "MISMATCHED_ATTEMPT",
    message: "Dữ liệu trả về không khớp lượt thi đang xem.",
  });
}
