import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class MarkPaidDto {
  @IsNotEmpty()
  @IsString()
  paidDate: string;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
