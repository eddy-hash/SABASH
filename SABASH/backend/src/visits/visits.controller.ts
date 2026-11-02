import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { VisitsService } from './visits.service';
import { Visit } from './visit.entity';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/auth.guard';

@Controller('visits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  findAll(): Promise<Visit[]> {
    return this.visitsService.findAll();
  }

  @Post()
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  create(@Body() createVisitDto: Partial<Visit>, @Req() req: any): Promise<Visit> {
    return this.visitsService.create(createVisitDto, req.user.userId);
  }
}
