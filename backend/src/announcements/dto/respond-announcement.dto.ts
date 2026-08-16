import { IsIn, IsOptional, IsString } from 'class-validator';

export class RespondAnnouncementDto {
  @IsIn(['yes', 'no'])
  status: 'yes' | 'no';

  @IsOptional()
  @IsString()
  note?: string;
}
