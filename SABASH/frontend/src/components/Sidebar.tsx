"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, PackagePlus, Users, LogOut, X, Contact, Store, Activity } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) { try { setUserRole(JSON.parse(userStr).role || 'STAFF'); } catch (e) { setUserRole('STAFF'); } }
  }, []);

  const handleLogout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    localStorage.removeItem('user');
    router.push('/');
  };

  const allMenuItems = [
    { name: t('nav.dashboard'), icon: LayoutDashboard, path: '/dashboard', roles: ['ADMIN', 'MANAGER', 'STAFF', 'WAREHOUSE'] },
    { name: t('nav.intake'), icon: PackagePlus, path: '/intake', roles: ['ADMIN', 'MANAGER', 'STAFF', 'WAREHOUSE'] },
    { name: t('nav.clients'), icon: Contact, path: '/clients', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { name: t('nav.visits'), icon: Store, path: '/visits', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { name: 'System Health', icon: Activity, path: '/health', roles: ['ADMIN'] },
    { name: t('nav.users'), icon: Users, path: '/users', roles: ['ADMIN'] },
  ];
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  return (
    <>
      <AnimatePresence>
        {isOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" />}
      </AnimatePresence>
      
      <motion.aside initial={false} animate={{ width: isOpen ? 240 : 72 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className={`bg-[#0F3B66] text-white h-[100dvh] flex flex-col fixed left-0 top-0 shadow-2xl z-50 overflow-hidden transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* FIXED ALIGNMENT */}
        <div className="h-16 flex items-center px-4 shrink-0 border-b border-white/10 relative">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center bg-white rounded-full transition-all duration-300 ${isOpen ? 'w-10 h-10' : 'w-8 h-8'}`}>
              <img src="/sabash-logo.png" alt="Sabash" className="w-full h-full object-contain p-1 rounded-full" />
            </div>
            {isOpen && <span className="font-bold text-sm tracking-widest text-white">SABASH</span>}
          </div>
          <button className="md:hidden absolute right-3 text-gray-300 hover:text-white" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 mt-2 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== "/dashboard" && pathname.startsWith(`${item.path}/`));
            return (
              <Link key={item.name} href={item.path} onClick={() => setIsOpen(false)}>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-[#FF5722] text-white shadow-lg' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
                  <item.icon size={20} className="shrink-0" />
                  <span className={`font-medium text-sm whitespace-nowrap transition-all duration-200 ${isOpen ? 'opacity-100 block' : 'opacity-0 hidden'}`}>{item.name}</span>
                </motion.div>
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-white/10 shrink-0">
          <button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 px-2.5 py-2.5 w-full rounded-lg text-left transition-colors">
            <LogOut size={20} className="shrink-0" />
            <span className={`font-medium text-sm whitespace-nowrap transition-all duration-200 ${isOpen ? 'opacity-100 block' : 'opacity-0 hidden'}`}>{t('nav.logout')}</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
