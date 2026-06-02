import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import zh from "./zh";
import en, { type Strings } from "./en";

export type Lang = "zh" | "en";
export type { Strings };

interface I18nContextValue {
  t: Strings;
  lang: Lang;
  setLang: (l: Lang) => void;
}

const STORAGE_KEY = "pii-lang";

const STRINGS: Record<Lang, Strings> = { zh, en };

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function readInitialLang(): Lang {
  if (typeof window === "undefined") {
    return "en";
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "zh" || stored === "en") {
    return stored;
  }
  return window.navigator.language.startsWith("zh") ? "zh" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang);

  const setLang = useCallback((next: Lang) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    setLangState(next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ t: STRINGS[lang], lang, setLang }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
