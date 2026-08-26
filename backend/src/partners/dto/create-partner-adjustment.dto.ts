import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
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

  // Bu para HANGI kasa/banka hesabina girdi/hangisinden cikti -- KRITIK
  // duzeltme: onceden bu alan hic yoktu, sermaye girisi/iadesi banka
  // bakiyesini HIC ETKILEMIYORDU (canli kullanimda tespit edildi).
  @IsNotEmpty()
  @IsUUID()
  bankAccountId: string;
}
