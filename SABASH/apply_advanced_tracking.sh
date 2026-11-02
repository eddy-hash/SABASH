#!/bin/bash
set -e
cd ~/SaaS/SABASH

echo "📦 1. Installing WebSocket Dependencies..."
# Backend deps
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./backend/package.json', 'utf8'));
pkg.dependencies['@nestjs/websockets'] = '^10.0.0';
pkg.dependencies['@nestjs/platform-socket.io'] = '^10.0.0';
pkg.dependencies['socket.io'] = '^4.7.2';
fs.writeFileSync('./backend/package.json', JSON.stringify(pkg, null, 2));
"
# Frontend deps
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./frontend/package.json', 'utf8'));
pkg.dependencies['socket.io-client'] = '^4.7.2';
fs.writeFileSync('./frontend/package.json', JSON.stringify(pkg, null, 2));
"

echo "🗄️ 2. Updating Database for Event Timeline..."
# Add a JSONB column to track the history of events
sudo docker exec -i sabash_db psql -U postgres -d sabash_cargo -c "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS event_history JSONB DEFAULT '[]'::jsonb;" || true
sed -i '/current_lng NUMERIC(10, 6) DEFAULT NULL,/a \    event_history JSONB DEFAULT '\''[]'\''::jsonb,' database/init.sql

cat << 'EOT' > backend/src/shipments/shipment.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tracking_code', unique: true }) trackingCode: string;
  @Column({ name: 'customer_name' }) customerName: string;
  @Column({ name: 'customer_phone' }) customerPhone: string;
  @Column({ name: 'freight_type' }) freightType: 'sea' | 'air';
  @Column({ name: 'origin_warehouse_code' }) originWarehouseCode: string;
  @Column('numeric', { name: 'length_cm' }) lengthCm: number;
  @Column('numeric', { name: 'width_cm' }) widthCm: number;
  @Column('numeric', { name: 'height_cm' }) heightCm: number;
  @Column('numeric', { name: 'weight_kg' }) weightKg: number;
  @Column('numeric', { name: 'calculated_cbm', nullable: true }) calculatedCbm: number;
  @Column('numeric', { name: 'billable_weight_kg', nullable: true }) billableWeightKg: number;
  @Column('numeric', { name: 'total_cost_usd', nullable: true }) totalCostUsd: number;
  @Column('numeric', { name: 'total_cost_tzs', nullable: true }) totalCostTzs: number;
  @Column({ default: 'Loaded' }) status: string;
  @Column({ name: 'created_by', nullable: true }) createdBy: string;
  @Column('numeric', { name: 'current_lat', nullable: true }) currentLat: number;
  @Column('numeric', { name: 'current_lng', nullable: true }) currentLng: number;
  @Column('jsonb', { name: 'event_history', default: [] }) eventHistory: any[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' }) createdAt: Date;
}
EOT

echo "⚙️ 3. Creating WebSocket Gateway..."
cat << 'EOT' > backend/src/shipments/tracking.gateway.ts
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class TrackingGateway {
  @WebSocketServer()
  server: Server;

  emitLocationUpdate(trackingCode: string, data: any) {
    this.server.emit(\`track_\${trackingCode}\`, data);
  }
}
EOT

# Register Gateway
node -e "
const fs = require('fs');
const path = 'backend/src/shipments/shipments.module.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('providers: [ShipmentsService],', 'providers: [ShipmentsService, TrackingGateway],');
content = content.replace('import { NotificationsModule }', 'import { TrackingGateway } from \"./tracking.gateway\";\nimport { NotificationsModule }');
fs.writeFileSync(path, content);
"

# Update Service to emit and add timeline events
cat << 'EOT' > backend/src/shipments/shipments.service.ts
import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Shipment } from './shipment.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { TrackingGateway } from './tracking.gateway';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment) private shipmentsRepository: Repository<Shipment>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private notificationService: NotificationsService,
    private trackingGateway: TrackingGateway,
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
      const origin = data.originWarehouseCode || 'CN';
      const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
      const generatedCode = \`SAB-\${origin}-\${randomHex}\`;

      const initialEvent = {
        status: 'Loaded',
        title: \`Cargo received at \${origin === 'CN' ? 'Guangzhou' : 'Dubai'} Warehouse\`,
        date: new Date().toISOString()
      };

      const shipment = this.shipmentsRepository.create({ 
        ...data, 
        trackingCode: generatedCode,
        eventHistory: [initialEvent]
      });
      
      const savedShipment = (await this.shipmentsRepository.save(shipment)) as Shipment;
      await this.cacheManager.del('all_shipments_manifest');
      
      await this.notificationService.create({
        userId,
        title: 'New Shipment Registered',
        message: \`Tracking: \${savedShipment.trackingCode} for \${savedShipment.customerName}\`
      });

      return savedShipment;
    } catch (error) {
      if (error.code === '23505') throw new ConflictException('Tracking code collision');
      throw error;
    }
  }

  async updateLocation(id: string, lat: number, lng: number, status: string, title: string) {
    const shipment = await this.shipmentsRepository.findOne({ where: { id } });
    if (!shipment) throw new Error('Not found');

    const newEvent = { status, title, date: new Date().toISOString() };
    const updatedHistory = [...(shipment.eventHistory || []), newEvent];

    await this.shipmentsRepository.update(id, { 
      currentLat: lat, 
      currentLng: lng,
      status: status,
      eventHistory: updatedHistory
    });
    
    await this.cacheManager.del('all_shipments_manifest');
    
    // EMIT LIVE WEBSOCKET EVENT TO THE CLIENT
    this.trackingGateway.emitLocationUpdate(shipment.trackingCode, {
      lat, lng, status, title, date: newEvent.date
    });

    return { success: true };
  }
}
EOT

# Update Controller to accept status updates
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

  @Get('track/:code')
  @Public()
  async trackByCode(@Param('code') code: string) {
    const shipment = await this.shipmentsService.findOneByCode(code);
    if (!shipment) throw new NotFoundException('Tracking number not found');
    return shipment; // Now returns the whole object including eventHistory
  }

  @Post()
  @Roles('ADMIN', 'MANAGER', 'STAFF', 'WAREHOUSE')
  create(@Body() createShipmentDto: Partial<Shipment>, @Req() req: any): Promise<Shipment> {
    createShipmentDto.createdBy = req.user.userId;
    return this.shipmentsService.create(createShipmentDto, req.user.userId);
  }

  @Patch(':id/location')
  @Roles('ADMIN', 'MANAGER', 'STAFF', 'WAREHOUSE')
  updateLocation(@Param('id') id: string, @Body() body: { lat: number, lng: number, status: string, title: string }) {
    return this.shipmentsService.updateLocation(id, body.lat, body.lng, body.status, body.title);
  }
}
EOT

echo "🎨 4. Building the Animated Timeline Component..."
cat << 'EOT' > frontend/src/components/TrackingTimeline.tsx
"use client";
import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';

export default function TrackingTimeline({ events }: { events: any[] }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 py-4">
      {events.map((event, index) => (
        <motion.div 
          key={index} 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}
          className="relative pl-6"
        >
          {/* Timeline Dot */}
          <span className="absolute -left-[17px] top-1 bg-white rounded-full">
            {index === events.length - 1 ? (
              <CheckCircle2 className="w-8 h-8 text-[#FF5722] bg-white" />
            ) : (
              <Circle className="w-8 h-8 text-gray-300 bg-white" />
            )}
          </span>
          <div>
            <p className="text-sm font-bold text-[#0F3B66]">{event.status}</p>
            <p className="text-gray-600 text-sm">{event.title}</p>
            <p className="text-xs text-gray-400 mt-1">{new Date(event.date).toLocaleString()}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
EOT

echo "🔌 5. Updating Public Landing Page (Real-time Socket + Timeline)..."
cat << 'EOT' > frontend/src/app/page.tsx
"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ShieldCheck, Zap, LogIn, Search, MapPin, Truck, CheckCircle2, Clock } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import dynamic from 'next/dynamic';
import { io, Socket } from 'socket.io-client';
import TrackingTimeline from '@/components/TrackingTimeline';

const TrackingMap = dynamic(() => import('@/components/TrackingMap'), { ssr: false, loading: () => <div className="h-[250px] bg-gray-100 rounded-xl flex items-center justify-center">Loading Map...</div> });

export default function LandingPage() {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const handleTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/shipments/track/' + code.toUpperCase());
      if (!res.ok) throw new Error('Tracking number not found. Please check and try again.');
      const data = await res.json();
      setResult(data);

      // Connect WebSocket for real-time updates
      if (socket) socket.disconnect();
      const newSocket = io(window.location.origin, { path: '/socket.io' });
      newSocket.on('track_' + data.trackingCode, (update: any) => {
        setResult((prev: any) => ({
          ...prev,
          status: update.status,
          currentLat: update.lat,
          currentLng: update.lng,
          eventHistory: [...(prev.eventHistory || []), { status: update.status, title: update.title, date: update.date }]
        }));
      });
      setSocket(newSocket);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlCode = urlParams.get("code");
    if (urlCode) {
      setCode(urlCode);
      handleTrack();
    }
    return () => { if (socket) socket.disconnect(); };
  }, []);

  // Calculate Mock ETA based on Freight Type
  const getETA = () => {
    if (!result) return null;
    const start = new Date(result.createdAt);
    const days = result.freightType === 'air' ? 3 : 30; // Air = 3 days, Sea = 30 days
    const eta = new Date(start);
    eta.setDate(eta.getDate() + days);
    return eta.toLocaleDateString();
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center py-8 px-4 bg-[#0F3B66] bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/background.jpg')" }}>
      <div className="absolute inset-0 bg-black/70"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto text-center w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="flex justify-center mb-6">
            <div className="bg-white p-3 rounded-2xl shadow-xl">
              <img src="/sabash-logo.png" alt="Sabash" className="w-16 h-16 object-contain" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white mb-3 md:mb-6 leading-tight drop-shadow-lg">
            SABASH CARGO <br />
            <span className="text-[#FF5722] text-2xl sm:text-4xl md:text-5xl">LOGISTIC COMPANY</span>
          </h1>
          
          <form onSubmit={handleTrack} className="flex shadow-2xl max-w-lg mx-auto mb-6">
            <input type="text" placeholder="Enter Tracking Code (e.g. SAB-CN-8X2A)" value={code} onChange={e => setCode(e.target.value)} required className="flex-1 p-4 border border-r-0 border-gray-300 rounded-l-xl focus:ring-2 focus:ring-[#FF5722] outline-none text-base md:text-lg uppercase" />
            <button type="submit" disabled={isLoading} className="bg-[#FF5722] text-white px-6 md:px-8 rounded-r-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center">
              {isLoading ? '...' : <><Search size={20} className="md:mr-2"/> <span className="hidden md:inline">Track</span></>}
            </button>
          </form>

          <div className="flex justify-center mt-6">
            <Link href="/login" className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-3 rounded-xl font-bold text-base shadow-xl hover:bg-white/20 transition-transform hover:scale-105 flex items-center justify-center">
              <LogIn className="mr-2" size={20} /> Staff Portal Login
            </Link>
          </div>
        </motion.div>

        {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-center mt-6 font-bold bg-black/50 inline-block px-4 py-2 rounded-lg">{error}</motion.p>}

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-left max-w-3xl mx-auto">
              <div className="bg-[#0F3B66] p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-sm text-gray-300">Tracking Number</p>
                  <h2 className="text-2xl font-bold">{result.trackingCode}</h2>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs text-gray-300 uppercase tracking-wider">Status</p>
                    <div className="flex items-center text-lg font-bold text-[#FF5722]">
                      {result.status === 'Delivered' ? <CheckCircle2 className="mr-2" size={20}/> : <Truck className="mr-2" size={20}/>}
                      {result.status}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-300 uppercase tracking-wider flex items-center"><Clock size={12} className="mr-1"/> Est. Arrival</p>
                    <p className="font-bold text-green-400">{getETA()}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Live Location</h3>
                  {result.currentLat && result.currentLng ? (
                    <TrackingMap lat={Number(result.currentLat)} lng={Number(result.currentLng)} trackingCode={result.trackingCode} />
                  ) : (
                    <div className="h-[250px] bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400">
                      <MapPin size={32} className="mb-2"/>
                      <p>Awaiting live GPS ping...</p>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Shipment Timeline</h3>
                  <TrackingTimeline events={result.eventHistory} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
EOT

echo "🐳 6. Rebuilding Stack..."
sudo docker compose build --no-cache backend frontend
sudo docker compose up -d

echo "✅ ADVANCED TRACKING DEPLOYED!"
