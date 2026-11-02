"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import PasswordStrength from "./PasswordStrength";
import { toast } from 'sonner';

export default function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('New password must be at least 6 characters');
    
    setIsLoading(true);
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update password');
      
      toast.success('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
            onClick={(e) => e.stopPropagation()} 
            className="w-full max-w-md bg-white rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl overflow-hidden"
          >
            <div className="bg-[#0F3B66] p-5 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold flex items-center"><ShieldCheck className="mr-2" size={20}/> Change Password</h2>
              <button onClick={onClose} className="text-gray-300 hover:text-white"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700">Current Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <input type={showOld ? "text" : "password"} required value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full pl-10 pr-10 p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" />
                  <button type="button" onClick={() => setShowOld(!showOld)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#0F3B66]">
                    {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">New Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <PasswordStrength password={newPassword} />
                  <input type={showNew ? "text" : "password"} required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-10 pr-10 p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#0F3B66]">
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full bg-[#FF5722] text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 mt-2">
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
