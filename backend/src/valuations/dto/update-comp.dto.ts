import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { AddCompDto } from './add-comp.dto';

export class UpdateCompDto extends PartialType(AddCompDto) {
  @IsOptional()
  @IsBoolean()
  includedInAnalysis?: boolean;

  @IsOptional()
  @IsNumber()
  adjustmentAmount?: number;

  @IsOptional()
  @IsString()
  adjustmentReason?: string;
}
