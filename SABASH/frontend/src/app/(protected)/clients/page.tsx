"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, UserPlus, Building2, Phone } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export default function ClientsListPage() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const fetchCustomers = async () => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    try {
      const res = await fetch(`/api/customers?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setCustomers(await res.json());
    } catch (e) {}
  };

  useEffect(() => { fetchCustomers(); }, []);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || (c.company && c.company.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-[#0F3B66]">{t('clients.title')}</h1>
        <Link href="/clients/new" className="w-full sm:w-auto bg-[#FF5722] text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:bg-orange-600 transition-colors flex justify-center items-center">
          <UserPlus size={18} className="mr-2" /> {t('clients.register')}
        </Link>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input type="text" placeholder={t('clients.search')} value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none text-sm shadow-sm" />
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden space-y-4">
        {filteredCustomers.length === 0 ? (
          <p className="text-center text-gray-400 py-8 bg-white rounded-xl shadow-sm">{t('clients.noClients')}</p>
        ) : (
          filteredCustomers.map(c => (
            <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-2">
              <p className="font-bold text-[#0F3B66] text-lg">{c.name}</p>
              <p className="text-sm text-gray-600 flex items-center"><Phone size={14} className="mr-2 text-[#FF5722]"/> {c.phone}</p>
              {c.company && <p className="text-sm text-gray-600 flex items-center"><Building2 size={14} className="mr-2 text-[#FF5722]"/> {c.company}</p>}
              {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm text-left text-gray-600 whitespace-nowrap">
            <thead className="text-xs text-white uppercase bg-[#0F3B66]">
              <tr>
                <th className="px-4 py-3">{t('clients.name')}</th>
                <th className="px-4 py-3">{t('clients.contact')}</th>
                <th className="px-4 py-3">{t('clients.company')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-[#0F3B66]">{c.name}</td>
                  <td className="px-4 py-3">{c.phone}<br/><span className="text-xs text-gray-400">{c.email || '-'}</span></td>
                  <td className="px-4 py-3">{c.company || '-'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
