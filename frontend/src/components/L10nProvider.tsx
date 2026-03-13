'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchAndParseL10n } from '@/utils/l10n';

const STORAGE_KEY = 'er-meta-language';

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
  const [language, setLanguageState] = useState<string>('Korean');
  const [l10n, setL10n] = useState<Map<string, string>>(
    () => initialL10n ? new Map(Object.entries(initialL10n)) : new Map()
  );
  const [loading, setLoading] = useState(!initialL10n);
  const [error, setError] = useState<string | null>(null);

  // localStorage에서 언어 확인 — Korean이 아닐 때만 refetch
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored !== language) {
      setLanguageState(stored);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 언어 변경 시에만 l10n 재로드 (초기 Korean + initialL10n이면 스킵)
  useEffect(() => {
    if (language === 'Korean' && initialL10n) return;

    setLoading(true);
    setError(null);
    fetchAndParseL10n(language)
      .then((map) => setL10n(map))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'l10n 로딩 실패');
      })
      .finally(() => setLoading(false));
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
