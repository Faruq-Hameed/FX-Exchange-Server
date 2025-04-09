import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { FxService } from './fx.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('fx')
@UseGuards(JwtAuthGuard)
export class FxController {
  constructor(private fxService: FxService) {}

  @Get('rates')
  getAllRates() {
    return this.fxService.getAllRates();
  }

  @Get('currencies')
  getSupportedCurrencies() {
    return this.fxService.getSupportedCurrencies();
  }

  @Get('rates/:from/:to')
  getExchangeRate(@Param('from') fromCurrency: string, @Param('to') toCurrency: string) {
    return this.fxService.getExchangeRate(fromCurrency, toCurrency);
  }
}