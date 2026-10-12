import { Module } from "@nestjs/common";

import { loadDatabaseConfig } from "@infrastructure/database/load-database-config";
import { PostgresDatabase } from "@infrastructure/database/transaction/postgres-database";

@Module({
  providers: [
    {
      provide: PostgresDatabase,
      useFactory: () => new PostgresDatabase(loadDatabaseConfig(process.env)),
    },
  ],
  exports: [PostgresDatabase],
})
export class DatabaseModule {}
