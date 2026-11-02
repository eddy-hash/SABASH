#!/bin/bash
set -e
cd ~/SaaS/SABASH

echo "🔐 1. Updating Backend Auth (Public Tracking Route)..."
# 1. Allow public tracking route bypass
cat << 'EOT' > backend/src/auth/auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, SetMetadata, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [context.getHandler(), context.getClass()]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) throw new ForbiddenException('Invalid token');
    return requiredRoles.includes(user.role);
  }
}
EOT

echo "📦 2. Auto-Generating Tracking Codes in Backend..."
# Update Service
cat << 'EOT' > backend/src/shipments/shipments.service.ts
import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Shipment } from './shipment.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment) private shipmentsRepository: Repository<Shipment>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private notificationService: NotificationsService,
  ) {}

  async findAll(): Promise<Shipment[]> {
    const CACHE_KEY = 'all_shipments_manifest';
    const cachedData = await this.cacheManager.get<Shipment[]>(CACHE_KEY);
    if (cachedData) return cachedData;
    const shipments = await this.shipmentsRepository.find({ order: { createdAt: 'DESC' }, take: 100 });
    await this.cacheManager.set(CACHE_KEY, shipments, 30000);
    return shipments;
  }

  async findOneByCode(code: string): Promise<Shipment | null> {
    return this.shipmentsRepository.findOne({ where: { trackingCode: code } });
  }

  async create(data: DeepPartial<Shipment>, userId: string): Promise<Shipment> {
    try {
      // AUTO GENERATE TRACKING CODE: SAB-{Origin}-{4 Random Hex}
      const origin = data.originWarehouseCode || 'CN';
      const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
      const generatedCode = \`SAB-\${origin}-\${randomHex}\`;

      const shipment = this.shipmentsRepository.create({ ...data, trackingCode: generatedCode });
      const savedShipment = (await this.shipmentsRepository.save(shipment)) as Shipment;
      
      await this.cacheManager.del('all_shipments_manifest');
      
      await this.notificationService.create({
        userId,
        title: 'New Shipment Registered',
        message: \`Tracking: \${savedShipment.trackingCode} for \${savedShipment.customerName}\`
      });

      return savedShipment;
    } catch (error) {
      if (error.code === '23505') throw new ConflictException('Tracking code collision, please try again');
      throw error;
    }
  }

  async updateLocation(id: string, lat: number, lng: number) {
    await this.shipmentsRepository.update(id, { currentLat: lat, currentLng: lng });
    await this.cacheManager.del('all_shipments_manifest');
    return { success: true };
  }
}
EOT

# Update Controller
cat << 'EOT' > backend/src/shipments/shipments.controller.ts
import { Controller, Get, Post, Body, UseGuards, Req, Patch, Param, NotFoundException } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { Shipment } from './shipment.entity';
import { JwtAuthGuard, RolesGuard, Roles, Public } from '../auth/auth.guard';

@Controller('shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  findAll(): Promise<Shipment[]> {
    return this.shipmentsService.findAll();
  }

  // PUBLIC ENDPOINT FOR CLIENTS
  @Get('track/:code')
  @Public()
  async trackByCode(@Param('code') code: string) {
    const shipment = await this.shipmentsService.findOneByCode(code);
    if (!shipment) throw new NotFoundException('Tracking number not found');
    // Return limited info for clients
    return {
      trackingCode: shipment.trackingCode,
      status: shipment.status,
      customerName: shipment.customerName,
      origin: shipment.originWarehouseCode,
      lat: shipment.currentLat,
      lng: shipment.currentLng,
      date: shipment.createdAt
    };
  }

  @Post()
  @Roles('ADMIN', 'MANAGER', 'STAFF', 'WAREHOUSE')
  create(@Body() createShipmentDto: Partial<Shipment>, @Req() req: any): Promise<Shipment> {
    createShipmentDto.createdBy = req.user.userId;
    return this.shipmentsService.create(createShipmentDto, req.user.userId);
  }

  @Patch(':id/location')
  @Roles('ADMIN', 'MANAGER', 'STAFF', 'WAREHOUSE')
  updateLocation(@Param('id') id: string, @Body() body: { lat: number, lng: number }) {
    return this.shipmentsService.updateLocation(id, body.lat, body.lng);
  }
}
EOT

echo "🎨 3. Removing Manual Tracking Code Input from Intake..."
node -e "
const fs = require('fs');
const path = 'frontend/src/app/(protected)/intake/page.tsx';
let content = fs.readFileSync(path, 'utf8');
// Remove the tracking code input field from the JSX
content = content.replace(/<input type=\"text\" name=\"trackingCode\"[^>]*\/>/g, '');
// Remove trackingCode from initial state
content = content.replace(/trackingCode: '', /g, '');
fs.writeFileSync(path, content);
"

echo "🛡️ 4. Adding Password Strength Validator..."
cat << 'EOT' > frontend/src/components/PasswordStrength.tsx
"use client";

export default function PasswordStrength({ password }: { password: string }) {
  const getStrength = () => {
    let score = 0;
    if (!password) return { score, label: '', color: 'bg-gray-200' };
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500', text: 'text-red-500' };
    if (score === 3 || score === 4) return { score, label: 'Medium', color: 'bg-yellow-500', text: 'text-yellow-500' };
    return { score, label: 'Strong', color: 'bg-green-500', text: 'text-green-500' };
  };

  const { score, label, color, text } = getStrength();

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">Password Strength</span>
        <span className={\`text-xs font-bold \${text}\`}>{label}</span>
      </div>
      <div className="flex space-x-1 h-1.5">
        {[1, 2, 3, 4, 5].map((step) => (
          <div key={step} className={\`flex-1 rounded-full \${step <= score ? color : 'bg-gray-200'}\`} />
        ))}
      </div>
    </div>
  );
}
EOT

# Add validator to Users Form
node -e "
const fs = require('fs');
const path = 'frontend/src/app/(protected)/users/new/page.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('import { useLanguage }', 'import PasswordStrength from \"@/components/PasswordStrength\";\nimport { useLanguage }');
content = content.replace('<input type={showPassword ? \"text\" : \"password\"} required value={formData.password}', '<PasswordStrength password={formData.password} />\n              <input type={showPassword ? \"text\" : \"password\"} required value={formData.password}');
fs.writeFileSync(path, content);
"

# Add validator to Change Password Modal
node -e "
const fs = require('fs');
const path = 'frontend/src/components/ChangePasswordModal.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('import { toast }', 'import PasswordStrength from \"./PasswordStrength\";\nimport { toast }');
content = content.replace('<input type={showNew ? \"text\" : \"password\"} required value={newPassword}', '<PasswordStrength password={newPassword} />\n                  <input type={showNew ? \"text\" : \"password\"} required value={newPassword}');
fs.writeFileSync(path, content);
"

echo "🌍 5. Creating Public Tracking Portal..."
mkdir -p frontend/src/app/track
cat << 'EOT' > frontend/src/app/track/page.tsx
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
EOT

echo "🔗 6. Adding Track Link to Landing Page..."
node -e "
const fs = require('fs');
const path = 'frontend/src/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('import { ArrowRight, ShieldCheck, Globe, Zap, LogIn } from \"lucide-react\";', 'import { ArrowRight, ShieldCheck, Globe, Zap, LogIn, Search } from \"lucide-react\";');
content = content.replace('<Link href=\"/login\"', '<Link href=\"/track\" className=\"w-full sm:w-auto bg-white text-[#0F3B66] px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-gray-100 transition-transform hover:scale-105 flex items-center justify-center mb-4 sm:mb-0 sm:mr-4\"><Search className=\"mr-2\" size={22} /> Track Cargo</Link>\n            <Link href=\"/login\"');
content = content.replace('flex flex-col sm:flex-row items-center justify-center gap-4', 'flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap');
fs.writeFileSync(path, content);
"

echo "🐳 7. Rebuilding Stack..."
sudo docker compose build --no-cache backend frontend
sudo docker compose up -d

echo "✅ Auto-tracking, Password Strength, and Client Portal are LIVE!"
