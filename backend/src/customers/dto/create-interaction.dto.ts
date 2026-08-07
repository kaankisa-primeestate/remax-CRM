import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { InteractionType } from '../interaction.entity';

export class CreateInteractionDto {
  @IsEnum(InteractionType, { message: 'Geçerli bir görüşme tipi seçin' })
  type: InteractionType;

  @IsString()
  @IsNotEmpty({ message: 'Görüşme notu boş olamaz' })
  notes: string;

  @IsOptional()
  @IsString()
  actionItems?: string;

  @IsDateString({}, { message: 'Geçerli bir tarih girin (ISO 8601)' })
  occurredAt: string;
}
