import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

// Finans modulu tamamen Broker'a ozel.
@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BROKER)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(@Body() dto: CreateExpenseDto) {
    return this.expensesService.create(dto);
  }

  @Get()
  findAll() {
    return this.expensesService.findAll();
  }

  // GET /api/expenses/summary?from=&to= -- kategori bazli ozet ("bu ay
  // nereye ne harcamisim") -- ":id" gibi bir rota OLMADIGI icin route
  // sirasi sorun yaratmaz.
  @Get('summary')
  getSummaryByCategory(@Query('from') from: string, @Query('to') to: string) {
    return this.expensesService.getSummaryByCategory(from, to);
  }

  // GET /api/expenses/category/:category?from=&to= -- bir kategorinin
  // tam sayfa detay dokumu (kalem kalem, hangi hesaptan odendigi ile)
  @Get('category/:category')
  getCategoryDetail(
    @Param('category') category: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.expensesService.getCategoryDetail(category, from, to);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.expensesService.remove(id);
    return { success: true };
  }
}
