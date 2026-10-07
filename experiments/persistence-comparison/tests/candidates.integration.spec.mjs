import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { createCandidate } from "../candidates.mjs";
import { disposableFixture, activatedSession } from "../fixture.mjs";
import { httpFixture } from "../http-fixture.mjs";
import {
  cryptoFixture,
  identityFixture,
  freshKey,
  PostgresIdentityRepository,
  PostgresSecurity,
} from "../runtime.mjs";
let fixture, crypto;
before(async () => {
  fixture = await disposableFixture();
  crypto = await cryptoFixture();
});
after(async () => {
  await fixture?.close();
});

for (const candidate of ["pg", "typeorm", "sequelize"]) {
  test(`${candidate}: durable transaction and Identity hard gates`, async (t) => {
    const db = await createCandidate(candidate, fixture.config);
    t.after(() => db.close());
    await t.test("joins one PID and rolls back a caught nested failure", async () => {
      let pid;
      await assert.rejects(
        db.transaction(async () => {
          pid = (await db.query("diagnostic", "SELECT pg_backend_pid() pid")).rows[0].pid;
          try {
            await db.transaction(async () => {
              assert.equal(
                (await db.query("diagnostic", "SELECT pg_backend_pid() pid")).rows[0].pid,
                pid,
              );
              await db.query("diagnostic", "INSERT INTO platform.orm_probe VALUES($1,1)", [
                `${candidate}-nested`,
              ]);
              throw new Error("inner failure");
            });
          } catch {
            /* caller catches, UoW must still abort */
          }
        }),
        /rollback-only/,
      );
      assert.equal(
        (
          await fixture.fixture.query(
            "SELECT count(*)::int n FROM platform.orm_probe WHERE id=$1",
            [`${candidate}-nested`],
          )
        ).rows[0].n,
        0,
      );
    });
    await t.test("redacts SQL errors and cannot commit an aborted transaction", async () => {
      await assert.rejects(
        db.transaction(async () => {
          await db.query("diagnostic", "INSERT INTO platform.orm_probe VALUES($1,1)", [
            `${candidate}-sql`,
          ]);
          try {
            await db.query("diagnostic", "SELECT secret_parameter_that_must_not_be_logged");
          } catch (error) {
            assert.equal(error.message, "Database operation failed");
            assert.equal(error.code, "42703");
          }
        }),
        /rollback-only/,
      );
      assert.equal(
        (
          await fixture.fixture.query(
            "SELECT count(*)::int n FROM platform.orm_probe WHERE id=$1",
            [`${candidate}-sql`],
          )
        ).rows[0].n,
        0,
      );
    });
    await t.test("rejects lock outside transaction and late asynchronous context", async () => {
      await assert.rejects(db.query("lock.acquire", "SELECT 1"), {
        code: "DB_TRANSACTION_REQUIRED",
      });
      let later;
      await db.transaction(async () => {
        later = delay(20)
          .then(() => db.query("diagnostic", "SELECT 1"))
          .catch((e) => e.code);
      });
      assert.equal(await later, "DB_CONTEXT_ENDED");
    });
    await t.test("waits for detached query then refuses its commit", async () => {
      let pending;
      await assert.rejects(
        db.transaction(async () => {
          pending = db.query("diagnostic", "SELECT pg_sleep(0.04)");
        }),
        /rollback-only/,
      );
      await pending;
    });
    await t.test("enforces restricted DDL and server timeout without leaking inputs", async () => {
      await assert.rejects(db.query("diagnostic", "CREATE TABLE public.prohibited(id int)"), {
        code: "42501",
      });
      await db
        .transaction(async () => {
          await db.query("diagnostic", "SET LOCAL statement_timeout='40ms'");
          await assert.rejects(db.query("diagnostic", "SELECT pg_sleep(1)"), { code: "57014" });
        })
        .then(
          () => assert.fail("aborted SQL committed"),
          (e) => assert.match(e.message, /rollback-only/),
        );
    });
    await t.test("bounds admission and drains before rejecting new work", async () => {
      const small = await createCandidate(candidate, { ...fixture.config, max: 1, maxWaiting: 1 });
      let entered;
      const inTx = new Promise((done) => {
        entered = done;
      });
      let finish;
      const hold = new Promise((done) => {
        finish = done;
      });
      const first = small.transaction(async () => {
        entered();
        await hold;
      });
      await inTx;
      const second = small.query("diagnostic", "SELECT 1");
      await assert.rejects(small.query("diagnostic", "SELECT 1"), { code: "DB_BUSY" });
      const closing = small.close();
      await assert.rejects(small.query("diagnostic", "SELECT 1"), { code: "DB_BUSY" });
      finish();
      await Promise.all([first, second, closing]);
    });
    await t.test("maps accounts and keeps ORM/raw/audit/receipt in one rollback", async () => {
      const pair = await activatedSession(db, crypto);
      const rawRepo = new PostgresIdentityRepository(db);
      const email = `${pair.userId}@example.test`;
      const mapped = identityFixture(db, crypto, candidate !== "pg");
      assert.deepEqual(
        await mapped.repo.accountByEmail(email),
        await rawRepo.accountByEmail(email),
      );
      const original = await mapped.identity.authenticate(pair.access);
      const key = freshKey(),
        input = {
          displayName: "Updated",
          leaderboardOptIn: true,
          expectedRevision: original.profile.revision,
        };
      const results = await Promise.all([
        mapped.identity.updateProfile(pair.access, key, input, crypto.codec.id()),
        mapped.identity.updateProfile(pair.access, key, input, crypto.codec.id()),
      ]);
      assert.deepEqual(results[0], results[1]);
      assert.equal(
        (
          await fixture.fixture.query(
            "SELECT count(*)::int n FROM platform.idempotency_receipts WHERE actor_id=$1",
            [pair.userId],
          )
        ).rows[0].n,
        1,
      );
      assert.equal(
        (
          await fixture.fixture.query(
            "SELECT count(*)::int n FROM platform.audit_logs WHERE actor_id=$1",
            [pair.userId],
          )
        ).rows[0].n,
        1,
      );
      const security = new PostgresSecurity(db, crypto.rateKey);
      security.audit = async () => {
        throw new Error("forced audit failure");
      };
      const failing = identityFixture(db, crypto, candidate !== "pg", security);
      await assert.rejects(
        failing.identity.updateProfile(
          pair.access,
          freshKey(),
          { ...input, displayName: "Must roll back", expectedRevision: results[0].revision },
          crypto.codec.id(),
        ),
        /forced audit failure/,
      );
      assert.equal(
        (await mapped.identity.authenticate(pair.access)).profile.displayName,
        "Updated",
      );
      assert.equal(
        (
          await fixture.fixture.query(
            "SELECT count(*)::int n FROM platform.idempotency_receipts WHERE actor_id=$1",
            [pair.userId],
          )
        ).rows[0].n,
        1,
      );
    });
    await t.test("rejects stale revisions and key reuse with another payload", async () => {
      const pair = await activatedSession(db, crypto),
        { identity } = identityFixture(db, crypto, candidate !== "pg");
      const key = freshKey(),
        input = { displayName: "First", leaderboardOptIn: false, expectedRevision: 1 };
      await identity.updateProfile(pair.access, key, input, crypto.codec.id());
      await assert.rejects(
        identity.updateProfile(
          pair.access,
          key,
          { ...input, displayName: "Different" },
          crypto.codec.id(),
        ),
        { code: "IDEMPOTENCY_CONFLICT" },
      );
      await assert.rejects(
        identity.updateProfile(pair.access, freshKey(), input, crypto.codec.id()),
        { code: "REVISION_CONFLICT" },
      );
      assert.equal((await identity.authenticate(pair.access)).profile.revision, 2);
    });
    await t.test("uses server lock timeout and releases a contended row", async () => {
      const id = `${candidate}-contention`;
      await fixture.fixture.query("INSERT INTO platform.orm_probe VALUES($1,1)", [id]);
      let entered, finish;
      const ready = new Promise((done) => {
          entered = done;
        }),
        hold = new Promise((done) => {
          finish = done;
        });
      const first = db.transaction(async () => {
        await db.query("lock.acquire", "SELECT id FROM platform.orm_probe WHERE id=$1 FOR UPDATE", [
          id,
        ]);
        entered();
        await hold;
      });
      await ready;
      const other = await createCandidate(candidate, { ...fixture.config, lockMs: 40 });
      try {
        await assert.rejects(
          other.transaction(() =>
            other.query(
              "lock.acquire",
              "SELECT id FROM platform.orm_probe WHERE id=$1 FOR UPDATE",
              [id],
            ),
          ),
          { code: "55P03" },
        );
      } finally {
        finish();
        await first;
        await other.close();
      }
    });
    await t.test("concurrent refresh rotates once and durably revokes replay", async () => {
      const pair = await activatedSession(db, crypto);
      const { identity } = identityFixture(db, crypto, candidate !== "pg");
      const outcomes = await Promise.allSettled([
        identity.refresh(pair.refresh),
        identity.refresh(pair.refresh),
      ]);
      assert.equal(outcomes.filter((o) => o.status === "fulfilled").length, 1);
      const winner = outcomes.find((o) => o.status === "fulfilled").value;
      await assert.rejects(identity.authenticate(winner.access), /Unauthenticated/);
      assert.equal(
        (
          await fixture.fixture.query(
            "SELECT revoked_at IS NOT NULL revoked FROM identity.session_families WHERE id=$1",
            [pair.familyId],
          )
        ).rows[0].revoked,
        true,
      );
    });
    await t.test("connection crash rolls back effects and next query recovers", async () => {
      await assert.rejects(
        db.transaction(async () => {
          await db.query("diagnostic", "INSERT INTO platform.orm_probe VALUES($1,1)", [
            `${candidate}-crash`,
          ]);
          const pid = (await db.query("diagnostic", "SELECT pg_backend_pid() pid")).rows[0].pid;
          await fixture.fixture.query("SELECT pg_terminate_backend($1)", [pid]);
          await db.query("diagnostic", "SELECT 1");
        }),
      );
      assert.equal(
        (
          await fixture.fixture.query(
            "SELECT count(*)::int n FROM platform.orm_probe WHERE id=$1",
            [`${candidate}-crash`],
          )
        ).rows[0].n,
        0,
      );
      assert.equal((await db.query("diagnostic", "SELECT 1 n")).rows[0].n, 1);
    });
    await t.test(
      "preserves actual HTTP envelope, CSRF rejection and signed cookie refresh",
      async () => {
        const pair = await activatedSession(db, crypto),
          capability = identityFixture(db, crypto, candidate !== "pg");
        const http = await httpFixture(capability.identity, capability.security);
        const cookies = `__Host-access=${pair.access}; __Host-refresh=${pair.refresh}`;
        try {
          const me = await http.call("/v1/me", { headers: { cookie: cookies } });
          assert.equal(me.status, 200);
          const body = await me.json();
          assert.deepEqual(Object.keys(body).sort(), ["data", "errorCode", "message", "status"]);
          assert.equal(body.data.id, pair.userId);
          assert.equal(body.errorCode, null);
          const rejected = await http.call("/v1/auth/refresh", {
            method: "POST",
            headers: { cookie: cookies, origin: "http://bad.example" },
          });
          assert.equal(rejected.status, 403);
          const csrf = await http.call("/v1/auth/csrf", { headers: { cookie: cookies } });
          const token = (await csrf.json()).data.csrfToken;
          const response = await http.call("/v1/auth/refresh", {
            method: "POST",
            headers: {
              origin: http.origin,
              cookie: cookies + `; __Host-csrf=${token}`,
              "x-csrf-token": token,
            },
          });
          assert.equal(response.status, 200);
          const session = (await response.json()).data;
          assert.equal(session.userId, pair.userId);
          assert.equal(session.access, undefined);
          assert.equal(session.refresh, undefined);
          const headers = response.headers.getSetCookie();
          assert.ok(
            headers.some(
              (value) =>
                value.startsWith("__Host-access=") &&
                /HttpOnly/i.test(value) &&
                /Secure/i.test(value),
            ),
          );
          assert.ok(
            headers.some(
              (value) =>
                value.startsWith("__Host-refresh=") &&
                /HttpOnly/i.test(value) &&
                /Secure/i.test(value),
            ),
          );
        } finally {
          await http.close();
        }
      },
    );
  });
}
