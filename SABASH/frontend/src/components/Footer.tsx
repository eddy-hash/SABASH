"use client";
import React from 'react';
import { Phone, MapPin } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTiktok, FaTwitter } from 'react-icons/fa';
import { useLanguage } from '@/context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#0F3B66] text-white mt-auto py-10">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
        
        <div className="flex flex-col items-center md:items-start">
          <p className="text-sm text-gray-300 leading-relaxed mb-6 mt-2">{t('footer.desc')}</p>
          <div className="flex space-x-4 justify-center md:justify-start">
            <a href="#" className="text-gray-300 hover:text-[#FF5722] transition-colors"><FaFacebook size={24} /></a>
            <a href="#" className="text-gray-300 hover:text-[#FF5722] transition-colors"><FaInstagram size={24} /></a>
            <a href="#" className="text-gray-300 hover:text-[#FF5722] transition-colors"><FaTiktok size={24} /></a>
            <a href="#" className="text-gray-300 hover:text-[#FF5722] transition-colors"><FaTwitter size={24} /></a>
          </div>
        </div>

        <div className="flex flex-col items-center md:items-start">
          <h3 className="text-lg font-bold text-[#FF5722] mb-4 flex items-center justify-center md:justify-start">
            <Phone size={18} className="mr-2" /> {t('footer.contact')}
          </h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><span className="font-semibold text-white">{t('footer.china')}:</span> +86 185 2914 1619</li>
            <li><span className="font-semibold text-white">{t('footer.uae') || 'UAE'}:</span> +971 56 294 4614</li>
            <li><span className="font-semibold text-white">{t('footer.tanzania')}:</span> +255 672 203 087</li>
          </ul>
        </div>

        <div className="md:col-span-2 flex flex-col items-center md:items-start">
          <h3 className="text-lg font-bold text-[#FF5722] mb-4 flex items-center justify-center md:justify-start">
            <MapPin size={18} className="mr-2" /> {t('footer.offices')}
          </h3>
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex items-center justify-center md:justify-start">
              <span className="text-xl mr-3">🇨🇳</span> 
              <span><strong>{t('footer.china')}:</strong> Baiyun District, Guangzhou</span>
            </li>
            <li className="flex items-center justify-center md:justify-start">
              <span className="text-xl mr-3">🇦🇪</span> 
              <span><strong>{t('footer.uae') || 'UAE'}:</strong> {t('footer.uaeCity') || 'Deira, Dubai'}</span>
            </li>
            <li className="flex items-center justify-center md:justify-start">
              <span className="text-xl mr-3">🇹🇿</span> 
              <span><strong>{t('footer.tanzania')}:</strong> Kariakoo, Dar es Salaam</span>
            </li>
          </ul>
        </div>

      </div>
      <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-700 border-opacity-50">
        &copy; {new Date().getFullYear()} Sabash Cargo. {t('footer.rights')}
      </div>
    </footer>
  );
}
