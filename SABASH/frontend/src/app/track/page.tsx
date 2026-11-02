"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, PackageSearch, MapPin, Truck, CheckCircle2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const TrackingMap = dynamic(() => import('@/components/TrackingMap'), { ssr: false, loading: () => <div className="h-[300px] bg-gray-100 rounded-xl flex items-center justify-center">Loading Map...</div> });

export default function PublicTrackingPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/shipments/track/' + code.toUpperCase());
      if (!res.ok) throw new Error('Tracking number not found. Please check and try again.');
      setResult(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <PackageSearch size={48} className="mx-auto text-[#0F3B66] mb-4" />
          <h1 className="text-3xl font-bold text-[#0F3B66]">Track Your Cargo</h1>
          <p className="text-gray-500 mt-2">Enter your Sabash tracking number below.</p>
        </div>

        <form onSubmit={handleTrack} className="flex shadow-sm">
          <input 
            type="text" 
            placeholder="e.g. SAB-CN-8X2A" 
            value={code} 
            onChange={e => setCode(e.target.value)} 
            required
            className="flex-1 p-4 border border-r-0 border-gray-300 rounded-l-xl focus:ring-2 focus:ring-[#FF5722] outline-none text-lg uppercase"
          />
          <button type="submit" disabled={isLoading} className="bg-[#FF5722] text-white px-8 rounded-r-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center">
            {isLoading ? 'Searching...' : <><Search size={20} className="mr-2"/> Track</>}
          </button>
        </form>

        {error && <p className="text-red-500 text-center mt-4 font-medium">{error}</p>}

        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-[#0F3B66] p-6 text-white">
              <p className="text-sm text-gray-300">Tracking Number</p>
              <h2 className="text-2xl font-bold">{result.trackingCode}</h2>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Current Status</p>
                <div className="flex items-center text-lg font-bold text-[#FF5722]">
                  {result.status === 'Delivered' ? <CheckCircle2 className="mr-2" size={24}/> : <Truck className="mr-2" size={24}/>}
                  {result.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Customer</p>
                  <p className="font-medium">{result.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Origin</p>
                  <p className="font-medium">{result.origin}</p>
                </div>
              </div>

              {result.lat && result.lng && (
                <div>
                  <p className="text-sm text-gray-500 mb-2 flex items-center"><MapPin size={16} className="mr-1"/> Live Location</p>
                  <TrackingMap lat={Number(result.lat)} lng={Number(result.lng)} trackingCode={result.trackingCode} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
