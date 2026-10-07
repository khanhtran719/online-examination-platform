import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";
import type { Exam, SectionSummary } from "../shared/api/dto";

export interface FrozenMeta {
  examId: string;
  publishedVersionId: string;
  title: string;
  sections: SectionSummary[];
  questionCount: number;
  version: number;
}

interface MemoryApi {
  remember(exam: Exam): void;
  lookup(publishedVersionId: string): FrozenMeta | null;
  clear(): void;
}

const MemoryContext = createContext<MemoryApi | null>(null);

export function MemoryProvider({ children }: { children: ReactNode }) {
  const records = useRef(new Map<string, FrozenMeta>());
  const api = useMemo<MemoryApi>(
    () => ({
      remember(exam) {
        records.current.set(exam.publishedVersionId, {
          examId: exam.id,
          publishedVersionId: exam.publishedVersionId,
          title: exam.title,
          sections: exam.sections,
          questionCount: exam.questionCount,
          version: exam.version,
        });
      },
      lookup(publishedVersionId) {
        return records.current.get(publishedVersionId) ?? null;
      },
      clear() {
        records.current.clear();
      },
    }),
    [],
  );
  return <MemoryContext.Provider value={api}>{children}</MemoryContext.Provider>;
}

export function useMemory(): MemoryApi {
  const value = useContext(MemoryContext);
  if (!value) throw new Error("Memory missing");
  return value;
}
