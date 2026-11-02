"use client";
import { useState, useRef, useEffect } from 'react';
import { useCurrency } from '@/context/CurrencyContext';
import { Coins, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const currencies = [
  { code: 'USD', label: 'US Dollar', flag: '🇺🇸', symbol: '$' },
  { code: 'TZS', label: 'Tanzanian Shilling', flag: '🇹🇿', symbol: 'TZS' },
];

export default function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = currencies.find(c => c.code === currency) || currencies[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-1.5 bg-[#1a4f85] hover:bg-[#15406d] px-2.5 py-1.5 rounded-md border border-blue-800 text-white transition-colors">
        <Coins size={16} className="text-gray-300 shrink-0" />
        <span className="text-sm font-bold uppercase">{selected.code}</span>
        <ChevronDown size={14} className={`text-gray-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[100]">
            {currencies.map((c) => (
              <button key={c.code} onClick={() => { setCurrency(c.code as any); setIsOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center space-x-3 transition-colors hover:bg-gray-50 ${currency === c.code ? 'bg-blue-50 font-bold text-[#0F3B66]' : 'text-gray-700'}`}>
                <span className="text-lg">{c.flag}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
