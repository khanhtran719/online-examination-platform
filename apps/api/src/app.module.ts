import { DynamicModule, Module } from "@nestjs/common";
import { IdentityModule } from "./modules/identity/identity.module";
import { DatabaseModule } from "./platform/infrastructure/database/database.module";
import { HealthModule } from "./platform/infrastructure/health/health.module";
import { ApiConfig } from "./platform/infrastructure/security/runtime-config";

@Module({})
export class AppModule {
  static forRoot(config: ApiConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [DatabaseModule, HealthModule, IdentityModule.forRoot(config)],
    };
  }
}
