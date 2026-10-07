import "reflect-metadata";
import { DynamicModule, Type } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import cookie from "@fastify/cookie";
import { randomUUID } from "node:crypto";
import { ShutdownGate } from "../resilience/shutdown/shutdown-gate";
import { ApiResponseInterceptor } from "../../shared/common/interceptors/api-response.interceptor";
import { DomainExceptionFilter } from "../../shared/common/filters/domain-exception.filter";

export interface HttpApplicationOptions {
  trustedProxies?: string[];
  log?: (value: object) => void;
}

export async function createHttpApplication(
  root: Type | DynamicModule,
  options: HttpApplicationOptions = {},
): Promise<{ app: NestFastifyApplication; drain: () => void }> {
  const adapter = new FastifyAdapter({
    logger: false,
    bodyLimit: 16384,
    requestTimeout: 10000,
    connectionTimeout: 10000,
    keepAliveTimeout: 5000,
    trustProxy: options.trustedProxies?.length ? options.trustedProxies : false,
    requestIdHeader: false,
    genReqId: () => randomUUID(),
  });
  adapter.getInstance().addHook("onRoute", (route) => {
    // Controllers own payload contracts; the reusable adapter only applies bounded metadata.
    const limit = (route.config as { requestBodyLimit?: unknown } | undefined)?.requestBodyLimit;
    if (limit === undefined) return;
    if (typeof limit !== "number" || !Number.isSafeInteger(limit) || limit < 1 || limit > 1_048_576)
      throw new Error("Invalid HTTP route body limit");
    route.bodyLimit = limit;
  });
  const app = await NestFactory.create<NestFastifyApplication>(root, adapter, { logger: false });
  await app.register(cookie);
  const shutdown = app.get(ShutdownGate);
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new DomainExceptionFilter());
  adapter.getInstance().addHook("onRequest", async (request, reply) => {
    reply
      .header("x-correlation-id", request.id)
      .header("cache-control", "no-store")
      .header("x-content-type-options", "nosniff")
      .header("referrer-policy", "no-referrer");
    if (shutdown.isDraining() && request.url !== "/live" && request.url !== "/ready") {
      return reply.status(503).send({
        data: null,
        errorCode: "Service unavailable",
        message: "Service unavailable",
        status: false,
      });
    }
  });
  adapter.getInstance().addHook("onResponse", async (request, reply) => {
    try {
      options.log?.({
        event: "http.completed",
        correlationId: request.id,
        method: request.method,
        route: request.routeOptions.url ?? "unmatched",
        status: reply.statusCode,
        durationMs: reply.elapsedTime,
      });
    } catch {
      /* Diagnostics cannot change response semantics. */
    }
  });
  await app.init();
  await adapter.getInstance().ready();
  return { app, drain: () => shutdown.drain() };
}
