import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class TransferFundsDto {
  @IsNotEmpty()
  @IsString()
  fromCurrency: string;

  @IsNotEmpty()
  @IsString()
  toCurrency: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;
}