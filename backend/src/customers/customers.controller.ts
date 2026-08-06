import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // POST /api/customers
  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  // GET /api/customers?search=&type=&agentId=
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('agentId') agentId?: string,
  ) {
    return this.customersService.findAll({ search, type, agentId });
  }

  // GET /api/customers/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  // PATCH /api/customers/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  // DELETE /api/customers/:id
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }

  // POST /api/customers/:id/interactions
  @Post(':id/interactions')
  addInteraction(@Param('id') id: string, @Body() dto: CreateInteractionDto) {
    return this.customersService.addInteraction(id, dto);
  }
}
