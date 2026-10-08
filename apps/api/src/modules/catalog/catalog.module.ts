import { DynamicModule, Module } from "@nestjs/common";
import { ApiConfig } from "../../config/app.config";
import { DatabaseModule } from "../../infrastructure/database/database.module";
import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { PostgresIdempotency } from "../../infrastructure/idempotency/postgres-idempotency";
import { PostgresSecurity } from "../../infrastructure/security/authorization/postgres-security";
import { CatalogService } from "./application/services/catalog.service";
import { CATALOG_ACCESS } from "./application/facades/catalog.facade";
import { IDENTITY_ACCESS, IdentityAccess } from "../identity/application/facades/identity.facade";
import { HmacCatalogCursor } from "./infrastructure/cursor/catalog-cursor";
import { PostgresCatalogQuery } from "./infrastructure/persistence/postgres-catalog.query";
import { PostgresCatalogRepository } from "./infrastructure/persistence/postgres-catalog.repository";
import { CatalogController } from "./presentation/http/catalog.controller";

@Module({})
export class CatalogModule {
  static forRoot(config: ApiConfig): DynamicModule {
    return {
      module: CatalogModule,
      global: true,
      imports: [DatabaseModule],
      controllers: [CatalogController],
      providers: [
        {
          provide: CatalogService,
          inject: [IDENTITY_ACCESS, PostgresDatabase],
          useFactory: (access: IdentityAccess, database: PostgresDatabase) =>
            new CatalogService(
              access,
              new PostgresCatalogRepository(database),
              new PostgresCatalogQuery(database),
              new PostgresIdempotency(database),
              new PostgresSecurity(database, config.rateKey),
              database,
              new HmacCatalogCursor(config.csrfKey),
            ),
        },
        { provide: CATALOG_ACCESS, useExisting: CatalogService },
      ],
      exports: [CATALOG_ACCESS],
    };
  }
}
