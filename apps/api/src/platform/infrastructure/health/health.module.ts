import { Module } from "@nestjs/common";
import { READINESS } from "../../application/readiness";
import { ShutdownGate } from "../../application/shutdown-gate";
import { DatabaseModule } from "../database/database.module";
import { PostgresDatabase } from "../database/postgres-database";
import { PostgresReadiness } from "../database/postgres-readiness";
import { LiveController } from "../../presentation/http/health/live.controller";
import { ReadyController } from "../../presentation/http/health/ready.controller";

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
