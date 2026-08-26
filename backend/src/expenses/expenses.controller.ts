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

  // GET /api/expenses/categories -- kullanicinin yonetebilecegi, serbest
  // gider kategorileri listesi (artik sabit bir enum degil).
  @Get('categories')
  listCategories() {
    return this.expensesService.listCategories();
  }

  // POST /api/expenses/categories -- yeni bir kategori olustur (orn.
  // "Akaryakıt", "Müşteri Yemeği") -- kullanici ihtiyaç halinde aninda ekler.
  @Post('categories')
  createCategory(@Body('name') name: string) {
    return this.expensesService.createCategory(name);
  }

  // DELETE /api/expenses/categories/:id -- KALICI silme DEGIL,
  // pasiflestirme (gecmis giderler o kategoriye bagli kalir).
  @Delete('categories/:id')
  async deactivateCategory(@Param('id') id: string) {
    await this.expensesService.deactivateCategory(id);
    return { success: true };
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

  // GET /api/expenses/category/:categoryId?from=&to= -- bir kategorinin
  // tam sayfa detay dokumu (kalem kalem, hangi hesaptan odendigi ile)
  @Get('category/:categoryId')
  getCategoryDetail(
    @Param('categoryId') categoryId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.expensesService.getCategoryDetail(categoryId, from, to);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.expensesService.remove(id);
    return { success: true };
  }
}
