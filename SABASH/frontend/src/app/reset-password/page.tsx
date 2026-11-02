"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      if (!res.ok) throw new Error('Invalid or expired token');
      alert('Password reset successfully! Please login.');
      router.push('/login');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F3B66]">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-[#0F3B66] mb-6 text-center">Enter New Password</h1>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="6-Character Token" required onChange={(e) => setToken(e.target.value.toUpperCase())} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-[#FF5722] font-mono text-center tracking-widest text-lg" />
          
          <div className="relative">
            <input type={showPassword ? "text" : "password"} placeholder="New Password" required onChange={(e) => setNewPassword(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-[#FF5722] pr-10" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#0F3B66]">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          
          <button type="submit" className="w-full bg-[#FF5722] text-white font-bold py-3 rounded-lg">Update Password</button>
        </form>
      </div>
    </div>
  );
}
