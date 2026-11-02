"use client";
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';

const TrackingMap = dynamic(() => import('./TrackingMap'), { ssr: false, loading: () => <div className="h-[300px] md:h-[400px] flex items-center justify-center bg-gray-100 rounded-xl">Loading Map...</div> });

export default function TrackingModal({ isOpen, onClose, shipment }: { isOpen: boolean, onClose: () => void, shipment: any }) {
  const [lat, setLat] = useState(shipment?.currentLat ? Number(shipment.currentLat) : -6.7924);
  const [lng, setLng] = useState(shipment?.currentLng ? Number(shipment.currentLng) : 39.2083);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!shipment) return null;

  const handleUpdateLocation = async (newLat: number, newLng: number) => {
    setIsUpdating(true);
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    try {
      const res = await fetch('/api/shipments/' + shipment.id + '/location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ lat: newLat, lng: newLng })
      });
      if (!res.ok) throw new Error('Failed to update location');
      setLat(newLat);
      setLng(newLng);
      toast.success('Location updated successfully!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const simulateMovement = () => {
    const newLat = lat + (Math.random() - 0.5) * 0.5;
    const newLng = lng + (Math.random() - 0.5) * 0.5;
    handleUpdateLocation(newLat, newLng);
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
            className="w-full max-w-2xl bg-white rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl overflow-hidden relative"
          >
            <div className="bg-[#0F3B66] p-4 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold flex items-center"><MapPin className="mr-2" size={20}/> Track Cargo: {shipment.trackingCode}</h2>
              <button onClick={onClose} className="text-gray-300 hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="p-4 space-y-4">
              <TrackingMap lat={lat} lng={lng} trackingCode={shipment.trackingCode} />
              
              <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 gap-3">
                <div className="text-sm text-gray-600 text-center sm:text-left">
                  <p><strong>Latitude:</strong> {lat.toFixed(4)}</p>
                  <p><strong>Longitude:</strong> {lng.toFixed(4)}</p>
                </div>
                <button onClick={simulateMovement} disabled={isUpdating} className="bg-[#FF5722] text-white px-4 py-2 rounded-lg font-bold flex items-center hover:bg-orange-600 transition-colors disabled:opacity-50">
                  <Navigation size={16} className="mr-2" /> {isUpdating ? 'Updating...' : 'Simulate Movement'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
