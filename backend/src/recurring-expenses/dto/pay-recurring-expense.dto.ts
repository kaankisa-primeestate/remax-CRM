import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

// Bir sablonun bu donem icin "odendi" isaretlenmesi -- tutar varsayilan
// degerden FARKLI olabilir (orn. elektrik faturasi her ay degisir),
// bu yuzden odeme aninda elle girilir/degistirilir.
export class PayRecurringExpenseDto {
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
  @IsString()
  referenceNo?: string;
}
