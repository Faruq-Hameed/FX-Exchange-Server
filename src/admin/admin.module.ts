import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { ExchangeRate } from '../fx/entities/exchange-rate.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Transaction, ExchangeRate]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}