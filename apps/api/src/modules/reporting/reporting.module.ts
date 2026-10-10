import { DynamicModule, Module } from "@nestjs/common";
import { ApiConfig } from "../../config/app.config";
import { DatabaseModule } from "../../infrastructure/database/database.module";
import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { RANKING_PROJECTION } from "./application/facades/ranking.facade";
import { RankingService } from "./application/services/ranking.service";
import { PostgresRankingQuery } from "./infrastructure/persistence/postgres-ranking.query";
import { RankingCrypto } from "./infrastructure/security/ranking-crypto";
import { IDENTITY_ACCESS, IdentityAccess } from "../identity/application/facades/identity.facade";
import { PostgresSecurity } from "../../infrastructure/security/authorization/postgres-security";
import { ActiveCandidatesService } from "./application/services/active-candidates.service";
import { PostgresActiveCandidatesQuery } from "./infrastructure/persistence/postgres-active-candidates.query";
import { ActiveCandidatesCrypto } from "./infrastructure/security/active-candidates-cursor";
import { ActiveCandidatesController } from "./presentation/http/active-candidates.controller";
import { SubmissionsService } from "./application/services/submissions.service";
import { PostgresSubmissionsQuery } from "./infrastructure/persistence/postgres-submissions.query";
import { SubmissionsCrypto } from "./infrastructure/security/submissions-cursor";
import { SubmissionsController } from "./presentation/http/submissions.controller";
import { QuestionStatisticsService } from "./application/services/question-statistics.service";
import { PostgresQuestionStatisticsQuery } from "./infrastructure/persistence/postgres-question-statistics.query";
import { QuestionStatisticsCrypto } from "./infrastructure/security/question-statistics-cursor";
import { QuestionStatisticsController } from "./presentation/http/question-statistics.controller";
import { CandidateResultsService } from "./application/services/candidate-results.service";
import { PostgresCandidateResultsQuery } from "./infrastructure/persistence/postgres-candidate-results.query";
import { CandidateResultsCrypto } from "./infrastructure/security/candidate-results-cursor";
import { CandidateResultsController } from "./presentation/http/candidate-results.controller";
import { BusinessMetricsService } from "./application/services/business-metrics.service";
import { PostgresBusinessMetricsQuery } from "./infrastructure/persistence/postgres-business-metrics.query";
import { BusinessMetricsController } from "./presentation/http/business-metrics.controller";
@Module({})
export class ReportingModule {
  static forRoot(config: ApiConfig): DynamicModule {
    return {
      module: ReportingModule,
      imports: [DatabaseModule],
      exports: [RANKING_PROJECTION],
      controllers: [
        BusinessMetricsController,
        ActiveCandidatesController,
        SubmissionsController,
        QuestionStatisticsController,
        CandidateResultsController,
      ],
      providers: [
        {
          provide: BusinessMetricsService,
          inject: [IDENTITY_ACCESS, PostgresDatabase],
          useFactory: (access: IdentityAccess, db: PostgresDatabase) =>
            new BusinessMetricsService(
              access,
              new PostgresBusinessMetricsQuery(db),
              new PostgresSecurity(db, config.rateKey),
              db,
            ),
        },
        {
          provide: CandidateResultsService,
          inject: [IDENTITY_ACCESS, PostgresDatabase],
          useFactory: (access: IdentityAccess, db: PostgresDatabase) =>
            new CandidateResultsService(
              access,
              new PostgresCandidateResultsQuery(db),
              new CandidateResultsCrypto(config.csrfKey),
              new PostgresSecurity(db, config.rateKey),
              db,
            ),
        },
        {
          provide: QuestionStatisticsService,
          inject: [IDENTITY_ACCESS, PostgresDatabase],
          useFactory: (access: IdentityAccess, db: PostgresDatabase) =>
            new QuestionStatisticsService(
              access,
              new PostgresQuestionStatisticsQuery(db),
              new QuestionStatisticsCrypto(config.csrfKey),
              new PostgresSecurity(db, config.rateKey),
              db,
            ),
        },
        {
          provide: SubmissionsService,
          inject: [IDENTITY_ACCESS, PostgresDatabase],
          useFactory: (access: IdentityAccess, db: PostgresDatabase) =>
            new SubmissionsService(
              access,
              new PostgresSubmissionsQuery(db),
              new SubmissionsCrypto(config.csrfKey),
              new PostgresSecurity(db, config.rateKey),
              db,
            ),
        },
        {
          provide: ActiveCandidatesService,
          inject: [IDENTITY_ACCESS, PostgresDatabase],
          useFactory: (access: IdentityAccess, db: PostgresDatabase) =>
            new ActiveCandidatesService(
              access,
              new PostgresActiveCandidatesQuery(db),
              new ActiveCandidatesCrypto(config.csrfKey),
              new PostgresSecurity(db, config.rateKey),
              db,
            ),
        },
        {
          provide: RANKING_PROJECTION,
          inject: [PostgresDatabase],
          useFactory: (db: PostgresDatabase) => {
            const crypto = new RankingCrypto(config.leaderboardKey);
            return new RankingService(new PostgresRankingQuery(db), crypto, crypto);
          },
        },
      ],
    };
  }
}
