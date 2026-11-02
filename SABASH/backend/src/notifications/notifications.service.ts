import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationsService {
  constructor(@InjectRepository(Notification) private notificationRepo: Repository<Notification>) {}
  
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 10 });
  }
  
  async markAsRead(id: string, userId: string) {
    await this.notificationRepo.update({ id, userId }, { isRead: true });
    return { success: true };
  }

  // CRITICAL FIX: Added the create method
  async create(data: DeepPartial<Notification>): Promise<Notification> {
    const notif = this.notificationRepo.create(data);
    return (await this.notificationRepo.save(notif)) as Notification;
  }
}
