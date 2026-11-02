"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ShieldCheck, Zap, LogIn, Search, MapPin, Truck, CheckCircle2, Clock } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import dynamic from 'next/dynamic';
import { io, Socket } from 'socket.io-client';
import TrackingTimeline from '@/components/TrackingTimeline';

const TrackingMap = dynamic(() => import('@/components/TrackingMap'), { ssr: false, loading: () => <div className="h-[200px] md:h-[250px] bg-gray-100 rounded-xl flex items-center justify-center">Loading Map...</div> });

export default function LandingPage() {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const handleTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/shipments/track/' + code.toUpperCase());
      if (!res.ok) throw new Error('Tracking number not found. Please check and try again.');
      const data = await res.json();
      setResult(data);

      if (socket) socket.disconnect();
      const newSocket = io(window.location.origin, { path: '/socket.io' });
      newSocket.on('track_' + data.trackingCode, (update: any) => {
        setResult((prev: any) => ({
          ...prev,
          status: update.status,
          currentLat: update.lat,
          currentLng: update.lng,
          eventHistory: [...(prev.eventHistory || []), { status: update.status, title: update.title, date: update.date }]
        }));
      });
      setSocket(newSocket);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlCode = urlParams.get("code");
    if (urlCode) { setCode(urlCode); handleTrack(); }
    return () => { if (socket) socket.disconnect(); };
  }, []);

  const getETA = () => {
    if (!result) return null;
    const start = new Date(result.createdAt);
    const days = result.freightType === 'air' ? 3 : 30;
    const eta = new Date(start);
    eta.setDate(eta.getDate() + days);
    return eta.toLocaleDateString();
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center py-6 px-4 bg-[#0F3B66] bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/background.jpg')" }}>
      <div className="absolute inset-0 bg-black/70"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto text-center w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="flex justify-center mb-4 md:mb-6">
            <div className="bg-white p-2 md:p-3 rounded-2xl shadow-xl">
              <img src="/sabash-logo.png" alt="Sabash" className="w-12 h-12 md:w-16 md:h-16 object-contain" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold text-white mb-2 md:mb-6 leading-tight drop-shadow-lg">
            SABASH CARGO <br />
            <span className="text-[#FF5722] text-lg sm:text-3xl md:text-5xl">LOGISTIC COMPANY</span>
          </h1>
          
          <form onSubmit={handleTrack} className="flex shadow-2xl max-w-lg mx-auto mb-4 md:mb-6">
            <input 
              type="text" 
              placeholder="Enter Tracking Code" 
              value={code} 
              onChange={e => setCode(e.target.value)} 
              required 
              className="flex-1 p-3 md:p-4 border border-r-0 border-gray-300 rounded-l-xl focus:ring-2 focus:ring-[#FF5722] outline-none text-sm md:text-lg uppercase" 
            />
            <button type="submit" disabled={isLoading} className="bg-[#FF5722] text-white px-4 md:px-8 rounded-r-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center">
              {isLoading ? '...' : <><Search size={18} className="md:mr-2"/> <span className="hidden md:inline">Track</span></>}
            </button>
          </form>

          <div className="flex justify-center mt-4 md:mt-6">
            <Link href="/login" className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-2.5 md:px-8 md:py-3 rounded-xl font-bold text-sm md:text-base shadow-xl hover:bg-white/20 transition-transform hover:scale-105 flex items-center justify-center">
              <LogIn className="mr-2" size={18} /> Staff Portal Login
            </Link>
          </div>
        </motion.div>

        {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm md:text-base text-center mt-4 md:mt-6 font-bold bg-black/50 inline-block px-3 py-2 rounded-lg">{error}</motion.p>}

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 md:mt-8 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-left max-w-3xl mx-auto">
              <div className="bg-[#0F3B66] p-4 md:p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
                <div>
                  <p className="text-xs md:text-sm text-gray-300">Tracking Number</p>
                  <h2 className="text-base md:text-2xl font-bold break-all">{result.trackingCode}</h2>
                </div>
                <div className="flex gap-4 md:gap-6 flex-wrap">
                  <div>
                    <p className="text-[10px] md:text-xs text-gray-300 uppercase tracking-wider">Status</p>
                    <div className="flex items-center text-sm md:text-lg font-bold text-[#FF5722]">
                      {result.status === 'Delivered' ? <CheckCircle2 className="mr-1 md:mr-2" size={16}/> : <Truck className="mr-1 md:mr-2" size={16}/>}
                      {result.status}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs text-gray-300 uppercase tracking-wider flex items-center"><Clock size={10} className="mr-1"/> Est. Arrival</p>
                    <p className="text-sm md:text-base font-bold text-green-400">{getETA()}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <div>
                  <h3 className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 md:mb-4 border-b pb-2">Live Location</h3>
                  {result.currentLat && result.currentLng ? (
                    <TrackingMap lat={Number(result.currentLat)} lng={Number(result.currentLng)} trackingCode={result.trackingCode} />
                  ) : (
                    <div className="h-[200px] md:h-[250px] bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400">
                      <MapPin size={28} className="mb-2"/>
                      <p className="text-sm">Awaiting GPS ping...</p>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 md:mb-4 border-b pb-2">Shipment Timeline</h3>
                  <TrackingTimeline events={result.eventHistory} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="grid grid-cols-3 gap-2 md:gap-6 w-full max-w-3xl mx-auto px-2 mt-8 md:mt-12">
          {[ { icon: Zap, text: t('landing.feat1Title') }, { icon: Globe, text: t('landing.feat2Title') }, { icon: ShieldCheck, text: t('landing.feat3Title') } ].map((f, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-md border border-white/20 p-2 md:p-6 rounded-xl flex flex-col items-center justify-center text-center">
              <f.icon className="text-[#FF5722] mb-1 md:mb-3" size={20} />
              <span className="text-white text-[9px] sm:text-xs md:text-base font-medium leading-tight">{f.text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
