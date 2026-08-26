import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { BankTransactionType } from '../bank-transaction.entity';

export class CreateBankTransactionDto {
  @IsNotEmpty()
  @IsEnum(BankTransactionType)
  type: BankTransactionType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsString()
  date: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
