import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { Attempt } from "@web/shared/api/dto";
import { ApiError } from "@web/shared/api/errors";
import type { PlatformApi } from "@web/shared/api/platform";

import type { ClockSample } from "./clock";
import { clockSample } from "./room-receipts";

export function wrongRoomResponse() {
  return new ApiError({
    kind: "malformed",
    status: 0,
    errorCode: "INVALID_ROOM",
    message: "Dữ liệu không khớp lượt thi.",
  });
}

export function useRoomReads(input: {
  api: PlatformApi;
  actor: string;
  attemptId: string;
  enabled: boolean;
  isCurrent: () => boolean;
  onError: (error: unknown) => void;
  onAttempt: (attempt: Attempt, sample: ClockSample) => void;
}) {
  const { api, actor, attemptId, enabled, isCurrent, onError } = input;
  const client = useQueryClient();
  async function read<T>(signal: AbortSignal, call: () => Promise<T>): Promise<T> {
    signal.throwIfAborted();
    if (!isCurrent()) throw new DOMException("Room changed", "AbortError");
    try {
      const result = await call();
      signal.throwIfAborted();
      if (!isCurrent()) throw new DOMException("Room changed", "AbortError");
      return result;
    } catch (error) {
      if (!signal.aborted && isCurrent()) onError(error);
      throw error;
    }
  }
  const attemptQuery = useQuery({
    queryKey: ["attempt", actor, attemptId],
    enabled,
    queryFn: async ({ signal }) => {
      const started = performance.now();
      const attempt = await read(signal, async () => {
        const response = await api.resumeAttempt(attemptId);
        if (response.data.id !== attemptId) throw wrongRoomResponse();
        return response.data;
      });
      input.onAttempt(attempt, clockSample(attempt, started, performance.now()));
      return attempt;
    },
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const runnable =
    enabled &&
    (attemptQuery.data?.status === "IN_PROGRESS" || attemptQuery.data?.status === "CREATED");
  const questions = useInfiniteQuery({
    queryKey: ["attempt-questions", actor, attemptId],
    enabled: runnable,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) =>
      read(signal, () =>
        api.getQuestions(attemptId, { pageSize: 20, cursor: pageParam }).then((r) => r.data),
      ),
    getNextPageParam: (last) => last.next ?? undefined,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const answers = useInfiniteQuery({
    queryKey: ["attempt-answers", actor, attemptId],
    enabled: runnable,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) =>
      read(signal, () =>
        api.getAnswers(attemptId, { pageSize: 20, cursor: pageParam }).then((r) => r.data),
      ),
    getNextPageParam: (last) => last.next ?? undefined,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  useEffect(
    () => () => {
      for (const kind of ["attempt", "attempt-questions", "attempt-answers"]) {
        const queryKey = [kind, actor, attemptId];
        void client.cancelQueries({ queryKey });
        client.removeQueries({ queryKey });
      }
    },
    [actor, attemptId, client],
  );
  return { attemptQuery, questions, answers };
}
