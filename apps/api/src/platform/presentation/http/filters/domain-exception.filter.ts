import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import { FastifyReply } from "fastify";
import { DomainError } from "../../../domain/domain-error";
import { ErrorCategory } from "../../../domain/error-category";
import { UnavailableError } from "../../../domain/unavailable.error";

export interface ErrorEnvelope {
  data: null;
  errorCode: string;
  message: string;
  status: false;
}

const statusByCategory: Record<ErrorCategory, number> = {
  [ErrorCategory.BadInput]: 400,
  [ErrorCategory.Unauthorized]: 401,
  [ErrorCategory.Forbidden]: 403,
  [ErrorCategory.NotFound]: 404,
  [ErrorCategory.Conflict]: 409,
  [ErrorCategory.BusinessRule]: 422,
  [ErrorCategory.RateLimited]: 429,
};

export function toTransportError(error: unknown): { status: number; body: ErrorEnvelope } {
  if (error instanceof DomainError) {
    return { status: statusByCategory[error.category], body: envelope(error.message) };
  }
  if (error instanceof UnavailableError) {
    return { status: 503, body: envelope(error.message) };
  }
  if (error instanceof HttpException) {
    const status = error.getStatus();
    if (status === 404) return { status: 404, body: envelope("Not found") };
    if (status >= 400 && status < 500) return { status: 400, body: envelope("Invalid request") };
    return { status: 503, body: envelope("Service unavailable") };
  }
  return { status: 503, body: envelope("Service unavailable") };
}

function envelope(message: string): ErrorEnvelope {
  return { data: null, errorCode: message, message, status: false };
}

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    if (
      !(error instanceof DomainError) &&
      !(error instanceof UnavailableError) &&
      !(error instanceof HttpException)
    ) {
      const request = host.switchToHttp().getRequest<{ id?: unknown }>();
      const correlationId = typeof request.id === "string" ? request.id : undefined;
      process.stderr.write(JSON.stringify({ event: "unhandled_exception", correlationId }) + "\n");
    }
    const mapped = toTransportError(error);
    host.switchToHttp().getResponse<FastifyReply>().status(mapped.status).send(mapped.body);
  }
}
