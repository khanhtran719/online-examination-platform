import { DynamicModule, Module } from "@nestjs/common";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { HealthModule } from "./infrastructure/health/health.module";
import { ApiConfig } from "./config/app.config";

@Module({})
export class AppModule {
  static forRoot(config: ApiConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        DatabaseModule,
        HealthModule,
        IdentityModule.forRoot(config),
        CatalogModule.forRoot(config),
      ],
    };
  }
}
