import { HttpQuestionPageSizer } from "./infrastructure/http/http-question-page-sizer";
import { DynamicModule, Module } from "@nestjs/common";
import { ApiConfig } from "../../config/app.config";
import { DatabaseModule } from "../../infrastructure/database/database.module";
import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { PostgresIdempotency } from "../../infrastructure/idempotency/postgres-idempotency";
import { IdentityAccess, IDENTITY_ACCESS } from "../identity/application/facades/identity.facade";
import { CatalogAccess, CATALOG_ACCESS } from "../catalog/application/facades/catalog.facade";
import { AssessmentService } from "./application/services/assessment.service";
import { HmacAssessmentCursor } from "./infrastructure/cursor/assessment-cursor";
import { PostgresAttemptQuery } from "./infrastructure/persistence/postgres-attempt.query";
import { PostgresAttemptRepository } from "./infrastructure/persistence/postgres-attempt.repository";
import { PostgresSubmissionOutbox } from "./infrastructure/persistence/postgres-submission-outbox";
import { AssessmentController } from "./presentation/http/assessment.controller";

@Module({})
export class AssessmentModule {
  static forRoot(config: ApiConfig): DynamicModule {
    return {
      module: AssessmentModule,
      imports: [DatabaseModule],
      controllers: [AssessmentController],
      providers: [
        {
          provide: AssessmentService,
          inject: [IDENTITY_ACCESS, CATALOG_ACCESS, PostgresDatabase],
          useFactory: (
            access: IdentityAccess,
            catalog: CatalogAccess,
            database: PostgresDatabase,
          ) =>
            new AssessmentService(
              access,
              catalog,
              new PostgresAttemptRepository(database),
              new PostgresAttemptQuery(database),
              new PostgresIdempotency(database),
              new PostgresSubmissionOutbox(database),
              database,
              new HmacAssessmentCursor(config.csrfKey),
              new HttpQuestionPageSizer(),
            ),
        },
      ],
    };
  }
}
