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
