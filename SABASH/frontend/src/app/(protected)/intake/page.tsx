"use client";
import { useState } from 'react';
import { calculateSeaFreight, calculateAirFreight } from '@/lib/calculations';
import { useLanguage } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Ship, Plane, Scale, Box } from 'lucide-react';

export default function IntakePage() {
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const router = useRouter();
  
  const [formData, setFormData] = useState({ 
    customerName: '', customerPhone: '+255', 
    freightType: 'sea', originWarehouseCode: 'CN', 
    lengthCm: '', widthCm: '', heightCm: '', weightKg: '' 
  });
  
  const [calc, setCalc] = useState({ cbm: 0, weight: 0, costUsd: 0, costTzs: 0 });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    liveCalculate({ ...formData, [name]: value });
  };

  const setFreightType = (type: 'sea' | 'air') => {
    setFormData(prev => ({ ...prev, freightType: type }));
    liveCalculate({ ...formData, freightType: type });
  };

  const liveCalculate = (data: typeof formData) => {
    if (data.freightType === 'sea') {
      const res = calculateSeaFreight(Number(data.lengthCm), Number(data.widthCm), Number(data.heightCm));
      setCalc({ cbm: res.cbm, weight: 0, costUsd: res.costUsd, costTzs: res.costTzs });
    } else {
      const res = calculateAirFreight(Number(data.weightKg));
      setCalc({ cbm: 0, weight: res.weight, costUsd: res.costUsd, costTzs: res.costTzs });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    
    const payload = { 
      ...formData, 
      lengthCm: formData.freightType === 'sea' ? Number(formData.lengthCm) : 0, 
      widthCm: formData.freightType === 'sea' ? Number(formData.widthCm) : 0, 
      heightCm: formData.freightType === 'sea' ? Number(formData.heightCm) : 0, 
      weightKg: formData.freightType === 'air' ? Number(formData.weightKg) : 0, 
      calculatedCbm: formData.freightType === 'sea' ? calc.cbm : 0, 
      billableWeightKg: formData.freightType === 'air' ? calc.weight : 0, 
      totalCostUsd: calc.costUsd, 
      totalCostTzs: calc.costTzs 
    };

    try {
      const res = await fetch('/api/shipments', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (res.ok) { toast.success(t('form.success')); router.push('/dashboard'); } else { throw new Error(t('form.error')); }
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-8 mt-4 md:mt-8 border-t-4 border-t-[#FF5722]">
      
      {/* Freight Type Toggle */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
        <button type="button" onClick={() => setFreightType('sea')} className={`flex-1 py-2.5 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${formData.freightType === 'sea' ? 'bg-[#0F3B66] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
          <Ship size={18} className="mr-2"/> {t('form.sea')} (CBM)
        </button>
        <button type="button" onClick={() => setFreightType('air')} className={`flex-1 py-2.5 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${formData.freightType === 'air' ? 'bg-[#0F3B66] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
          <Plane size={18} className="mr-2"/> {t('form.air')} (KG)
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        
        {/* Common Customer Details */}
        <div className="space-y-4">
          
          <input type="text" name="customerName" placeholder={t('form.customerName')} required onChange={handleInputChange} className="w-full p-3.5 border border-gray-300 text-base rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" />
          <input type="text" name="customerPhone" value={formData.customerPhone} required onChange={handleInputChange} className="w-full p-3.5 border border-gray-300 text-base rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" />
        </div>
        
        {/* Dynamic Freight Details */}
        <div className="space-y-4">
          
          {/* SEA: Show ONLY Dimensions */}
          {formData.freightType === 'sea' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="text-xs text-gray-500 mb-1 block">Box Dimensions (For CBM)</label>
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                <input type="number" name="lengthCm" placeholder="L (CM)" required onChange={handleInputChange} className="w-full p-3.5 border border-gray-300 text-base rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none text-sm" />
                <input type="number" name="widthCm" placeholder="W (CM)" required onChange={handleInputChange} className="w-full p-3.5 border border-gray-300 text-base rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none text-sm" />
                <input type="number" name="heightCm" placeholder="H (CM)" required onChange={handleInputChange} className="w-full p-3.5 border border-gray-300 text-base rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none text-sm" />
              </div>
            </div>
          )}
          
          {/* AIR: Show ONLY Weight */}
          {formData.freightType === 'air' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="text-xs text-gray-500 mb-1 block">Actual Weight (KG)</label>
              <div className="relative">
                <Scale className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input type="number" name="weightKg" placeholder="Enter Weight in KG" required onChange={handleInputChange} className="w-full pl-10 p-3.5 border border-gray-300 text-base rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" />
              </div>
            </div>
          )}

          {/* CALCULATION RESULT PANEL */}
          <div className="bg-[#0F3B66] text-white p-5 rounded-lg flex flex-col sm:flex-row justify-between items-center shadow-lg">
            <div className="mb-3 sm:mb-0 text-center sm:text-left">
              {formData.freightType === 'sea' ? (
                <p className="text-sm text-gray-300">Total Volume: <span className="text-lg font-bold text-[#FF5722] ml-1">{calc.cbm} CBM</span></p>
              ) : (
                <p className="text-sm text-gray-300">Total Weight: <span className="text-lg font-bold text-[#FF5722] ml-1">{calc.weight} KG</span></p>
              )}
            </div>
            <div className="text-center sm:text-right">
              <p className="text-xs text-gray-300 uppercase tracking-wider">{t('form.totalCost')}</p>
              {currency === 'USD' ? (
                <><p className="text-2xl font-bold text-white">${calc.costUsd.toLocaleString()}</p><p className="text-sm font-medium text-[#FF5722]">{Math.round(calc.costTzs).toLocaleString()} TZS</p></>
              ) : (
                <><p className="text-2xl font-bold text-white">{Math.round(calc.costTzs).toLocaleString()} TZS</p><p className="text-sm font-medium text-[#FF5722]">${calc.costUsd.toLocaleString()}</p></>
              )}
            </div>
          </div>

          <button type="submit" className="w-full bg-[#FF5722] text-white font-bold py-3.5 rounded-lg shadow-md hover:bg-orange-600 transition-colors">
            {t('form.calculate')}
          </button>
        </div>
      </form>
    </div>
  );
}
