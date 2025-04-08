import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class FundWalletDto {
  @IsNotEmpty()
  @IsString() 
  currency: string; //wallet that the use wants to fund

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;
}