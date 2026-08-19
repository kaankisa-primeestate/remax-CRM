import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { PartnerLedgerType } from '../partner-ledger-entry.entity';

export class CreatePartnerAdjustmentDto {
  @IsEnum(PartnerLedgerType)
  type: PartnerLedgerType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  date: string;
}
