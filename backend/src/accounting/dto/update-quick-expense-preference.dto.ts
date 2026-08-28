import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateQuickExpensePreferenceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  label: string;

  @IsBoolean()
  isHidden: boolean;
}
