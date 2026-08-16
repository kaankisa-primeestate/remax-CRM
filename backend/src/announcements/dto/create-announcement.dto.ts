import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAnnouncementDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetAgentIds?: string[];

  @IsOptional()
  @IsIn(['general', 'celebration'])
  type?: 'general' | 'celebration';
}
