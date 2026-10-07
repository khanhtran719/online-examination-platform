import { useEffect, useRef } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { isApiError } from "./api/errors";

export function isForbidden(error: unknown): boolean {
  return isApiError(error) && error.status === 403;
}

export function visibleProtected<T>(rows: readonly T[], error: unknown): readonly T[] {
  return isForbidden(error) ? [] : rows;
}

export function useProtectedAccess(
  error: unknown,
  keys: readonly QueryKey[],
  blocked: boolean,
  block: () => void,
): boolean {
  const client = useQueryClient();
  const keysRef = useRef(keys);
  keysRef.current = keys;
  if (!blocked && isForbidden(error)) block();
  useEffect(() => {
    if (!blocked) return;
    for (const key of keysRef.current) client.removeQueries({ queryKey: key });
  }, [blocked, client]);
  return blocked || isForbidden(error);
}
