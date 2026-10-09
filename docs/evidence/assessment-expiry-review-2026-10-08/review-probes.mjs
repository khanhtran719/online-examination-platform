// Independent review probes. Only disposable databases; never runs the archived measurement entry point.
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import pg from "pg";
const require = createRequire(import.meta.url);
const { databaseConfig } = require(resolve("dist/config/database.config.js"));
const { loadMigrations, migrate } = require(resolve("dist/infrastructure/database/migration-runner.js"));
const { PostgresDatabase } = require(resolve("dist/infrastructure/database/transaction/postgres-database.js"));
const { DeadlineSweep } = require(resolve("dist/modules/assessment/application/services/deadline-sweep.js"));
const { PostgresAttemptRepository, claimDueSql } = require(resolve("dist/modules/assessment/infrastructure/persistence/postgres-attempt.repository.js"));
const { PostgresSubmissionOutbox } = require(resolve("dist/modules/assessment/infrastructure/persistence/postgres-submission-outbox.js"));
const results = [];
const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl) throw new Error("Disposable PostgreSQL administrator required");
function check(name, expected, actual, note) {
 const pass = JSON.stringify(expected) === JSON.stringify(actual);
 results.push({name, pass, expected, actual, note});
 process.stdout.write(JSON.stringify({name, pass}) + "\n");
}

const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const database = `expiry_review_${suffix}`;
const owner = `review_ddl_${suffix}`;
const login = `review_expiry_${suffix}`;
const password = randomUUID();
const admin = new pg.Pool({ connectionString: adminUrl, max: 1 });
const fixtureUrl = new URL(adminUrl);
fixtureUrl.pathname = `/${database}`;
const ownerUrl = new URL(fixtureUrl);
ownerUrl.username = owner;
ownerUrl.password = password;
const workerUrl = new URL(fixtureUrl);
workerUrl.username = login;
workerUrl.password = password;
let fixture, db, db2;
try {
 await admin.query(`CREATE DATABASE ${database}`);
 await admin.query(await readFile("infra/database/roles.sql", "utf8"));
 await admin.query(`GRANT CREATE ON DATABASE ${database} TO examination_owner`);
 await admin.query(`CREATE ROLE ${owner} LOGIN NOINHERIT PASSWORD '${password}'`);
 await admin.query(`CREATE ROLE ${login} LOGIN INHERIT PASSWORD '${password}'`);
 await admin.query(`GRANT examination_owner TO ${owner}`);
 await admin.query(`GRANT examination_expiry_worker TO ${login}`);
 await migrate(dbConfig(ownerUrl.toString(), 1), await loadMigrations("apps/api/src/infrastructure/database/migrations"));
 fixture = new pg.Pool({ connectionString: fixtureUrl.toString(), max: 2 });
 const version = await publishOne(fixture);
 const reference = {id:version.versionId, exam_id:version.examId};
 db = new PostgresDatabase(dbConfig(workerUrl.toString()));
 db2 = new PostgresDatabase(dbConfig(workerUrl.toString()));
 const sweep = (database, batch) => new DeadlineSweep(new PostgresAttemptRepository(database), new PostgresSubmissionOutbox(database), database, batch);
 const openIds = async () => (await fixture.query(`
   SELECT id FROM assessment.attempts
   WHERE status = 'IN_PROGRESS' AND deadline <= clock_timestamp()
   ORDER BY deadline, id
 `)).rows.map(row=>row.id);

 // ER-01: the worker role must not commit accepted provenance as NULL.
 await insertAttempts(fixture, reference, 1, "due");
 const [missingKind] = await openIds();
 let missingKindCode = null;
 try {
   await db.query("assessment.write", `
     UPDATE assessment.attempts
     SET status = 'EXPIRED', expired = true, submitted_at = clock_timestamp(),
         submission_id = gen_random_uuid(), submission_event_id = gen_random_uuid(),
         submission_kind = NULL, revision = revision + 1
     WHERE id = $1
   `, [missingKind]);
 } catch(error) { missingKindCode = error.code; }
 check("ER-01 accepted NULL provenance is rejected", "23514", missingKindCode,
   "Actual UPDATE runs as a dedicated login inheriting examination_expiry_worker, including deferred commit guards.");
 let repairCode = null;
 try {
   await db.query("assessment.write", "UPDATE assessment.attempts SET submission_kind = 'DEADLINE' WHERE id = $1", [missingKind]);
 } catch(error) {repairCode = error.code;}
 check("control accepted provenance cannot later change", "23514", repairCode);

 // ER-02: a full failed batch must not indefinitely starve younger valid rows.
 await insertAttempts(fixture, reference, 3, "due");
 const [poisonA, poisonB, healthy] = await openIds();
 assert(healthy);
 await fixture.query(`
   CREATE FUNCTION public.review_poison() RETURNS trigger LANGUAGE plpgsql AS $fn$
   BEGIN
     IF NEW.aggregate_id IN ('${poisonA}'::uuid, '${poisonB}'::uuid) THEN
       RAISE EXCEPTION 'review poison' USING ERRCODE = 'P0001';
     END IF;
     RETURN NEW;
   END $fn$;
   CREATE TRIGGER review_poison BEFORE INSERT ON platform.outbox
   FOR EACH ROW EXECUTE FUNCTION public.review_poison()
 `);
 const ticks = [];
 for (let n = 0; n < 3; n += 1) ticks.push(await sweep(db, 2).runOnce(randomUUID()));
 const healthyStatus = (await fixture.query("SELECT status FROM assessment.attempts WHERE id = $1", [healthy])).rows[0].status;
 check("ER-02 younger row progresses past two repeatedly failing rows", "EXPIRED", healthyStatus,
   {batchSize:2, ticks});
 await fixture.query("DROP TRIGGER review_poison ON platform.outbox; DROP FUNCTION public.review_poison()");
 const recovered = await sweep(db, 10).runOnce(randomUUID());
 check("control clearing poison recovers rolled-back attempts", 3, recovered.processed);

 // Control: simultaneous workers keep one event and revision increment per new attempt.
 await insertAttempts(fixture, reference, 4, "due");
 const concurrentIds = await openIds();
 await Promise.all([sweep(db, 10).runOnce(randomUUID()), sweep(db2, 10).runOnce(randomUUID())]);
 const durable = (await fixture.query(`
   SELECT count(*)::int AS attempts,
          bool_and(status = 'EXPIRED' AND revision = 2 AND submission_kind = 'DEADLINE') AS valid,
          (SELECT count(*)::int FROM platform.outbox WHERE aggregate_id = ANY($1::uuid[])) AS events
   FROM assessment.attempts WHERE id = ANY($1::uuid[])
 `, [concurrentIds])).rows[0];
 check("control concurrent workers commit exactly once", {attempts:4,valid:true,events:4}, durable);

 // ER-03: acceptance timestamp precedes an independently observed pre-commit barrier.
 await insertAttempts(fixture, reference, 1, "due");
 const [delayed] = await openIds();
 await fixture.query(`
   CREATE TABLE public.review_commit_witness (attempt_id uuid, witnessed_at timestamptz);
   GRANT INSERT ON public.review_commit_witness TO examination_expiry_worker;
   CREATE FUNCTION public.review_delay() RETURNS trigger LANGUAGE plpgsql AS $fn$
   BEGIN
     PERFORM pg_sleep(0.2);
     INSERT INTO public.review_commit_witness VALUES (NEW.aggregate_id, clock_timestamp());
     RETURN NEW;
   END $fn$;
   CREATE TRIGGER review_delay BEFORE INSERT ON platform.outbox
   FOR EACH ROW EXECUTE FUNCTION public.review_delay()
 `);
 const delayedResult = await sweep(db, 10).runOnce(randomUUID());
 assert.equal(delayedResult.processed, 1);
 const lag = (await fixture.query(`
   SELECT extract(epoch FROM (a.submitted_at - a.deadline)) * 1000 AS reported_lag_ms,
          extract(epoch FROM (w.witnessed_at - a.deadline)) * 1000 AS commit_lag_lower_bound_ms,
          extract(epoch FROM (w.witnessed_at - a.submitted_at)) * 1000 AS omitted_ms
   FROM assessment.attempts a JOIN public.review_commit_witness w ON a.id = w.attempt_id
   WHERE a.id = $1
 `, [delayed])).rows[0];
 check("ER-03 labeled commit lag includes mandatory pre-commit work", true, Number(lag.omitted_ms) < 10, lag);
 await fixture.query("DROP TRIGGER review_delay ON platform.outbox; DROP FUNCTION public.review_delay(); DROP TABLE public.review_commit_witness");

 // ER-04: with no due rows, a claim/backlog should use an index deadline range.
 await insertAttempts(fixture, reference, 100000, "future");
 await fixture.query("ANALYZE assessment.attempts");
 const sqlSource = await readFile("apps/api/src/modules/assessment/infrastructure/persistence/postgres-attempt.repository.ts", "utf8");
 const backlogSql = sqlSource.slice(sqlSource.indexOf("async dueBacklog"), sqlSource.indexOf("async insert")).match(/`([\s\S]*?)`/)[1];
 const plans = [];
 for (let repeat = 0; repeat < 3; repeat += 1) {
   for (const [name,sql,params] of [
     ["claim-current",claimDueSql,[[]]],
     ["claim-stable-discovery",claimDueSql.replace("deadline <= clock_timestamp()", "deadline <= statement_timestamp()"),[[]]],
     ["backlog-current",backlogSql,[]],
     ["backlog-stable-discovery",backlogSql.replace("deadline <= clock_timestamp()", "deadline <= statement_timestamp()"),[]],
   ]) {
     const client = await fixture.connect();
     try {
       await client.query("BEGIN");
       const result = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`,params);
       await client.query("ROLLBACK");
       plans.push({name,repeat,plan:result.rows[0]["QUERY PLAN"]});
     } finally {client.release();}
   }
 }
 const indexConditions = plan => JSON.stringify(plan).includes('"Index Cond"');
 check("ER-04 current empty claim has a deadline index range", true, indexConditions(plans[0].plan),
   "100,000 future IN_PROGRESS rows, ANALYZE, zero due rows. Comparison changes discovery only; outer post-lock clock remains clock_timestamp().");
 await writeFile("docs/evidence/assessment-expiry-review-2026-10-08/query-plans.json", JSON.stringify(plans,null,2)+"\n",{flag:"wx"});
} finally {
 await db?.close();
 await db2?.close();
 await fixture?.end();
 await admin.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
 await admin.query(`DROP ROLE IF EXISTS ${owner}, ${login}`);
 await admin.end();
 await writeFile("docs/evidence/assessment-expiry-review-2026-10-08/review-results.json",JSON.stringify({capturedAt:new Date().toISOString(),results},null,2)+"\n",{flag:"wx"});
}
process.exitCode = results.some(result=>!result.pass) ? 1 : 0;
function dbConfig(databaseUrl, poolMax = 2) {
 return databaseConfig({NODE_ENV:"test", DATABASE_URL:databaseUrl, DB_POOL_MAX:String(poolMax),
 DB_MAX_WAITING:"4", DB_ACQUIRE_TIMEOUT_MS:"1000", DB_STATEMENT_TIMEOUT_MS:"2000",
 DB_LOCK_TIMEOUT_MS:"500", DB_IDLE_TRANSACTION_TIMEOUT_MS:"5000", DB_SSL:"false"});
}

// Fixture setup copied from the ATT-07 harness; review cases below are independent.
async function publishOne(fixture) {
  const client = await fixture.connect();
  try {
    await client.query("BEGIN");
    const userId = randomUUID();
    const examId = randomUUID();
    const versionId = randomUUID();
    const sectionId = randomUUID();
    const questionId = randomUUID();
    const optionA = randomUUID();
    const optionB = randomUUID();
    await client.query(
      `INSERT INTO identity.users (id, email, password_hash, display_name)
       VALUES ($1, $2, 'fixture-not-a-real-password-hash', 'Publisher')`,
      [userId, `${userId}@example.test`],
    );
    await client.query(
      `INSERT INTO catalog.exams (
         id, title, category, duration_seconds, attempt_limit, opens_at, closes_at, display_timezone
       ) VALUES (
         $1, 'Expiry measure', 'IT_CERTIFICATION', 90, 10,
         clock_timestamp() - interval '1 day', clock_timestamp() + interval '1 day', 'Asia/Ho_Chi_Minh'
       )`,
      [examId],
    );
    await client.query(
      `INSERT INTO catalog.published_versions (
         id, exam_id, version, title, description, duration_seconds, attempt_limit,
         opens_at, closes_at, display_timezone, explanation_policy, category, published_by
       ) VALUES (
         $1, $2, 1, 'Expiry measure', '', 90, 10,
         clock_timestamp() - interval '1 day', clock_timestamp() + interval '1 day',
         'Asia/Ho_Chi_Minh', 'NEVER', 'IT_CERTIFICATION', $3
       )`,
      [versionId, examId, userId],
    );
    await client.query(
      `INSERT INTO catalog.published_sections (version_id, id, title, position) VALUES ($1, $2, 'One', 1)`,
      [versionId, sectionId],
    );
    await client.query(
      `INSERT INTO catalog.published_questions (
         version_id, id, section_id, source_question_id, source_revision, type, prompt, explanation, points, position
       ) VALUES ($1, $2, $3, $4, 1, 'SINGLE_CHOICE', 'Prompt', 'hidden', 5, 1)`,
      [versionId, questionId, sectionId, randomUUID()],
    );
    await client.query(
      `INSERT INTO catalog.published_options (version_id, question_id, id, position, text)
       VALUES ($1, $2, $3, 1, 'A'), ($1, $2, $4, 2, 'B')`,
      [versionId, questionId, optionA, optionB],
    );
    await client.query(
      `INSERT INTO catalog.published_answer_keys (version_id, question_id, option_id) VALUES ($1, $2, $3)`,
      [versionId, questionId, optionA],
    );
    await client.query(
      `UPDATE catalog.exams SET published = true, current_version_id = $2, revision = 2 WHERE id = $1`,
      [examId, versionId],
    );
    await client.query("COMMIT");
    return { examId, versionId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function insertAttempts(fixture, version, count, kind) {
  if (count < 1) return;
  if (kind === "due" || kind === "future") {
    await fixture.query(
      `WITH people AS (
         INSERT INTO identity.users (id, email, password_hash, display_name)
         SELECT gen_random_uuid(), replace(gen_random_uuid()::text, '-', '') || '@example.test',
                'fixture-not-a-real-password-hash', 'Measure'
         FROM generate_series(1, $3)
         RETURNING id
       ), numbered AS (
         SELECT id, row_number() OVER () AS n FROM people
       )
       INSERT INTO assessment.attempts (
         id, user_id, exam_id, version_id, status, started_at, deadline, revision
       )
       SELECT gen_random_uuid(), id, $1, $2, 'IN_PROGRESS',
              clock_timestamp() - interval '2 hours',
              CASE
                WHEN $4 = 'future' THEN clock_timestamp() + interval '1 hour'
                ELSE clock_timestamp() - (((n % 60) + 1) * interval '1 second')
              END,
              1
       FROM numbered`,
      [version.exam_id, version.id, count, kind],
    );
    return;
  }
  await fixture.query(
    `WITH people AS (
       INSERT INTO identity.users (id, email, password_hash, display_name)
       SELECT gen_random_uuid(), replace(gen_random_uuid()::text, '-', '') || '@example.test',
              'fixture-not-a-real-password-hash', 'Measure'
       FROM generate_series(1, $3)
       RETURNING id
     )
     INSERT INTO assessment.attempts (
       id, user_id, exam_id, version_id, status, started_at, deadline, submitted_at,
       submission_id, submission_event_id, expired, failure_code, revision, submission_kind
     )
     SELECT gen_random_uuid(), id, $1, $2,
            CASE $4
              WHEN 'submitted' THEN 'SUBMITTED'
              WHEN 'expired' THEN 'EXPIRED'
              ELSE 'FAILED'
            END,
            clock_timestamp() - interval '2 days',
            CASE WHEN $4 = 'expired' THEN clock_timestamp() - interval '1 day'
                 ELSE clock_timestamp() + interval '1 hour' END,
            CASE WHEN $4 = 'expired' THEN clock_timestamp() - interval '1 day'
                 ELSE clock_timestamp() - interval '30 minutes' END,
            gen_random_uuid(), gen_random_uuid(),
            $4 = 'expired',
            CASE WHEN $4 = 'failed' THEN 'SCORE_UNAVAILABLE' ELSE NULL END,
            2,
            CASE WHEN $4 = 'expired' THEN 'DEADLINE' ELSE 'MANUAL' END
     FROM people`,
    [version.exam_id, version.id, count, kind],
  );
}
