import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { OptionalAuthRequest } from '../authenticated-request';
import { paramOf } from './request-params';
import { autoriteSurProjet } from './project-authority';

/**
 * Autorise l'écriture d'une tâche selon le projet qui la porte.
 *
 * Une tâche n'a pas d'existence propre : elle appartient à un projet, et
 * l'autorité sur ce projet est la seule question à poser. `@Roles(...)` dit
 * qu'un Chef de projet gère des tâches ; ce garde dit *lesquelles*.
 *
 * Le projet visé est lu par ordre de fiabilité : d'abord la tâche désignée par
 * l'URL, ensuite seulement `projectId` dans le corps. Sans cet ordre, une
 * requête sur la tâche d'autrui pourrait se faire autoriser en joignant l'id
 * d'un projet dont l'appelant est bien le porteur.
 */
@Injectable()
export class TaskWriteGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OptionalAuthRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentification requise.');
    }

    const taskId = paramOf(request, 'id');
    let projectId: string | null;
    if (taskId) {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        select: { projectId: true },
      });
      if (!task) {
        throw new NotFoundException('Tâche non trouvée');
      }
      projectId = task.projectId;
    } else {
      const body = request.body as { projectId?: unknown } | undefined;
      projectId = typeof body?.projectId === 'string' ? body.projectId : null;
      if (!projectId) {
        throw new ForbiddenException('Projet cible non déterminé.');
      }
    }

    const autorite = await autoriteSurProjet(this.prisma, user, projectId);
    if (autorite === null) {
      throw new NotFoundException('Projet non trouvé');
    }
    if (autorite !== 'ecriture') {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à gérer les tâches de ce projet.",
      );
    }
    return true;
  }
}
