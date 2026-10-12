import { Module } from "@nestjs/common";

import { DatabaseModule } from "@infrastructure/database/database.module";
import { PostgresDatabase } from "@infrastructure/database/transaction/postgres-database";
import { LiveController } from "@infrastructure/health/http/live.controller";
import { ReadyController } from "@infrastructure/health/http/ready.controller";
import { PostgresReadiness } from "@infrastructure/health/postgres-readiness";
import { ShutdownGate } from "@infrastructure/resilience/shutdown/shutdown-gate";
import { READINESS } from "@shared/application/ports/readiness";

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
