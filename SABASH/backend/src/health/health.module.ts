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
