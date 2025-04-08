import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { TransferFundsDto } from './dto/transfer-funds.dto';
import { FxService } from 'src/fx/fx.service';
import { TransactionService } from '../transaction/transaction.service';
import {
  TransactionType,
  TransactionStatus,
  Transaction,
} from '../transaction/entities/transaction.entity';
import { TransferFundsWithIdempotencyDto } from 'src/transaction/dto/transfer-funds-with-idempotency.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private fxService: FxService,
    private transactionService: TransactionService,
    private dataSource: DataSource,
  ) {}

  async getWallets(userId: string): Promise<Wallet[]> {
    return this.walletRepository.find({
      where: { userId },
      order: { currency: 'ASC' },
    });
  }

  async getWallet(userId: string, currency: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { userId, currency },
    });

    if (!wallet) {
      // Create a new wallet for this currency if it doesn't exist
      const newWallet = this.walletRepository.create({
        userId,
        currency,
        balance: 0,
      });
      return this.walletRepository.save(newWallet);
    }

    return wallet;
  }

  async fundWallet(
    userId: string,
    fundWalletDto: FundWalletDto,
  ): Promise<Wallet> {
    const { currency, amount } = fundWalletDto;

    // Start a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get or create wallet
      let wallet = await this.getWallet(userId, currency);

      // Update wallet balance
      wallet.balance = Number(wallet.balance) + amount;

      wallet = await queryRunner.manager.save(wallet);

      // Create transaction record
      await this.transactionService.createTransaction({
        userId,
        type: TransactionType.FUNDING,
        status: TransactionStatus.COMPLETED,
        amount,
        fromCurrency: currency,
        toCurrency: currency,
        exchangeRate: 1, // Same currency, so rate is 1:1
      });

      // Commit transaction
      await queryRunner.commitTransaction();

      return wallet;
    } catch (error) {
      // Rollback transaction in case of error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  async transferFunds(
    userId: string,
    transferFundsDto: TransferFundsDto,
  ): Promise<any> {
    const { fromCurrency, toCurrency, amount } = transferFundsDto;

    if (fromCurrency === toCurrency) {
      throw new BadRequestException('From and To currencies must be different');
    }

    // Start a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get source wallet
      const sourceWallet = await this.getWallet(userId, fromCurrency);

      // Check if source wallet has enough balance
      if (Number(sourceWallet.balance) < amount) {
        throw new BadRequestException(`Insufficient ${fromCurrency} balance`);
      }

      // Get exchange rate
      const exchangeRate = await this.fxService.getExchangeRate(
        fromCurrency,
        toCurrency,
      );

      // Calculate converted amount
      const convertedAmount = amount * exchangeRate;

      // Update source wallet
      sourceWallet.balance = Number(sourceWallet.balance) - amount;
      await queryRunner.manager.save(sourceWallet);

      // Get or create destination wallet
      let destWallet = await this.getWallet(userId, toCurrency);

      // Update destination wallet
      destWallet.balance = Number(destWallet.balance) + convertedAmount;
      destWallet = await queryRunner.manager.save(destWallet);

      // Create transaction record
      const transaction = await this.transactionService.createTransaction({
        userId,
        type: TransactionType.CONVERSION,
        status: TransactionStatus.COMPLETED,
        amount,
        fromCurrency,
        toCurrency,
        exchangeRate,
      });

      // Commit transaction
      await queryRunner.commitTransaction();

      return {
        transaction,
        sourceWallet,
        destWallet,
        convertedAmount,
        exchangeRate,
      };
    } catch (error) {
      // Rollback transaction in case of error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  // Initialize wallets for a new user
  async initializeUserWallets(userId: string): Promise<void> {
    // Create default NGN wallet with initial balance
    const ngnWallet = this.walletRepository.create({
      userId,
      currency: 'NGN',
      balance: 0, // Can be set to a default value if needed
    });

    await this.walletRepository.save(ngnWallet);

    // Create USD wallet with zero balance
    const usdWallet = this.walletRepository.create({
      userId,
      currency: 'USD',
      balance: 0,
    });

    await this.walletRepository.save(usdWallet);
  }

  async transferFundsWithIdempotency(
    userId: string,
    transferFundsDto: TransferFundsWithIdempotencyDto,
  ): Promise<any> {
    const { fromCurrency, toCurrency, amount, idempotencyKey } =
      transferFundsDto;

    return this.transactionService.processWithIdempotency(
      idempotencyKey,
      async () => {
        if (fromCurrency === toCurrency) {
          throw new BadRequestException(
            'From and To currencies must be different',
          );
        }

        // Start a transaction
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          // Get source wallet with lock for update
          const sourceWallet = await queryRunner.manager.findOne(Wallet, {
            where: { userId, currency: fromCurrency },
            lock: { mode: 'pessimistic_write' },
          });

          if (!sourceWallet) {
            throw new NotFoundException(
              `Wallet for currency ${fromCurrency} not found`,
            );
          }

          // Check if source wallet has enough balance
          if (Number(sourceWallet.balance) < amount) {
            throw new BadRequestException(
              `Insufficient ${fromCurrency} balance`,
            );
          }

          // Get exchange rate
          const exchangeRate = await this.fxService.getExchangeRate(
            fromCurrency,
            toCurrency,
          );

          // Calculate converted amount
          const convertedAmount = amount * exchangeRate;

          // Update source wallet
          sourceWallet.balance = Number(sourceWallet.balance) - amount;
          await queryRunner.manager.save(sourceWallet);

          // Get or create destination wallet with lock
          let destWallet = await queryRunner.manager.findOne(Wallet, {
            where: { userId, currency: toCurrency },
            lock: { mode: 'pessimistic_write' },
          });

          if (!destWallet) {
            destWallet = this.walletRepository.create({
              userId,
              currency: toCurrency,
              balance: 0,
            });
          }

          // Update destination wallet
          destWallet.balance = Number(destWallet.balance) + convertedAmount;
          destWallet = await queryRunner.manager.save(destWallet);

          // Create transaction record
          const transaction = await queryRunner.manager.save(
            this.transactionRepository.create({
              userId,
              type: TransactionType.CONVERSION,
              status: TransactionStatus.COMPLETED,
              amount,
              fromCurrency,
              toCurrency,
              exchangeRate,
            }),
          );

          // Commit transaction
          await queryRunner.commitTransaction();

          return {
            transaction,
            sourceWallet,
            destWallet,
            convertedAmount,
            exchangeRate,
          };
        } catch (error) {
          // Rollback transaction in case of error
          await queryRunner.rollbackTransaction();
          throw error;
        } finally {
          // Release query runner
          await queryRunner.release();
        }
      },
    );
  }
}
