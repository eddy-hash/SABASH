import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';
import { Shipment } from './shipment.entity';
import { TrackingGateway } from "./tracking.gateway";
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Shipment]), NotificationsModule],
  controllers: [ShipmentsController],
  providers: [ShipmentsService, TrackingGateway],
})
export class ShipmentsModule {}
