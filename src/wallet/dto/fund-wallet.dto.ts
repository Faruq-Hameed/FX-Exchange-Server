import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class FundWalletDto {
  @IsNotEmpty()
  @IsString()
  private _currency: string; //wallet that the user wants to fund

  @IsNotEmpty()
  @IsString()
  set currency(value: string) {
    this._currency = value.toUpperCase(); //transform to uppercase
  }

  get currency(): string {
    return this._currency;
  }

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;
}