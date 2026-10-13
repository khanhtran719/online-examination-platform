import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useMemory } from "@web/app/memory";
import { useRuntime } from "@web/app/runtime";
import { useSession } from "@web/app/session";

import { isClosedResultRead, mismatchedResultRead } from "./result-read-policy";

// A score is authorized by the result endpoint. The optional status read only
// supplies exam identity for frozen labels and navigation; it cannot grant score access.
export function useAttemptResult(attemptId: string) {
  const { api } = useRuntime(),
    session = useSession(),
    memory = useMemory(),
    client = useQueryClient();
  const actor = session.profile?.id ?? "anonymous";
  const scope = JSON.stringify([actor, attemptId]);
  const [blockedScope, setBlockedScope] = useState<string | null>(null);
  const authenticated = session.status === "authenticated" && !session.needsReauth;
  const query = useQuery({
    queryKey: ["result", actor, attemptId],
    enabled: authenticated && blockedScope !== scope,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      signal.throwIfAborted();
      const response = await api.getResult(attemptId);
      signal.throwIfAborted();
      const read = response.data;
      if (
        (read.result && read.result.attemptId !== attemptId) ||
        (read.attempt && read.attempt.id !== attemptId)
      )
        throw mismatchedResultRead();
      return read;
    },
  });
  const denied = isClosedResultRead(query.error);
  const hidden = !authenticated || blockedScope === scope || denied;
  const data = hidden || query.error ? undefined : query.data;
  const score = data?.pending ? null : (data?.result ?? null);
  const metadata = useQuery({
    queryKey: ["result-attempt", actor, attemptId],
    enabled: !hidden && !!score,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      signal.throwIfAborted();
      const response = await api.getAttemptStatus(attemptId);
      signal.throwIfAborted();
      if (
        response.data.id !== attemptId ||
        response.data.publishedVersionId !== score?.publishedVersionId
      )
        throw mismatchedResultRead();
      return response.data;
    },
  });
  useEffect(() => {
    if (denied) setBlockedScope(scope);
  }, [denied, scope]);
  useEffect(() => {
    if (!hidden) return;
    const [owner, id]: string[] = JSON.parse(scope);
    for (const name of ["result", "review", "result-attempt"]) {
      const queryKey = [name, owner, id];
      void client.cancelQueries({ queryKey, exact: true });
      client.removeQueries({ queryKey, exact: true });
    }
    memory.clear();
  }, [hidden, scope, client, memory]);
  useEffect(
    () => () => {
      const [owner, id]: string[] = JSON.parse(scope);
      for (const name of ["result", "review", "result-attempt"]) {
        const queryKey = [name, owner, id];
        void client.cancelQueries({ queryKey, exact: true });
        client.removeQueries({ queryKey, exact: true });
      }
    },
    [scope, client],
  );
  const attempt = !hidden && !metadata.error ? metadata.data : undefined;
  const remembered = score && attempt ? memory.lookup(score.publishedVersionId) : null;
  const frozen =
    remembered?.examId === attempt?.examId &&
    remembered?.publishedVersionId === score?.publishedVersionId
      ? remembered
      : null;
  return {
    query,
    hidden,
    data,
    score,
    attempt,
    frozen,
    scope,
    refresh: () =>
      hidden || query.isFetching ? undefined : query.refetch({ cancelRefetch: false }),
  };
}
