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

export function L10nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>('Korean');
  const [l10n, setL10n] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // localStorage에서 언어 초기화 (hydration 이후)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setLanguageState(stored);
  }, []);

  // 언어 변경 시 l10n 로드
  useEffect(() => {
    setLoading(true);
    setError(null);
    console.log(`[L10nProvider] l10n 로드 시작: language=${language}`);
    fetchAndParseL10n(language)
      .then((map) => {
        console.log(`[L10nProvider] 로드 완료: ${map.size}개 키, 샘플:`, {
          'Character/Name/1': map.get('Character/Name/1'),
          'Character/Name/2': map.get('Character/Name/2'),
          'Character/Name/3': map.get('Character/Name/3'),
        });
        setL10n(map);
      })
      .catch((err) => {
        console.error('[L10nProvider] 로드 실패:', err);
        setError(err instanceof Error ? err.message : 'l10n 로딩 실패');
      })
      .finally(() => setLoading(false));
  }, [language]);

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
