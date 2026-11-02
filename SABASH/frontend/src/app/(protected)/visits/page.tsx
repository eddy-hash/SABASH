"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, Plus, Phone, User as UserIcon, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export default function VisitsPage() {
  const { t } = useLanguage();
  const [visits, setVisits] = useState<any[]>([]);

  useEffect(() => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    fetch('/api/visits', { headers: { Authorization: 'Bearer ' + token } })
      .then(res => res.json())
      .then(data => setVisits(Array.isArray(data) ? data : []));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-[#0F3B66]">{t('visits.title')}</h1>
        <Link href="/visits/new" className="w-full sm:w-auto bg-[#FF5722] text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:bg-orange-600 transition-colors flex justify-center items-center">
          <Plus size={18} className="mr-2" /> {t('visits.register')}
        </Link>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {visits.length === 0 ? (
          <p className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg">{t('visits.noVisits')}</p>
        ) : (
          visits.map(v => (
            <div key={v.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-2">
              <div className="flex justify-between items-start">
                <p className="font-bold text-[#0F3B66] text-lg">{v.customerName}</p>
                <span className="text-xs text-gray-400">{new Date(v.visitDate).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-600 flex items-center"><Store size={14} className="mr-2 text-[#FF5722]"/> {v.workplace}</p>
              <p className="text-sm text-gray-600 flex items-center"><Phone size={14} className="mr-2 text-[#FF5722]"/> {v.customerPhone}</p>
              {v.comments && <p className="text-xs bg-gray-50 p-2 rounded text-gray-600 mt-2">"{v.comments}"</p>}
              <p className="text-xs text-gray-400 pt-2 border-t mt-2 flex items-center"><UserIcon size={12} className="mr-1"/> Agent: {v.agent?.name || 'Unknown'}</p>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm text-left text-gray-600 whitespace-nowrap">
            <thead className="text-xs text-white uppercase bg-[#0F3B66]">
              <tr>
                <th className="px-6 py-4">{t('visits.date')}</th>
                <th className="px-6 py-4">{t('visits.customer')}</th>
                <th className="px-6 py-4">{t('visits.workplace')}</th>
                <th className="px-6 py-4">{t('visits.comments')}</th>
                <th className="px-6 py-4">{t('visits.agent')}</th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 bg-gray-50">{t('visits.noVisits')}</td></tr>
              ) : (
                visits.map((v, i) => (
                  <motion.tr key={v.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-xs">{new Date(v.visitDate).toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-[#0F3B66]">{v.customerName}<br/><span className="text-xs font-normal text-gray-500">{v.customerPhone}</span></td>
                    <td className="px-6 py-4">{v.workplace}</td>
                    <td className="px-6 py-4 text-xs max-w-xs truncate">{v.comments || '-'}</td>
                    <td className="px-6 py-4 text-xs"><UserIcon size={12} className="inline mr-1"/> {v.agent?.name || 'Unknown'}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
