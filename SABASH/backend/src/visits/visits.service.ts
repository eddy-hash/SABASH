import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visit } from './visit.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VisitsService {
  constructor(
    @InjectRepository(Visit) private visitRepo: Repository<Visit>,
    private notificationService: NotificationsService,
  ) {}

  async findAll(): Promise<Visit[]> {
    return this.visitRepo.find({ relations: ['agent'], order: { visitDate: 'DESC' } });
  }

  async create(data: Partial<Visit>, agentId: string): Promise<Visit> {
    const visit = this.visitRepo.create({ ...data, agentId });
    const saved = await this.visitRepo.save(visit);

    await this.notificationService.create({
      userId: agentId,
      title: 'Field Visit Logged',
      message: 'Recorded visit to ' + saved.workplace + ' (' + saved.customerName + ')'
    });

    return saved;
  }
}
