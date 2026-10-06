import assert from "node:assert/strict";
import { test, before } from "node:test";
import { resolve } from "node:path";
import { loadContracts, inspectOperations, validateEvent } from "../contracts.mjs";

let contracts;
before(async () => {
  contracts = await loadContracts(resolve(import.meta.dirname, "../.."));
});

test("validates the complete OpenAPI contract and its payload examples", () => {
  assert.equal(contracts.api.openapi, "3.0.3");
  assert.ok(contracts.operationCount >= 35);
  assert.ok(contracts.exampleCount >= 10);
});

test("verification is an explicit public POST with a bounded one-use token and final password", () => {
  const confirm = contracts.api.paths["/v1/auth/email-verification/confirm"];
  const resend = contracts.api.paths["/v1/auth/email-verification/request"];
  assert.ok(confirm?.post);
  assert.ok(resend?.post);
  assert.equal(confirm.get, undefined);
  const validate = contracts.schemas.ConfirmEmailVerificationRequest;
  const sample = { token: "A".repeat(43), password: "a final safe password" };
  assert.equal(validate(sample), true);
  assert.equal(validate({ ...sample, token: "A".repeat(42) }), false);
  assert.equal(validate({ ...sample, token: "/".repeat(43) }), false);
  assert.equal(validate({ token: sample.token }), false);
  assert.equal(validate({ ...sample, userId: "attacker" }), false);
  const api = structuredClone(contracts.api);
  api.paths["/v1/auth/email-verification/confirm"].post.security = [];
  assert.ok(inspectOperations(api).some((error) => error.includes("CSRF")));
});

test("signed token contract keeps access and refresh separate and PostgreSQL authoritative", () => {
  const policy = contracts.api["x-session-token-contract"];
  assert.equal(policy?.algorithm, "ES256");
  assert.equal(policy?.authority, "PostgreSQL");
  assert.notEqual(policy.access.typ, policy.refresh.typ);
  assert.notEqual(policy.access.audience, policy.refresh.audience);
  for (const change of [
    { algorithm: "HS256" },
    { authority: "signature-only" },
    { keySource: "token-supplied-url" },
  ]) {
    const api = structuredClone(contracts.api);
    api["x-session-token-contract"] = { ...policy, ...change };
    assert.ok(
      inspectOperations(api).some((error) => error.includes("token contract")),
      JSON.stringify(change),
    );
  }
});

test("contract checks reject a refresh audience reused for access", () => {
  const api = structuredClone(contracts.api);
  api["x-session-token-contract"] = {
    format: "JWT",
    algorithm: "ES256",
    curve: "P-256",
    keySource: "trusted-keyring",
    authority: "PostgreSQL",
    access: { typ: "exam-access+jwt", audience: "same", tokenUse: "access" },
    refresh: { typ: "exam-refresh+jwt", audience: "same", tokenUse: "refresh" },
  };
  assert.ok(inspectOperations(api).some((error) => error.includes("token contract")));
});

test("email login rejects alternate usernames and Session rejects raw credential fields", () => {
  assert.equal(
    contracts.schemas.LoginRequest({
      username: "candidate",
      password: "password",
    }),
    false,
  );
  const session = {
    userId: "00000000-0000-4000-8000-000000000001",
    accessExpiresAt: "2026-10-06T12:05:00.000Z",
    refreshExpiresAt: "2026-10-13T12:00:00.000Z",
    absoluteExpiresAt: "2026-11-05T12:00:00.000Z",
  };
  assert.equal(contracts.schemas.Session(session), true);
  assert.equal(contracts.schemas.Session({ ...session, access_token: "secret" }), false);
  assert.equal(contracts.schemas.Session({ ...session, refresh_token: "secret" }), false);
});

test("email schemas reject non-ASCII identifiers consistently with the PostgreSQL identity policy", () => {
  const invalidEmail = "cándidate@example.com";
  assert.equal(
    contracts.schemas.LoginRequest({
      email: invalidEmail,
      password: "safe password",
    }),
    false,
  );
  assert.equal(
    contracts.schemas.RegisterRequest({
      email: invalidEmail,
      displayName: "Candidate",
      password: "a safe fixture password",
    }),
    false,
  );
  assert.equal(contracts.schemas.RequestEmailVerificationRequest({ email: invalidEmail }), false);
});

test("accepts a submitted event and rejects answer data anywhere in it", () => {
  const sample = contracts.event.examples[0];
  assert.deepEqual(validateEvent(contracts, sample), []);
  assert.ok(validateEvent(contracts, { ...sample, answers: [] }).length);
  assert.ok(
    validateEvent(contracts, {
      ...sample,
      payload: { ...sample.payload, correctOptionIds: [] },
    }).length,
  );
});

test("rejects an event for another aggregate, schema version or invalid timestamp", () => {
  const sample = contracts.event.examples[0];
  assert.ok(
    validateEvent(contracts, {
      ...sample,
      aggregateId: "00000000-0000-4000-8000-000000000009",
    }).length,
  );
  assert.ok(validateEvent(contracts, { ...sample, version: 2 }).length);
  assert.ok(validateEvent(contracts, { ...sample, occurredAt: "yesterday" }).length);
  assert.ok(
    validateEvent(contracts, {
      ...sample,
      payload: { ...sample.payload, expired: true },
    }).length,
  );
});

test("candidate question schema rejects keys and explanation leaks", () => {
  const validate = contracts.schemas.CandidateQuestion;
  const question = contracts.api.components.schemas.CandidateQuestion.example;
  assert.equal(validate(question), true);
  assert.equal(validate({ ...question, correctOptionIds: [] }), false);
  assert.equal(validate({ ...question, explanation: "secret" }), false);
  assert.equal(
    validate({
      ...question,
      options: [{ ...question.options[0], correct: true }],
    }),
    false,
  );
});

test("rejects non-finite timestamps rather than treating them as a manual submission", () => {
  const sample = contracts.event.examples[0];
  assert.ok(
    validateEvent(contracts, {
      ...sample,
      occurredAt: "2026-10-06T23:59:60.000Z",
    }).length,
  );
});

test("save contract accepts clearing and rejects duplicate options and oversized batches", () => {
  const validate = contracts.schemas.SaveAnswersRequest;
  const sample = contracts.api.components.schemas.SaveAnswersRequest.example;
  assert.equal(validate(sample), true);
  assert.equal(validate({ answers: [{ ...sample.answers[0], selectedOptionIds: [] }] }), true);
  assert.equal(
    validate({
      answers: [
        {
          ...sample.answers[0],
          selectedOptionIds: [
            "00000000-0000-4000-8000-000000000003",
            "00000000-0000-4000-8000-000000000003",
          ],
        },
      ],
    }),
    false,
  );
  assert.equal(validate({ answers: Array(21).fill(sample.answers[0]) }), false);
  assert.equal(validate({ answers: [{ ...sample.answers[0], expectedVersion: -1 }] }), false);
});

test("rejects an admin operation made public even when the document remains valid OpenAPI", () => {
  const api = structuredClone(contracts.api);
  api.paths["/v1/admin/exams"].post.security = [];
  assert.ok(inspectOperations(api).some((error) => error.includes("authentication")));
});

test("does not allow an admin route to inherit a public operation name", () => {
  const api = structuredClone(contracts.api);
  const admin = api.paths["/v1/admin/exams"].post;
  admin.operationId = "login";
  admin.security = [{ CsrfHeader: [] }];
  assert.ok(inspectOperations(api).some((error) => error.includes("authentication")));
});

test("rejects a critical mutation without an idempotency header", () => {
  const api = structuredClone(contracts.api);
  api.paths["/v1/attempts/{attemptId}/answers"].put.parameters = [];
  assert.ok(inspectOperations(api).some((error) => error.includes("Idempotency-Key")));
});

test("rejects unsafe browser operations without Origin or CSRF contract", () => {
  const api = structuredClone(contracts.api);
  api.paths["/v1/auth/login"].post.parameters = [];
  api.paths["/v1/auth/register"].post.security = [];
  const errors = inspectOperations(api);
  assert.ok(errors.some((error) => error.includes("Origin")));
  assert.ok(errors.some((error) => error.includes("CSRF")));
});

test("rejects undocumented owners, acceptance cases and unbounded list pagination", () => {
  const api = structuredClone(contracts.api);
  const browse = api.paths["/v1/exams"].get;
  browse["x-owner"] = "questions-table";
  browse["x-cases"] = [];
  browse.parameters = [];
  const errors = inspectOperations(api);
  assert.ok(errors.some((error) => error.includes("owner")));
  assert.ok(errors.some((error) => error.includes("acceptance")));
  assert.ok(errors.some((error) => error.includes("pageSize")));
});
