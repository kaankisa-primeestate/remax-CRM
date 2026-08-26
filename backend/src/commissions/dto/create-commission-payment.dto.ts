import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateCommissionPaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsString()
  date: string;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @IsOptional()
  @IsIn(['account', 'cheque', 'note'])
  paymentMethod?: string;

  @IsOptional()
  @IsDateString()
  chequeDueDate?: string;

  @IsOptional()
  @IsString()
  chequeDrawerName?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
