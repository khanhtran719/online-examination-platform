import { Module } from "@nestjs/common";
import { loadDatabaseConfig } from "./load-database-config";
import { PostgresDatabase } from "./transaction/postgres-database";

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
