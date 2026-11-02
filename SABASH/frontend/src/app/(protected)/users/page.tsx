"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { UserPlus, Shield, User as UserIcon, Lock } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export default function UsersListPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const fetchUsers = async () => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    try {
      const res = await fetch(`/api/users?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setUsers(await res.json());
    } catch (e) {}
  };

  useEffect(() => {
    if (JSON.parse(localStorage.getItem('user') || '{}').role === 'ADMIN') { setIsAuthorized(true); fetchUsers(); }
    else router.push('/dashboard');
  }, [router]);

  if (!isAuthorized) return <div className="flex h-[80vh] items-center justify-center"><Lock size={48} className="text-red-400 animate-pulse" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl md:text-3xl font-bold text-[#0F3B66]">{t('users.title')}</h1>
          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full border border-red-200 flex items-center"><Shield size={12} className="mr-1"/> {t('users.adminAccess')}</span>
        </div>
        <Link href="/users/new" className="w-full sm:w-auto bg-[#FF5722] text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:bg-orange-600 transition-colors flex justify-center items-center">
          <UserPlus size={18} className="mr-2" /> {t('users.register')}
        </Link>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden space-y-4">
        {users.map(u => (
          <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <p className="font-bold text-[#0F3B66] text-lg flex items-center"><UserIcon size={16} className="mr-2 text-gray-400"/> {u.name}</p>
              <span className={`px-2 py-1 rounded text-xs font-bold flex items-center ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                <Shield size={12} className="mr-1"/> {u.role}
              </span>
            </div>
            <p className="text-sm text-gray-500">{u.email}</p>
          </div>
        ))}
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-[#0F3B66] mb-6">{t('users.team')}</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm text-left text-gray-600 whitespace-nowrap">
            <thead className="text-xs text-white uppercase bg-[#0F3B66]">
              <tr>
                <th className="px-4 py-3">{t('users.name')}</th>
                <th className="px-4 py-3">{t('users.email')}</th>
                <th className="px-4 py-3">{t('users.role')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <motion.tr key={u.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-[#0F3B66] flex items-center"><UserIcon size={16} className="mr-2 text-gray-400"/> {u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold flex items-center w-fit ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      <Shield size={12} className="mr-1"/> {u.role}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
