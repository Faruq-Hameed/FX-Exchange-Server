import { Controller, Get, Body, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

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
}
