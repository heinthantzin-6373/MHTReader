import { Directory, File, Paths } from 'expo-file-system';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { deleteManhwaStorage } from '@/lib/manhwa-storage';
import type { Chapter, LibraryState, Manhwa } from '@/types/library';
import { createId, UNTITLED_MANHWA_TITLE } from '@/types/library';

type LibraryContextValue = {
  ready: boolean;
  manhwas: Manhwa[];
  createManhwa: () => Manhwa;
  updateManhwa: (id: string, patch: Partial<Omit<Manhwa, 'id' | 'chapters'>>) => void;
  setChapters: (manhwaId: string, chapters: Chapter[]) => void;
  updateChapter: (manhwaId: string, chapterId: string, patch: Partial<Chapter>) => void;
  deleteManhwa: (id: string) => Promise<void>;
  getManhwa: (id: string) => Manhwa | undefined;
  getChapter: (chapterId: string) => { manhwa: Manhwa; chapter: Chapter } | undefined;
  saveReadingProgress: (manhwaId: string, chapterId: string, offsetY: number) => void;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

function libraryFile() {
  return new File(Paths.document, 'library.json');
}

async function loadLibrary(): Promise<LibraryState> {
  const file = libraryFile();
  if (!file.exists) {
    return { manhwas: [] };
  }
  try {
    const data = await file.json();
    if (data && Array.isArray(data.manhwas)) {
      return { manhwas: data.manhwas as Manhwa[] };
    }
  } catch {
    // corrupt — start fresh
  }
  return { manhwas: [] };
}

async function persistLibrary(state: LibraryState) {
  const file = libraryFile();
  if (!file.exists) {
    file.create({ intermediates: true, overwrite: true });
  }
  await file.write(JSON.stringify(state, null, 2));
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [manhwas, setManhwas] = useState<Manhwa[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await loadLibrary();
      if (!cancelled) {
        setManhwas(state.manhwas);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback((updater: (prev: Manhwa[]) => Manhwa[]) => {
    setManhwas((prev) => {
      const next = updater(prev);
      void persistLibrary({ manhwas: next });
      return next;
    });
  }, []);

  const createManhwa = useCallback(() => {
    const now = Date.now();
    const manhwa: Manhwa = {
      id: createId('mh'),
      title: UNTITLED_MANHWA_TITLE,
      createdAt: now,
      updatedAt: now,
      chapters: [],
    };
    const root = new Directory(Paths.document, 'manhwa', manhwa.id);
    if (!root.exists) {
      root.create({ intermediates: true, idempotent: true });
    }
    commit((prev) => [manhwa, ...prev]);
    return manhwa;
  }, [commit]);

  const updateManhwa = useCallback(
    (id: string, patch: Partial<Omit<Manhwa, 'id' | 'chapters'>>) => {
      commit((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m))
      );
    },
    [commit]
  );

  const setChapters = useCallback(
    (manhwaId: string, chapters: Chapter[]) => {
      commit((prev) =>
        prev.map((m) =>
          m.id === manhwaId ? { ...m, chapters, updatedAt: Date.now() } : m
        )
      );
    },
    [commit]
  );

  const updateChapter = useCallback(
    (manhwaId: string, chapterId: string, patch: Partial<Chapter>) => {
      commit((prev) =>
        prev.map((m) => {
          if (m.id !== manhwaId) return m;
          return {
            ...m,
            updatedAt: Date.now(),
            chapters: m.chapters.map((c) => (c.id === chapterId ? { ...c, ...patch } : c)),
          };
        })
      );
    },
    [commit]
  );

  const deleteManhwa = useCallback(
    async (id: string) => {
      const manhwa = manhwas.find((m) => m.id === id);
      // Remove copied .mht sources, extracted pages, and cover from app storage
      await deleteManhwaStorage(manhwa ?? { id });
      commit((prev) => prev.filter((m) => m.id !== id));
    },
    [commit, manhwas]
  );

  const getManhwa = useCallback(
    (id: string) => manhwas.find((m) => m.id === id),
    [manhwas]
  );

  const getChapter = useCallback(
    (chapterId: string) => {
      for (const manhwa of manhwas) {
        const chapter = manhwa.chapters.find((c) => c.id === chapterId);
        if (chapter) return { manhwa, chapter };
      }
      return undefined;
    },
    [manhwas]
  );

  const saveReadingProgress = useCallback(
    (manhwaId: string, chapterId: string, offsetY: number) => {
      commit((prev) =>
        prev.map((m) =>
          m.id === manhwaId
            ? {
                ...m,
                lastChapterId: chapterId,
                lastOffsetY: offsetY,
                updatedAt: Date.now(),
              }
            : m
        )
      );
    },
    [commit]
  );

  const value = useMemo(
    () => ({
      ready,
      manhwas,
      createManhwa,
      updateManhwa,
      setChapters,
      updateChapter,
      deleteManhwa,
      getManhwa,
      getChapter,
      saveReadingProgress,
    }),
    [
      ready,
      manhwas,
      createManhwa,
      updateManhwa,
      setChapters,
      updateChapter,
      deleteManhwa,
      getManhwa,
      getChapter,
      saveReadingProgress,
    ]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) {
    throw new Error('useLibrary must be used within LibraryProvider');
  }
  return ctx;
}
