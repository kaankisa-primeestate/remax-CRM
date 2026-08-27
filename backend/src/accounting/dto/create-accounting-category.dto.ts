import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AccountingEntryType } from '../accounting-entry.entity';

export class CreateAccountingCategoryDto {
  @IsEnum(AccountingEntryType)
  type: AccountingEntryType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}
