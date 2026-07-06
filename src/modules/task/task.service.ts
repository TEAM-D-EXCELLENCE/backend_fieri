import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  async getTasksByProject(projectId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      data: tasks.map((t) => ({
        id: t.id,
        projectId: t.projectId,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assignedTo: t.assignedTo || '',
      })),
    };
  }

  async createTask(data: {
    projectId: string;
    title: string;
    status?: string;
    priority?: string;
    assignedTo?: string;
  }) {
    // Check if project exists
    const project = await this.prisma.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }

    const task = await this.prisma.task.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        status: data.status || 'TODO',
        priority: data.priority || 'MEDIUM',
        assignedTo: data.assignedTo || '',
      },
    });

    return {
      success: true,
      data: {
        id: task.id,
        projectId: task.projectId,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignedTo: task.assignedTo || '',
      },
    };
  }

  async updateTaskStatus(id: string, status: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Tâche non trouvée');
    }

    await this.prisma.task.update({
      where: { id },
      data: { status },
    });

    return {
      success: true,
      message: 'Tâche mise à jour.',
    };
  }

  async assignTask(id: string, assignedTo: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Tâche non trouvée');
    }

    await this.prisma.task.update({
      where: { id },
      data: { assignedTo },
    });

    return {
      success: true,
      message: 'Tâche assignée.',
    };
  }

  async updateTaskPriority(id: string, priority: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Tâche non trouvée');
    }

    await this.prisma.task.update({
      where: { id },
      data: { priority },
    });

    return {
      success: true,
      message: 'Priorité mise à jour.',
    };
  }

  async deleteTask(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Tâche non trouvée');
    }

    await this.prisma.task.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Tâche supprimée.',
    };
  }
}
