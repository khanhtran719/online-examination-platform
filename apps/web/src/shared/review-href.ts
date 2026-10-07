export function isReleasedReviewHref(attemptId: string, href: string): boolean {
  return href === `/v1/attempts/${attemptId}/review`;
}
