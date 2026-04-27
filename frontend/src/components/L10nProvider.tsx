"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, type SupportedLanguage } from "@/lib/detectLanguage";
import { fetchAndParseL10n } from "@/utils/l10n";

const COOKIE_MAX_AGE_DAYS = 365;

function setLanguageCookie(lang: string) {
  if (typeof document === "undefined") return;
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${LANGUAGE_COOKIE}=${encodeURIComponent(lang)};path=/;max-age=${maxAge};SameSite=Lax`;
}

interface L10nState {
  l10n: Map<string, string>;
  loading: boolean;
  error: string | null;
}

type L10nAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: Map<string, string> }
  | { type: "FETCH_ERROR"; payload: string };

const l10nReducer = (state: L10nState, action: L10nAction): L10nState => {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS":
      return { ...state, loading: false, error: null, l10n: action.payload };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

interface L10nContextType {
  l10n: Map<string, string>;
  loading: boolean;
  error: string | null;
  language: string;
  setLanguage: (lang: string) => void;
}

const L10nContext = createContext<L10nContextType | undefined>(undefined);

export function useL10n() {
  const context = useContext(L10nContext);
  if (context === undefined) {
    throw new Error("useL10n must be used within a L10nProvider");
  }
  return context;
}

interface L10nProviderProps {
  initialL10n?: Record<string, string>;
  initialLanguage?: SupportedLanguage;
  children: React.ReactNode;
}

export function L10nProvider({ initialL10n, initialLanguage, children }: L10nProviderProps) {
  const serverLanguage = initialLanguage ?? DEFAULT_LANGUAGE;
  // SSR 일치 보장: 서버 결정 언어로 시작 → 마운트 후 localStorage 우선값 적용
  const [language, setLanguageState] = useState<string>(serverLanguage);
  const [l10nState, l10nDispatch] = React.useReducer(l10nReducer, {
    l10n: initialL10n ? new Map(Object.entries(initialL10n)) : new Map(),
    loading: !initialL10n,
    error: null,
  });
  const { l10n, loading, error } = l10nState;
  // 현재 l10n state 가 어떤 언어로 로드돼있는지 추적 (재선택 시 fetch skip 판단)
  const loadedLanguageRef = useRef<string>(initialL10n ? serverLanguage : "");

  // 언어가 현재 로드된 것과 다를 때만 갱신.
  // 같은 언어로 다시 돌아온 경우 (예: KO→EN→KO) 캐시된 initialL10n 즉시 복원 또는 fetch.
  useEffect(() => {
    if (language === loadedLanguageRef.current) return;

    // 서버 hydration 언어로 돌아오는 경우 → initialL10n 즉시 복원 (네트워크 절약)
    if (language === serverLanguage && initialL10n) {
      l10nDispatch({ type: "FETCH_SUCCESS", payload: new Map(Object.entries(initialL10n)) });
      loadedLanguageRef.current = language;
      return;
    }

    let ignore = false;
    l10nDispatch({ type: "FETCH_START" });

    fetchAndParseL10n(language)
      .then((map) => {
        if (!ignore) {
          l10nDispatch({ type: "FETCH_SUCCESS", payload: map });
          loadedLanguageRef.current = language;
        }
      })
      .catch((err) => {
        if (!ignore)
          l10nDispatch({
            type: "FETCH_ERROR",
            payload: err instanceof Error ? err.message : "l10n 로딩 실패",
          });
      });

    return () => {
      ignore = true;
    };
  }, [language, serverLanguage, initialL10n]);

  const setLanguage = (lang: string) => {
    setLanguageCookie(lang);
    setLanguageState(lang);
  };

  return (
    <L10nContext.Provider value={{ l10n, loading, error, language, setLanguage }}>
      {children}
    </L10nContext.Provider>
  );
}
