'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchAndParseL10n } from '@/utils/l10n';

const STORAGE_KEY = 'er-meta-language';

interface L10nState {
  l10n: Map<string, string>;
  loading: boolean;
  error: string | null;
}

type L10nAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Map<string, string> }
  | { type: 'FETCH_ERROR'; payload: string };

const l10nReducer = (state: L10nState, action: L10nAction): L10nState => {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, error: null, l10n: action.payload };
    case 'FETCH_ERROR':
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
    throw new Error('useL10n must be used within a L10nProvider');
  }
  return context;
}

interface L10nProviderProps {
  initialL10n?: Record<string, string>;
  children: React.ReactNode;
}

export function L10nProvider({ initialL10n, children }: L10nProviderProps) {
  const [language, setLanguageState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return stored;
      }
    }
    return 'Korean';
  });
    const [l10nState, l10nDispatch] = React.useReducer(
      l10nReducer,
      {
        l10n: initialL10n ? new Map(Object.entries(initialL10n)) : new Map(),
        loading: !initialL10n,
        error: null,
      }
    );
    const { l10n, loading, error } = l10nState;
  
    // 언어 변경 시에만 l10n 재로드 (초기 Korean + initialL10n이면 스킵)
    useEffect(() => {
      if (language === 'Korean' && initialL10n) return;
  
      let ignore = false;
      l10nDispatch({ type: 'FETCH_START' });
  
      fetchAndParseL10n(language)
        .then((map) => {
          if (!ignore) l10nDispatch({ type: 'FETCH_SUCCESS', payload: map });
        })
        .catch((err) => {
          if (!ignore) l10nDispatch({ type: 'FETCH_ERROR', payload: err instanceof Error ? err.message : 'l10n 로딩 실패' });
        });
  
      return () => {
        ignore = true;
      };
    }, [language, initialL10n]);

  const setLanguage = (lang: string) => {
    localStorage.setItem(STORAGE_KEY, lang);
    setLanguageState(lang);
  };

  return (
    <L10nContext.Provider value={{ l10n, loading, error, language, setLanguage }}>
      {children}
    </L10nContext.Provider>
  );
}
