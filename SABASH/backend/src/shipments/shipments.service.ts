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
      const generatedCode = 'SAB-' + origin + '-' + randomHex;

      const initialEvent = {
        status: 'Loaded',
        title: 'Cargo received at ' + (origin === 'CN' ? 'Guangzhou' : 'Dubai') + ' Warehouse',
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
        userId: userId,
        title: 'New Shipment Registered',
        message: 'Tracking: ' + savedShipment.trackingCode + ' for ' + savedShipment.customerName
      });

      return savedShipment;
    } catch (error) {
      if (error.code === '23505') throw new ConflictException('Tracking code collision');
      throw error;
    }
  }

  async updateLocation(id: string, lat: number, lng: number, status: string, title: string) {
    const shipment = await this.shipmentsRepository.findOne({ where: { id } });
    if (!shipment) throw new Error('Shipment not found');

    const newEvent = { status: status, title: title, date: new Date().toISOString() };
    const currentHistory = shipment.eventHistory || [];
    const updatedHistory = currentHistory.concat([newEvent]);

    await this.shipmentsRepository.update(id, {
      currentLat: lat,
      currentLng: lng,
      status: status,
      eventHistory: updatedHistory
    });

    await this.cacheManager.del('all_shipments_manifest');

    this.trackingGateway.emitLocationUpdate(shipment.trackingCode, {
      lat: lat,
      lng: lng,
      status: status,
      title: title,
      date: newEvent.date
    });

    return { success: true };
  }

  async getStats() {
    // Total revenue (only non-delivered shipments count as 'active revenue' for now)
    const totalResult = await this.shipmentsRepository
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.total_cost_usd), 0)', 'total_usd')
      .addSelect('COALESCE(SUM(s.total_cost_tzs), 0)', 'total_tzs')
      .addSelect('COUNT(*)', 'total_count')
      .getRawOne();

    // Active shipments (not delivered)
    const activeResult = await this.shipmentsRepository
      .createQueryBuilder('s')
      .select('COUNT(*)', 'count')
      .where('s.status != :status', { status: 'Delivered' })
      .getRawOne();

    // Pending intake (status = Loaded)
    const pendingResult = await this.shipmentsRepository
      .createQueryBuilder('s')
      .select('COUNT(*)', 'count')
      .where('s.status = :status', { status: 'Loaded' })
      .getRawOne();

    // Weekly growth (this week vs last week)
    const thisWeek = await this.shipmentsRepository
      .createQueryBuilder('s')
      .select('COUNT(*)', 'count')
      .where("s.created_at >= NOW() - INTERVAL '7 days'")
      .getRawOne();
    
    const lastWeek = await this.shipmentsRepository
      .createQueryBuilder('s')
      .select('COUNT(*)', 'count')
      .where("s.created_at >= NOW() - INTERVAL '14 days'")
      .andWhere("s.created_at < NOW() - INTERVAL '7 days'")
      .getRawOne();

    const thisWeekCount = parseInt(thisWeek.count) || 0;
    const lastWeekCount = parseInt(lastWeek.count) || 0;
    const growth = lastWeekCount === 0 
      ? (thisWeekCount > 0 ? 100 : 0)
      : Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);

    // Daily revenue for the last 7 days (for chart)
    const dailyData = await this.shipmentsRepository
      .createQueryBuilder('s')
      .select("TO_CHAR(s.created_at, 'Dy')", 'day')
      .addSelect('COALESCE(SUM(s.total_cost_usd), 0)', 'revenue')
      .where("s.created_at >= NOW() - INTERVAL '7 days'")
      .groupBy("TO_CHAR(s.created_at, 'Dy')")
      .orderBy("MIN(s.created_at)")
      .getRawMany();

    return {
      totalRevenueUsd: parseFloat(totalResult.total_usd) || 0,
      totalRevenueTzs: parseFloat(totalResult.total_tzs) || 0,
      totalShipments: parseInt(totalResult.total_count) || 0,
      activeShipments: parseInt(activeResult.count) || 0,
      pendingIntake: parseInt(pendingResult.count) || 0,
      weeklyGrowth: growth,
      dailyRevenue: dailyData.map(d => ({ name: d.day.trim(), revenue: parseFloat(d.revenue) || 0 }))
    };
  }
}