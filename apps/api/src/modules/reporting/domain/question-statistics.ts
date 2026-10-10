export interface StatisticCounters {
  completed: string;
  correct: string;
  incorrect: string;
  unanswered: string;
}
function unavailable(): never {
  throw new Error("STATISTICS_STATE_UNAVAILABLE");
}
function count(value: string): number {
  if (!/^(0|[1-9][0-9]{0,9})$/.test(value)) unavailable();
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > 2147483647) unavailable();
  return number;
}
export function statisticCounts(value: StatisticCounters) {
  const completedAttempts = count(value.completed),
    correct = count(value.correct),
    incorrect = count(value.incorrect),
    unanswered = count(value.unanswered),
    answered = correct + incorrect;
  if (answered + unanswered !== completedAttempts) unavailable();
  return { completedAttempts, answered, correct, incorrect, unanswered };
}
export function selectedCount(value: string, answered: number): number {
  const selected = count(value);
  if (selected > answered) unavailable();
  return selected;
}
