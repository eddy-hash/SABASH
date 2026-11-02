"use client";
import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Phone, MapPin } from 'lucide-react';
import TrackingModal from './TrackingModal';

export default function ManifestTable() {
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const [shipments, setShipments] = useState<any[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);

  const fetchShipments = () => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    fetch('/api/shipments', { headers: { Authorization: 'Bearer ' + token } })
      .then(res => res.json())
      .then(data => setShipments(Array.isArray(data) ? data : []));
  };

  useEffect(() => { fetchShipments(); }, []);

  const openTracking = (shipment: any) => {
    setSelectedShipment(shipment);
    setIsTrackModalOpen(true);
  };

  const generateWhatsAppLink = (shipment: any) => {
    const phone = shipment.customerPhone.replace(/[^0-9]/g, '');
    const costText = currency === 'USD' ? '$' + shipment.totalCostUsd + ' (' + shipment.totalCostTzs + ' TZS)' : shipment.totalCostTzs + ' TZS ($' + shipment.totalCostUsd + ')';
    const message = t('whatsapp.message', { name: shipment.customerName, tracking: shipment.trackingCode, cost: costText });
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
  };

  const formatCost = (s: any) => {
    if (currency === 'USD') return <><span>${s.totalCostUsd}</span><br/><span className="text-xs text-gray-500">{s.totalCostTzs} TZS</span></>;
    return <><span>{s.totalCostTzs} TZS</span><br/><span className="text-xs text-gray-500">${s.totalCostUsd}</span></>;
  };

  return (
    <>
      <div className="md:hidden space-y-3">
        {shipments.length === 0 ? <p className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg">{t('dashboard.noShipments')}</p> : shipments.map((s) => (
          <div key={s.id} className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#0F3B66] text-base">{s.trackingCode}</span>
              <span className={'px-2 py-1 rounded text-[10px] font-bold ' + (s.status === 'Arrived Dar' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-[#FF5722]')}>{t('status.' + s.status)}</span>
            </div>
            <div className="text-sm text-gray-700 font-medium">{s.customerName}</div>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span className="flex items-center"><Phone size={12} className="mr-1"/> {s.customerPhone}</span>
              <span className="font-bold text-[#FF5722] text-right">{formatCost(s)}</span>
            </div>
            <div className="flex space-x-2 mt-2">
              <button onClick={() => openTracking(s)} className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-xs font-bold flex justify-center items-center shadow-sm hover:bg-blue-600 transition-colors">
                <MapPin size={14} className="mr-1"/> Track
              </button>
              <a href={generateWhatsAppLink(s)} target="_blank" rel="noreferrer" className="flex-1 bg-green-500 text-white py-2 rounded-lg text-xs font-bold flex justify-center items-center shadow-sm hover:bg-green-600 transition-colors">
                {t('table.notify')}
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto w-full rounded-lg border border-gray-200">
        <table className="w-full text-sm text-left text-gray-600 whitespace-nowrap">
          <thead className="text-xs text-white uppercase bg-[#0F3B66]">
            <tr><th className="px-6 py-4">{t('table.tracking')}</th><th className="px-6 py-4">{t('table.customer')}</th><th className="px-6 py-4">{t('table.status')}</th><th className="px-6 py-4">{t('table.cost')}</th><th className="px-6 py-4">{t('table.action')}</th></tr>
          </thead>
          <tbody>
            {shipments.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-400 bg-gray-50">{t('dashboard.noShipments')}</td></tr> : shipments.map((s) => (
              <tr key={s.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-bold text-[#0F3B66]">{s.trackingCode}</td>
                <td className="px-6 py-4">{s.customerName}<br/><span className="text-xs text-gray-400 font-mono">{s.customerPhone}</span></td>
                <td className="px-6 py-4"><span className={'px-2.5 py-1 rounded-md text-xs font-bold ' + (s.status === 'Arrived Dar' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-[#FF5722]')}>{t('status.' + s.status)}</span></td>
                <td className="px-6 py-4 font-bold text-[#FF5722]">{formatCost(s)}</td>
                <td className="px-6 py-4 flex space-x-2">
                  <button onClick={() => openTracking(s)} className="bg-blue-500 text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-sm hover:bg-blue-600 transition-colors flex items-center">
                    <MapPin size={14} className="mr-1"/> Track
                  </button>
                  <a href={generateWhatsAppLink(s)} target="_blank" rel="noreferrer" className="bg-green-500 text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-sm hover:bg-green-600 transition-colors">{t('table.notify')}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TrackingModal isOpen={isTrackModalOpen} onClose={() => setIsTrackModalOpen(false)} shipment={selectedShipment} />
    </>
  );
}
