import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

// Mahremiyet Duvari: her endpoint giris yapmayi zorunlu kilar; filtreleme
// mantigi TasksService icinde, giris yapan kullanicinin rolune gore uygulanir.
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // POST /api/tasks
  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: CurrentUserPayload) {
    return this.tasksService.create(dto, user);
  }

  // GET /api/tasks -- Danisman sadece kendi gorevlerini, Broker tumunu gorur
  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.tasksService.findAll(user);
  }

  // PATCH /api/tasks/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: CurrentUserPayload) {
    return this.tasksService.update(id, dto, user);
  }

  // DELETE /api/tasks/:id
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.tasksService.remove(id, user);
    return { success: true };
  }
}
