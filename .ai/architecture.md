# Backend Architecture

> **Document status:** Normative architecture and execution contract.  
> This file owns the detailed API, worker, transaction, and integration flows. The concise enforceable catalog is in [rules](rules.md); [AGENTS.md](../AGENTS.md) defines document precedence and task routing.  
> When implementation and this document conflict, identify the cause and deliberately update the implementation or the owning rule. Never silently break an architectural boundary.

> **Project context:** This is the target architecture for Online Examination Platform. PostgreSQL is the source of truth and the repository owns versioned PostgreSQL migrations. Invoice, Store, Loyalty, POS, vendor names, routes, and sample values remain illustrative. Kafka and Redis sections apply when those integrations are selected. See the [project profile](../docs/project-profile.md) for adopted local decisions.


## 1. Purpose

This document defines the target architecture for the Online Examination Platform NestJS modular monolith, with API and worker runtimes.

PostgreSQL is the source of truth. Database-specific schema mapping, SQL, locking behavior, and error translation stay in Infrastructure and are verified against the actual PostgreSQL behavior. The project owns a versioned SQL migration toolchain; ADR-001 defines deployment ordering and compatibility. Its target bundle placement is `apps/api/src/infrastructure/database/migrations`; current `apps/api/migrations` remains during the explicit ADR-006 transition. See the [project profile](../docs/project-profile.md).

The reference model combines:

- Modular Monolith
- DDD-lite
- Clean Architecture
- Hexagonal Architecture / Ports & Adapters
- CQRS-lite
- Repository Pattern
- Unit of Work
- Transaction Context with `AsyncLocalStorage`
- Transactional Outbox
- Event-Driven Integration
- Kafka
- Redis
- Security boundaries
- Observability
- Background Workers
- Resilience patterns
- Horizontal scaling / HA-ready deployment

Module ownership, dependency direction, and business invariants are core. Transactional Outbox, Kafka, Redis, particular persistence adapters, and HA deployment details apply when the adopting project's requirements and stack call for them. Their presence here is not an instruction to install every component.

The goal is not to maximize abstraction.

The goal is to create clear boundaries so that:

1. Business logic stays independent from framework and infrastructure details.
2. Business modules own their data and behavior.
3. TypeORM, Redis, Kafka, HTTP clients, and other technologies stay behind ports/adapters.
4. Database transactions can span multiple repositories without leaking `EntityManager`.
5. Cross-module coupling stays controlled.
6. Read-heavy/reporting use cases can be optimized independently from write-side domain logic.
7. The application can scale horizontally.
8. Selected modules can be extracted into microservices later without redesigning the whole system.

---

# 2. Architecture Style

The macro architecture is:

```text
Modular Monolith
    +
DDD-lite
    +
Clean / Hexagonal Boundaries
    +
CQRS-lite
    +
Event-Driven Integration
```

This means the application is deployed as one logical backend initially, but business boundaries are designed as if modules were independent systems.

Do not treat this architecture as microservices.

Do not introduce distributed-system complexity unless required.

---

# 3. High-Level Runtime Architecture

The diagram below is a reference deployment with optional Redis and Kafka capabilities. A project need not deploy every component to follow the module and layer boundaries.

```text
                         Clients
                  Web / Mobile / POS
                         |
                         v
                API Gateway / LB
                         |
         +---------------+---------------+
         |               |               |
         v               v               v
      API #1          API #2          API #3
         |               |               |
         +---------------+---------------+
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
    PostgreSQL     Redis          Kafka
       Cluster         Cluster        Cluster
```

The API layer should remain stateless where possible.

Horizontal scaling must not depend on in-memory session state.

---

# 4. Application Layering

```text
Presentation
     |
     v
Application
     |
     v
Domain / Ports
     ^
     |
Infrastructure
```

The dependency direction is critical.

## Allowed

```text
Presentation -> Application
Application  -> Domain
Application  -> Ports
Infrastructure -> Domain
Infrastructure -> Application Ports
```

## Forbidden

```text
Domain -> Infrastructure
Domain -> Application orchestration
Application -> TypeORM
Application -> Redis client
Application -> Kafka producer
Application -> HTTP implementation
Module A -> Module B repository
Module A -> Module B ORM entity
```

---

# 5. Target Project Structure

The tree is a placement guide. Create only the modules and infrastructure integrations that the adopting project actually needs. In this repository, `src/` maps to `apps/api/src/`; this is not a repository-flattening instruction. Domain and Application remain plain TypeScript.

```text
src/
|-- main.ts
|-- app.module.ts
|-- config/
|   |-- app.config.ts
|   |-- database.config.ts
|   |-- redis.config.ts
|   |-- kafka.config.ts
|   |-- observability.config.ts
|   |-- config.validation.ts
|   `-- config.module.ts
|-- shared/
|   |-- domain/
|   |   |-- entity.ts
|   |   |-- aggregate-root.ts
|   |   |-- value-object.ts
|   |   |-- domain-event.ts
|   |   `-- exceptions/
|   |-- application/
|   |   |-- unit-of-work/
|   |   |   |-- unit-of-work.port.ts
|   |   |   `-- unit-of-work.constants.ts
|   |   |-- pagination/
|   |   |   |-- page-request.ts
|   |   |   |-- page-result.ts
|   |   |   `-- index.ts
|   |   `-- ports/
|   `-- common/
|       |-- decorators/
|       |-- guards/
|       |-- interceptors/
|       |-- filters/
|       |-- pipes/
|       |-- errors/
|       `-- utils/
|-- modules/
|   |-- invoice/
|   |   |-- invoice.module.ts
|   |   |-- domain/
|   |   |   |-- entities/
|   |   |   |-- value-objects/
|   |   |   |-- repositories/
|   |   |   |-- services/
|   |   |   |-- events/
|   |   |   |-- enums/
|   |   |   `-- errors/
|   |   |-- application/
|   |   |   |-- commands/
|   |   |   |-- queries/
|   |   |   |-- services/
|   |   |   |-- facades/
|   |   |   |-- dto/
|   |   |   `-- ports/
|   |   |-- infrastructure/
|   |   |   `-- persistence/
|   |   |       `-- typeorm/
|   |   |           |-- entities/
|   |   |           |-- repositories/
|   |   |           `-- mappers/
|   |   `-- presentation/
|   |       `-- http/
|   |           |-- invoice.controller.ts
|   |           `-- dto/
|   |-- member/
|   |-- promotion/
|   |-- loyalty/
|   |-- room/
|   |-- shift/
|   |-- store/
|   `-- reporting/
|-- infrastructure/
|   |-- database/
|   |   |-- database.module.ts
|   |   |-- data-source.ts
|   |   |-- migrations/
|   |   `-- transaction/
|   |       |-- typeorm-transaction-context.ts
|   |       |-- typeorm-unit-of-work.ts
|   |       `-- typeorm-repository-provider.ts
|   |-- messaging/
|   |   `-- kafka/
|   |       |-- kafka.module.ts
|   |       |-- kafka.producer.ts
|   |       |-- kafka.consumer.ts
|   |       |-- serializers/
|   |       `-- retry/
|   |-- outbox/
|   |   |-- outbox.module.ts
|   |   |-- outbox.port.ts
|   |   `-- persistence/
|   |-- cache/
|   |   `-- redis/
|   |       |-- redis.module.ts
|   |       |-- redis-cache.adapter.ts
|   |       |-- redis-lock.adapter.ts
|   |       `-- redis-key.factory.ts
|   |-- security/
|   |   |-- authentication/
|   |   `-- authorization/
|   |-- integrations/
|   |-- observability/
|   |   |-- logging/
|   |   |-- tracing/
|   |   |-- metrics/
|   |   `-- audit/
|   `-- resilience/
|       |-- retry/
|       |-- timeout/
|       `-- circuit-breaker/
`-- workers/
    |-- kafka/
    |-- outbox/
    |-- scheduler/
    `-- reconciliation/
```

### Placement and dependency contract

Invoice/member/POS names above are teaching examples. The examination project uses `modules/{identity,catalog,assessment,reporting}` with the same placement rules. `apps/web`, repository `infra/terraform`, `load-tests`, `experiments`, `scripts` and `apps/api/tests/integration` retain their separate responsibilities. No empty folders, base entities, generic repositories or integrations are required by this tree.

- `shared/domain` is pure, capability-neutral domain code. `shared/application` contains pure shared contracts/ports, UnitOfWork and pagination when needed. Aggregate write repository ports live in module `domain/repositories`; query/projection, crypto, delivery and application workflow ports live in `application/ports`. Domain ports cannot import application DTOs or infrastructure types.
- `shared/common` is the outer reusable Nest/transport helper area. Domain/Application MUST NOT import `shared/common`, `config`, `workers` or technical implementations, including via barrels. Shared pure code cannot import business modules. Module-owned policies/errors stay in their module.
- `config` owns typed settings, validation and Nest composition. Secret file/provider I/O belongs to infrastructure security/integration adapters. Business logic receives plain values or ports; it does not read environment variables or import ConfigService/config implementations.
- Global `infrastructure` owns reusable technical adapters and MUST NOT import business modules. Module-specific persistence/crypto/mail integrations stay in the owning module. Nest module factories, `main.ts` and worker composition roots may bind adapters; this wiring permission does not extend to business classes.
- `workers` owns process/queue/scheduler inbound orchestration and lifecycle. Business rules stay in module Application/Domain. Worker roots consume a module's public worker factory/facade/port, without exporting private repositories. Add SQS/email/health/HTTP/idempotency/shutdown groups only when required; the tree is extensible by responsibility.
- A business-facing outbox port lives in shared or module `application/ports`. The illustrated `infrastructure/outbox/outbox.port.ts` is only an infrastructure-internal relay/storage contract if needed. It does not authorize Application → Infrastructure imports.
- TypeORM filenames are used if that adapter is selected; current pg adapters remain until a recorded persistence decision. Both implementations resolve the active transaction manager/client per operation. Raw SQL/projections are allowed in Infrastructure under the same transaction/ownership/security contract. Do not hydrate full aggregates for read-only projections by default.
- Kafka and Redis are optional; SQS remains the selected scoring integration. Cursor pagination is adopted under ADR-002: the page-based filenames above are illustrative, not permission to add OFFSET/count queries or an unused pagination framework.

### Explicit transition

[ADR-006](../docs/adr/006-source-layout-normalization.md) adopts this target. Current code still uses `platform/`, root `worker.ts` and `apps/api/migrations`; [normalization plan](../docs/architecture-normalization-plan.md) enumerates the scope, dependencies and unchecked runtime tasks. No new legacy placement is allowed. Boundary checks must cover old and new layouts during migration, then reject legacy placement. Complete normalization gates before extending Catalog. This is an explicit temporary placement transition, not an exception to dependency or transaction boundaries.

Target SQL migration placement is `apps/api/src/infrastructure/database/migrations`; preserve the existing bundle names, checksums, receipt history and artifact inclusion. SQL schema `platform` is not renamed because the source folder is removed. ORM selection is a separate evidence-based decision; no performance gain is claimed from folder moves.

---

# 6. Business Module Ownership

A Nest module represents a **business capability**, not a database table.

Examples:

```text
InvoiceModule
PromotionModule
MemberModule
LoyaltyModule
RoomModule
ShiftModule
StoreModule
ReportingModule
```

Do not create modules such as:

```text
InvoiceItemModule
InvoiceVatModule
InvoiceDiscountModule
```

unless those concepts have an independent business lifecycle.

A table does not automatically imply a module.

---

# 7. Aggregate Ownership

Entities sharing the same business lifecycle should normally belong to the same aggregate/module.

Example:

```text
Invoice Aggregate
|
|-- Invoice
|-- InvoiceItem
|-- InvoicePayment
|-- InvoiceDiscount
|-- InvoiceVAT
|-- InvoiceCoupon
`-- InvoiceRequiredCharge
```

The application should usually persist the aggregate through one repository abstraction:

```ts
await invoiceRepository.save(invoice);
```

Avoid application code that knows persistence-table structure:

```ts
await invoiceRepository.save(invoice);
await invoiceItemRepository.save(items);
await invoicePaymentRepository.save(payments);
await invoiceVatRepository.save(vats);
```

Infrastructure may internally use multiple ORM repositories if required.

---

# 8. Domain Model

Domain code contains business behavior and invariants.

Example:

```ts
export class Invoice {
  pay(payment: Payment): void {
    if (this.status !== InvoiceStatus.OPEN) {
      throw new InvoiceCannotBePaidError();
    }

    this.payments.push(payment);
    this.status = InvoiceStatus.PAID;
  }
}
```

Domain code must not depend on:

```text
NestJS
TypeORM
database drivers
Redis
Kafka
HTTP
Axios
Express/Fastify
```

Domain code should model:

- Entities
- Aggregates
- Value Objects
- Domain Services
- Domain Events
- Domain Errors
- Business invariants

---

# 9. DDD-lite Rule

Do not force rich domain modeling into trivial CRUD modules.

Simple modules may use a simpler structure.

Example:

```text
modules/config/
|-- config.module.ts
|-- config.controller.ts
|-- config.service.ts
`-- config.orm-entity.ts
```

Use full domain/application/infrastructure separation only where business complexity justifies it.

Typical candidates:

```text
Invoice
Promotion
Loyalty
Payment
Room lifecycle
Order
```

---

# 10. Domain Entity vs ORM Entity

For complex modules:

```text
Domain Entity != ORM Entity
```

Example domain entity:

```text
modules/invoice/domain/entities/invoice.ts
```

Example persistence entity:

```text
modules/invoice/infrastructure/persistence/typeorm/entities/
invoice.orm-entity.ts
```

ORM entities may contain:

```ts
@Entity()
@Column()
@Index()
@OneToMany()
@ManyToOne()
```

Domain entities must not.

---

# 11. ORM Entity Ownership

Do not maintain one global folder:

```text
src/database/entities/
```

Prefer ownership by module:

```text
modules/invoice/infrastructure/persistence/typeorm/entities/
modules/member/infrastructure/persistence/typeorm/entities/
modules/promotion/infrastructure/persistence/typeorm/entities/
```

Shared database infrastructure should only contain technical database concerns:

```text
database.module.ts
data-source.ts
transaction/
migrations/
```

---

# 12. Application Layer

Application services orchestrate use cases.

Examples:

```text
CreateInvoice
PayInvoice
CloseInvoice
CancelInvoice
ApplyPromotion
AddMemberPoints
```

A use case should coordinate:

- Domain entities
- Repository ports
- Unit of Work
- Module ports/facades
- Domain events
- Outbox

Application code describes **what must happen**.

Infrastructure describes **how it happens technically**.

---

# 13. Preferred Use-Case Style

```ts
return this.unitOfWork.transaction(async () => {
  const invoice =
    await this.invoiceRepository.findForUpdate(invoiceId);

  invoice.pay(payment);

  await this.invoiceRepository.save(invoice);

  await this.outbox.add(
    InvoicePaidEvent.from(invoice),
  );

  return invoice;
});
```

Application code must not know that the implementation uses:

```text
PostgreSQL
TypeORM
EntityManager
QueryRunner
Repository<T>
```

---


# 13A. API Execution Contract

This section is the **mandatory operational contract** for implementing APIs.

An agent must not only place files in the correct folders; it must also implement the correct execution flow.

Before coding any endpoint/use case, classify the operation using the following questions:

```text
1. Is this a READ or a WRITE?

2. Which module owns this business capability?

3. Does it mutate an Aggregate/State?

4. Is a transaction required?

5. Is there a cross-module dependency?

6. Does the cross-module call need an immediate result, or can it use eventual consistency?

7. Does it produce an integration event?

8. Does it call an external API/network service?

9. Does it require cache/lock/idempotency?

10. Which errors are Domain Errors, Application Errors, or Technical Errors?

11. Which request context values must be propagated?

12. Which tests prove that this flow works correctly?
```

If the important questions above are not answered yet, implementation should not begin.

---

# 13B. Standard Write API Flow

Any API that changes business state should, by default, follow this flow:

```text
HTTP Request
     |
     v
Controller
     |
     v
Authentication / Authorization
     |
     v
Request DTO Validation
     |
     v
Application Use Case / Command
     |
     v
UnitOfWork.transaction()
     |
     +--> Load Aggregate / State
     |
     +--> Validate Current State
     |
     +--> Execute Domain Behavior
     |
     +--> Persist Aggregate
     |
     +--> Persist Outbox Event (if an integration event is required)
     |
     v
COMMIT
     |
     v
Application Result
     |
     v
Response Mapper
     |
     v
Response DTO
     |
     v
HTTP Response
```

Example:

```ts
@Post(':id/pay')
async pay(
  @Param('id') invoiceId: string,
  @Body() dto: PayInvoiceDto,
): Promise<PayInvoiceResponseDto> {
  const result = await this.payInvoice.execute({
    invoiceId,
    ...dto,
  });

  return PayInvoiceResponseMapper.toDto(result);
}
```

`PayInvoiceResponseDto` is the `data` value. The HTTP body is the envelope in §46, not the DTO alone.

Use case:

```ts
async execute(
  command: PayInvoiceCommand,
): Promise<PayInvoiceResult> {
  return this.unitOfWork.transaction(async () => {
    const invoice =
      await this.invoiceRepository.findForUpdate(
        command.invoiceId,
      );

    const payment = Payment.create({
      amount: command.amount,
      method: command.method,
    });

    invoice.pay(payment);

    await this.invoiceRepository.save(invoice);

    await this.outbox.add(
      InvoicePaidEvent.from(invoice),
    );

    return PayInvoiceResult.from(invoice);
  });
}
```

Mandatory responsibilities:

```text
Controller
    must not contain business rules.

Application
    must make the transaction boundary visible.

Domain
    decides whether a business state transition is valid.

Repository
    persists the Aggregate.

Outbox
    persists integration intent in the same DB transaction.

Infrastructure
    handles EntityManager / QueryRunner / SQL / Kafka mechanics.
```

For write use cases with real business logic, do not collapse the flow into:

```text
Controller
    -> TypeORM Repository
    -> save()
```

---

# 13C. Standard Read API Flow

A read API does not have to reconstruct a Domain Aggregate.

Standard flow:

```text
HTTP Request
     |
     v
Controller
     |
     v
Authentication / Authorization
     |
     v
Query DTO Validation
     |
     v
Application Query / Query Service
     |
     v
Read Repository / Query Object
     |
     v
Optimized QueryBuilder / SQL / Projection
     |
     v
Read Model / Read DTO
     |
     v
HTTP Response
```

Example:

```text
GET /invoices?page=1&pageSize=20
```

does not need to use:

```text
DB Row
  -> ORM Entity
  -> Domain Aggregate
  -> Mapper
  -> Response
```

when the endpoint only needs a projection.

It may use:

```text
SQL / QueryBuilder
    -> InvoiceListItemDto
```

Rule:

```text
Write side:
    prioritize Aggregate + invariant + ownership.

Read side:
    prioritize clear queries + performance + correct DTO contracts.
```

This is how the repository applies CQRS-lite.

---

# 13D. Standard Cross-Module Synchronous Flow

Use synchronous cross-module calls when the caller **needs an immediate result** in order to complete the use case.

Example: Invoice needs Promotion to calculate a discount before an invoice can be created.

Do not:

```text
InvoiceUseCase
    -> PromotionRepository
```

Do not:

```text
InvoiceUseCase
    -> PromotionOrmEntity
```

Prefer:

```text
InvoiceUseCase
      |
      v
PromotionFacade / PromotionPort
      |
      v
Promotion Application
      |
      v
Promotion Domain / Repository
      |
      v
Promotion Result
      |
      v
InvoiceUseCase continues
```

Example abstraction:

```ts
export interface PromotionPricingPort {
  calculate(
    input: PromotionPricingInput,
  ): Promise<PromotionPricingResult>;
}
```

The owning module keeps authority over its own business rules.

The caller only knows the public capability.

If the call writes through both modules, also follow the shared transaction contract in §27A; an immediate result alone is not a reason to couple their repositories.

---

# 13E. Standard Asynchronous Side-Effect Flow

Use events when the producer does not need the consumer to complete immediately.

Example after an Invoice is paid:

```text
PayInvoice Use Case
      |
      v
Invoice.pay()
      |
      v
InvoiceRepository.save()
      |
      v
Outbox.add(InvoicePaid)
      |
      v
COMMIT
      |
      v
Outbox Publisher / Debezium CDC
      |
      v
Kafka
      |
      +--------------------+
      |                    |
      v                    v
Loyalty Consumer      Analytics Consumer
      |                    |
      v                    v
AddPoints Use Case    Update Projection
```

Important points:

```text
Invoice transaction
    does not wait for the Loyalty transaction.

Invoice module
    does not inject LoyaltyRepository.

Producer
    does not need to know how many consumers exist.
```

A use case should choose asynchronous events only when eventual consistency is acceptable.

---

# 13F. Standard Kafka Consumer Flow

A Kafka Consumer is an inbound/presentation adapter.

Standard flow:

```text
Kafka Message
     |
     v
Consumer Adapter
     |
     +--> Deserialize
     |
     +--> Schema / Contract Validation
     |
     +--> Extract correlation metadata
     |
     v
UnitOfWork.transaction()
     |
     +--> Unique Inbox claim
     |       +--> duplicate: no business effect
     |
     +--> new event: Application Use Case / Command
     |       +--> Domain + Repository
     v
COMMIT
     |
     v
ACK
```

This atomic inbox form applies when the inbox and business effect share a database. See §36 for redelivery and external side-effect limits.

A consumer should not directly do:

```text
Kafka Handler
   -> QueryBuilder
   -> Update business table
```

unless the adapter is explicitly defined as an ETL/CDC synchronization pipeline that does not contain business invariants.

Consumers must handle duplicate delivery safely.

---

# 13G. Standard External Integration Flow

Application code must not call Axios/vendor SDKs directly.

Flow:

```text
Application Use Case
      |
      v
Integration Port
      ^
      |
Infrastructure Adapter
      |
      +--> Timeout
      +--> Retry policy
      +--> Circuit breaker
      +--> Mapping
      |
      v
External System
```

Example:

```ts
export interface PaymentGateway {
  charge(
    request: ChargeRequest,
  ): Promise<ChargeResult>;
}
```

Infrastructure:

```text
PaymentGateway
     ^
     |
VNPayAdapter
MoMoAdapter
```

### External calls and DB transactions

Do not default to:

```text
BEGIN

PostgreSQL row lock via Infrastructure

HTTP call 5-10 seconds

UPDATE

COMMIT
```

because a network call can keep locks and transactions open for too long.

Depending on the business workflow, prefer:

```text
Transaction 1
    -> persist pending state
    -> COMMIT

External call

Transaction 2
    -> persist result
    -> COMMIT
```

If the workflow is complex and requires compensation/retry/state transitions, use a state machine or Saga-like workflow rather than keeping a long-running DB transaction open.

---

# 13H. Standard Cache Flow

The default cache strategy is Cache-Aside.

## Read

```text
Application Query
      |
      v
CachePort.get()
      |
      +--> HIT
      |     |
      |     v
      |   return
      |
      +--> MISS
            |
            v
         Database
            |
            v
       CachePort.set()
            |
            v
          return
```

## Write

```text
Application Use Case
      |
      v
DB Transaction
      |
      v
COMMIT
      |
      v
Cache Invalidate / Refresh
```

Do not invalidate cache before commit.

Post-commit invalidation can still fail or race with a cache refill; §39 defines the required staleness decision and recovery options.

Every cache usage must define:

```text
Key format

TTL

Source of truth

Invalidation strategy

Stale-data tolerance

Redis failure behavior
```

If these are not defined yet, the cache should not be added.

---

# 13I. Standard Error Propagation Flow

Errors must respect architectural boundaries.

Domain/Application errors carry a transport-neutral semantic category. The HTTP adapter maps it as follows:

| Semantic category | HTTP status |
| ----------------- | ----------- |
| `bad_input`       | 400         |
| `unauthorized`    | 401         |
| `forbidden`       | 403         |
| `not_found`       | 404         |
| `conflict`        | 409         |
| `business_rule`   | 422         |
| `rate_limited`    | 429         |

Do not put HTTP status values or NestJS exceptions in Domain or Application code.

Flow:

```text
Domain
    |
    +--> Domain Error
    |
    v
Application
    |
    +--> propagate / translate application-specific error if needed
    |
    v
Presentation Exception Mapper
    |
    v
HTTP status + response envelope
```

The body is `{ data, errorCode, message, status }`. Add `metadata` only when the API is paginated. Field rules are in the [project profile](../docs/project-profile.md). Do not respond with `{ code, message, requestId }`.

Example Domain error:

```ts
throw new InvoiceAlreadyPaidError();
```

Presentation mapping:

```text
InvoiceAlreadyPaidError
    -> HTTP status
    -> { data: null, errorCode, message, status: false }
```

`errorCode` and `message` are the same safe client text. `InvoiceAlreadyPaidError` is the domain class name, not a body field.

Do not throw:

```ts
throw new ConflictException();
```

from Domain code.

Technical errors such as PostgreSQL connection failures must not expose raw messages, SQL, or stack traces to production clients.

---

# 13J. Standard Request Context Flow

Each inbound request/message should carry correlation context where appropriate.

```text
Inbound HTTP/Kafka
      |
      v
RequestContext
      |
      +--> requestId
      +--> traceId
      +--> correlationId
      +--> causationId (event)
      +--> userId
      +--> storeId
      |
      +--------------+--------------+
      |              |              |
      v              v              v
    Logs        External API      Outbox/Kafka
```

Agents should avoid manually passing many context fields through every method if the repository already provides a RequestContext abstraction.

Context is technical/request metadata, not Domain state.

---

# 13K. Standard Authorization Flow

Authorization must happen before sensitive operations, while business invariants still remain protected by Domain/Application logic.

Flow:

```text
Request
   |
   v
Authentication
   |
   v
Current Principal
   |
   v
Authorization / Permission Check
   |
   v
Application Use Case
   |
   v
Domain Invariant
```

Example permissions:

```text
invoice.create
invoice.pay
invoice.cancel
invoice.refund
```

Authorization is not a replacement for Domain invariants.

For example:

```text
User has invoice.pay permission
```

does not mean:

```text
A CLOSED Invoice can still be paid.
```

Permission and business validity are separate concerns.

---

# 13L. Standard Background Job / Scheduler Flow

Cron/queue/worker triggers are inbound adapters just like HTTP/Kafka.

Flow:

```text
Scheduler / Worker Trigger
      |
      v
Adapter
      |
      v
Application Use Case
      |
      v
Domain / Repository / Integration Port
```

Do not place large business logic directly inside:

```ts
@Cron(...)
```

or worker handlers.

This allows the same use case to be triggered by HTTP, scheduler, or message processing without duplicating business logic.

---

# 13M. API Implementation Decision Matrix

Agents should use the following matrix when choosing a flow:

```text
Use case only reads data?
    -> Read Query Flow

Use case changes state?
    -> Write Flow + consider UnitOfWork

Multiple DB writes must be atomic?
    -> UnitOfWork

Need to lock the same record?
    -> Repository business method such as findForUpdate()

Need another module to return a result immediately?
    -> Sync Port / Facade

Do not need another module to process immediately?
    -> Domain/Integration Event + Outbox

DB change + Kafka event?
    -> Transactional Outbox

External API?
    -> Integration Port + Adapter + resilience policy

Read-heavy/reporting?
    -> Query Object / optimized SQL

Redis cache?
    -> Cache-Aside + explicit invalidation/fallback

Kafka consumer?
    -> Inbox / idempotency + Application Use Case
```

---

# 13N. API Definition of Done

An API/use case is only complete when the agent confirms:

```text
[ ] Correct owning module.

[ ] Correct Read/Write classification.

[ ] Controller/consumer/scheduler acts only as an adapter.

[ ] Application use case is explicit.

[ ] Business invariants live in the correct Domain/Application layer.

[ ] Transaction boundary is explicit.

[ ] No EntityManager/DataSource/QueryRunner leakage.

[ ] Repository belongs to the owning module.

[ ] Cross-module interaction uses a public capability.

[ ] Sync/Event choice is justified.

[ ] DB + Kafka uses Outbox where consistency is required.

[ ] Consumer is idempotent if it processes messages.

[ ] External integration uses Port/Adapter.

[ ] Redis usage defines TTL/invalidation/failure behavior.

[ ] Error mapping respects boundaries.

[ ] ORM Entity is not returned directly by the API.

[ ] Request/correlation context is propagated when needed.

[ ] Appropriate tests exist for the layer/use case.

[ ] No unnecessary abstraction was introduced.
```

---


# 14. Unit of Work

The application-facing abstraction is:

```ts
export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

export interface UnitOfWork {
  transaction<T>(
    work: () => Promise<T>,
  ): Promise<T>;
}
```

Do not expose `EntityManager`.

Incorrect:

```ts
unitOfWork.transaction(async manager => {
  const repository =
    manager.getRepository(InvoiceOrmEntity);
});
```

Correct:

```ts
unitOfWork.transaction(async () => {
  await invoiceRepository.save(invoice);
});
```

---

# 15. Transaction Context

TypeORM requires transaction operations to use the transaction-scoped `EntityManager`.

A TypeORM adapter propagates its active manager internally through `AsyncLocalStorage`. The current runtime uses the equivalent transaction-scoped `pg` connection under ADR-001. The TypeORM code below is an allowed adapter example; the revised layout does not select or install an ORM. See ADR-006 and the persistence comparison gate in the normalization plan.

Example:

```ts
@Injectable()
export class TypeOrmTransactionContext {
  private readonly storage =
    new AsyncLocalStorage<{ manager: EntityManager; rollbackOnly: boolean }>();

  run<T>(
    manager: EntityManager,
    work: () => Promise<T>,
  ): Promise<T> {
    return this.storage.run({ manager, rollbackOnly: false }, work);
  }

  getManager(): EntityManager | undefined {
    return this.storage.getStore()?.manager;
  }

  isInTransaction(): boolean {
    return this.storage.getStore() !== undefined;
  }

  markRollbackOnly(): void {
    const scope = this.storage.getStore();
    if (scope) scope.rollbackOnly = true;
  }

  isRollbackOnly(): boolean {
    return this.storage.getStore()?.rollbackOnly ?? false;
  }
}
```

This class belongs to infrastructure only.

---

# 16. TypeORM Unit of Work

```ts
@Injectable()
export class TypeOrmUnitOfWork
  implements UnitOfWork {

  constructor(
    private readonly dataSource: DataSource,
    private readonly context:
      TypeOrmTransactionContext,
  ) {}

  async transaction<T>(
    work: () => Promise<T>,
  ): Promise<T> {
    if (this.context.isInTransaction()) {
      try {
        return await work();
      } catch (error) {
        this.context.markRollbackOnly();
        throw error;
      }
    }

    return this.dataSource.transaction(manager =>
      this.context.run(manager, async () => {
        const result = await work();
        if (this.context.isRollbackOnly()) {
          throw new Error('Transaction marked rollback-only');
        }
        return result;
      }),
    );
  }
}
```

Default nested transaction semantics:

```text
Existing transaction -> join existing transaction
No transaction       -> create transaction
Joined failure       -> mark rollback-only; outer commit is forbidden
```

Do not create independent nested transactions unless explicitly required.

---

# 17. Transaction-Aware Repository Provider

```ts
@Injectable()
export class TypeOrmRepositoryProvider {
  constructor(
    private readonly dataSource: DataSource,
    private readonly transactionContext:
      TypeOrmTransactionContext,
  ) {}

  getRepository<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
  ): Repository<T> {
    const manager =
      this.transactionContext.getManager();

    if (manager) {
      return manager.getRepository(entity);
    }

    return this.dataSource.getRepository(entity);
  }
}
```

Behavior:

```text
Outside transaction
    -> DataSource repository

Inside transaction
    -> transaction-scoped repository
```

---

# 18. Never Cache a Transaction-Aware Repository

Do not do this:

```ts
constructor(provider: TypeOrmRepositoryProvider) {
  this.repository =
    provider.getRepository(InvoiceOrmEntity);
}
```

The repository may be resolved outside a transaction.

Prefer:

```ts
private get repository() {
  return this.repositories.getRepository(
    InvoiceOrmEntity,
  );
}
```

or resolve inside each method.

---

# 19. Repository Ports

Repositories exposed to application/domain code are interfaces.

Example:

```ts
export const INVOICE_REPOSITORY =
  Symbol('INVOICE_REPOSITORY');

export interface InvoiceRepository {
  findById(id: string): Promise<Invoice | null>;

  findForUpdate(
    id: string,
  ): Promise<Invoice>;

  save(
    invoice: Invoice,
  ): Promise<void>;
}
```

Use business-oriented names.

Prefer:

```text
findOpenInvoiceByRoom
findForUpdate
findActiveInvoice
```

over generic wrappers when business semantics exist.

Do not create repository abstractions that only mirror TypeORM CRUD without value.

---

# 20. TypeORM Repository Implementations

TypeORM repository implementations belong in module infrastructure.

Example:

```text
modules/invoice/infrastructure/persistence/typeorm/repositories/
typeorm-invoice.repository.ts
```

They may use:

- TypeORM Repository
- EntityManager
- QueryBuilder
- Raw SQL
- database-specific optimizations

These details must not leak into application/domain code.

---

# 21. Persistence Mappers

When domain and ORM entities are separated:

```text
Domain <-> Mapper <-> ORM Entity
```

Example:

```ts
export class InvoiceMapper {
  static toPersistence(
    invoice: Invoice,
  ): InvoiceOrmEntity {
    // ...
  }

  static toDomain(
    entity: InvoiceOrmEntity,
  ): Invoice {
    // ...
  }
}
```

Mapping logic belongs to persistence infrastructure.

---

# 22. Cross-Module ORM Relations

Avoid ORM object relations across business-module boundaries.

Avoid:

```ts
@ManyToOne(() => StoreOrmEntity)
store!: StoreOrmEntity;
```

inside Invoice if Store belongs to `StoreModule`.

Prefer:

```ts
@Column({
  name: 'StoreId',
  type: 'uuid',
})
storeId!: string;
```

Rule:

```text
Same module:
  ORM relation allowed.

Cross module:
  prefer scalar ID.
```

---

# 23. Database Foreign Keys

Avoiding ORM object relationships does not mean avoiding database integrity.

Foreign keys remain valid PostgreSQL integrity constraints even though ORM object relationships are avoided across modules.

Example:

```sql
ALTER TABLE "Invoices"
ADD CONSTRAINT "FK_Invoices_StoreId"
FOREIGN KEY ("StoreId")
REFERENCES "Stores"("Id");
```

Keep these concepts separate:

```text
Database integrity
!=
ORM object graph
!=
Business-module dependency
```

---

# 24. NestJS Module Registration

Module composition roots register owned infrastructure adapters and bind plain Application constructors with factory providers. Domain/Application have no Nest imports or decorators. Nest `exports` exposes deliberate public capabilities only. [Module template §22](module-template.md#22-nestjs-module-template) shows complete illustrative factory wiring.

With the current `pg` adapters, a module registers its SQL repository/query adapters and port bindings. A TypeORM alternative may register its module-owned entities via `TypeOrmModule.forFeature` and `autoLoadEntities: true` in main configuration. Do not create a global business entity directory or move DI decorators into Application merely to simplify registration.

---

# 25. TypeORM CLI Data Source

TypeORM CLI does not bootstrap the Nest module graph.

The standalone `data-source.ts` should discover ORM entities using globs.

Example:

```ts
export default new DataSource({
  // ...

  entities: [
    __dirname +
      '/../../modules/**/*.orm-entity{.ts,.js}',

    __dirname +
      '/../outbox/**/*.orm-entity{.ts,.js}',
  ],

  migrations: [
    __dirname +
      '/migrations/*{.ts,.js}',
  ],

  synchronize: false,
});
```

Do not move all entities into one global folder just for CLI convenience.

---

# 26. Cross-Module Communication

Repositories are private implementation details of their owning modules.

Forbidden:

```text
InvoiceModule -> MemberRepository
RoomModule    -> InvoiceRepository
Promotion     -> InvoiceOrmEntity
```

Preferred:

```text
InvoiceModule -> MemberFacade
InvoiceModule -> PromotionPort
InvoiceModule -> MemberQuery
InvoiceModule -> Domain/Application Event
```

Use:

- Public application services
- Facades
- Query ports
- Events

---

# 27. Module Public APIs

Nest module exports define the module public surface.

Avoid:

```ts
exports: [
  InvoiceOrmEntity,
  TypeOrmInvoiceRepository,
  INVOICE_REPOSITORY,
]
```

Prefer:

```ts
exports: [
  InvoiceFacade,
]
```

or export nothing if not needed.

---

# 27A. Cross-Module Transaction Contract

A synchronous call across module boundaries does not by itself require a shared write transaction. Prefer a public read/calculation capability when the caller needs an immediate answer.

When one business invariant truly requires writes in two modules to commit together in the **same database**, one application use case owns the transaction and calls the other module through its public application capability. Both sides must use the same UnitOfWork context and transaction-scoped repositories. The called module must not start an independent commit, expose its repository, or publish an integration event directly.

```text
Coordinating use case
  -> UnitOfWork.transaction()
     -> Module A public write capability
     -> Module B public write capability
     -> Outbox rows, if required
  -> one COMMIT or one ROLLBACK
```

The coordinating use case identifies the invariant and a stable lock order. Keep this transaction short; do not include slow network calls. Propagate a failure from a joined write so the entire operation rolls back. Do not catch a database failure and continue inside the same transaction; the UnitOfWork must roll back. Do not assume independent databases can share this ACID transaction. For cross-database or long-running work, model states, idempotency, and compensation explicitly.

Tests must prove that a failure in either module leaves neither module's write committed and that concurrent calls preserve the invariant. If the second action may happen later, use an event/outbox instead of a shared synchronous write.

---

# 28. CQRS-lite

The project uses CQRS selectively.

Do not introduce full CQRS complexity by default.

Separate write and read concerns where it provides value.

## Write Side

```text
Command
 -> Application Use Case
 -> Domain Aggregate
 -> Repository
 -> Transaction
```

## Read Side

```text
Query
 -> Read Repository / Query Object
 -> Optimized SQL
 -> Read DTO
```

Do not rebuild rich aggregates for simple list/search/report queries.

---

# 29. Reporting Architecture

Reporting is allowed to cross business data boundaries on the read side.

Example:

```text
ReportingModule
|
|-- DailySalesQuery
|-- RevenueByStoreQuery
|-- PaymentSummaryQuery
`-- ShiftPerformanceQuery
```

Reporting queries may join:

```text
Invoices
InvoiceItems
Members
Stores
Users
Shifts
Payments
```

Do not call multiple business services merely to build a report.

Write-side ownership must remain strict.

Read-side optimization may be pragmatic.

The reporting module owns the query contract, while each source module still owns its write schema and business meaning. Keep cross-module reporting queries read-only and make their table/view dependencies explicit. Review affected reports with every source migration; add contract or integration tests for relied-on columns and joins. A projection or stable read view may reduce direct coupling when schemas change often.

State freshness when reports use asynchronous projections or replicas. Do not use a possibly stale report to enforce a write-side invariant or authorization decision. Apply tenant/store access scope and sensitive-data rules to reporting results just as to ordinary reads.

---

# 30. Event Architecture

Distinguish:

1. Domain Event
2. Integration Event
3. Kafka Message

Example flow:

```text
Invoice Aggregate
      |
InvoicePaid
      |
      v
Application
      |
      v
Outbox
      |
      v
Integration Event
      |
      v
Kafka Adapter
      |
      v
Kafka
```

Domain events must not know Kafka topics or serialization details.

---

# 31. Event Envelope

Integration events should use consistent metadata.

Recommended shape:

```json
{
  "eventId": "uuid",
  "eventType": "invoice.paid.v1",
  "aggregateId": "uuid",
  "occurredAt": "ISO-8601",
  "correlationId": "uuid",
  "causationId": "uuid",
  "source": "<service-name>",
  "version": 1,
  "payload": {}
}
```

Event schemas must be versioned intentionally.

---

# 32. Transactional Outbox

Database writes and event persistence must be atomic.

Preferred:

```ts
return this.unitOfWork.transaction(async () => {
  await this.invoiceRepository.save(invoice);

  await this.outbox.add(
    InvoicePaidEvent.from(invoice),
  );
});
```

Runtime:

```text
BEGIN

INSERT/UPDATE Invoice
INSERT OutboxEvent

COMMIT
```

If either operation fails, both rollback.

---

# 33. Never Publish Kafka Inside a DB Transaction

Forbidden:

```ts
return this.unitOfWork.transaction(async () => {
  await invoiceRepository.save(invoice);

  await kafka.publish(event);
});
```

Kafka does not participate in the database transaction.

Use:

```text
Database Transaction
       |
Invoice + Outbox
       |
     COMMIT
       |
Outbox Publisher / CDC
       |
      Kafka
```

---

# 34. Outbox Publishing

Supported implementations:

## Worker Publisher

```text
Outbox Table
    |
    v
Outbox Worker
    |
    v
Kafka
```

## CDC

```text
Outbox Table
    |
PostgreSQL logical decoding or CDC, when enabled
    |
Debezium
    |
Kafka
```

Application code must not depend on which implementation is used.

For a worker publisher, multiple workers must claim rows without publishing the same claim concurrently. Use an atomic PostgreSQL claim and a short database transaction to acquire a lease, then commit the claim before broker I/O; keep locking details inside Infrastructure and verify concurrent workers against real PostgreSQL. Publish using the stable event ID, then mark the row delivered only after broker acknowledgement. A crash after publish but before that mark can produce a duplicate: the contract is **at least once**, and consumers must tolerate it. An expired lease must make the row retryable.

Define bounded retry/backoff, a parked or dead-letter state for poison records, and a controlled replay procedure. If order matters within an aggregate, assign a sequence or equivalent ordering key and preserve that order through claim and broker partitioning; do not promise global order. Observe pending count, oldest pending age, retries, parked records, and commit-to-publish latency. CDC deployments need equivalent recovery, duplicate, and observability guarantees.

---

# 35. Kafka Consumer Architecture

Kafka consumers are adapters.

Preferred:

```text
Kafka
 |
 v
Consumer Adapter
 |
Deserialize / Validate
 |
 v
Application Command / Use Case
```

Avoid consumers directly manipulating business persistence unless the consumer is explicitly designed as an ETL/synchronization adapter.

---

# 36. Idempotency / Inbox

Kafka consumers must be idempotent.

For a business effect stored in the same database as the inbox, claim the stable event ID under a unique constraint **inside the transaction that performs that effect**:

```text
Message
   |
   v
Validate envelope and payload
   |
UnitOfWork.transaction()
   -> atomically claim inbox(eventId) under a unique constraint
   -> duplicate: no business effect
   -> new: execute application use case using the same transaction
COMMIT
   -> ACK
```

If business work fails, the inbox claim rolls back with it. Concurrent duplicate deliveries must not both execute the effect. A crash after commit but before ACK causes redelivery, which the inbox ignores. Non-transactional external effects need their own idempotency key or a new outbox step; the inbox transaction alone cannot make them atomic.

Outbox protects producers.

Inbox/idempotency protects consumers.

---

# 37. Retry and DLQ

Consumer retry policy must distinguish:

```text
Transient technical failure
Business rejection
Invalid schema/message
Permanent dependency failure
```

Do not retry every failure indefinitely.

Kafka retry/DLQ behavior must be explicit and observable.

ACK only after the intended durable result (successful commit, confirmed duplicate, or durable quarantine according to policy). Invalid schemas and permanent business rejection require a documented discard/quarantine decision rather than an endless retry. Transient failures use bounded retries with backoff. Record enough metadata to diagnose and safely replay without silently changing the original event identity.

---

# 38. Redis Architecture

Redis is infrastructure.

Do not inject raw Redis clients into business/domain code.

Define purpose-specific abstractions.

Examples:

```text
CachePort
DistributedLockPort
RateLimitPort
SessionStore
```

Avoid a giant generic `RedisService` that becomes a dependency of every module.

---

# 39. Cache Strategy

Default caching strategy:

```text
Cache-Aside
```

Read:

```text
Application
    |
Cache lookup
    |
  miss
    |
Database
    |
Cache SET
```

Write:

```text
Database Update
      |
    COMMIT
      |
Cache Invalidate
```

Database remains the source of truth unless explicitly designed otherwise.

The post-commit cache action is **not atomic** with the DB write. A process crash or Redis failure can leave a stale value until TTL or repair; a concurrent miss may also refill an old value. Each cache must state its maximum acceptable staleness and how that bound is enforced. Options include a bounded TTL for tolerant reads, versioned keys/generation numbers for stronger read freshness, or outbox-driven invalidation for eventual repair with lag monitoring and a fallback when lag exceeds the allowed bound. An outbox alone does not guarantee immediate freshness. Critical invariants and authorization checks read an authoritative source.

After the DB commits, a cache failure cannot roll back that write. Do not return an ambiguous failure that invites an unsafe duplicate client retry unless the write API is idempotent and its error contract explains the outcome.

---

# 40. Redis Failure Strategy

For each Redis usage, define behavior when Redis is unavailable.

Examples:

```text
Non-critical cache:
  fallback to DB

Distributed lock:
  operation may need to fail

Rate limit:
  choose fail-open or fail-closed intentionally

Session:
  behavior depends on authentication design
```

Do not silently assume Redis is always available.

---

# 41. External Integrations

External systems must be accessed through ports.

Example:

```ts
export interface PaymentGateway {
  charge(
    request: ChargeRequest,
  ): Promise<ChargeResult>;
}
```

Infrastructure:

```text
integrations/payment/
|-- vnpay-payment.adapter.ts
`-- momo-payment.adapter.ts
```

Application depends on `PaymentGateway`, not Axios or a vendor SDK.

---

# 42. Resilience

External calls must define:

- Timeout
- Retry policy
- Backoff
- Circuit breaker policy
- Fallback behavior
- Idempotency requirements

Do not apply one retry policy globally.

Example:

```text
GET configuration:
  retries may be safe

Charge payment:
  automatic retry may be dangerous
  idempotency key required
```

---

# 43. HTTP / Presentation Architecture

Controllers should handle only:

- Routing
- Authentication
- Authorization
- Input validation
- DTO parsing
- Application use-case invocation
- Response mapping

Controllers must not contain:

- TypeORM queries
- Transactions
- Business calculations
- Kafka calls
- Redis implementation details

---

# 44. DTO Rules

DTOs are boundary contracts.

They are not domain entities.

Avoid:

```ts
dto.calculateTotal();
dto.applyPromotion();
```

DTOs may handle:

- transport validation
- serialization
- transformation

Business rules belong to domain/application logic.

---

# 45. API Response Rules

Do not return ORM entities directly.

Prefer:

```text
Domain/Application Result
        |
        v
Response Mapper
        |
        v
Response DTO
        |
        v
HTTP envelope
    data = Response DTO
    metadata only for a paginated API
    errorCode, message, status
```

The response DTO is `data`. It is not the HTTP body. The envelope is `{ data, errorCode, message, status }`, plus `metadata` only for a paginated API. See the [project profile](../docs/project-profile.md).

This prevents database schema changes from accidentally changing API contracts.

---

# 46. Error Architecture

Domain code should raise domain errors.

Example:

```ts
throw new InvoiceAlreadyPaidError();
```

Domain code should not throw:

```ts
BadRequestException
ConflictException
HttpException
```

HTTP mapping happens at the presentation boundary.

Each client-visible error declares one semantic category from §13I. The exception mapper converts the category to the transport status. Adding an error therefore requires an explicit category choice; it must not fall through to a blanket HTTP 400.

Example:

```text
InvoiceAlreadyPaidError
        |
        v
Exception Mapper
        |
        v
HTTP status + response envelope
```

Response body:

```json
{
  "data": null,
  "errorCode": "Invoice has already been paid",
  "message": "Invoice has already been paid",
  "status": false
}
```

`metadata` is omitted here because this response is not paginated. On success, `data` is the response DTO, `errorCode` is `null`, and `status` is `true`. A paginated success adds `metadata` beside `data`; this project uses `{next,pageSize}` for keyset pagination under [ADR-002](../docs/adr/002-cursor-pagination.md). Do not nest `metadata` inside `data`.

`requestId` belongs to request context and logs (see §13J and §50). It is not a response field. The domain class name is not a response field. Full field rules are in the [project profile](../docs/project-profile.md).

---

# 47. Security Architecture

Separate:

```text
Authentication
Authorization
```

Authentication answers:

```text
Who is the caller?
```

Authorization answers:

```text
What is the caller allowed to do?
```

Prefer permissions/capabilities over scattered role checks.

Examples:

```text
invoice.create
invoice.cancel
invoice.refund
shift.close
promotion.update
```

Avoid:

```ts
if (user.role === 'ADMIN') {
  ...
}
```

throughout business code.

The examination Identity authentication contract is detailed in [security/permissions](../docs/security-and-permissions.md) and [ADR-005](../docs/adr/005-email-verification-and-signed-tokens.md): email/password requires email verification; access and refresh are asymmetric signed JWTs with mutually exclusive validators and authoritative PostgreSQL session/revocation checks. Crypto, key loading and transport are infrastructure; activation/session policy belongs to Identity Domain/Application through ports. Email ownership links are separate single-use capabilities, not access/refresh tokens or future magic-link login. Registration/activation and durable Identity email intent commit atomically; external email sends occur outside transactions. The email worker has no JWT signing private key. Magic link and GitHub are explicitly later work, not installed infrastructure.

---

# 48. Configuration

Use typed configuration.

Recommended:

```text
config/
|-- app.config.ts
|-- database.config.ts
|-- redis.config.ts
|-- kafka.config.ts
|-- observability.config.ts
`-- config.validation.ts
```

Avoid direct `process.env.*` usage throughout the application.

Environment variables are parsed/validated at configuration boundaries.

---

# 49. Secrets

Production secrets must not be embedded in:

- source code
- committed `.env`
- Docker image
- configuration checked into Git

Use an external secret mechanism where available, such as Vault or the deployment platform's secret store.

---

# 50. Observability

Observability includes:

- Structured logging
- Metrics
- Distributed tracing
- Audit logging
- Correlation IDs

Recommended context fields:

```text
requestId
traceId
correlationId
userId
storeId
invoiceId
module
operation
duration
```

Do not rely on `console.log()` for production diagnostics.

---

# 51. Logging

Use structured logs.

Example:

```json
{
  "traceId": "...",
  "correlationId": "...",
  "storeId": "...",
  "invoiceId": "...",
  "module": "invoice",
  "operation": "payInvoice",
  "durationMs": 124
}
```

Never log secrets, credentials, tokens, or sensitive payment values.

---

# 52. Metrics

Technical metrics should include:

```text
HTTP request rate
HTTP latency
HTTP errors

DB pool utilization
DB query latency
DB errors

Redis latency
Redis hit/miss

Kafka producer errors
Kafka consumer lag
Kafka processing latency
```

Business metrics may include:

```text
invoice_created_total
invoice_paid_total
invoice_payment_failed_total
shift_closed_total
```

---

# 53. Tracing

Correlation/tracing context should propagate through:

```text
HTTP
Database
Kafka
Redis
External APIs
Workers
```

Outgoing events should carry correlation metadata where appropriate.

---

# 54. Background Workers

Long-running asynchronous work should not be forced into request/response flows.

Supported worker categories:

```text
Kafka consumers
Outbox publisher
Scheduled jobs
Reconciliation
Heavy background processing
```

Workers may live in the same repository but have separate runtime entry points.

---

# 55. Scheduler Rules

Cron/scheduled jobs should call application use cases.

Avoid putting business logic directly in cron decorators.

Preferred:

```text
Scheduler Adapter
      |
      v
Application Use Case
```

---

# 56. Locks

Locking mechanics belong to infrastructure.

Application may express intent:

```ts
invoiceRepository.findForUpdate(id);
```

Infrastructure may implement:

```text
PostgreSQL row lock via Infrastructure
pessimistic_write
```

Do not leak TypeORM lock syntax into domain logic.

---

# 57. Testing Architecture

Testing strategy:

```text
Domain
 -> Unit tests

Application
 -> Use-case tests

Repositories
 -> Integration tests with real PostgreSQL

Kafka / Redis
 -> Integration tests

HTTP
 -> E2E tests

Cross-system contracts
 -> Contract tests where valuable
```

Unit tests target complex or important behavior; they are not required for every source file. Store a unit test in `__tests__/` beside the tested source file's directory and name it `<subject>.unit.spec.ts`. Use integration tests to verify repository, broker, cache, and transaction behavior against real adapters where applicable.

---

# 58. Domain Tests

Domain tests should not require NestJS.

Example:

```ts
const invoice = Invoice.create(...);

invoice.pay(payment);

expect(invoice.status).toBe(
  InvoiceStatus.PAID,
);
```

These tests should remain fast.

---

# 59. Repository Tests

Do not mock TypeORM to prove a TypeORM repository works.

Repository implementations should be tested against a real PostgreSQL instance where practical.

Testcontainers or equivalent isolated integration environments are preferred.

---

# 60. Health Checks

Expose separate concepts for liveness and readiness.

Example:

```text
/live
  Is the process alive?

/ready
  Can this instance serve traffic?
```

These endpoints stay outside the application API prefix and response envelope. Keep their payloads operationally simple: `{ "status": "ok" }` when healthy and an HTTP 503 `{ "status": "error" }` when a critical readiness dependency is unavailable.

Readiness may consider critical dependencies.

Do not remove a healthy process from traffic merely because an optional dependency is temporarily unavailable.

Dependency criticality must be explicit.

---

# 61. Deployment Principles

The architecture is a Modular Monolith, but deployment may be horizontally scaled.

```text
Load Balancer
    |
+---+---+
|   |   |
v   v   v
API API API
```

Monolith does not mean single server.

The API should avoid machine-local mutable state.

---

# 62. Database HA

Application code connects to the database through the configured database endpoint/VIP/proxy.

Failover mechanics belong to infrastructure.

Application/domain code must not contain database failover awareness. Online Examination Platform uses PostgreSQL; see the [project profile](../docs/project-profile.md).

---

# 63. Schema Evolution Strategy

Versioned PostgreSQL SQL migrations are adopted by [ADR-001](../docs/adr/001-project-adoption.md). The platform team owns `apps/api/migrations`. A dedicated one-off task applies forward migrations under a database advisory lock before rolling application deployment. Applied file checksums are immutable. Runtime roles cannot execute DDL. Use expand/contract changes, keep old application revisions compatible, and roll back application images rather than automatically reversing data migrations. Restore/PITR is a separate operator action with measured RPO/RTO. TypeORM synchronize remains disabled if TypeORM is introduced.

# 63A. Execution Flow Priority Rule

When implementing APIs, the flows defined in sections `13A` through `13N` are normative.

If the framework allows a shorter implementation but that implementation breaks the defined flow or boundaries, do not choose the shortcut.

For example, NestJS supports:

```ts
constructor(
  @InjectRepository(InvoiceOrmEntity)
  private readonly invoices: Repository<InvoiceOrmEntity>,
) {}
```

Using this in a Controller/Service does not mean the architecture allows this pattern in every layer.

Framework capability is not an Architecture Decision.


# 64. Architecture Rules for Agents

All coding agents MUST treat this file as the architectural contract.

Before changing code, determine:

1. Which business module owns the behavior?
2. Is this write-side or read-side logic?
3. Does this operation require a transaction?
4. Does it cross a module boundary?
5. Is an infrastructure dependency leaking into application/domain code?
6. Is an event internal or an integration event?
7. Does the operation require idempotency?
8. Does Redis/Kafka/external API failure require explicit fallback behavior?
9. Is new abstraction justified by real complexity?

---

# 65. MUST

Agents MUST:

- Keep business logic inside business modules.
- Keep TypeORM inside infrastructure/persistence.
- Keep Redis implementation details inside cache infrastructure.
- Keep Kafka implementation details inside messaging infrastructure.
- Use UnitOfWork for multi-step atomic database operations.
- Keep `EntityManager` hidden from application/domain code.
- Resolve TypeORM repositories through transaction-aware infrastructure.
- Place ORM entities inside the module that owns them.
- Use repository ports for aggregate persistence.
- Keep repositories private to their owning module.
- Use module facade/port/event for cross-module communication.
- Use Transactional Outbox for reliable DB + Kafka workflows.
- Make Kafka consumers idempotent.
- Separate optimized read queries from aggregate repositories when useful.
- Keep reporting reads free to use optimized cross-module joins.
- Keep controllers thin.
- Keep domain errors transport-independent.
- Use explicit resilience policies for external calls.
- Use structured logs and observable failures.
- Preserve module boundaries when adding new features.
- Prefer simple architecture when a module is only CRUD.

---

# 66. MUST NOT

Agents MUST NOT:

- Call `DataSource.transaction()` from application services.
- Pass `EntityManager` through application/business methods.
- Call `manager.getRepository()` in application code.
- Inject raw TypeORM repositories into domain code.
- Inject another module's repository.
- Access another module's ORM entity directly.
- Create one Nest module per database table.
- Keep all entities in a global `database/entities` directory.
- Publish Kafka directly inside a database transaction.
- Use Redis as an undeclared source of truth.
- Add retries blindly to non-idempotent external operations.
- Put domain-specific helpers into global `common`.
- Return ORM entities directly from controllers.
- Throw HTTP exceptions from domain entities.
- Introduce full DDD/CQRS ceremony into trivial CRUD without justification.
- Create cross-module TypeORM object graphs by default.
- Cache a repository resolved from a transaction-aware provider.
- Hide important transactional boundaries so completely that use-case atomicity becomes unclear.
- Couple business logic to deployment or HA mechanics.

---

# 67. Decision Guide: New Module

Before creating a module, ask:

```text
Does this represent a business capability?

Does it own a distinct business lifecycle?

Does it expose meaningful behavior?

Would another module interact with it through a public capability?
```

If not, the code may belong to an existing module.

---

# 68. Decision Guide: New Repository

Before creating a repository, ask:

```text
Is this an aggregate persistence abstraction?

Does the application need this persistence capability?

Does the method express business persistence semantics?

Or is this only wrapping TypeORM CRUD?
```

Do not add abstraction without value. Name a write or cohesive small read/write port `Repository`; name a read-only port `ReadRepository` or a specific `Query`. The TypeORM adapter mirrors that responsibility. See [conventions §§17–19](./conventions.md#17-repository-port-naming) for file, class, and token names; a name alone does not justify splitting one cohesive adapter into multiple layers.

---

# 69. Decision Guide: Domain Model

Before introducing Domain Entity + ORM Entity separation, ask:

```text
Does this concept have meaningful behavior?

Does it enforce invariants?

Does persistence shape differ from business shape?

Is the business complexity high enough to justify mapping?
```

If not, a simpler CRUD model is acceptable.

---

# 70. Decision Guide: Transaction

Before opening a transaction, identify the invariant being protected.

Example:

```text
Invoice status change
+
Payment record
+
Outbox event
```

may need to commit atomically.

Do not wrap large unrelated workflows in one database transaction.

Keep transactions short.

---

# 71. Decision Guide: Sync vs Event

Use synchronous communication when:

```text
The caller needs an immediate answer to continue.
```

Use events when:

```text
The producer does not require an immediate consumer result.
Consumers may be added independently.
Eventual consistency is acceptable.
```

Do not use Kafka merely because Kafka exists.

---

# 72. Decision Guide: Cache

Before adding cache, define:

```text
What is cached?
Why is it cached?
What is the source of truth?
What is the TTL?
How is it invalidated?
What happens if Redis is unavailable?
```

If these questions are not answered, do not add the cache.

---

# 73. Architecture Mental Model

```text
                 BUSINESS MODULES

+------------------------------------------+
| Invoice                                  |
|                                          |
| Presentation                             |
|      |                                   |
|      v                                   |
| Application                              |
|      |                                   |
|      v                                   |
| Domain / Ports                           |
|      ^                                   |
|      |                                   |
| Infrastructure / TypeORM                 |
+------------------------------------------+

+------------------------------------------+
| Promotion                                |
| Member                                   |
| Loyalty                                  |
| Room                                     |
| Shift                                    |
| Store                                    |
| Reporting                                |
+------------------------------------------+


              SHARED INFRASTRUCTURE

+------------------------------------------+
| Database                                 |
| - UnitOfWork implementation              |
| - TransactionContext                     |
| - RepositoryProvider                     |
| - Migrations                             |
|                                          |
| Kafka                                    |
| Redis                                    |
| Outbox                                   |
| Security                                 |
| Observability                            |
| Integrations                             |
| Resilience                               |
+------------------------------------------+
```

The core rule is:

> Business modules own business concepts. Infrastructure owns technical mechanisms.

Application code defines:

```text
WHAT must happen.
```

Domain code defines:

```text
WHAT is valid.
```

Infrastructure defines:

```text
HOW technical work is performed.
```

Presentation defines:

```text
HOW the outside world communicates with the application.
```

---

# 74. Preferred End-State Example

Application code should remain readable:

```ts
return this.unitOfWork.transaction(async () => {
  const invoice =
    await this.invoiceRepository.findForUpdate(
      command.invoiceId,
    );

  invoice.pay(command.payment);

  await this.invoiceRepository.save(invoice);

  await this.outbox.add(
    InvoicePaidEvent.from(invoice),
  );

  return InvoiceResult.from(invoice);
});
```

This code should not need to know that the runtime implementation involves:

```text
TypeORM
EntityManager
PostgreSQL
Invoice tables
Payment tables
Outbox table
Kafka
Redis
HAProxy
database failover
```

Those concerns belong behind the architectural boundaries defined in this document.

---

# 75. Final Principle

Do not optimize for the largest possible architecture.

Optimize for:

```text
Clear ownership
Explicit boundaries
Business readability
Correct transactions
Controlled coupling
Operational reliability
Future evolvability
```

Use the simplest implementation that still respects these boundaries.

<!-- Final English architecture contract: original English architecture preserved, API execution flows added as normative rules. -->

# 76. Examination performance and cost contract

Optimize lowest cost satisfying correctness, security, durability, SLO and capacity. Every critical endpoint must record query count, DB round trips, payload, pool wait, lock/transaction duration, p50/p95/p99, sustainable throughput, CPU/request and memory behavior. Infrastructure claims require before/after measurements with region, configuration, image digest, dataset and cost provenance. Failed SLO/correctness/reliability configurations are ineligible regardless of price. Production acceptance requires AWS load/failure/restore evidence, not a successful deploy. See `docs/performance.md`.

# 77. Examination Capability and Persistence Contract

The target is a single modular monolith with separate API and worker entry points, not separate services/databases. Identity owns User, Role, permission assignments and Session. Catalog owns Exam, ExamSection, Question, QuestionOption and immutable ExamQuestion snapshots. Assessment owns ExamAttempt/AttemptAnswer/ExamResult and derived Leaderboard/question statistics. Reporting owns read-only admin/business queries across explicitly declared source schemas. AuditLog is an append-only technical port used in the same transaction as admin mutations. This does not create one module per table.

`apps/api/src/modules/<capability>/{domain,application,infrastructure,presentation}` holds behavior and owned adapters. Apply §5: pure shared contracts in `shared/{domain,application}`, reusable Nest helpers in `shared/common`, typed settings in `config`, global technical adapters in `infrastructure` and process/inbound adapters in `workers`. Domain write repositories use `domain/repositories`; read/technical workflow ports use `application/ports`. `main.ts` and worker entry points are composition roots. Browser code stays in `apps/web`; migration target placement and the explicit current-layout transition are recorded in §5/ADR-006. Do not put scoring, attempt, Identity or publication policy into shared/global technical folders.

The supplied TypeORM examples illustrate an allowed adapter. ADR-001 records the current parameterized `pg` implementation behind repository/query ports; it is not a measured performance/cost preference over ORM. TypeORM/Sequelize may implement those ports after a documented comparison and decision. Domain/Application cannot import `pg`, NestJS, Redis, AWS SDK or transport implementations. Transaction connections remain in infrastructure AsyncLocalStorage and are resolved for every operation. Nested work joins the transaction; any joined failure makes it rollback-only even if accidentally caught. Connection acquisition, statement/lock/idle transaction limits and pool headroom are explicit.

# 78. Attempt Lifecycle and Concurrency Contract

The adopted v1 policy details and acceptance cases are in [product specification](../docs/product-specification.md), [permissions](../docs/security-and-permissions.md) and [HTTP/event contracts](../docs/contracts/README.md). [ADR-003](../docs/adr/003-idempotency-retention.md) supplies the bounded durable receipt/retry contract. These specialize the invariants below; specification validation is not runtime evidence.

The lifecycle policy is CREATED → IN_PROGRESS → SUBMITTED → PROCESSING → COMPLETED. A deadline submission follows IN_PROGRESS → EXPIRED → PROCESSING → COMPLETED and preserves `expired=true`. Grading permanent/exhausted failure is FAILED; an audited replay may move FAILED → PROCESSING. Transient failures roll back their transaction and are retried; they must not permanently claim the inbox. PROCESSING may be a transaction-local transition in the first implementation. A durable visible processing state requires an explicit lease/fencing design and crash tests; do not infer a persisted state from a queue receive alone.

Start: authenticate/authorize → application UnitOfWork → actor/exam serialization → Catalog public capability for current published version/open/close/duration/limit → select existing active attempt or check attempt count → create attempt referencing immutable published version → actor/key receipt → commit. Do not lock Identity repositories from Assessment. Reusing the key for another exam/payload is a conflict.

Save: UnitOfWork → owning attempt row lock → check actor and receipt → resolve database time after lock acquisition → require IN_PROGRESS and before deadline → validate selected options against frozen question → compare expected per-answer version → persist answer/mark + durable receipt → commit. Same accepted retry returns its original receipt; an old retry cannot overwrite a newer answer. Define receipt TTL/pruning and retry-after-retention response before deployment. A timestamp captured before a long lock wait cannot authorize a save after deadline.

Submit: UnitOfWork → same attempt lock → actor/receipt/state validation → immutable accepted submission/deadline reason → state change + one stable versioned outbox intent + receipt → commit → acknowledgement. No queue/network call or heavy scoring inside submit. Save/submit lock ordering yields either an answer committed before submission or a rejected save after it, never acknowledged-but-lost data. Scheduled expiration calls the same application path in bounded batches and safely competes with manual submit. Client countdown is derived from server deadline and cannot control acceptance.

Published content/scoring/release policy is immutable. Editing a bank question affects a new exam version only. Unpublishing denies new attempts without changing existing attempt content. Candidate question projection excludes keys/explanations; result explanation access obeys the frozen release policy (never, after completion or after exam close). Authorization is rechecked on resume/status/result/history endpoints.

# 79. SQS Outbox, Grading and Projection Contract

SQS Standard + DLQ is the initial broker candidate; Kafka is not a dependency. Outbox publisher atomically claims bounded rows with a short PostgreSQL lease transaction and SKIP LOCKED or equivalent, commits claim before I/O, sends stable event identity then marks delivered only after broker acknowledgement and matching lease token. Crash after send can duplicate. Expired claims are recoverable; failed sends use bounded jittered backoff; poison/aged rows park for audited replay. Observe unpublished age separately from SQS depth.

Event envelope follows §31 with `attempt.submitted.v1`, source, schema version, attempt/published-version identifiers and correlation/causation metadata. Do not put candidate answers or keys into the queue. Consumer validates runtime schema, establishes request/trace context and invokes an application use case. Unique `(consumer,eventId)` inbox and deterministic grading/result/projection completion share one UnitOfWork. Duplicates verify durable prior completion, not only an in-memory flag. Result uniqueness also protects against different event IDs for the same attempt. Successful commit precedes DeleteMessage. A worker crash must permit safe redelivery.

Heavy computation must not hold unnecessary locks. Benchmark scoring duration before choosing transaction-local grading; if it is materially long, use a short claim/snapshot, compute outside transaction, then a fenced completion transaction with immutable snapshot identity. Never acknowledge before result durability. Leaderboard ranking/ties, one-entry-per-candidate vs per-attempt semantics and question-statistic denominators must be specified before implementation. A separately asynchronous projection must expose freshness and cannot become authority for a write invariant.

Workers have independent task sizing/autoscaling, bounded parallelism and DB budgets. Match visibility timeout/heartbeat to measured worst-case job time; graceful drain stops receives and completes or safely releases active jobs. DLQ/FAILED are operator-visible with an audited replay runbook. Queue depth/oldest age/processing duration drive scaling hypotheses, not CPU alone.

# 80. Performance and Database Measurement Contract

For each hot endpoint, declare an expected query/round-trip budget before implementation and verify observed counts. Measure full end-to-end latency separately from handler/query/pool/lock/transaction timings. Save and submit need concurrent PostgreSQL tests, not mocked query assertions. Projection reads select only authorized fields and bounded page sizes; cursor ordering has a unique tie-breaker. Snapshot question loading avoids N+1 and retains bounded payloads. SQL stays inside owned adapters; reporting cross-module joins are read-only and declared.

Dataset includes at least 100,000 users, 1,000 exams, 500,000 questions and millions of attempt/answer rows, with realistic distributions, timestamps, options, history and hot/cold exams. Record exact counts/seed/version/skew. Run EXPLAIN (ANALYZE, BUFFERS), pg_stat_statements and lock/pool/WAL/IOPS observations in staging. Find first saturation point and sustainable load with latency/error/headroom gates; CPU alone is insufficient. Tune query/index/schema/pool before instance growth. Experiments with missing/bad indexes, N+1, OFFSET/cursor, slow queries, exhaustion, locks and high writes require an isolated copy, rollback and bounded duration.

# 81. Cache and AWS Resource Contract

No Redis is provisioned by default. Cache-aside remains the default if measured later; define every key/version/TTL/invalidation/staleness/fallback/stampede bound under §39 and R-68. Record Redis cost against total avoided database/compute cost, plus required SLO or resilience value. Durable answers/results, authorization and deadline/limit checks remain PostgreSQL-based.

Target infrastructure is Terraform: CloudFront and WAF public entry, private application tasks/ALB origin, encrypted private Multi-AZ RDS PostgreSQL, SQS/DLQ, ECR, private S3, secret injection and CloudWatch. Route53/custom certificates are conditional on a domain; default CloudFront hostname supplies public viewer HTTPS. End-to-end origin TLS remains an open design/certificate requirement until settled; a private link is not a substitute for TLS where TLS is required. Compare VPC origin support and regional availability before applying Terraform.

A resource ledger captures why it exists, absence/failure behavior, SLO requirement, utilization target/headroom, monthly regional cost including traffic/storage, alternatives and evidence. No Redis/Kafka/RDS Proxy/NAT/interface endpoint selection is assumed to win. Compare network topologies including AZ fault tolerance, endpoint fixed charges, NAT processing and cross-AZ transfer. Private tasks must reach registry/logs/secrets/SQS without opening public addresses. Security and resilience are feasibility gates before cost selection.

# 82. Compute, Scaling and Deployment Contract

API has a non-Spot availability baseline across AZs; worker baseline/Spot burst follows queue SLO and interruption tolerance. Candidate configurations include Fargate x86_64, Fargate ARM64/Graviton and ECS EC2 when amortized capacity justifies operations cost. Use architecture-compatible immutable image digests and measure image size, start-to-ready, RSS, CPU utilization and requests/jobs per task. Scheduled scale-up before known exam bursts complements reactive scaling; measure cold start and autoscaling reaction time.

Scaling metrics must predict saturation: ALB requests/target, p95 latency, pool wait, memory/CPU and worker backlog per effective capacity/oldest age. Set min/max, cooldown, scheduled windows and load shedding from evidence. Respect database connection budget at maximum task count. Deployment drains ALB/API and queue workers, verifies readiness, uses circuit breaker/health checks and protects minimal capacity. Runtime role has no migration DDL; migration role is separate. CI builds/test/security checks, publishes ECR image, runs the migration task, rolls ECS, verifies health and stores deployment provenance. Roll back the prior image/task definition; reverse data only through an explicit restore/migration decision.

# 83. Observability, Security and Recovery Contract

Structured redacted logs, bounded-cardinality metrics and sampled traces link HTTP → outbox → publisher → SQS → grading. Sampling must bound cost while preserving useful failure diagnosis. Diagnostic retention, audit retention, levels and CloudWatch ingestion/storage/query/metric/trace budgets are distinct. IDs may be redacted contextual log/trace fields, never metric labels. Never log tokens, passwords, answers, answer keys, SQL parameters or request bodies. Quantify instrumentation overhead.

Mandatory controls include authenticated sessions/rotation/revocation, permissions and object ownership, audited admin/import/replay actions, TLS, encryption at rest, IAM/DB least privilege, private DB/cache, WAF/rate limits, secret injection/rotation, dependency/image/IaC checks, timeouts, bounded retry with jitter, back-pressure and graceful drain. Health readiness includes only critical dependencies. SQS delivery failure must not lose a committed submit; outbox capacity/backlog admission policy is explicit. Database failure cannot fall back to memory and claim a durable save.

RPO/RTO are targets until a timed restore validates them. Multi-AZ is not a backup. Automated backups/PITR, deletion protection, final-snapshot policy, restore-to-new-instance verification and endpoint switch/rollback are separate controls. Test task crash, queue backlog/duplicates/poison, connection exhaustion, RDS failover, deployment under load and restore in isolated environments. Record lost acknowledged writes, recovery time and traffic impact.

# 84. SLO, Workload and Performance-Cost Contract

The profile defines provisional SLO/capacity targets; production commitment requires specified workload, error treatment, window and verified feasibility. Simulate 100→500→2,000 arrivals, synchronized question loading, 45 minutes of autosaves, simultaneous submission, five minutes of polling then leaderboard burst. k6 smoke/baseline/normal/ramp/spike/stress/soak/mass-start/autosave/mass-submit/polling complement the lifecycle test.

For every configuration measure sustainable achieved RPS, concurrent active candidates, jobs/task/sec, p50/p95/p99, CPU/request, allocation/RSS/GC, query counts, DB pool/CPU/IOPS/locks, utilization/headroom and complete infrastructure cost. Define cost time basis and normalized formulas in [performance protocol](../docs/performance.md). Estimates are not bill measurements. The performance-cost curve excludes failing correctness/security/durability/SLO/reliability/capacity configurations; choose the lowest total cost among feasible ones. Assess marginal gain per added USD and a 20% cost reduction with a new run, not extrapolated certainty.

# 85. Evidence and Completion Contract

Every `/experiments` record contains hypothesis, config/dataset/image/region/date, resources, traffic, raw metrics, cost provenance, result and decision. Track code/template existence separately from execution/production evidence. A local pass is not an AWS pass. The [roadmap](../docs/implementation-roadmap.md) and [production acceptance ledger](../docs/production-acceptance.md) must remain truthful. Completion requires every requested capacity/cost/failure-recovery question to be answered with reproducible evidence. Unknowns stay explicitly unmeasured; do not fabricate a curve, ranking or winning infrastructure configuration.
