import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { Wallet } from './entities/wallet.entity';
import { FxModule } from 'src/fx/fx.module';
import { TransactionModule } from '../transaction/transaction.module';
import { Transaction } from 'src/transaction/entities/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction]),
    FxModule,
    TransactionModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}