import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { LedgerAdjustmentType } from '../agent-ledger-adjustment.entity';

export class CreateAdjustmentDto {
  @IsNotEmpty()
  @IsUUID()
  agentId: string;

  @IsNotEmpty()
  @IsEnum(LedgerAdjustmentType)
  type: LedgerAdjustmentType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  date: string;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string;
}
