import type { Answer, AnswerMutation, SaveReceipt } from "../../shared/api/dto";

export const DEBOUNCE_MS = 500;
export const FLUSH_BASE_MS = 10_000;
export const BATCH_LIMIT = 20;
export const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000];

export type SavePhase =
  | "clean"
  | "pending"
  | "saving"
  | "saved"
  | "retrying"
  | "conflict"
  | "offline"
  | "unconfirmed";

export interface DraftIntent {
  questionId: string;
  selectedOptionIds: readonly string[];
  marked: boolean;
  baseVersion: number;
  localIntentSequence: number;
}

export interface LoadedAnswer {
  questionId: string;
  selectedOptionIds: readonly string[];
  marked: boolean;
  version: number;
  updatedAt: string | null;
}

export interface InFlightBatch {
  key: string;
  answers: readonly AnswerMutation[];
  capturedSequences: Readonly<Record<string, number>>;
  attempt: number;
  retryAtMs: number | null;
  exhausted: boolean;
}

interface AppliedCapture {
  answers: readonly AnswerMutation[];
  capturedSequences: Readonly<Record<string, number>>;
}

export interface AutosaveState {
  loaded: Readonly<Record<string, LoadedAnswer>>;
  drafts: Readonly<Record<string, DraftIntent>>;
  inFlight: InFlightBatch | null;
  applied: Readonly<Record<string, AppliedCapture>>;
  conflictQuestionIds: readonly string[];
  lastAcceptedAt: string | null;
  canSave: boolean;
  authenticated: boolean;
  offline: boolean;
  editingFrozen: boolean;
  nextSequence: number;
  debounceDueMs: number | null;
  flushDueMs: number | null;
  phase: SavePhase;
}

export function createAutosaveState(): AutosaveState {
  return derive({
    loaded: {},
    drafts: {},
    inFlight: null,
    applied: {},
    conflictQuestionIds: [],
    lastAcceptedAt: null,
    canSave: true,
    authenticated: true,
    offline: false,
    editingFrozen: false,
    nextSequence: 1,
    debounceDueMs: null,
    flushDueMs: null,
    phase: "clean",
  });
}

function derive(state: AutosaveState): AutosaveState {
  const dirty = Object.keys(state.drafts).length > 0;
  let phase: SavePhase = "clean";
  if (state.conflictQuestionIds.length > 0) phase = "conflict";
  else if (state.offline && (dirty || state.inFlight)) phase = "offline";
  else if (!state.authenticated && (dirty || state.inFlight)) phase = "unconfirmed";
  else if (state.inFlight?.exhausted) phase = "unconfirmed";
  else if (state.inFlight && state.inFlight.attempt > 0 && state.inFlight.retryAtMs !== null) phase = "retrying";
  else if (state.inFlight) phase = "saving";
  else if (dirty && !state.canSave) phase = "unconfirmed";
  else if (dirty) phase = "pending";
  else if (state.lastAcceptedAt) phase = "saved";
  return { ...state, phase };
}

function jitteredFlush(nowMs: number, random: number): number {
  return nowMs + Math.round(FLUSH_BASE_MS * (0.8 + 0.4 * random));
}

export function setTransport(
  state: AutosaveState,
  flags: { canSave?: boolean; authenticated?: boolean; offline?: boolean; editingFrozen?: boolean },
): AutosaveState {
  return derive({ ...state, ...flags });
}

export function ingestAnswerPage(
  state: AutosaveState,
  questionIds: readonly string[],
  answers: readonly Answer[],
  options?: { authoritative?: boolean },
): AutosaveState {
  const byId = new Map(answers.map((answer) => [answer.questionId, answer]));
  const loaded = { ...state.loaded };
  for (const questionId of questionIds) {
    const answer = byId.get(questionId);
    if (!answer && !options?.authoritative) continue;
    const previous = loaded[questionId];
    const incoming: LoadedAnswer = answer
      ? {
          questionId,
          selectedOptionIds: [...answer.selectedOptionIds],
          marked: answer.marked,
          version: answer.version,
          updatedAt: answer.updatedAt,
        }
      : {
          questionId,
          selectedOptionIds: [],
          marked: false,
          version: 0,
          updatedAt: null,
        };
    if (previous && previous.version > incoming.version) {
      loaded[questionId] = previous;
    } else if (!state.drafts[questionId]) {
      loaded[questionId] = incoming;
    } else {
      loaded[questionId] = {
        ...(previous ?? incoming),
        version: Math.max(previous?.version ?? 0, incoming.version),
        selectedOptionIds: incoming.selectedOptionIds,
        marked: incoming.marked,
        updatedAt: incoming.updatedAt,
      };
    }
  }
  return derive({ ...state, loaded });
}

export function editAnswer(
  state: AutosaveState,
  input: { questionId: string; selectedOptionIds: readonly string[]; marked: boolean },
  nowMs: number,
  random: number,
): AutosaveState {
  if (state.editingFrozen || !state.canSave) return state;
  const loaded = state.loaded[input.questionId];
  if (!loaded) throw new Error("Answer scope is not loaded");
  if (state.conflictQuestionIds.includes(input.questionId)) return state;
  const draft: DraftIntent = {
    questionId: input.questionId,
    selectedOptionIds: [...input.selectedOptionIds],
    marked: input.marked,
    baseVersion: state.drafts[input.questionId]?.baseVersion ?? loaded.version,
    localIntentSequence: state.nextSequence,
  };
  return derive({
    ...state,
    drafts: { ...state.drafts, [input.questionId]: draft },
    nextSequence: state.nextSequence + 1,
    debounceDueMs: nowMs + DEBOUNCE_MS,
    flushDueMs: state.flushDueMs ?? jitteredFlush(nowMs, random),
  });
}

export function capture(
  state: AutosaveState,
  nowMs: number,
  keyFactory: () => string,
  options?: { force?: boolean },
): { state: AutosaveState; batch: InFlightBatch | null } {
  if (state.inFlight) {
    if (
      state.inFlight.retryAtMs !== null &&
      !state.inFlight.exhausted &&
      nowMs >= state.inFlight.retryAtMs &&
      state.canSave &&
      state.authenticated &&
      !state.offline &&
      state.conflictQuestionIds.length === 0
    ) {
      const batch = { ...state.inFlight, retryAtMs: null };
      return { state: derive({ ...state, inFlight: batch }), batch };
    }
    return { state, batch: null };
  }
  if (!state.canSave || !state.authenticated || state.offline || state.conflictQuestionIds.length > 0) {
    return { state, batch: null };
  }
  const debounceDue = state.debounceDueMs !== null && nowMs >= state.debounceDueMs;
  const flushDue = state.flushDueMs !== null && nowMs >= state.flushDueMs;
  if (!options?.force && !debounceDue && !flushDue) return { state, batch: null };
  const drafts = Object.values(state.drafts).filter(
    (draft) => !state.conflictQuestionIds.includes(draft.questionId),
  );
  if (drafts.length === 0) {
    return { state: derive({ ...state, debounceDueMs: null, flushDueMs: null }), batch: null };
  }
  const chosen = drafts.slice(0, BATCH_LIMIT);
  const answers: AnswerMutation[] = chosen.map((draft) => ({
    questionId: draft.questionId,
    selectedOptionIds: [...draft.selectedOptionIds],
    marked: draft.marked,
    expectedVersion: draft.baseVersion,
  }));
  const capturedSequences: Record<string, number> = {};
  for (const draft of chosen) capturedSequences[draft.questionId] = draft.localIntentSequence;
  const batch: InFlightBatch = {
    key: keyFactory(),
    answers: Object.freeze(answers),
    capturedSequences: Object.freeze(capturedSequences),
    attempt: 0,
    retryAtMs: null,
    exhausted: false,
  };
  return {
    state: derive({ ...state, inFlight: batch, debounceDueMs: null }),
    batch,
  };
}

export function acknowledge(state: AutosaveState, receipt: SaveReceipt, key: string): AutosaveState {
  const captureRecord = state.inFlight?.key === key ? state.inFlight : state.applied[key];
  if (!captureRecord) return state;
  const sent =
    "answers" in captureRecord
      ? captureRecord.answers
      : [];
  const sequences = captureRecord.capturedSequences;
  const loaded = { ...state.loaded };
  const drafts = { ...state.drafts };
  const versions = new Map(receipt.answers.map((answer) => [answer.questionId, answer.version]));
  for (const mutation of sent) {
    const receiptVersion = versions.get(mutation.questionId);
    if (receiptVersion === undefined) continue;
    const current = loaded[mutation.questionId];
    if (!current) continue;
    if (receiptVersion < current.version) continue;
    loaded[mutation.questionId] = {
      ...current,
      version: Math.max(current.version, receiptVersion),
      selectedOptionIds: [...mutation.selectedOptionIds],
      marked: mutation.marked,
      updatedAt: receipt.acceptedAt,
    };
    const draft = drafts[mutation.questionId];
    const captured = sequences[mutation.questionId];
    if (draft && captured !== undefined && draft.localIntentSequence === captured) {
      delete drafts[mutation.questionId];
    } else if (draft) {
      drafts[mutation.questionId] = { ...draft, baseVersion: Math.max(current.version, receiptVersion) };
    }
  }
  const applied = {
    ...state.applied,
    [key]: { answers: sent, capturedSequences: sequences },
  };
  const inFlight = state.inFlight?.key === key ? null : state.inFlight;
  const stillDirty = Object.keys(drafts).length > 0;
  return derive({
    ...state,
    loaded,
    drafts,
    applied,
    inFlight,
    lastAcceptedAt: receipt.acceptedAt,
    flushDueMs: stillDirty ? (state.flushDueMs ?? receiptTimeFallback(state.flushDueMs)) : null,
    debounceDueMs: stillDirty ? state.debounceDueMs : null,
  });
}

function receiptTimeFallback(existing: number | null): number | null {
  return existing;
}

export function failRetryable(
  state: AutosaveState,
  input: { nowMs: number; retryAfterSeconds: number | null; random: number; allowRetry: boolean },
): AutosaveState {
  if (!state.inFlight) return state;
  const nextAttempt = state.inFlight.attempt + 1;
  const schedule = RETRY_DELAYS_MS[state.inFlight.attempt];
  const exhausted = !input.allowRetry || schedule === undefined || nextAttempt > RETRY_DELAYS_MS.length;
  if (exhausted) {
    return derive({
      ...state,
      inFlight: { ...state.inFlight, exhausted: true, retryAtMs: null, attempt: state.inFlight.attempt },
    });
  }
  const jittered = Math.round(schedule * (0.8 + 0.4 * input.random));
  const serverMinimum = Math.max(0, input.retryAfterSeconds ?? 0) * 1000;
  const retryAtMs = input.nowMs + Math.max(jittered, serverMinimum);
  return derive({
    ...state,
    inFlight: { ...state.inFlight, attempt: nextAttempt, retryAtMs, exhausted: false },
  });
}

export function failConflict(state: AutosaveState): AutosaveState {
  if (!state.inFlight) return state;
  const ids = state.inFlight.answers.map((answer) => answer.questionId);
  return derive({
    ...state,
    inFlight: null,
    conflictQuestionIds: [...new Set([...state.conflictQuestionIds, ...ids])],
    debounceDueMs: null,
  });
}

export function failOffline(state: AutosaveState): AutosaveState {
  return derive({ ...state, offline: true });
}

export function resumeOnline(state: AutosaveState, nowMs: number): AutosaveState {
  if (!state.inFlight) return derive({ ...state, offline: false });
  return derive({
    ...state,
    offline: false,
    inFlight: { ...state.inFlight, retryAtMs: nowMs, exhausted: false },
  });
}

export function holdForReauth(state: AutosaveState): AutosaveState {
  if (!state.inFlight) return derive({ ...state, authenticated: false });
  return derive({
    ...state,
    authenticated: false,
    inFlight: { ...state.inFlight, retryAtMs: null, exhausted: false },
  });
}

export function rearmExhausted(state: AutosaveState, nowMs: number): AutosaveState {
  if (!state.inFlight?.exhausted) return state;
  return derive({
    ...state,
    offline: false,
    inFlight: { ...state.inFlight, exhausted: false, retryAtMs: nowMs },
  });
}

export function resumeAuthenticated(state: AutosaveState, nowMs: number): AutosaveState {
  if (!state.inFlight) return derive({ ...state, authenticated: true });
  return derive({
    ...state,
    authenticated: true,
    inFlight: { ...state.inFlight, retryAtMs: nowMs, exhausted: false },
  });
}

export function resolveUseServer(state: AutosaveState, answers: readonly Answer[]): AutosaveState {
  const incoming = new Map(answers.map((answer) => [answer.questionId, answer]));
  const drafts = { ...state.drafts };
  const loaded = { ...state.loaded };
  for (const questionId of state.conflictQuestionIds) {
    delete drafts[questionId];
    const answer = incoming.get(questionId);
    if (!answer) continue;
    loaded[questionId] = {
      questionId,
      selectedOptionIds: [...answer.selectedOptionIds],
      marked: answer.marked,
      version: answer.version,
      updatedAt: answer.updatedAt,
    };
  }
  return derive({ ...state, drafts, loaded, conflictQuestionIds: [] });
}

export function resolveKeepMine(state: AutosaveState, answers: readonly Answer[]): AutosaveState {
  const incoming = new Map(answers.map((answer) => [answer.questionId, answer]));
  const drafts = { ...state.drafts };
  const loaded = { ...state.loaded };
  let nextSequence = state.nextSequence;
  for (const questionId of state.conflictQuestionIds) {
    const answer = incoming.get(questionId);
    const draft = drafts[questionId];
    if (answer) {
      loaded[questionId] = {
        questionId,
        selectedOptionIds: [...answer.selectedOptionIds],
        marked: answer.marked,
        version: answer.version,
        updatedAt: answer.updatedAt,
      };
    }
    if (draft && answer) {
      drafts[questionId] = {
        ...draft,
        baseVersion: answer.version,
        localIntentSequence: nextSequence,
      };
      nextSequence += 1;
    }
  }
  return derive({
    ...state,
    drafts,
    loaded,
    conflictQuestionIds: [],
    nextSequence,
    debounceDueMs: state.debounceDueMs,
  });
}

export function viewAnswer(
  state: AutosaveState,
  questionId: string,
): { known: boolean; selectedOptionIds: readonly string[]; marked: boolean; version: number | null } {
  const draft = state.drafts[questionId];
  if (draft) {
    return {
      known: true,
      selectedOptionIds: draft.selectedOptionIds,
      marked: draft.marked,
      version: draft.baseVersion,
    };
  }
  const loaded = state.loaded[questionId];
  if (!loaded) return { known: false, selectedOptionIds: [], marked: false, version: null };
  return {
    known: true,
    selectedOptionIds: loaded.selectedOptionIds,
    marked: loaded.marked,
    version: loaded.version,
  };
}

export function dirtyCount(state: AutosaveState): number {
  return Object.keys(state.drafts).length;
}

export function saveStatusLabel(state: AutosaveState, savedClock: string): string {
  const count = dirtyCount(state);
  if (state.phase === "pending") {
    return count === 1 ? "Có 1 thay đổi chờ lưu" : `Có ${count} thay đổi chờ lưu`;
  }
  if (state.phase === "saving") return "Đang lưu…";
  if (state.phase === "saved") return `Đã lưu lúc ${savedClock}`;
  if (state.phase === "retrying") return "Đang thử lưu lại…";
  if (state.phase === "conflict") return "Đáp án đã thay đổi ở tab khác";
  if (state.phase === "offline") return "Chưa kết nối. Các thay đổi hiện chỉ ở trình duyệt";
  if (state.phase === "unconfirmed") {
    return count > 0
      ? `${count} thay đổi chưa được xác nhận`
      : "Chưa xác nhận được đã lưu";
  }
  return "Chưa có thay đổi cần lưu";
}
