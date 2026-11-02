"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState('admin@sabash.com');
  const [password, setPassword] = useState('Admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error('Invalid credentials');
      
      const data = await res.json();
      document.cookie = `token=${data.access_token}; path=/`;
      localStorage.setItem('user', JSON.stringify(data.user));
      
      toast.success(`Welcome back, ${data.user.name}!`);
      router.push('/dashboard');
    } catch (err: any) { 
      toast.error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F3B66] relative overflow-hidden p-4">
      <div className="absolute top-6 right-6 z-20"><LanguageSwitcher /></div>
      
      <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#FF5722] rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
      
      <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white p-6 sm:p-10 rounded-2xl shadow-2xl w-full max-w-md relative z-10">
        
        <div className="text-center mb-8 flex flex-col items-center">
          {/* CLEAN LOGO: No circle, no crop, just the image */}
          <img 
            src="/sabash-logo.png" 
            alt="Sabash Logo" 
            className="h-20 md:h-24 w-auto object-contain mb-4" 
          />
          <h1 className="text-2xl font-bold text-[#0F3B66]">{t('auth.welcome')}</h1>
          <p className="text-gray-500 mt-1">{t('auth.subtitle')}</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none transition-all" />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">{t('auth.password')}</label>
              <Link href="/forgot-password" className="text-sm text-[#FF5722] font-semibold hover:underline">{t('auth.forgot')}</Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none transition-all" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#0F3B66] min-h-[44px]">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading} className="w-full bg-[#FF5722] text-white font-bold py-3 rounded-lg shadow-lg hover:bg-orange-600 transition-colors flex justify-center items-center disabled:opacity-70 mt-2">
            {isLoading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : <><LogIn className="mr-2 h-5 w-5" /> {t('auth.loginBtn')}</>}
          </motion.button>
        </form>
        
        <p className="text-center text-sm text-gray-500 mt-6">
          {t('auth.noAccount')} <Link href="/register" className="text-[#FF5722] font-bold hover:underline">{t('auth.registerLink')}</Link>
        </p>
      </motion.div>
    </div>
  );
}
