import { IsEnum, IsNotEmpty, IsOptional, IsNumber, IsString, IsUUID } from 'class-validator';
import { TransactionStage } from '../transaction.entity';

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsUUID()
  customerId: string;

  @IsNotEmpty()
  @IsUUID()
  propertyId: string;

  @IsOptional()
  @IsEnum(TransactionStage)
  stage?: TransactionStage;

  @IsOptional()
  @IsNumber()
  offerAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
