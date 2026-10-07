import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";

export interface SuccessEnvelope<T> {
  data: T | null;
  errorCode: null;
  message: null;
  status: true;
}

export interface PageEnvelope<T> {
  data: T[];
  errorCode: null;
  message: null;
  status: true;
  metadata: { next: string | null; pageSize: number };
}

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ url?: string; raw?: { url?: string } }>();
    if (isHealthPath(request.url ?? request.raw?.url ?? "")) return next.handle();
    return next.handle().pipe(map((value: unknown) => toSuccessEnvelope(value)));
  }
}

export function isHealthPath(url: string): boolean {
  const path = url.split("?")[0];
  return path === "/live" || path === "/ready";
}

export function toSuccessEnvelope(
  value: unknown,
): SuccessEnvelope<unknown> | PageEnvelope<unknown> {
  if (isPage(value)) {
    return {
      data: value.items,
      errorCode: null,
      message: null,
      status: true,
      metadata: value.metadata,
    };
  }
  return {
    data: value === undefined ? null : value,
    errorCode: null,
    message: null,
    status: true,
  };
}

function isPage(value: unknown): value is {
  kind: "page";
  items: unknown[];
  metadata: { next: string | null; pageSize: number };
} {
  if (!value || typeof value !== "object") return false;
  const page = value as {
    kind?: unknown;
    items?: unknown;
    metadata?: { next?: unknown; pageSize?: unknown };
  };
  return (
    page.kind === "page" &&
    Array.isArray(page.items) &&
    !!page.metadata &&
    (page.metadata.next === null || typeof page.metadata.next === "string") &&
    typeof page.metadata.pageSize === "number"
  );
}
