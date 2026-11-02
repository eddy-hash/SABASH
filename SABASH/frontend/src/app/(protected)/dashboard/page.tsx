"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Coins, Ship, TrendingUp, Boxes } from 'lucide-react';
import ManifestTable from '@/components/ManifestTable';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/context/LanguageContext';
import { useCurrency } from '@/context/CurrencyContext';
import { USD_TO_TZS_RATE } from '@/lib/calculations';

export default function DashboardPage() {
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const [role, setRole] = useState('STAFF');
  const [stats, setStats] = useState<any>({
    totalRevenueUsd: 0, totalRevenueTzs: 0, totalShipments: 0,
    activeShipments: 0, pendingIntake: 0, weeklyGrowth: 0, dailyRevenue: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setRole(JSON.parse(localStorage.getItem('user') || '{}').role || 'STAFF');
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    fetch('/api/shipments/stats', { headers: { Authorization: 'Bearer ' + token } })
      .then(res => res.ok ? res.json() : Promise.reject('API error'))
      .then(data => { setStats(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  const allStats = [
    {
      title: t('dashboard.revenue'),
      value: isLoading ? '...' : (currency === 'USD'
        ? '$' + Number(stats.totalRevenueUsd).toLocaleString(undefined, {maximumFractionDigits: 2})
        : Math.round(stats.totalRevenueTzs).toLocaleString() + ' TZS'),
      icon: Coins, color: 'text-green-600', bg: 'bg-green-100',
      roles: ['ADMIN', 'MANAGER']
    },
    {
      title: t('dashboard.shipments'),
      value: isLoading ? '...' : stats.activeShipments.toString(),
      icon: Ship, color: 'text-[#0F3B66]', bg: 'bg-blue-100',
      roles: ['ADMIN', 'MANAGER', 'STAFF', 'WAREHOUSE']
    },
    {
      title: t('dashboard.pending'),
      value: isLoading ? '...' : stats.pendingIntake.toString(),
      icon: Package, color: 'text-[#FF5722]', bg: 'bg-orange-100',
      roles: ['ADMIN', 'MANAGER', 'STAFF', 'WAREHOUSE']
    },
    {
      title: t('dashboard.growth'),
      value: isLoading ? '...' : (stats.weeklyGrowth >= 0 ? '+' : '') + stats.weeklyGrowth + '%',
      icon: TrendingUp,
      color: stats.weeklyGrowth >= 0 ? 'text-purple-600' : 'text-red-600',
      bg: stats.weeklyGrowth >= 0 ? 'bg-purple-100' : 'bg-red-100',
      roles: ['ADMIN', 'MANAGER']
    },
  ];

  const visibleStats = allStats.filter(s => s.roles.includes(role));
  const chartData = stats.dailyRevenue.length > 0 ? stats.dailyRevenue : [{ name: 'No data', revenue: 0 }];

  return (
    <div className="space-y-6 md:space-y-8 w-full min-w-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-[#0F3B66]">{t('dashboard.title')}</h1>
        {role === 'WAREHOUSE' && <span className="bg-orange-100 text-[#FF5722] text-xs font-bold px-3 py-1 rounded-full flex items-center"><Boxes size={14} className="mr-1"/> Warehouse View</span>}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 w-full">
        {visibleStats.map((stat, i) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white p-3 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center md:space-x-4 w-full overflow-hidden">
            <div className={`p-2 md:p-4 rounded-lg ${stat.bg} ${stat.color} mb-2 md:mb-0 shrink-0`}>
              <stat.icon size={20} className="md:w-6 md:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] md:text-sm text-gray-500 font-medium truncate">{stat.title}</p>
              <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-800 break-words leading-tight">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>
      {role !== 'WAREHOUSE' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 w-full min-w-0 overflow-hidden">
          <h2 className="text-base md:text-lg font-bold text-[#0F3B66] mb-4">{t('dashboard.chartTitle')}</h2>
          <div className="h-52 md:h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FF5722" stopOpacity={0.8}/><stop offset="95%" stopColor="#FF5722" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} width={50} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Tooltip formatter={(value) => '$' + Number(value).toLocaleString()} />
                <Area type="monotone" dataKey="revenue" stroke="#FF5722" fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 w-full min-w-0">
        <h2 className="text-base md:text-lg font-bold text-[#0F3B66] mb-4">{t('dashboard.manifestTitle')}</h2>
        <ManifestTable />
      </div>
    </div>
  );
}
