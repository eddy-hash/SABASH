"use client";
import { useState, useEffect } from 'react';
import { Menu, Bell, UserCircle, Check, Maximize, Minimize, LogOut, Lock, X } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import CurrencySwitcher from './CurrencySwitcher';
import ChangePasswordModal from './ChangePasswordModal';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function Topbar({ toggleSidebar, isSidebarOpen }: { toggleSidebar: () => void, isSidebarOpen: boolean }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else if (document.exitFullscreen) document.exitFullscreen();
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.name || 'User');
        setUserRole(user.role || 'STAFF');
      } catch (e) {}
    }

    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/notifications', { headers: { Authorization: 'Bearer ' + token } });
        if (res.ok) setNotifications(await res.json());
      } catch (e) {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markRead = async (id: string) => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    await fetch('/api/notifications/' + id + '/read', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token } });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleLogout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 md:px-6 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
          <Menu size={24} />
        </button>
      </div>
      
      <div className="flex items-center space-x-1.5 md:space-x-3">
        <LanguageSwitcher />
        <CurrencySwitcher />
        
        <button onClick={toggleFullscreen} className="text-gray-500 hover:text-[#0F3B66] p-2 hidden sm:block transition-colors">
          {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
        </button>

        {/* Notifications Button */}
        <button 
          onClick={() => { setShowNotifDropdown(true); setShowProfileDropdown(false); }} 
          className="text-gray-500 hover:text-[#0F3B66] relative p-2 transition-colors"
        >
          <Bell size={22} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-[#FF5722] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Profile Button */}
        <div className="relative border-l border-gray-200 pl-2 md:pl-4 ml-1">
          <button 
            onClick={() => { setShowProfileDropdown(!showProfileDropdown); setShowNotifDropdown(false); }} 
            className="flex items-center space-x-2 cursor-pointer"
          >
            <UserCircle size={28} className="text-[#0F3B66]" />
            <div className="hidden md:block text-left">
              <p className="text-sm font-bold text-[#0F3B66] leading-tight">{userName}</p>
              <p className="text-[11px] text-gray-500 capitalize">{t('users.' + userRole.toLowerCase()) || userRole}</p>
            </div>
          </button>
          
          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
              <div className="p-3 bg-gray-50 border-b border-gray-100 md:hidden text-center">
                <p className="text-sm font-bold text-[#0F3B66]">{userName}</p>
                <p className="text-xs text-gray-500 capitalize">{t('users.' + userRole.toLowerCase()) || userRole}</p>
              </div>
              <button 
                onClick={() => { setShowProfileDropdown(false); setShowPasswordModal(true); }} 
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors border-b border-gray-100"
              >
                <Lock size={16} className="mr-2" /> Change Password
              </button>
              <button 
                onClick={handleLogout} 
                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
              >
                <LogOut size={16} className="mr-2" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* NOTIFICATIONS — Full-screen drawer on mobile, dropdown on desktop */}
      <AnimatePresence>
        {showNotifDropdown && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowNotifDropdown(false)} 
              className="fixed inset-0 bg-black/60 z-[90] md:hidden" 
            />
            
            {/* Desktop Dropdown (hidden on mobile) */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="hidden md:block absolute right-4 top-16 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[100]"
            >
              <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <span className="font-bold text-[#0F3B66] text-sm">{t("topbar.notifications")}</span>
                <button onClick={() => setShowNotifDropdown(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
              <NotificationList 
                notifications={notifications} 
                markRead={markRead} 
                t={t} 
              />
            </motion.div>

            {/* Mobile Full-Screen Drawer */}
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed inset-x-0 bottom-0 top-16 bg-white z-[95] rounded-t-3xl shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-[#0F3B66]">{t("topbar.notifications")}</h2>
                  {unreadCount > 0 && (
                    <p className="text-xs text-gray-500">{unreadCount} unread</p>
                  )}
                </div>
                <button 
                  onClick={() => setShowNotifDropdown(false)} 
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <NotificationList 
                  notifications={notifications} 
                  markRead={markRead} 
                  t={t} 
                  isMobile={true}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </header>
  );
}

// Extracted notification list component for reuse
function NotificationList({ notifications, markRead, t, isMobile }: { notifications: any[], markRead: (id: string) => void, t: any, isMobile?: boolean }) {
  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">
        {t("topbar.noNotifs")}
      </div>
    );
  }

  return (
    <div className={isMobile ? 'divide-y divide-gray-100' : 'max-h-96 overflow-y-auto'}>
      {notifications.map(n => (
        <div 
          key={n.id} 
          className={`flex items-start justify-between gap-3 ${isMobile ? 'p-4' : 'p-3 border-b border-gray-50'} ${n.isRead ? 'bg-white' : 'bg-orange-50'}`}
        >
          <div className="flex-1 min-w-0">
            <p className={`${isMobile ? 'text-sm' : 'text-xs sm:text-sm'} ${n.isRead ? 'text-gray-600' : 'font-bold text-[#0F3B66]'}`}>
              {n.title}
            </p>
            <p className={`${isMobile ? 'text-xs' : 'text-[11px] sm:text-xs'} text-gray-500 mt-1 break-words`}>
              {n.message}
            </p>
          </div>
          {!n.isRead && (
            <button 
              onClick={() => markRead(n.id)} 
              className="text-gray-400 hover:text-green-500 p-1 shrink-0"
              title="Mark as read"
            >
              <Check size={isMobile ? 18 : 16} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
