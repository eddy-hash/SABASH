#!/bin/bash
set -e
cd ~/SaaS/SABASH

echo "💰 1. Updating Air Freight Rate to \$14.00 / KG..."
sed -i 's/export const AIR_RATE_PER_KG = 9.50;/export const AIR_RATE_PER_KG = 14.00;/g' frontend/src/lib/calculations.ts

echo "⚙️ 2. Updating Backend for Password Change..."

# 1. Add findById to UsersService
cat << 'EOT' > backend/src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find({ order: { createdAt: 'DESC' } });
  }

  async create(data: any): Promise<User> {
    const hash = await bcrypt.hash(data.password, 10);
    const user = this.userRepo.create({
      name: data.name,
      email: data.email,
      passwordHash: hash,
      role: data.role || 'STAFF',
    });
    return this.userRepo.save(user);
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(userId, { passwordHash: hash });
  }
}
EOT

# 2. Add changePassword logic to AuthService
cat << 'EOT' >> backend/src/auth/auth.service.ts
