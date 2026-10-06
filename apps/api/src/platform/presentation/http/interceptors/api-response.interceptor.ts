import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";

export interface SuccessEnvelope<T> {
  data: T | null;
  errorCode: null;
  message: null;
  status: true;
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

export function toSuccessEnvelope(value: unknown): SuccessEnvelope<unknown> {
  return {
    data: value === undefined ? null : value,
    errorCode: null,
    message: null,
    status: true,
  };
}
