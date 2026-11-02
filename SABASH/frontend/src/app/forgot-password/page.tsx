"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [demoToken, setDemoToken] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    setMessage(data.message);
    if (data.demoToken) setDemoToken(data.demoToken);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F3B66]">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-[#0F3B66] mb-6 text-center">Reset Password</h1>
        {!demoToken ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-500 text-center mb-4">Enter your email to receive a reset token.</p>
            <input type="email" placeholder="Email" required onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-[#FF5722]" />
            <button type="submit" className="w-full bg-[#0F3B66] text-white font-bold py-3 rounded-lg">Send Reset Token</button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-green-600 font-bold">{message}</p>
            <p className="text-sm text-gray-600">Since this is a demo, here is your token:</p>
            <div className="bg-gray-100 p-4 rounded-lg text-2xl font-mono font-bold tracking-widest text-[#FF5722]">{demoToken}</div>
            <button onClick={() => router.push('/reset-password')} className="w-full bg-[#FF5722] text-white font-bold py-3 rounded-lg mt-4">Proceed to Reset</button>
          </div>
        )}
        <p className="text-center text-sm text-gray-500 mt-6"><Link href="/login" className="text-[#FF5722] font-bold">Back to Login</Link></p>
      </div>
    </div>
  );
}
