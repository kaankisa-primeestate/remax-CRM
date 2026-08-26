import { IsEnum, IsString, IsNumber, IsOptional, IsDateString, IsUUID, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseCategory } from '../expense.entity';

export class ExpenseChargebackDto {
  @IsUUID()
  agentId: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  percentage?: number;
}

export class CreateExpenseDto {
  // YENI, esnek kategori sistemi -- artik zorunlu alan bu.
  @IsUUID()
  categoryId: string;

  // Eski sabit enum -- artik OPSIYONEL, sadece geriye donuk uyumluluk
  // icin duruyor, yeni giderler bunu ARTIK GONDERMEZ.
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsString()
  title: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  vatRate?: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @IsOptional()
  @IsUUID()
  agentId?: string;

  @IsOptional()
  @IsNumber()
  chargebackPercentage?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseChargebackDto)
  chargebacks?: ExpenseChargebackDto[];

  @IsOptional()
  @IsUUID()
  recurringExpenseId?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
