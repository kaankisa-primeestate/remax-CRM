import { IsNotEmpty, IsString } from 'class-validator';

export class CreateVoiceNoteDto {
  @IsString()
  @IsNotEmpty({ message: 'Ses dosyasi linki bos olamaz' })
  url: string;
}
