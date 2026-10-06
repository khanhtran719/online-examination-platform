import { Module } from "@nestjs/common";
import { databaseConfig } from "./database-config";
import { PostgresDatabase } from "./postgres-database";

@Module({
  providers: [
    {
      provide: PostgresDatabase,
      useFactory: () => new PostgresDatabase(databaseConfig(process.env)),
    },
  ],
  exports: [PostgresDatabase],
})
export class DatabaseModule {}
