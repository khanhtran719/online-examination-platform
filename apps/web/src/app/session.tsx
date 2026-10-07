import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  browserCoordination,
  createSessionCoordinator,
  type RecoverResult,
  type SessionCoordinator,
  type SessionSignal,
} from "../features/auth/session-coordinator";
import { isApiError } from "../shared/api/errors";
import type { Profile } from "../shared/api/dto";
import { useMemory } from "./memory";
import { useRuntime } from "./runtime";

export type SessionStatus = "loading" | "anonymous" | "authenticated" | "unavailable";

interface SessionValue {
  status: SessionStatus;
  profile: Profile | null;
  error: unknown;
  logoutError: string | null;
  hasUnconfirmed: boolean;
  needsReauth: boolean;
  setUnconfirmed: (value: boolean) => void;
  reload: (options?: { quiet?: boolean }) => Promise<boolean>;
  adoptProfile: (profile: Profile) => void;
  replaceActor: (profile: Profile) => void;
  logout: () => Promise<void>;
  recover: () => Promise<RecoverResult>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { api, transport, bindRecovery } = useRuntime();
  const memory = useMemory();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [hasUnconfirmed, setUnconfirmed] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const coordinatorRef = useRef<SessionCoordinator | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const reload = useCallback(async (options?: { quiet?: boolean }) => {
    if (!options?.quiet) setStatus("loading");
    try {
      const response = await api.getProfile();
      setProfile(response.data);
      setStatus("authenticated");
      setNeedsReauth(false);
      setError(null);
      return true;
    } catch (caught) {
      if (options?.quiet) {
        setError(caught);
        return false;
      }
      setProfile(null);
      if (isApiError(caught) && caught.status === 401) {
        setStatus("anonymous");
        setError(null);
      } else {
        setStatus("unavailable");
        setError(caught);
      }
      return false;
    }
  }, [api]);

  const adoptProfile = useCallback((next: Profile) => {
    setProfile(next);
    setStatus("authenticated");
    setNeedsReauth(false);
    setError(null);
  }, []);

  const replaceActor = useCallback(
    (next: Profile) => {
      queryClient.clear();
      memory.clear();
      setUnconfirmed(false);
      setProfile(next);
      setStatus("authenticated");
      setNeedsReauth(false);
      setError(null);
    },
    [memory, queryClient],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const coordinator = createSessionCoordinator({ transport, ...browserCoordination() });
    coordinatorRef.current = coordinator;
    bindRecovery?.(() => coordinator.recover());
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("exam-platform-session");
    channelRef.current = channel;
    if (channel) {
      channel.onmessage = (event: MessageEvent<SessionSignal>) => {
        if (!event.data) return;
        if (event.data.type === "session-epoch") coordinator.noteExternalEpoch(event.data.epoch);
        if (event.data.type === "reauth") setNeedsReauth(true);
        if (event.data.type === "logout") {
          queryClient.clear();
          memory.clear();
          setProfile(null);
          setUnconfirmed(false);
          setNeedsReauth(false);
          setStatus("anonymous");
        }
      };
    }
    return () => {
      channel?.close();
      channelRef.current = null;
    };
  }, [bindRecovery, memory, queryClient, transport]);

  const logout = useCallback(async () => {
    setLogoutError(null);
    try {
      await api.logout();
    } catch {
      setLogoutError("Máy chủ chưa xác nhận đăng xuất. Dữ liệu riêng trên trình duyệt đã được xóa.");
    }
    channelRef.current?.postMessage({ type: "logout" });
    queryClient.clear();
    memory.clear();
    setProfile(null);
    setUnconfirmed(false);
    setNeedsReauth(false);
    setStatus("anonymous");
  }, [api, memory, queryClient]);

  const recover = useCallback(async () => {
    const coordinator = coordinatorRef.current;
    if (!coordinator) return { type: "reauth", reason: "unsupported-coordination" } as const;
    return coordinator.recover();
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      profile,
      error,
      logoutError,
      hasUnconfirmed,
      needsReauth,
      setUnconfirmed,
      reload,
      adoptProfile,
      replaceActor,
      logout,
      recover,
    }),
    [adoptProfile, error, hasUnconfirmed, logout, logoutError, needsReauth, profile, recover, reload, replaceActor, status],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Session missing");
  return value;
}
