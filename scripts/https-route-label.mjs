const staticRoutes = new Set([
  "/v1/auth/csrf",
  "/v1/auth/register",
  "/v1/auth/login",
  "/v1/auth/email-verification/request",
  "/v1/auth/email-verification/confirm",
  "/v1/auth/refresh",
  "/v1/auth/logout",
  "/v1/me",
  "/v1/exams",
  "/v1/admin/exams",
  "/v1/admin/questions",
  "/ready",
  "/live",
]);
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const patterns = [
  [new RegExp(`^/v1/attempts/${uuid}$`), "/v1/attempts/:attemptId"],
  ...["questions", "answers", "submit", "status", "result", "review"].map((suffix) => [
    new RegExp(`^/v1/attempts/${uuid}/${suffix}$`),
    `/v1/attempts/:attemptId/${suffix}`,
  ]),
  [new RegExp(`^/v1/exams/${uuid}$`), "/v1/exams/:examId"],
  [new RegExp(`^/v1/exams/${uuid}/attempts$`), "/v1/exams/:examId/attempts"],
  [new RegExp(`^/v1/admin/exams/${uuid}$`), "/v1/admin/exams/:examId"],
  [new RegExp(`^/v1/admin/exams/${uuid}/publish$`), "/v1/admin/exams/:examId/publish"],
  [new RegExp(`^/v1/admin/exams/${uuid}/unpublish$`), "/v1/admin/exams/:examId/unpublish"],
  [new RegExp(`^/v1/admin/questions/${uuid}$`), "/v1/admin/questions/:questionId"],
];

// Test observation labels, never a routing or authorization decision.
export function httpsRouteLabel(pathname) {
  if (staticRoutes.has(pathname)) return pathname;
  return patterns.find(([pattern]) => pattern.test(pathname))?.[1] ?? "unmatched";
}
