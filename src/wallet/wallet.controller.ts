import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { TransferFundsDto } from './dto/transfer-funds.dto';
import { TransferFundsWithIdempotencyDto } from 'src/transaction/dto/transfer-funds-with-idempotency.dto';
import { TransactionService } from 'src/transaction/transaction.service';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private walletService: WalletService,
    private transactionService: TransactionService
  ) {}

  @Get()
  getWallets(@Request() req) {
    return this.walletService.getWallets(req.user.id);
  }

  @Post('fund')
  fundWallet(@Request() req, @Body() fundWalletDto: FundWalletDto) {
    return this.walletService.fundWallet(req.user.id, fundWalletDto);
  }

  @Post('transfer')
  transferFunds(@Request() req, @Body() transferFundsDto: TransferFundsDto) {
    return this.walletService.transferFunds(req.user.id, transferFundsDto);
  }

  @Post('transfer-with-idempotency')
  transferFundsWithIdempotency(@Request() req, @Body() transferFundsDto: TransferFundsWithIdempotencyDto) {
    return this.walletService.transferFundsWithIdempotency(req.user.id, transferFundsDto);
  }

  @Get('generate-idempotency-key')
  generateIdempotencyKey() {
    return { idempotencyKey: this.transactionService.generateIdempotencyKey() };
  }
}