import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ExpenseCategory } from '../../expenses/expense.entity';

export class UpdateRecurringExpenseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  defaultAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dueDayOfMonth?: number;

  @IsOptional()
  @IsUUID()
  defaultBankAccountId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
