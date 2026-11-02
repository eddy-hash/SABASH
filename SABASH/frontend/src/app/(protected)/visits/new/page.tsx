"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Save, Store, Phone, User as UserIcon, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export default function NewVisitPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [formData, setFormData] = useState({ customerName: '', customerPhone: '', workplace: '', comments: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to save visit');
      
      toast.success(t('visits.success'));
      router.push('/visits');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <Link href="/visits" className="mr-4 p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors">
          <ArrowLeft size={20} className="text-[#0F3B66]" />
        </Link>
        <h1 className="text-2xl font-bold text-[#0F3B66]">{t('visits.register')}</h1>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 border-t-4 border-t-[#FF5722]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t('visits.customer')}</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input type="text" required value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" placeholder="Edgar Edson" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t('visits.phone')}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input type="text" required value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" placeholder="+255 7XX XXX XXX" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t('visits.workplace')}</label>
            <div className="relative">
              <Store className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input type="text" required value={formData.workplace} onChange={e => setFormData({...formData, workplace: e.target.value})} className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" placeholder="e.g. Kariakoo Shop No. 45" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t('visits.comments')}</label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <textarea rows={4} value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" placeholder="What did the customer say? Did they show interest?"></textarea>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-[#FF5722] text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition-colors flex justify-center items-center disabled:opacity-50 mt-4">
            {isLoading ? 'Saving...' : <><Save size={18} className="mr-2"/> {t('visits.save')}</>}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
