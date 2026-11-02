#!/bin/bash
set -e
cd ~/SaaS/SABASH

echo "🗄️ 1. Adding GPS Coordinates to Database..."
# Add to init.sql for future installs
sed -i '/total_cost_tzs NUMERIC(12, 2) DEFAULT 0,/a \    current_lat NUMERIC(10, 6) DEFAULT NULL,\n    current_lng NUMERIC(10, 6) DEFAULT NULL,' database/init.sql

# Alter the CURRENT running database so we don't lose data
sudo docker exec -i sabash_db psql -U postgres -d sabash_cargo -c "ALTER TABLE shipments ADD COLUMN current_lat NUMERIC(10, 6) DEFAULT NULL, ADD COLUMN current_lng NUMERIC(10, 6) DEFAULT NULL;" || true

echo "⚙️ 2. Updating Backend Entity & API..."
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
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' }) createdAt: Date;
}
EOT

# Add update location endpoint
cat << 'EOT' > backend/src/shipments/shipments.controller.ts
import { Controller, Get, Post, Body, UseGuards, Req, Patch, Param } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { Shipment } from './shipment.entity';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/auth.guard';

@Controller('shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  findAll(): Promise<Shipment[]> {
    return this.shipmentsService.findAll();
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

# Add updateLocation to Service
node -e "
const fs = require('fs');
const path = 'backend/src/shipments/shipments.service.ts';
let content = fs.readFileSync(path, 'utf8');
const newMethod = \`
  async updateLocation(id: string, lat: number, lng: number) {
    await this.shipmentsRepository.update(id, { currentLat: lat, currentLng: lng });
    await this.cacheManager.del('all_shipments_manifest');
    return { success: true };
  }
}\`;
content = content.replace(/}\s*$/, newMethod);
fs.writeFileSync(path, content);
"

echo "🎨 3. Installing Map Libraries..."
# Add leaflet to package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./frontend/package.json', 'utf8'));
pkg.dependencies['leaflet'] = '^1.9.4';
pkg.dependencies['react-leaflet'] = '^4.2.1';
pkg.devDependencies['@types/leaflet'] = '^1.9.8';
fs.writeFileSync('./frontend/package.json', JSON.stringify(pkg, null, 2));
"

echo "🗺️ 4. Creating Map Components..."
mkdir -p frontend/src/components

cat << 'EOT' > frontend/src/components/TrackingMap.tsx
"use client";
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for missing marker icons in Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function TrackingMap({ lat, lng, trackingCode }: { lat: number, lng: number, trackingCode: string }) {
  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-gray-200">
      <MapContainer center={[lat, lng]} zoom={6} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={customIcon}>
          <Popup>Cargo: {trackingCode}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
EOT

cat << 'EOT' > frontend/src/components/TrackingModal.tsx
"use client";
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';

// Dynamically import map to avoid SSR errors
const TrackingMap = dynamic(() => import('./TrackingMap'), { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center bg-gray-100 rounded-xl">Loading Map...</div> });

export default function TrackingModal({ isOpen, onClose, shipment }: { isOpen: boolean, onClose: () => void, shipment: any }) {
  const [lat, setLat] = useState(shipment?.currentLat ? Number(shipment.currentLat) : -6.7924); // Default to Dar es Salaam
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
    // Simulate moving the cargo slightly towards Dar es Salaam
    const newLat = lat + (Math.random() - 0.5) * 0.5;
    const newLng = lng + (Math.random() - 0.5) * 0.5;
    handleUpdateLocation(newLat, newLng);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 z-[100]" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-2xl bg-white rounded-2xl shadow-2xl z-[110] overflow-hidden">
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
        </>
      )}
    </AnimatePresence>
  );
}
EOT

echo "🔗 5. Adding Track Button to Manifest Table..."
# We will rewrite the ManifestTable to include the tracking button
cat << 'EOT' > frontend/src/components/ManifestTable.tsx
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
EOT

echo "🐳 6. Rebuilding Stack..."
sudo docker compose build --no-cache backend frontend
sudo docker compose up -d

echo "✅ GPS Tracking is now fully integrated!"
