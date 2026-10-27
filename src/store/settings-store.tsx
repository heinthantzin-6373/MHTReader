import { File, Paths } from 'expo-file-system';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ReaderMode = 'images' | 'fullPage';

type SettingsState = {
  readerMode: ReaderMode;
};

type SettingsContextValue = {
  ready: boolean;
  readerMode: ReaderMode;
  setReaderMode: (mode: ReaderMode) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function settingsFile() {
  return new File(Paths.document, 'settings.json');
}

async function loadSettings(): Promise<SettingsState> {
  const file = settingsFile();
  if (!file.exists) {
    return { readerMode: 'images' };
  }
  try {
    const data = (await file.json()) as Partial<SettingsState>;
    if (data.readerMode === 'images' || data.readerMode === 'fullPage') {
      return { readerMode: data.readerMode };
    }
  } catch {
    // ignore corrupt file
  }
  return { readerMode: 'images' };
}

async function persistSettings(state: SettingsState) {
  const file = settingsFile();
  if (!file.exists) {
    file.create({ intermediates: true, overwrite: true });
  }
  await file.write(JSON.stringify(state, null, 2));
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [readerMode, setReaderModeState] = useState<ReaderMode>('images');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await loadSettings();
      if (!cancelled) {
        setReaderModeState(state.readerMode);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setReaderMode = useCallback((mode: ReaderMode) => {
    setReaderModeState(mode);
    void persistSettings({ readerMode: mode }).catch(() => {
      // keep in-memory value even if disk write fails
    });
  }, []);

  const value = useMemo(
    () => ({ ready, readerMode, setReaderMode }),
    [ready, readerMode, setReaderMode]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
