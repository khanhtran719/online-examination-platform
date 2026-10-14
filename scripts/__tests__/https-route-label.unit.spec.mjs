import assert from "node:assert/strict";
import test from "node:test";

import { httpsRouteLabel } from "../https-route-label.mjs";

test("preserves Identity observation labels without raw verification or cookie data", () => {
  for (const route of ["/v1/me", "/v1/auth/login", "/v1/auth/email-verification/confirm", "/ready"])
    assert.equal(httpsRouteLabel(route), route);
  assert.equal(httpsRouteLabel("/verify-email"), "unmatched");
});

test("normalizes Catalog and start routes without retaining fixture resource identifiers", () => {
  const id = "0199ce86-a377-7aba-8795-cf22fdc630ef";
  for (const [route, expected] of [
    ["/v1/exams", "/v1/exams"],
    [`/v1/exams/${id}`, "/v1/exams/:examId"],
    [`/v1/exams/${id}/attempts`, "/v1/exams/:examId/attempts"],
    ["/v1/admin/exams", "/v1/admin/exams"],
    [`/v1/admin/exams/${id}/publish`, "/v1/admin/exams/:examId/publish"],
    [`/v1/admin/exams/${id}/unpublish`, "/v1/admin/exams/:examId/unpublish"],
    ["/v1/admin/questions", "/v1/admin/questions"],
  ])
    assert.equal(httpsRouteLabel(route), expected);
});

test("keeps unknown/query-bearing paths out of retained observation labels", () => {
  for (const route of [
    "/v1/exams?cursor=private",
    "/v1/exams/not-an-id",
    "/v1/admin/secret",
    "/v1",
  ])
    assert.equal(httpsRouteLabel(route), "unmatched");
});

test("normalizes private Assessment and question-write routes without identifiers", () => {
  const id = "0199ce86-a377-7aba-8795-cf22fdc630ef";
  assert.equal(httpsRouteLabel(`/v1/attempts/${id}`), "/v1/attempts/:attemptId");
  for (const suffix of ["questions", "answers", "submit", "status", "result", "review"])
    assert.equal(
      httpsRouteLabel(`/v1/attempts/${id}/${suffix}`),
      `/v1/attempts/:attemptId/${suffix}`,
    );
  assert.equal(httpsRouteLabel(`/v1/admin/questions/${id}`), "/v1/admin/questions/:questionId");
  assert.equal(httpsRouteLabel(`/v1/attempts/${id}/questions?cursor=private`), "unmatched");
  assert.equal(httpsRouteLabel(`/v1/attempts/${id}/unrecognized`), "unmatched");
});
