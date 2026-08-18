import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { TransactionDocType } from '../transaction-document.entity';

export class AddDocumentDto {
  @IsEnum(TransactionDocType)
  docType: TransactionDocType;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;
}
