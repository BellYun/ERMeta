"use client";

import { NextIntlClientProvider } from "next-intl";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, type SupportedLanguage } from "@/lib/detectLanguage";
import { HTML_LANG_BY_LANGUAGE, loadIntlMessages, type IntlMessages } from "@/lib/staticIntl";
import { fetchAndParseL10n } from "@/utils/l10n";

const COOKIE_MAX_AGE_DAYS = 365;

function setLanguageCookie(lang: SupportedLanguage) {
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
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
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
  initialMessages: IntlMessages;
  initialLanguage?: SupportedLanguage;
  lockInitialLanguage?: boolean;
  children: React.ReactNode;
}

export function L10nProvider({
  initialL10n,
  initialMessages,
  initialLanguage,
  lockInitialLanguage: _lockInitialLanguage = false,
  children,
}: L10nProviderProps) {
  const serverLanguage = initialLanguage ?? DEFAULT_LANGUAGE;
  void _lockInitialLanguage;
  const [language, setLanguageState] = useState<SupportedLanguage>(serverLanguage);
  const [messages, setMessages] = useState<IntlMessages>(initialMessages);
  const [l10nState, l10nDispatch] = React.useReducer(l10nReducer, {
    l10n: initialL10n ? new Map(Object.entries(initialL10n)) : new Map(),
    loading: !initialL10n,
    error: null,
  });
  const { l10n, loading, error } = l10nState;
  const messageCacheRef = useRef<Partial<Record<SupportedLanguage, IntlMessages>>>({
    [serverLanguage]: initialMessages,
  });
  const l10nCacheRef = useRef<Partial<Record<SupportedLanguage, Map<string, string>>>>(
    initialL10n ? { [serverLanguage]: new Map(Object.entries(initialL10n)) } : {}
  );

  useEffect(() => {
    document.documentElement.lang = HTML_LANG_BY_LANGUAGE[language] ?? "ko";
    setLanguageCookie(language);
  }, [language]);

  useEffect(() => {
    let ignore = false;

    const cachedMessages = messageCacheRef.current[language];
    const cachedL10n = l10nCacheRef.current[language];

    if (cachedMessages) {
      setMessages(cachedMessages);
    }

    if (cachedL10n) {
      l10nDispatch({ type: "FETCH_SUCCESS", payload: cachedL10n });
    } else {
      l10nDispatch({ type: "FETCH_START" });
    }

    if (cachedMessages && cachedL10n) {
      return;
    }

    Promise.all([
      cachedMessages ? Promise.resolve(cachedMessages) : loadIntlMessages(language),
      cachedL10n ? Promise.resolve(cachedL10n) : fetchAndParseL10n(language),
    ])
      .then(([nextMessages, nextL10n]) => {
        if (ignore) return;

        messageCacheRef.current[language] = nextMessages;
        l10nCacheRef.current[language] = nextL10n;
        setMessages(nextMessages);
        l10nDispatch({ type: "FETCH_SUCCESS", payload: nextL10n });
      })
      .catch((err) => {
        if (!ignore) {
          l10nDispatch({
            type: "FETCH_ERROR",
            payload: err instanceof Error ? err.message : "l10n 로딩 실패",
          });
        }
      });

    return () => {
      ignore = true;
    };
  }, [language]);

  const setLanguage = (lang: SupportedLanguage) => {
    if (lang === language) return;
    setLanguageCookie(lang);
    setLanguageState(lang);
  };

  return (
    <NextIntlClientProvider
      locale={HTML_LANG_BY_LANGUAGE[language] ?? "ko"}
      messages={messages}
      timeZone="Asia/Seoul"
    >
      <L10nContext.Provider value={{ l10n, loading, error, language, setLanguage }}>
        {children}
      </L10nContext.Provider>
    </NextIntlClientProvider>
  );
}
