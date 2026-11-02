"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Save, Lock, Eye, EyeOff, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import PasswordStrength from "@/components/PasswordStrength";
import { useLanguage } from '@/context/LanguageContext';

export default function NewUserPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'STAFF' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (JSON.parse(localStorage.getItem('user') || '{}').role === 'ADMIN') setIsAuthorized(true);
    else router.push('/dashboard');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true);
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    try {
      const res = await fetch('/api/auth/register-staff', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(formData) });
      if (!res.ok) throw new Error((await res.json()).message || t('users.error'));
      toast.success(t('users.success'));
      window.location.href = '/users';
    } catch (err: any) { toast.error(err.message); } finally { setIsLoading(false); }
  };

  if (!isAuthorized) return <div className="flex h-[80vh] items-center justify-center"><Lock size={48} className="text-red-400 animate-pulse" /></div>;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <Link href="/users" className="mr-4 p-2 bg-gray-200 rounded-full hover:bg-gray-300"><ArrowLeft size={20} className="text-[#0F3B66]" /></Link>
        <h1 className="text-2xl font-bold text-[#0F3B66]">{t('users.register')}</h1>
      </div>
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div><label className="text-sm font-medium text-gray-700">{t('users.name')}</label><input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" /></div>
          <div><label className="text-sm font-medium text-gray-700">{t('users.email')}</label><input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" /></div>
          <div>
            <label className="text-sm font-medium text-gray-700">{t('users.password')}</label>
            <div className="relative mt-1">
              <PasswordStrength password={formData.password} />
              <input type={showPassword ? "text" : "password"} required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#0F3B66]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>
          
          {/* FIXED DROPDOWN */}
          <div>
            <label className="text-sm font-medium text-gray-700">{t('users.role')}</label>
            <div className="relative mt-1">
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 border rounded-lg bg-gray-50 outline-none appearance-none cursor-pointer relative z-10">
                <option value="WAREHOUSE">{t('users.warehouse')}</option>
                <option value="STAFF">{t('users.staff')}</option>
                <option value="MANAGER">{t('users.manager')}</option>
                <option value="ADMIN">{t('users.admin')}</option>
              </select>
              <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
            </div>
          </div>
          
          <button type="submit" disabled={isLoading} className="w-full bg-[#FF5722] text-white font-bold py-3 rounded-lg hover:bg-orange-600 flex justify-center items-center mt-4">
            {isLoading ? 'Saving...' : <><Save size={18} className="mr-2"/> {t('users.register')}</>}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
