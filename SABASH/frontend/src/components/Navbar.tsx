"use client";
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { Globe, Package, Box } from 'lucide-react';

export default function Navbar() {
  const { lang, setLang, t } = useLanguage();
  return (
    <nav className="bg-[#0F3B66] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-xl font-bold text-[#FF5722]">Sabash Cargo</Link>
          <Link href="/intake" className="flex items-center space-x-1 hover:text-[#FF5722]"><Box size={18} /><span>{t('nav.intake')}</span></Link>
          <Link href="/dashboard" className="flex items-center space-x-1 hover:text-[#FF5722]"><Package size={18} /><span>{t('nav.dashboard')}</span></Link>
        </div>
        <div className="flex items-center space-x-2 bg-blue-900 px-3 py-1 rounded">
          <Globe size={16} />
          <select value={lang} onChange={(e) => setLang(e.target.value as any)} className="bg-transparent text-white outline-none cursor-pointer text-sm">
            <option value="en" className="text-black">EN</option>
            <option value="sw" className="text-black">SW</option>
            <option value="zh" className="text-black">ZH</option>
            <option value="tr" className="text-black">TR</option>
          </select>
        </div>
      </div>
    </nav>
  );
}
