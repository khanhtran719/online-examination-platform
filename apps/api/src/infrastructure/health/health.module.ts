import { Module } from "@nestjs/common";
import { READINESS } from "../../shared/application/ports/readiness";
import { ShutdownGate } from "../resilience/shutdown/shutdown-gate";
import { DatabaseModule } from "../database/database.module";
import { PostgresDatabase } from "../database/transaction/postgres-database";
import { PostgresReadiness } from "./postgres-readiness";
import { LiveController } from "./http/live.controller";
import { ReadyController } from "./http/ready.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [LiveController, ReadyController],
  providers: [
    ShutdownGate,
    {
      provide: READINESS,
      inject: [PostgresDatabase],
      useFactory: (database: PostgresDatabase) => new PostgresReadiness(database),
    },
  ],
  exports: [ShutdownGate],
})
export class HealthModule {}
