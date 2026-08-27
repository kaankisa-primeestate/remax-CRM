import { IsDateString, IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { BankTransactionType } from '../bank-transaction.entity';

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsUUID()
  bankAccountId: string;

  @IsNotEmpty()
  @IsEnum(BankTransactionType)
  type: BankTransactionType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @IsOptional()
  @IsIn(['account', 'cheque', 'note'])
  paymentMethod?: string;

  @IsOptional()
  @IsDateString()
  chequeDueDate?: string;

  @IsOptional()
  @IsString()
  chequeDrawerName?: string;
}
