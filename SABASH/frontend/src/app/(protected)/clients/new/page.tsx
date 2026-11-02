"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export default function NewClientPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', company: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    
    const payload = {
      ...formData,
      phone: `+255${formData.phone.replace(/^0+/, '')}` // Format phone
    };

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      
      // If the backend returns an error, show the EXACT error
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(`Server Error ${res.status}: ${errData.message || 'Unknown error'}`);
      }
      
      toast.success(t('clients.success'));
      window.location.href = '/clients'; // Force hard reload
    } catch (err: any) {
      toast.error(err.message); // Show the real error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <Link href="/clients" className="mr-4 p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors">
          <ArrowLeft size={20} className="text-[#0F3B66]" />
        </Link>
        <h1 className="text-2xl font-bold text-[#0F3B66]">{t('clients.register')}</h1>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700">{t('clients.name')}</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" placeholder="e.g. Edgar Edson" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">{t('clients.phone')}</label>
            <div className="mt-1 flex rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-[#FF5722] focus-within:border-[#FF5722] overflow-hidden">
              <span className="bg-gray-50 px-3 py-3 text-gray-500 font-medium border-r border-gray-300">+255</span>
              <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} className="w-full p-3 outline-none" placeholder="710 209 220" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Do not include the leading 0.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">{t('clients.company')}</label>
            <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="mt-1 w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" placeholder="e.g. Acme Ltd" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">{t('clients.email')}</label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" placeholder="edgar@sabash.com" />
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-[#FF5722] text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition-colors flex justify-center items-center disabled:opacity-50 mt-4">
            {isLoading ? 'Saving...' : <><Save size={18} className="mr-2"/> {t('clients.save')}</>}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
