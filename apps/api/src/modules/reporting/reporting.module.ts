import { DynamicModule, Module } from "@nestjs/common";

import { ApiConfig } from "@config/app.config";
import { IDENTITY_ACCESS, IdentityAccess } from "@identity/facade";
import { DatabaseModule } from "@infrastructure/database/database.module";
import { PostgresDatabase } from "@infrastructure/database/transaction/postgres-database";
import { PostgresSecurity } from "@infrastructure/security/authorization/postgres-security";
import { RANKING_PROJECTION } from "@reporting/ranking";

import { ActiveCandidatesService } from "./application/services/active-candidates.service";
import { AuditService } from "./application/services/audit.service";
import { BusinessMetricsService } from "./application/services/business-metrics.service";
import { CandidateResultsService } from "./application/services/candidate-results.service";
import { QuestionStatisticsService } from "./application/services/question-statistics.service";
import { RankingService } from "./application/services/ranking.service";
import { SubmissionsService } from "./application/services/submissions.service";
import { PostgresActiveCandidatesQuery } from "./infrastructure/persistence/postgres-active-candidates.query";
import { PostgresAuditQuery } from "./infrastructure/persistence/postgres-audit.query";
import { PostgresBusinessMetricsQuery } from "./infrastructure/persistence/postgres-business-metrics.query";
import { PostgresCandidateResultsQuery } from "./infrastructure/persistence/postgres-candidate-results.query";
import { PostgresQuestionStatisticsQuery } from "./infrastructure/persistence/postgres-question-statistics.query";
import { PostgresRankingQuery } from "./infrastructure/persistence/postgres-ranking.query";
import { PostgresSubmissionsQuery } from "./infrastructure/persistence/postgres-submissions.query";
import { ActiveCandidatesCrypto } from "./infrastructure/security/active-candidates-cursor";
import { AuditCrypto } from "./infrastructure/security/audit-cursor";
import { CandidateResultsCrypto } from "./infrastructure/security/candidate-results-cursor";
import { QuestionStatisticsCrypto } from "./infrastructure/security/question-statistics-cursor";
import { RankingCrypto } from "./infrastructure/security/ranking-crypto";
import { SubmissionsCrypto } from "./infrastructure/security/submissions-cursor";
import { ActiveCandidatesController } from "./presentation/http/active-candidates.controller";
import { AuditController } from "./presentation/http/audit.controller";
import { BusinessMetricsController } from "./presentation/http/business-metrics.controller";
import { CandidateResultsController } from "./presentation/http/candidate-results.controller";
import { QuestionStatisticsController } from "./presentation/http/question-statistics.controller";
import { SubmissionsController } from "./presentation/http/submissions.controller";

@Module({})
export class ReportingModule {
  static forRoot(config: ApiConfig): DynamicModule {
    return {
      module: ReportingModule,
      imports: [DatabaseModule],
      exports: [RANKING_PROJECTION],
      controllers: [
        AuditController,
        BusinessMetricsController,
        ActiveCandidatesController,
        SubmissionsController,
        QuestionStatisticsController,
        CandidateResultsController,
      ],
      providers: [
        {
          provide: AuditService,
          inject: [IDENTITY_ACCESS, PostgresDatabase],
          useFactory: (access: IdentityAccess, db: PostgresDatabase) =>
            new AuditService(
              access,
              new PostgresAuditQuery(db),
              new AuditCrypto(config.csrfKey),
              new PostgresSecurity(db, config.rateKey),
              db,
            ),
        },
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
