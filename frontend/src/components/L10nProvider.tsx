"use client";

import { NextIntlClientProvider } from "next-intl";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { L10nNamespace } from "@/generated/l10nManifest";
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, type SupportedLanguage } from "@/lib/detectLanguage";
import { HTML_LANG_BY_LANGUAGE, loadIntlMessages, type IntlMessages } from "@/lib/staticIntl";
import { fetchL10nNamespace } from "@/utils/l10n";

const COOKIE_MAX_AGE_DAYS = 365;
const EMPTY_L10N = new Map<string, string>();

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
      return { l10n: EMPTY_L10N, loading: true, error: null };
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

interface L10nNamespaceState {
  language: SupportedLanguage;
  namespace: L10nNamespace;
  l10n: Map<string, string>;
  loading: boolean;
  error: string | null;
}

/** 현재 기능에서 요구하는 l10n namespace만 지연 로드한다. */
export function useL10nNamespace(namespace: L10nNamespace) {
  const context = useL10n();
  const { language } = context;
  const [state, setState] = useState<L10nNamespaceState | null>(null);

  useEffect(() => {
    if (namespace === "core") return;

    let ignore = false;

    fetchL10nNamespace(language, namespace)
      .then((nextL10n) => {
        if (!ignore) {
          setState({ language, namespace, l10n: nextL10n, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (!ignore) {
          setState({
            language,
            namespace,
            l10n: EMPTY_L10N,
            loading: false,
            error: error instanceof Error ? error.message : "l10n 로딩 실패",
          });
        }
      });

    return () => {
      ignore = true;
    };
  }, [language, namespace]);

  if (namespace === "core") {
    return { l10n: context.l10n, loading: context.loading, error: context.error };
  }

  if (!state || state.language !== language || state.namespace !== namespace) {
    return { l10n: EMPTY_L10N, loading: true, error: null };
  }

  return { l10n: state.l10n, loading: state.loading, error: state.error };
}

interface L10nProviderProps {
  initialL10nSeed?: Record<string, string>;
  initialMessages: IntlMessages;
  initialLanguage?: SupportedLanguage;
  children: React.ReactNode;
}

export function L10nProvider({
  initialL10nSeed,
  initialMessages,
  initialLanguage,
  children,
}: L10nProviderProps) {
  const serverLanguage = initialLanguage ?? DEFAULT_LANGUAGE;
  const initialL10nMap = React.useMemo(
    () => (initialL10nSeed ? new Map(Object.entries(initialL10nSeed)) : null),
    [initialL10nSeed]
  );
  const [language, setLanguageState] = useState<SupportedLanguage>(serverLanguage);
  const [messages, setMessages] = useState<IntlMessages>(initialMessages);
  const [l10nState, l10nDispatch] = React.useReducer(l10nReducer, {
    l10n: initialL10nMap ?? new Map(),
    loading: !initialL10nMap,
    error: null,
  });
  const { l10n, loading, error } = l10nState;
  const messageCacheRef = useRef<Partial<Record<SupportedLanguage, IntlMessages>>>({
    [serverLanguage]: initialMessages,
  });
  const l10nCacheRef = useRef<Partial<Record<SupportedLanguage, Map<string, string>>>>(
    initialL10nMap ? { [serverLanguage]: initialL10nMap } : {}
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
      cachedL10n ? Promise.resolve(cachedL10n) : fetchL10nNamespace(language, "core"),
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
    const cachedL10n = l10nCacheRef.current[lang];
    l10nDispatch(
      cachedL10n ? { type: "FETCH_SUCCESS", payload: cachedL10n } : { type: "FETCH_START" }
    );
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
