import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class IdempotencyKey { // Unique key for idempotency. It ensures that the same transaction is not processed multiple times
  @PrimaryColumn()
  key: string;

  @Column('json', { nullable: true })
  response: any;

  @Column({ nullable: true })
  transactionId: string;

  @Column({ default: false })
  isProcessing: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
