import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Customer } from './customer.entity';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}
  @Get()
  findAll(): Promise<Customer[]> { return this.customersService.findAll(); }
  @Post()
  create(@Body() createCustomerDto: Partial<Customer>, @Req() req: any): Promise<Customer> { return this.customersService.create(createCustomerDto, req.user.userId); }
}
