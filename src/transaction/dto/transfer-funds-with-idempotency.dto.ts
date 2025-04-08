import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

// This DTO is used to transfer funds between two currencies with idempotency key
// It ensures that the transfer is processed only once even if the request is sent multiple times
// The idempotency key is a unique identifier for the request, which allows the server to recognize duplicate requests
// and avoid processing them multiple times
// The DTO also validates the input data to ensure that the required fields are present and have the correct types
export class TransferFundsWithIdempotencyDto {
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

  @IsNotEmpty()
  @IsString()
  idempotencyKey: string; // Unique key to ensure idempotency
}