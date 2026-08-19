import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePartnerDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  sharePercentage: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
