import { Controller, Get, Body, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AdminService } from './admin.service';
import { FxService } from 'src/fx/fx.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private fxService: FxService,
  ) {}

  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('transactions')
  getAllTransactions() {
    return this.adminService.getAllTransactions();
  }

  @Post('adjust-rate/:baseCurrency/:targetCurrency')
  adjustExchangeRate(
    @Param('baseCurrency') baseCurrency: string,
    @Param('targetCurrency') targetCurrency: string,
    @Body('rate') rate: number,
  ) {
    return this.adminService.adjustExchangeRate(
      baseCurrency,
      targetCurrency,
      rate,
    );
  }

  @Post('currency/:currency')
  addNewCurrency(@Param('currency') currency: string) {
    return this.fxService.addSupportedCurrency(currency);
  }
}
