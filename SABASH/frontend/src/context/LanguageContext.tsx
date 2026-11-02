"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';
import en from '../locales/en.json';
import sw from '../locales/sw.json';
import zh from '../locales/zh.json';
import tr from '../locales/tr.json';

const dictionaries: Record<string, any> = { en, sw, zh, tr };
type Lang = 'en' | 'sw' | 'zh' | 'tr';
const LanguageContext = createContext<any>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>('en');
  const t = (key: string, vars?: Record<string, string>) => {
    let text = key.split('.').reduce((obj, k) => (obj ? obj[k] : key), dictionaries[lang]) || key;
    if (vars) Object.keys(vars).forEach(v => { text = text.replace(`{${v}}`, vars[v]); });
    return text;
  };
  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
};
export const useLanguage = () => useContext(LanguageContext);
