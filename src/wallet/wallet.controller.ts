import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { TransferFundsDto } from './dto/transfer-funds.dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

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
}