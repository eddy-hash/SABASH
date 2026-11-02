import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { ShipmentsModule } from './shipments/shipments.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from "./health/health.module";
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { VisitsModule } from "./visits/visits.module";
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT, 10) || 6379 },
          ttl: 60000,
        }),
      }),
    }),
    AuthModule, 
    UsersModule,
    HealthModule, 
    ShipmentsModule, 
    CustomersModule, 
    NotificationsModule,
    VisitsModule,
  ],
})
export class AppModule {}
