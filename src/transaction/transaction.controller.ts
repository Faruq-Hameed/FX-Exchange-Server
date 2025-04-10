import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  @Get()
  getUserTransactions(@Request() req) {
    return this.transactionService.getUserTransactions(req.user.id);
  }

  @Get(':id')
  getTransactionById(@Request() req, @Param('id') id: string) {
    return this.transactionService.getTransactionById(id);
  }
}
