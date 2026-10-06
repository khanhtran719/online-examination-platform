import assert from "node:assert/strict";
import { test, before } from "node:test";
import { resolve } from "node:path";
import {
  loadContracts,
  inspectOperations,
  validateEvent,
} from "../contracts.mjs";

let contracts;
before(async () => {
  contracts = await loadContracts(resolve(import.meta.dirname, "../.."));
});

test("validates the complete OpenAPI contract and its payload examples", () => {
  assert.equal(contracts.api.openapi, "3.0.3");
  assert.ok(contracts.operationCount >= 35);
  assert.ok(contracts.exampleCount >= 10);
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
  assert.ok(
    validateEvent(contracts, { ...sample, occurredAt: "yesterday" }).length,
  );
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
  assert.equal(
    validate({ answers: [{ ...sample.answers[0], selectedOptionIds: [] }] }),
    true,
  );
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
  assert.equal(
    validate({ answers: [{ ...sample.answers[0], expectedVersion: -1 }] }),
    false,
  );
});

test("rejects an admin operation made public even when the document remains valid OpenAPI", () => {
  const api = structuredClone(contracts.api);
  api.paths["/v1/admin/exams"].post.security = [];
  assert.ok(
    inspectOperations(api).some((error) => error.includes("authentication")),
  );
});

test("does not allow an admin route to inherit a public operation name", () => {
  const api = structuredClone(contracts.api);
  const admin = api.paths["/v1/admin/exams"].post;
  admin.operationId = "login";
  admin.security = [{ CsrfHeader: [] }];
  assert.ok(
    inspectOperations(api).some((error) => error.includes("authentication")),
  );
});

test("rejects a critical mutation without an idempotency header", () => {
  const api = structuredClone(contracts.api);
  api.paths["/v1/attempts/{attemptId}/answers"].put.parameters = [];
  assert.ok(
    inspectOperations(api).some((error) => error.includes("Idempotency-Key")),
  );
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
