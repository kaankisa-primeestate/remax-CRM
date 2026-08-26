import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ExpenseCategory } from '../../expenses/expense.entity';

export class CreateRecurringExpenseDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsNumber()
  @Min(0.01)
  defaultAmount: number;

  @IsInt()
  @Min(1)
  @Max(31)
  dueDayOfMonth: number;

  @IsOptional()
  @IsUUID()
  defaultBankAccountId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
