export interface ActiveCandidate {
  candidateId: string;
  attemptId: string;
  status: "IN_PROGRESS";
  startedAt: string;
  deadline: string;
}
export interface ActiveCandidatesPage {
  items: ActiveCandidate[];
  metadata: { next: string | null; pageSize: number; asOf: string };
}
export interface ActiveCandidatesInput {
  raw: string;
  actorId: string;
  examId: string;
  pageSize: number;
  cursor: string | null;
  correlationId: string;
}
