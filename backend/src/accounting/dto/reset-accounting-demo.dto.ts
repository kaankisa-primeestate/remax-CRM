import { IsIn, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetAccountingDemoDto {
  @IsIn(['MUHASEBE DENEME KAYITLARINI SIFIRLA'])
  confirmation: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  reason: string;
}
