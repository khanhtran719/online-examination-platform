import { Controller, Get, Inject, Res } from "@nestjs/common";
import { FastifyReply } from "fastify";
import { READINESS, Readiness } from "../../../shared/application/ports/readiness";
import { ShutdownGate } from "../../resilience/shutdown/shutdown-gate";

@Controller()
export class ReadyController {
  constructor(
    @Inject(READINESS) private readonly readiness: Readiness,
    private readonly shutdown: ShutdownGate,
  ) {}

  @Get("ready")
  async ready(@Res() reply: FastifyReply): Promise<void> {
    try {
      if (this.shutdown.isDraining()) throw new Error("Draining");
      await this.readiness.check();
      reply.send({ status: "ok" });
    } catch {
      reply.status(503).send({ status: "error" });
    }
  }
}
