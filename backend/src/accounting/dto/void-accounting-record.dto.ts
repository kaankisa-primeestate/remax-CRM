import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VoidAccountingRecordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason: string;
}
