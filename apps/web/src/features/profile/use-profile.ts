import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useMemory } from "@web/app/memory";
import { useRuntime } from "@web/app/runtime";
import { useSession } from "@web/app/session";
import type { MutationReceipt, Profile, ProfileUpdate } from "@web/shared/api/dto";
import { ApiError, isApiError } from "@web/shared/api/errors";
import { uuidV7 } from "@web/shared/api/uuid";

import { displayNameError, profileChanged } from "./profile-model";

type Phase = "idle" | "saving" | "unknown" | "conflict" | "accepted";
interface State {
  base: Profile | null;
  name: string;
  optIn: boolean;
  phase: Phase;
  fresh: Profile | null;
  intent: { key: string; body: Readonly<ProfileUpdate> } | null;
  receipt: MutationReceipt | null;
  error: unknown;
  readError: unknown;
  nameError: string | null;
  retryAt: number;
}
function initial(base: Profile | null): State {
  return {
    base,
    name: base?.displayName ?? "",
    optIn: base?.leaderboardOptIn ?? false,
    phase: "idle",
    fresh: null,
    intent: null,
    receipt: null,
    error: null,
    readError: null,
    nameError: null,
    retryAt: 0,
  };
}
function invalidResponse() {
  return new ApiError({
    kind: "malformed",
    status: 0,
    errorCode: "Invalid profile response",
    message: "Chưa nhận được dữ liệu hồ sơ hợp lệ.",
  });
}

export function useProfile() {
  const { api } = useRuntime();
  const session = useSession();
  const memory = useMemory();
  const actor = session.profile?.id ?? "";
  const authorized = session.status === "authenticated" && !!actor && !session.needsReauth;
  const scope = useMemo(() => ({ actor, authorized }), [actor, authorized]);
  const active = useRef({ scope, mounted: true });
  active.current.scope = scope;
  const [state, setState] = useState(() => initial(session.profile));
  const ref = useRef(state);
  const busy = useRef(false);
  const readBusy = useRef(false);
  const profileRef = useRef(session.profile);
  profileRef.current = session.profile;
  const denied = useRef(false);
  const [accessError, setAccessError] = useState<unknown>(null);
  const [reading, setReading] = useState(false);
  const [now, setNow] = useState(performance.now());
  const current = useCallback(
    () =>
      active.current.mounted &&
      active.current.scope === scope &&
      scope.authorized &&
      !denied.current,
    [scope],
  );
  function commit(next: State) {
    if (!current()) return;
    ref.current = next;
    setState(next);
  }
  function protect(error: unknown) {
    if (!current() || !isApiError(error) || ![401, 403, 404].includes(error.status)) return false;
    denied.current = true;
    ref.current = initial(null);
    setState(ref.current);
    setAccessError(error);
    memory.clear();
    return true;
  }
  useEffect(() => {
    const ticket = active.current;
    ticket.mounted = true;
    denied.current = false;
    setAccessError(null);
    ref.current = initial(scope.authorized ? profileRef.current : null);
    setState(ref.current);
    busy.current = false;
    readBusy.current = false;
    setReading(false);
    return () => {
      if (ticket.scope === scope) ticket.mounted = false;
    };
    // Same-actor projection changes do not silently advance a dirty draft's base.
  }, [scope]);
  useEffect(() => {
    const next = session.profile;
    const saved = ref.current;
    if (
      !current() ||
      !next ||
      saved.phase !== "idle" ||
      profileChanged(saved.base, saved.name, saved.optIn) ||
      next.id !== saved.base?.id ||
      next.revision <= saved.base.revision
    )
      return;
    ref.current = initial(next);
    setState(ref.current);
  }, [session.profile, current]);
  const visible = authorized && !accessError && state.base?.id === actor;
  const dirty = visible && profileChanged(state.base, state.name, state.optIn);
  const unconfirmed = visible && (dirty || ["saving", "unknown", "conflict"].includes(state.phase));
  const setUnconfirmed = session.setUnconfirmed;
  useEffect(() => {
    setUnconfirmed(unconfirmed);
    return () => setUnconfirmed(false);
  }, [unconfirmed, setUnconfirmed]);
  useEffect(() => {
    setNow(performance.now());
    if (state.retryAt <= performance.now()) return;
    const timer = window.setInterval(() => {
      const tick = performance.now();
      setNow(tick);
      if (tick >= state.retryAt) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [state.retryAt]);

  async function readFresh(purpose: "conflict" | "accepted") {
    if (!current() || readBusy.current || performance.now() < ref.current.retryAt) return;
    readBusy.current = true;
    setReading(true);
    const base = ref.current.base;
    try {
      const response = await api.getProfile();
      if (!current()) return;
      const next = response.data;
      const known = profileRef.current;
      const floor = Math.max(
        ref.current.receipt?.revision ?? 0,
        base?.revision ?? 0,
        known?.id === actor && known.email === base?.email ? known.revision : 0,
      );
      if (!base || next.id !== actor || next.email !== base.email || next.revision < floor)
        throw invalidResponse();
      if (
        purpose === "accepted" &&
        next.revision === ref.current.receipt?.revision &&
        (next.displayName !== base.displayName || next.leaderboardOptIn !== base.leaderboardOptIn)
      )
        throw invalidResponse();
      session.syncProfile(next);
      if (purpose === "conflict") commit({ ...ref.current, fresh: next, readError: null });
      else commit({ ...initial(next), receipt: ref.current.receipt });
    } catch (error) {
      if (!current() || protect(error)) return;
      const delay = isApiError(error) ? (error.retryAfterSeconds ?? 0) * 1000 : 0;
      commit({
        ...ref.current,
        fresh: null,
        readError: error,
        retryAt: delay ? performance.now() + delay : 0,
      });
    } finally {
      if (current()) {
        readBusy.current = false;
        setReading(false);
      }
    }
  }
  async function send(replay = false) {
    const saved = ref.current;
    if (!current() || busy.current || readBusy.current || performance.now() < saved.retryAt) return;
    if (replay ? saved.phase !== "unknown" : saved.phase !== "idle") return;
    if (!saved.base) return;
    const problem = displayNameError(saved.name);
    if (problem) {
      commit({ ...saved, nameError: problem });
      return;
    }
    if (!replay && !profileChanged(saved.base, saved.name, saved.optIn)) return;
    const intent = saved.intent ?? {
      key: uuidV7(),
      body: Object.freeze({
        displayName: saved.name.trim(),
        leaderboardOptIn: saved.optIn,
        expectedRevision: saved.base.revision,
      }),
    };
    busy.current = true;
    commit({
      ...saved,
      intent,
      phase: "saving",
      error: null,
      readError: null,
      nameError: null,
      receipt: null,
    });
    try {
      const response = await api.updateProfile(intent.key, intent.body);
      if (!current()) return;
      const receipt = response.data;
      if (receipt.resourceId !== actor || receipt.revision !== intent.body.expectedRevision + 1)
        throw invalidResponse();
      const accepted = {
        ...saved.base,
        displayName: intent.body.displayName,
        leaderboardOptIn: intent.body.leaderboardOptIn,
        revision: receipt.revision,
      };
      commit({ ...initial(accepted), phase: "accepted", receipt });
      session.syncProfile(accepted);
      await readFresh("accepted");
    } catch (error) {
      if (!current() || protect(error)) return;
      const delay = isApiError(error) ? (error.retryAfterSeconds ?? 0) * 1000 : 0;
      if (isApiError(error) && error.status === 409) {
        commit({
          ...ref.current,
          intent: null,
          phase: "conflict",
          fresh: null,
          error,
          retryAt: delay ? performance.now() + delay : 0,
        });
        await readFresh("conflict");
      } else {
        const unknown =
          !isApiError(error) ||
          error.kind !== "http" ||
          error.status >= 500 ||
          error.status === 429;
        commit({
          ...ref.current,
          phase: unknown ? "unknown" : "idle",
          intent: unknown ? intent : null,
          error,
          retryAt: delay ? performance.now() + delay : 0,
        });
      }
    } finally {
      if (current()) busy.current = false;
    }
  }
  const retryWait = Math.max(0, Math.ceil((state.retryAt - now) / 1000));
  return {
    ...state,
    scope: `${actor}:${authorized}`,
    base: visible ? state.base : null,
    fresh: visible ? state.fresh : null,
    name: visible ? state.name : "",
    optIn: visible && state.optIn,
    visible,
    accessError,
    dirty,
    unconfirmed,
    reading,
    retryWait,
    needsReauth: session.needsReauth,
    locked: !visible || state.phase !== "idle" || reading,
    canSave: visible && state.phase === "idle" && dirty && retryWait === 0 && !reading,
    changeName(name: string) {
      if (current() && ref.current.phase === "idle")
        commit({ ...ref.current, name, nameError: null, receipt: null, error: null });
    },
    changeOptIn(optIn: boolean) {
      if (current() && ref.current.phase === "idle")
        commit({ ...ref.current, optIn, receipt: null, error: null });
    },
    reset() {
      if (current() && ref.current.phase === "idle") commit(initial(ref.current.base));
    },
    save: () => send(),
    retry: () => send(true),
    refresh: () => {
      if (ref.current.phase !== "accepted" && ref.current.phase !== "conflict") return;
      return readFresh(ref.current.phase);
    },
    useServer() {
      if (current() && !readBusy.current && ref.current.fresh) commit(initial(ref.current.fresh));
    },
    keepMine() {
      if (!current() || readBusy.current || !ref.current.fresh) return;
      commit({
        ...ref.current,
        base: ref.current.fresh,
        fresh: null,
        phase: "idle",
        intent: null,
        error: null,
        readError: null,
      });
    },
    logout: session.logout,
  };
}
