import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ChequeNoteStatus } from '../cheque-note.entity';

// Durum degistirme (orn. "Tahsil Edildi" isaretleme) + banka hesabi
// secme icin -- tum alanlar opsiyonel (kismi guncelleme).
export class UpdateChequeNoteDto {
  @IsOptional()
  @IsEnum(ChequeNoteStatus)
  status?: ChequeNoteStatus;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
