"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Registration failed');
      }
      const data = await res.json();
      document.cookie = `token=${data.access_token}; path=/`;
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F3B66] relative overflow-hidden">
      <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#0F3B66]">Create an Account</h1>
          <p className="text-gray-500 mt-2">Join Sabash Cargo Enterprise</p>
        </div>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        <form onSubmit={handleRegister} className="space-y-4">
          <input type="text" placeholder="Full Name" required onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" />
          <input type="email" placeholder="Email" required onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" />
          <input type="password" placeholder="Password" required onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" />
          <button type="submit" className="w-full bg-[#FF5722] text-white font-bold py-3 rounded-lg shadow-lg hover:bg-orange-600">Register</button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">Already have an account? <Link href="/login" className="text-[#FF5722] font-bold">Login</Link></p>
      </motion.div>
    </div>
  );
}
