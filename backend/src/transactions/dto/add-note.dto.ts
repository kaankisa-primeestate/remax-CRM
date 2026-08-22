import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddNoteDto {
  @IsNotEmpty()
  @IsString()
  text: string;

  @IsOptional()
  @IsBoolean()
  isBrokerFlag?: boolean;
}
