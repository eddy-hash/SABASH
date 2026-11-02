"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Currency = 'USD' | 'TZS';
const CurrencyContext = createContext<any>(null);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<Currency>('USD');
  return <CurrencyContext.Provider value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => useContext(CurrencyContext);
