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
