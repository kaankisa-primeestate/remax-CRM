import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

// Brief 1.1: Mahremiyet Duvarı — bu controller'daki her endpoint giriş
// yapmayı zorunlu kılar; filtreleme mantığı CustomersService içinde,
// giriş yapan kullanıcının rolüne göre uygulanır.
@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // POST /api/customers
  @Post()
  create(@Body() dto: CreateCustomerDto, @CurrentUser() user: CurrentUserPayload) {
    return this.customersService.create(dto, user);
  }

  // GET /api/customers?search=&type=&agentId=
  // Not: agentId parametresi sadece Broker için dikkate alınır; bir
  // Danışman ne gönderirse göndersin sadece kendi müşterilerini görür.
  @Get()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('agentId') agentId?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.customersService.findAll({ search, type, agentId, keyword }, user);
  }

  // GET /api/customers/:id
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.customersService.findOne(id, user);
  }

  // PATCH /api/customers/:id
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customersService.update(id, dto, user);
  }

  // DELETE /api/customers/:id
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.customersService.remove(id, user);
  }

  // POST /api/customers/:id/interactions
  @Post(':id/interactions')
  addInteraction(
    @Param('id') id: string,
    @Body() dto: CreateInteractionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customersService.addInteraction(id, dto, user);
  }
}
