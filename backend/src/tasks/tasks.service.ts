import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUserPayload } from '../auth/current-user.decorator';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
  ) {}

  // Gorevler her zaman gorevi olusturan danismana aittir -- Mahremiyet
  // Duvari: Broker tum gorevleri gorebilir, Danisman sadece kendisininkini.
  async create(dto: CreateTaskDto, currentUser: CurrentUserPayload): Promise<Task> {
    const task = this.taskRepo.create({ ...dto, agentId: currentUser.userId });
    return this.taskRepo.save(task);
  }

  async findAll(currentUser: CurrentUserPayload): Promise<Task[]> {
    const where = currentUser.role === 'agent' ? { agentId: currentUser.userId } : {};
    return this.taskRepo.find({ where, order: { completed: 'ASC', dueDate: 'ASC', createdAt: 'DESC' } });
  }

  private async findOneOwned(id: string, currentUser: CurrentUserPayload): Promise<Task> {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException('Görev bulunamadı');
    }
    if (currentUser.role === 'agent' && task.agentId !== currentUser.userId) {
      throw new ForbiddenException('Bu göreve erişim yetkiniz yok');
    }
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, currentUser: CurrentUserPayload): Promise<Task> {
    const task = await this.findOneOwned(id, currentUser);
    Object.assign(task, dto);
    return this.taskRepo.save(task);
  }

  async remove(id: string, currentUser: CurrentUserPayload): Promise<void> {
    const task = await this.findOneOwned(id, currentUser);
    await this.taskRepo.remove(task);
  }
}
