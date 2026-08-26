import { IsDateString, IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
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

  // SADECE type=DEPOSIT (giris) icin anlamli -- musteriden komisyon
  // tahsilati gibi bir giris "Cek/Senet Alarak" yapiliyorsa, para HENUZ
  // hesaba GECMEMISTIR. Bu durumda hesap ARTIRILMAZ, bunun yerine bir
  // ChequeNote (RECEIVABLE, henuz tahsil edilmedi) kaydi acilir.
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
