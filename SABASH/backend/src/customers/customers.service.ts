import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Customer } from './customer.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    private notificationService: NotificationsService,
  ) {}

  async findAll(): Promise<Customer[]> {
    return this.customerRepo.find({ order: { createdAt: 'DESC' } });
  }

  async create(data: DeepPartial<Customer>, userId: string): Promise<Customer> {
    try {
      const customer = this.customerRepo.create(data);
      const savedCustomer = (await this.customerRepo.save(customer)) as Customer;
      
      await this.notificationService.create({
        userId,
        title: 'New Client Registered',
        message: `${savedCustomer.name} (${savedCustomer.phone}) was added to the directory.`
      });

      return savedCustomer;
    } catch (error) {
      if (error.code === '23505') throw new ConflictException('Phone number already registered');
      throw error;
    }
  }
}
