import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { ExchangeRate } from '../fx/entities/exchange-rate.entity';
import { FxService } from 'src/fx/fx.service';
import { FxModule } from 'src/fx/fx.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Transaction, ExchangeRate]),
    FxModule
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}