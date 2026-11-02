import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  private resetTokens = new Map<string, { userId: string, expires: number }>();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role, name: user.name };
    return { access_token: this.jwtService.sign(payload), user };
  }

  async register(data: any, adminId?: string) {
    const existing = await this.usersService.findByEmail(data.email);
    if (existing) throw new BadRequestException('Email already exists');
    const user = await this.usersService.create(data);

    if (adminId) {
      await this.notificationsService.create({
        userId: adminId,
        title: 'New Staff Registered',
        message: user.name + ' was registered as a ' + user.role + '.'
      });
    }

    return this.login(user);
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return { message: 'If that email exists, a reset link was sent.' };
    const token = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.resetTokens.set(token, { userId: user.id, expires: Date.now() + 15 * 60 * 1000 });
    return { message: 'Reset token generated successfully.', demoToken: token };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = this.resetTokens.get(token);
    if (!record || record.expires < Date.now()) throw new BadRequestException('Invalid or expired token');
    await this.usersService.updatePassword(record.userId, newPassword);
    this.resetTokens.delete(token);
    return { message: 'Password reset successful' };
  }

  async changePassword(userId: string, oldPass: string, newPass: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    
    const isValid = await bcrypt.compare(oldPass, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Incorrect current password');
    
    await this.usersService.updatePassword(userId, newPass);
    return { success: true, message: 'Password updated successfully' };
  }
}
