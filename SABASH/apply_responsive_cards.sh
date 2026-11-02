#!/bin/bash
set -e
cd ~/SaaS/SABASH

echo "📱 1. Updating Dashboard Cards..."
cat << 'EOT' > "frontend/src/app/(protected)/dashboard/page.tsx"
"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, DollarSign, Ship, TrendingUp, Boxes } from 'lucide-react';
import ManifestTable from '@/components/ManifestTable';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/context/LanguageContext';

export default function DashboardPage() {
  const { t } = useLanguage();
  const [role, setRole] = useState('STAFF');

  useEffect(() => { setRole(JSON.parse(localStorage.getItem('user') || '{}').role || 'STAFF'); }, []);

  const allStats = [
    { title: t('dashboard.revenue'), value: '$18,450', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100', roles: ['ADMIN', 'MANAGER'] },
    { title: t('dashboard.shipments'), value: '124', icon: Ship, color: 'text-[#0F3B66]', bg: 'bg-blue-100', roles: ['ADMIN', 'MANAGER', 'STAFF', 'WAREHOUSE'] },
    { title: t('dashboard.pending'), value: '12', icon: Package, color: 'text-[#FF5722]', bg: 'bg-orange-100', roles: ['ADMIN', 'MANAGER', 'STAFF', 'WAREHOUSE'] },
    { title: t('dashboard.growth'), value: '+14.5%', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100', roles: ['ADMIN', 'MANAGER'] },
  ];
  const visibleStats = allStats.filter(s => s.roles.includes(role));

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-[#0F3B66]">{t('dashboard.title')}</h1>
        {role === 'WAREHOUSE' && <span className="bg-orange-100 text-[#FF5722] text-xs font-bold px-3 py-1 rounded-full flex items-center"><Boxes size={14} className="mr-1"/> Warehouse View</span>}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {visibleStats.map((stat, i) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 w-full">
            <div className={`p-3 md:p-4 rounded-lg ${stat.bg} ${stat.color}`}><stat.icon size={24} /></div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 font-medium">{stat.title}</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-800">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {role !== 'WAREHOUSE' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 w-full">
          <h2 className="text-base md:text-lg font-bold text-[#0F3B66] mb-4">{t('dashboard.chartTitle')}</h2>
          <div className="h-64 md:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[{name: 'Mon', revenue: 4000}, {name: 'Tue', revenue: 3000}, {name: 'Wed', revenue: 2000}, {name: 'Thu', revenue: 2780}, {name: 'Fri', revenue: 1890}]}>
                <defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FF5722" stopOpacity={0.8}/><stop offset="95%" stopColor="#FF5722" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} /><YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} width={40} /><CartesianGrid strokeDasharray="3 3" vertical={false} /><Tooltip /><Area type="monotone" dataKey="revenue" stroke="#FF5722" fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 w-full">
        <h2 className="text-base md:text-lg font-bold text-[#0F3B66] mb-4">{t('dashboard.manifestTitle')}</h2>
        <ManifestTable />
      </div>
    </div>
  );
}
EOT

echo "📱 2. Updating Intake Form Cards..."
cat << 'EOT' > "frontend/src/app/(protected)/intake/page.tsx"
"use client";
import { useState } from 'react';
import { calculateSeaFreight, calculateAirFreight } from '@/lib/calculations';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function IntakePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [formData, setFormData] = useState({
    trackingCode: '', customerName: '', customerPhone: '+255', freightType: 'sea', originWarehouseCode: 'CN',
    lengthCm: '', widthCm: '', heightCm: '', weightKg: ''
  });
  const [calc, setCalc] = useState({ cbm: 0, billable: 0, cost: 0 });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    liveCalculate({ ...formData, [name]: value });
  };

  const liveCalculate = (data: typeof formData) => {
    if (data.freightType === 'sea') {
      const res = calculateSeaFreight(Number(data.lengthCm), Number(data.widthCm), Number(data.heightCm));
      setCalc({ cbm: res.cbm, billable: 0, cost: res.cost });
    } else {
      const res = calculateAirFreight(Number(data.lengthCm), Number(data.widthCm), Number(data.heightCm), Number(data.weightKg));
      setCalc({ cbm: 0, billable: res.billableWeight, cost: res.cost });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    const payload = {
      ...formData, lengthCm: Number(formData.lengthCm), widthCm: Number(formData.widthCm),
      heightCm: Number(formData.heightCm), weightKg: Number(formData.weightKg),
      calculatedCbm: calc.cbm, billableWeightKg: calc.billable, totalCostUsd: calc.cost
    };
    try {
      const res = await fetch('/api/shipments', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (res.ok) { toast.success(t('form.success')); router.push('/dashboard'); } else { throw new Error(t('form.error')); }
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-8 mt-4 md:mt-8 border-t-4 border-t-[#FF5722]">
      <h2 className="text-xl md:text-2xl font-bold text-[#0F3B66] mb-6">{t('nav.intake')}</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-4">
          <input type="text" name="trackingCode" placeholder={t('form.trackingCode')} required onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" />
          <input type="text" name="customerName" placeholder={t('form.customerName')} required onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" />
          <input type="text" name="customerPhone" value={formData.customerPhone} required onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" />
          <select name="freightType" onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#FF5722] outline-none">
            <option value="sea">{t('form.sea')}</option>
            <option value="air">{t('form.air')}</option>
          </select>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input type="number" name="lengthCm" placeholder="L (CM)" required onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" />
            <input type="number" name="widthCm" placeholder="W (CM)" required onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" />
            <input type="number" name="heightCm" placeholder="H (CM)" required onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" />
            <input type="number" name="weightKg" placeholder="KG" required onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" />
          </div>
          
          <div className="bg-[#0F3B66] text-white p-5 rounded-lg flex flex-col sm:flex-row justify-between items-center shadow-lg">
            <div className="mb-2 sm:mb-0 text-center sm:text-left">
              {formData.freightType === 'sea' 
                ? <p className="text-sm text-gray-300">{t('form.cbm')}: <span className="text-lg font-bold text-[#FF5722] ml-1">{calc.cbm}</span></p> 
                : <p className="text-sm text-gray-300">{t('form.billableWeight')}: <span className="text-lg font-bold text-[#FF5722] ml-1">{calc.billable}</span></p>}
            </div>
            <div className="text-center sm:text-right">
              <p className="text-xs text-gray-300 uppercase tracking-wider">{t('form.totalCost')}</p>
              <p className="text-3xl font-bold text-[#FF5722]">${calc.cost}</p>
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
EOT

echo "📱 3. Updating Clients List Cards..."
cat << 'EOT' > "frontend/src/app/(protected)/clients/page.tsx"
"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, UserPlus, Building2, Phone } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export default function ClientsListPage() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const fetchCustomers = async () => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    try {
      const res = await fetch(`/api/customers?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setCustomers(await res.json());
    } catch (e) {}
  };

  useEffect(() => { fetchCustomers(); }, []);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || (c.company && c.company.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-[#0F3B66]">{t('clients.title')}</h1>
        <Link href="/clients/new" className="w-full sm:w-auto bg-[#FF5722] text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:bg-orange-600 transition-colors flex justify-center items-center">
          <UserPlus size={18} className="mr-2" /> {t('clients.register')}
        </Link>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input type="text" placeholder={t('clients.search')} value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none text-sm shadow-sm" />
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden space-y-4">
        {filteredCustomers.length === 0 ? (
          <p className="text-center text-gray-400 py-8 bg-white rounded-xl shadow-sm">{t('clients.noClients')}</p>
        ) : (
          filteredCustomers.map(c => (
            <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-2">
              <p className="font-bold text-[#0F3B66] text-lg">{c.name}</p>
              <p className="text-sm text-gray-600 flex items-center"><Phone size={14} className="mr-2 text-[#FF5722]"/> {c.phone}</p>
              {c.company && <p className="text-sm text-gray-600 flex items-center"><Building2 size={14} className="mr-2 text-[#FF5722]"/> {c.company}</p>}
              {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm text-left text-gray-600 whitespace-nowrap">
            <thead className="text-xs text-white uppercase bg-[#0F3B66]">
              <tr>
                <th className="px-4 py-3">{t('clients.name')}</th>
                <th className="px-4 py-3">{t('clients.contact')}</th>
                <th className="px-4 py-3">{t('clients.company')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-[#0F3B66]">{c.name}</td>
                  <td className="px-4 py-3">{c.phone}<br/><span className="text-xs text-gray-400">{c.email || '-'}</span></td>
                  <td className="px-4 py-3">{c.company || '-'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
EOT

echo "📱 4. Updating Users List Cards..."
cat << 'EOT' > "frontend/src/app/(protected)/users/page.tsx"
"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { UserPlus, Shield, User as UserIcon, Lock } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export default function UsersListPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const fetchUsers = async () => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    try {
      const res = await fetch(`/api/users?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setUsers(await res.json());
    } catch (e) {}
  };

  useEffect(() => {
    if (JSON.parse(localStorage.getItem('user') || '{}').role === 'ADMIN') { setIsAuthorized(true); fetchUsers(); }
    else router.push('/dashboard');
  }, [router]);

  if (!isAuthorized) return <div className="flex h-[80vh] items-center justify-center"><Lock size={48} className="text-red-400 animate-pulse" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl md:text-3xl font-bold text-[#0F3B66]">{t('users.title')}</h1>
          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full border border-red-200 flex items-center"><Shield size={12} className="mr-1"/> {t('users.adminAccess')}</span>
        </div>
        <Link href="/users/new" className="w-full sm:w-auto bg-[#FF5722] text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:bg-orange-600 transition-colors flex justify-center items-center">
          <UserPlus size={18} className="mr-2" /> {t('users.register')}
        </Link>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden space-y-4">
        {users.map(u => (
          <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <p className="font-bold text-[#0F3B66] text-lg flex items-center"><UserIcon size={16} className="mr-2 text-gray-400"/> {u.name}</p>
              <span className={`px-2 py-1 rounded text-xs font-bold flex items-center ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                <Shield size={12} className="mr-1"/> {u.role}
              </span>
            </div>
            <p className="text-sm text-gray-500">{u.email}</p>
          </div>
        ))}
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-[#0F3B66] mb-6">{t('users.team')}</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm text-left text-gray-600 whitespace-nowrap">
            <thead className="text-xs text-white uppercase bg-[#0F3B66]">
              <tr>
                <th className="px-4 py-3">{t('users.name')}</th>
                <th className="px-4 py-3">{t('users.email')}</th>
                <th className="px-4 py-3">{t('users.role')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <motion.tr key={u.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-[#0F3B66] flex items-center"><UserIcon size={16} className="mr-2 text-gray-400"/> {u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold flex items-center w-fit ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      <Shield size={12} className="mr-1"/> {u.role}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
EOT

echo "🐳 Rebuilding Frontend..."
sudo docker compose build frontend
sudo docker compose up -d frontend
echo "✅ Done!"
