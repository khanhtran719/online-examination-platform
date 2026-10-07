import { DynamicModule, Module } from "@nestjs/common";
import { DatabaseModule } from "../../infrastructure/database/database.module";
import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { PostgresIdempotency } from "../../infrastructure/idempotency/postgres-idempotency";
import { PostgresSecurity } from "../../infrastructure/security/authorization/postgres-security";
import { ApiConfig } from "../../config/app.config";
import { IdentityService } from "./application/services/identity.service";
import { HttpSession } from "./infrastructure/http/http-session";
import {
  createSessionCredentials,
  createVerificationSecrets,
} from "./infrastructure/security/identity-runtime";
import { PostgresIdentityRepository } from "./infrastructure/persistence/postgres/repositories/postgres-identity.repository";
import { HTTP_SESSION } from "./presentation/http/http-session.port";
import { PostgresIdentityQuery } from "./infrastructure/persistence/postgres/queries/postgres-identity.query";
import { IdentityController } from "./presentation/http/identity.controller";
import {
  IDENTITY_ACCESS,
  REQUEST_GUARD,
  RequestGuard,
} from "./application/facades/identity.facade";
import { FastifyRequest } from "fastify";

/**
 * Identity composition root. Binds application ports to adapters and registers the HTTP adapter.
 * Login, session, and profile rules stay in the application service.
 */
@Module({})
export class IdentityModule {
  static forRoot(config: ApiConfig): DynamicModule {
    return {
      module: IdentityModule,
      global: true,
      imports: [DatabaseModule],
      controllers: [IdentityController],
      exports: [IDENTITY_ACCESS, REQUEST_GUARD],
      providers: [
        {
          provide: PostgresSecurity,
          inject: [PostgresDatabase],
          useFactory: (database: PostgresDatabase) =>
            new PostgresSecurity(database, config.rateKey),
        },
        {
          provide: IdentityService,
          inject: [PostgresDatabase, PostgresSecurity],
          useFactory: async (database: PostgresDatabase, security: PostgresSecurity) => {
            const emailSecrets = createVerificationSecrets(
              config.emailKeys.activeKid,
              config.emailKeys.keys,
            );
            const credentials = await createSessionCredentials(emailSecrets, {
              issuer: config.issuer,
              active: {
                kid: config.activeKid,
                publicPem: config.activePublicPem,
                privatePem: config.privatePem,
              },
              publicKeys: config.publicKeys,
              passwordConcurrency: config.passwordConcurrency,
              passwordMaxQueued: config.passwordMaxQueued,
            });
            return new IdentityService(
              new PostgresIdentityRepository(database),
              database,
              credentials.passwords,
              credentials.tokens,
              emailSecrets,
              credentials.dummyHash,
              security,
              new PostgresIdempotency(database),
              new PostgresIdentityQuery(database),
            );
          },
        },
        {
          provide: HTTP_SESSION,
          inject: [IdentityService, PostgresSecurity],
          useFactory: (identity: IdentityService, security: PostgresSecurity) =>
            new HttpSession(identity, security, config.origin, config.csrfKey),
        },
        { provide: IDENTITY_ACCESS, useExisting: IdentityService },
        {
          provide: REQUEST_GUARD,
          inject: [HTTP_SESSION],
          useFactory: (session: HttpSession): RequestGuard => ({
            checkUnsafe: (request, context) =>
              session.checkUnsafe(request as FastifyRequest, context),
            admit: (request, kind, actor) => session.admit(request as FastifyRequest, kind, actor),
            access: (request) => session.access(request as FastifyRequest),
          }),
        },
      ],
    };
  }
}
