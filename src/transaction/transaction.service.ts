import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, DeepPartial } from 'typeorm';
import { Transaction} from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import * as crypto from 'crypto';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(IdempotencyKey)
    private idempotencyKeyRepository: Repository<IdempotencyKey>,
    private dataSource: DataSource,
  ) {}

  async createTransaction(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    const transaction = this.transactionRepository.create(createTransactionDto);
    return this.transactionRepository.save(transaction);
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getTransactionById(id: string): Promise<Transaction> {
    return this.transactionRepository.findOne({
      where: { id },
    });
  }

  async processWithIdempotency<T>(
    idempotencyKey: string,
    callback: () => Promise<T>
  ): Promise<T> {
    // First, check if we already have a response for this idempotency key
    const existingKey = await this.idempotencyKeyRepository.findOne({
      where: { key: idempotencyKey }
    });

    // If we have a response, return it immediately
    if (existingKey && !existingKey.isProcessing && existingKey.response) {
      return existingKey.response as T;
    }

    // If the transaction is currently processing, throw a conflict error
    if (existingKey && existingKey.isProcessing) {
      throw new ConflictException('This transaction is currently being processed. Please try again later.');
    }

    // Start a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create or update the idempotency key record to mark it as processing
      if (!existingKey) {
        await queryRunner.manager.insert(IdempotencyKey, {
          key: idempotencyKey,
          isProcessing: true,
        });
      } else {
        await queryRunner.manager.update(IdempotencyKey, { key: idempotencyKey }, {
          isProcessing: true,
          response: null,
          transactionId: null,
        });
      }

      // Commit so other concurrent requests can see this key is being processed
      await queryRunner.commitTransaction();

      // Execute the callback to perform the actual operation
      const result = await callback();

      // Store the result with the idempotency key
      await this.idempotencyKeyRepository.update({ key: idempotencyKey }, {
        response: result,
        isProcessing: false,
        transactionId: (result as unknown as any).transaction.id as string
      });
      // await this.idempotencyKeyRepository.update({ key: idempotencyKey }, {
      //   response: result as unknown as (() => string) | DeepPartial<unknown>[] | readonly DeepPartial<unknown>[] | DeepPartial<any>,
      //   isProcessing: false,
      //   transactionId: (result as any)?.id || (result as any)?.transaction?.id || null,
      // });

      return result;
    } catch (error) {
      // If there was an error in the callback, mark the key as not processing
      await this.idempotencyKeyRepository.update({ key: idempotencyKey }, {
        isProcessing: false,
      });

      throw error;
    }
  }

  generateIdempotencyKey(): string {
    return crypto.randomUUID();
  }
}