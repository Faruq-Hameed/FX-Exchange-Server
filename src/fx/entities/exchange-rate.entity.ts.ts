import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  baseCurrency: string; //currency to check against

  @Column()
  targetCurrency: string; //the currency to convert to

  @Column('decimal', { precision: 20, scale: 8 })
  rate: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
