import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class GenerateDuesDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'period YYYY-MM formatında olmalı' })
  period: string;
}
