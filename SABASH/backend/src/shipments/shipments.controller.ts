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

  
  @Get('stats')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  async getStats() {
    return this.shipmentsService.getStats();
  }

  @Get('track/:code')
  @Public()
  async trackByCode(@Param('code') code: string) {
    const shipment = await this.shipmentsService.findOneByCode(code);
    if (!shipment) throw new NotFoundException('Tracking number not found');
    return shipment;
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
