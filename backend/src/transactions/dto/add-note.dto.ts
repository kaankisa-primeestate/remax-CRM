import { IsNotEmpty, IsString } from 'class-validator';

export class AddNoteDto {
  @IsNotEmpty()
  @IsString()
  text: string;
}
