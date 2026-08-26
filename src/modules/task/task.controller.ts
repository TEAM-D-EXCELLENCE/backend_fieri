import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { TaskWriteGuard } from '../../auth/guards';
import { TaskService } from './task.service';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('project/:projectId')
  async getProjectTasks(@Param('projectId') projectId: string) {
    return this.taskService.getTasksByProject(projectId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHEF_DE_PROJET', 'ADMIN')
  @UseGuards(TaskWriteGuard)
  @Post()
  async createTask(
    @Body()
    data: {
      projectId: string;
      title: string;
      status?: string;
      priority?: string;
      assignedTo?: string;
    },
  ) {
    return this.taskService.createTask(data);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHEF_DE_PROJET', 'ADMIN')
  @UseGuards(TaskWriteGuard)
  @Put(':id')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.taskService.updateTaskStatus(id, status);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHEF_DE_PROJET', 'ADMIN')
  @UseGuards(TaskWriteGuard)
  @Patch(':id/assign')
  async assignTask(
    @Param('id') id: string,
    @Body('assignedTo') assignedTo: string,
  ) {
    return this.taskService.assignTask(id, assignedTo);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHEF_DE_PROJET', 'ADMIN')
  @UseGuards(TaskWriteGuard)
  @Patch(':id/priority')
  async updatePriority(
    @Param('id') id: string,
    @Body('priority') priority: string,
  ) {
    return this.taskService.updateTaskPriority(id, priority);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CHEF_DE_PROJET', 'ADMIN')
  @UseGuards(TaskWriteGuard)
  @Delete(':id')
  async deleteTask(@Param('id') id: string) {
    return this.taskService.deleteTask(id);
  }
}
