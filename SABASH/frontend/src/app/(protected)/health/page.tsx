"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, 
  Database, Server, Activity, Shield, Package
} from 'lucide-react';

export default function HealthPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHealth = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchHealth(); }, []);

  const getStatusIcon = (status: string) => {
    if (status === 'ok') return <CheckCircle2 className="text-green-500" size={24} />;
    if (status === 'warning') return <AlertTriangle className="text-yellow-500" size={24} />;
    return <XCircle className="text-red-500" size={24} />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'ok') return 'bg-green-50 border-green-200';
    if (status === 'warning') return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0F3B66] flex items-center">
            <Activity className="mr-2" /> System Health
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {data ? `Last check: ${new Date(data.timestamp).toLocaleString()}` : 'Running diagnostics...'}
          </p>
        </div>
        <button 
          onClick={fetchHealth}
          disabled={isLoading}
          className="bg-[#FF5722] text-white font-bold py-2.5 px-6 rounded-lg hover:bg-orange-600 transition-colors flex items-center disabled:opacity-50"
        >
          <RefreshCw size={18} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Checking...' : 'Re-run Check'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700">
          <p className="font-bold">Failed to run health check</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {data && (
        <>
          {/* Overall Status */}
          <div className={`p-6 rounded-xl border-2 ${
            data.overall === 'healthy' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
          }`}>
            <div className="flex items-center">
              {data.overall === 'healthy' 
                ? <CheckCircle2 className="text-green-600 mr-3" size={36} />
                : <XCircle className="text-red-600 mr-3" size={36} />
              }
              <div>
                <p className="text-lg font-bold">
                  {data.overall === 'healthy' ? 'All Systems Operational' : 'Critical Issues Detected'}
                </p>
                <p className="text-sm text-gray-600">
                  {data.checks.filter((c: any) => c.status === 'ok').length} of {data.checks.length} checks passed
                </p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {data.summary && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                <p className="text-xs text-gray-500 uppercase">Users</p>
                <p className="text-2xl font-bold text-[#0F3B66]">{data.summary.users}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                <p className="text-xs text-gray-500 uppercase">Shipments</p>
                <p className="text-2xl font-bold text-[#0F3B66]">{data.summary.shipments}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                <p className="text-xs text-gray-500 uppercase">Customers</p>
                <p className="text-2xl font-bold text-[#0F3B66]">{data.summary.customers}</p>
              </div>
            </div>
          )}

          {/* Detailed Checks */}
          <div className="space-y-3">
            {data.checks.map((check: any, i: number) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`p-4 rounded-xl border ${getStatusColor(check.status)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">{getStatusIcon(check.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-bold text-gray-800">{check.name}</p>
                      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                        check.status === 'ok' ? 'bg-green-100 text-green-700' :
                        check.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {check.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 break-words">{check.message}</p>
                    {check.fix && (
                      <div className="mt-2 p-2 bg-white/60 rounded border border-gray-200">
                        <p className="text-xs font-bold text-gray-700 mb-1">💡 HOW TO FIX:</p>
                        <code className="text-xs text-[#0F3B66] break-all">{check.fix}</code>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {isLoading && !data && (
        <div className="text-center py-12">
          <RefreshCw className="animate-spin mx-auto text-[#0F3B66]" size={48} />
          <p className="text-gray-500 mt-4">Running diagnostics...</p>
        </div>
      )}
    </div>
  );
}
