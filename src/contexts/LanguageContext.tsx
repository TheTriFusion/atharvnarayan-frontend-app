import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, setLanguage as setI18nLanguage, getLanguage } from '../utils/i18n';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  t: (key: string) => string;
  translations: any;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>('en');

  useEffect(() => {
    const loadLanguage = async () => {
      const lang = await getLanguage();
      setLanguageState(lang);
    };
    loadLanguage();
  }, []);

  const setLanguage = async (lang: string) => {
    await setI18nLanguage(lang);
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    if (!key || typeof key !== 'string') return key || '';
    
    const keys = key.split('.');
    let value: any = translations[language as keyof typeof translations];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    translations: translations[language as keyof typeof translations],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

