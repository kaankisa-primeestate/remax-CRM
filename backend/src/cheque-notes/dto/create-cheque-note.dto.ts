import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ChequeNoteType, ChequeNoteDirection } from '../cheque-note.entity';

export class CreateChequeNoteDto {
  @IsEnum(ChequeNoteType)
  type: ChequeNoteType;

  @IsEnum(ChequeNoteDirection)
  direction: ChequeNoteDirection;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsString()
  dueDate: string;

  @IsNotEmpty()
  @IsString()
  drawerName: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
