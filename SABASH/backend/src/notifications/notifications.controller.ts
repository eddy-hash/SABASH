import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}
  @Get()
  getNotifications(@Req() req: any) { return this.notificationsService.getUserNotifications(req.user.userId); }
  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Req() req: any) { return this.notificationsService.markAsRead(id, req.user.userId); }
}
