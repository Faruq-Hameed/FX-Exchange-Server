import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transaction/entities/transaction.entity';
import { ExchangeRate } from '../fx/entities/exchange-rate.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(ExchangeRate)
    private exchangeRateRepository: Repository<ExchangeRate>,
  ) {}

  async getAllUsers() {
    return this.usersRepository.find({
      select: ['id', 'email', 'isVerified', 'role', 'createdAt'],
    });
  }

  async getAllTransactions() {
    return this.transactionRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async adjustExchangeRate(baseCurrency: string, targetCurrency: string, rate: number) {
    let exchangeRate = await this.exchangeRateRepository.findOne({
      where: { baseCurrency, targetCurrency },
    });
    
    if (exchangeRate) {
      // Update existing rate
      exchangeRate.rate = rate;
    } else {
      // Create new rate
      exchangeRate = this.exchangeRateRepository.create({
        baseCurrency,
        targetCurrency,
        rate,
      });
    }
    
    return this.exchangeRateRepository.save(exchangeRate);
  }
}
