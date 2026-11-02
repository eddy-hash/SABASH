#!/bin/bash
set -e
cd ~/SaaS/SABASH

echo "🏥 1. Creating Backend Health Check Module..."
mkdir -p backend/src/health

# Health Controller with real diagnostics
cat << 'EOT' > backend/src/health/health.controller.ts
import { Controller, Get, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { User } from '../users/user.entity';
import { Shipment } from '../shipments/shipment.entity';

@Controller('health')
export class HealthController {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Shipment) private shipmentRepo: Repository<Shipment>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private dataSource: DataSource,
  ) {}

  @Get()
  async check() {
    const results: any = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      checks: [],
    };

    // 1. Database Connection
    try {
      await this.dataSource.query('SELECT 1');
      results.checks.push({
        name: 'PostgreSQL Connection',
        status: 'ok',
        message: 'Database is reachable',
      });
    } catch (e: any) {
      results.checks.push({
        name: 'PostgreSQL Connection',
        status: 'error',
        message: e.message,
        fix: 'Check DATABASE_URL in docker-compose.yml. Run: docker compose restart db',
      });
      results.overall = 'unhealthy';
    }

    // 2. Required Tables
    const tables = ['users', 'shipments', 'customers', 'warehouses', 'notifications', 'marketing_visits'];
    try {
      const existingTables = await this.dataSource.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
      );
      const names = existingTables.map((t: any) => t.tablename);
      const missing = tables.filter(t => !names.includes(t));
      
      if (missing.length === 0) {
        results.checks.push({
          name: 'Database Tables',
          status: 'ok',
          message: `All ${tables.length} required tables exist`,
        });
      } else {
        results.checks.push({
          name: 'Database Tables',
          status: 'error',
          message: `Missing tables: ${missing.join(', ')}`,
          fix: 'Reset database: docker volume rm sabash_pgdata && docker compose up -d',
        });
        results.overall = 'unhealthy';
      }
    } catch (e: any) {
      results.checks.push({
        name: 'Database Tables',
        status: 'error',
        message: e.message,
      });
    }

    // 3. Required Columns
    try {
      const requiredColumns: any = {
        users: ['id', 'name', 'email', 'password_hash', 'role'],
        shipments: ['id', 'tracking_code', 'total_cost_usd', 'total_cost_tzs', 'current_lat', 'current_lng', 'event_history'],
      };
      
      let missingCols: string[] = [];
      for (const [table, cols] of Object.entries(requiredColumns)) {
        const dbCols = await this.dataSource.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`
        );
        const dbColNames = dbCols.map((c: any) => c.column_name);
        for (const col of (cols as string[])) {
          if (!dbColNames.includes(col)) missingCols.push(`${table}.${col}`);
        }
      }

      if (missingCols.length === 0) {
        results.checks.push({
          name: 'Database Columns',
          status: 'ok',
          message: 'All required columns exist',
        });
      } else {
        results.checks.push({
          name: 'Database Columns',
          status: 'warning',
          message: `Missing columns: ${missingCols.join(', ')}`,
          fix: 'Some features may not work. Check your init.sql file.',
        });
      }
    } catch (e: any) {
      results.checks.push({
        name: 'Database Columns',
        status: 'warning',
        message: e.message,
      });
    }

    // 4. Unique Constraints
    try {
      const constraints = await this.dataSource.query(
        "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'users' AND constraint_type = 'UNIQUE'"
      );
      const hasEmailUnique = constraints.some((c: any) => c.constraint_name.includes('email'));
      
      results.checks.push({
        name: 'Unique Email Constraint',
        status: hasEmailUnique ? 'ok' : 'warning',
        message: hasEmailUnique ? 'Email uniqueness is enforced' : 'Email uniqueness NOT enforced',
        fix: hasEmailUnique ? undefined : 'Run: ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);',
      });
    } catch (e: any) {
      results.checks.push({
        name: 'Unique Email Constraint',
        status: 'warning',
        message: e.message,
      });
    }

    // 5. Redis Cache
    try {
      await this.cacheManager.set('health_check', 'ok', 5000);
      const val = await this.cacheManager.get('health_check');
      if (val === 'ok') {
        results.checks.push({
          name: 'Redis Cache',
          status: 'ok',
          message: 'Cache is reachable',
        });
      } else {
        throw new Error('Cache write/read failed');
      }
    } catch (e: any) {
      results.checks.push({
        name: 'Redis Cache',
        status: 'warning',
        message: e.message,
        fix: 'Run: docker compose restart redis',
      });
    }

    // 6. Users exist
    try {
      const userCount = await this.userRepo.count();
      const adminCount = await this.userRepo.count({ where: { role: 'ADMIN' as any } });
      
      results.checks.push({
        name: 'Users',
        status: adminCount > 0 ? 'ok' : 'error',
        message: `${userCount} users total, ${adminCount} admins`,
        fix: adminCount === 0 ? 'Reset admin: UPDATE users SET password_hash = crypt(\'Admin123\', gen_salt(\'bf\')) WHERE email = \'admin@sabash.com\';' : undefined,
      });
    } catch (e: any) {
      results.checks.push({
        name: 'Users',
        status: 'error',
        message: e.message,
      });
    }

    // 7. Data Integrity
    try {
      const orphanedShipments = await this.dataSource.query(
        "SELECT COUNT(*) FROM shipments WHERE origin_warehouse_code NOT IN (SELECT code FROM warehouses)"
      );
      
      results.checks.push({
        name: 'Data Integrity',
        status: parseInt(orphanedShipments[0].count) === 0 ? 'ok' : 'warning',
        message: parseInt(orphanedShipments[0].count) === 0 
          ? 'No orphaned shipments' 
          : `${orphanedShipments[0].count} shipments reference invalid warehouses`,
      });
    } catch (e: any) {
      results.checks.push({
        name: 'Data Integrity',
        status: 'warning',
        message: e.message,
      });
    }

    // 8. Counts summary
    try {
      const shipmentCount = await this.shipmentRepo.count();
      const customerCount = await this.dataSource.query("SELECT COUNT(*) FROM customers");
      
      results.summary = {
        users: await this.userRepo.count(),
        shipments: shipmentCount,
        customers: parseInt(customerCount[0].count),
      };
    } catch (e: any) {
      results.summary = { error: e.message };
    }

    return results;
  }
}
EOT

# Health Module
cat << 'EOT' > backend/src/health/health.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { User } from '../users/user.entity';
import { Shipment } from '../shipments/shipment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Shipment])],
  controllers: [HealthController],
})
export class HealthModule {}
EOT

# Register in AppModule
node -e "
const fs = require('fs');
const path = 'backend/src/app.module.ts';
let content = fs.readFileSync(path, 'utf8');
if (!content.includes('HealthModule')) {
  content = content.replace(
    'import { UsersModule }',
    'import { HealthModule } from \"./health/health.module\";\nimport { UsersModule }'
  );
  content = content.replace(
    'UsersModule,',
    'UsersModule,\n    HealthModule,'
  );
  fs.writeFileSync(path, content);
}
"

echo "✅ Backend health module added"

echo ""
echo "🎨 2. Creating Frontend Health Dashboard..."
mkdir -p "frontend/src/app/(protected)/health"

cat << 'EOT' > "frontend/src/app/(protected)/health/page.tsx"
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
EOT

echo "✅ Health dashboard UI created"

echo ""
echo "🔗 3. Adding Health link to Sidebar..."
node -e "
const fs = require('fs');
const path = 'frontend/src/components/Sidebar.tsx';
let content = fs.readFileSync(path, 'utf8');
if (!content.includes('/health')) {
  content = content.replace(
    \"import { LayoutDashboard, PackagePlus, Users, LogOut, X, Contact, Store }\",
    \"import { LayoutDashboard, PackagePlus, Users, LogOut, X, Contact, Store, Activity }\"
  );
  content = content.replace(
    \"{ name: t('nav.users'), icon: Users, path: '/users', roles: ['ADMIN'] },\",
    \"{ name: 'System Health', icon: Activity, path: '/health', roles: ['ADMIN'] },\n    { name: t('nav.users'), icon: Users, path: '/users', roles: ['ADMIN'] },\"
  );
  fs.writeFileSync(path, content);
}
"

echo "✅ Health link added to sidebar (Admin only)"

echo ""
echo "🐳 4. Rebuilding Stack..."
sudo docker compose build --no-cache backend frontend
sudo docker compose up -d backend frontend
sudo docker compose restart nginx
sleep 10

echo ""
echo "═══════ TEST HEALTH API ═══════"
curl -s http://localhost/api/health | head -c 800
echo ""
echo ""
echo "✅ HEALTH CHECK SYSTEM DEPLOYED!"
echo ""
echo "📱 Access it at: http://YOUR_IP/health (login as admin first)"
