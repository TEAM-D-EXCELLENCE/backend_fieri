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
 * Ouvre le tableau des tâches d'un projet à ceux qui y travaillent.
 *
 * Un projet est public ; l'organisation de son travail ne l'est pas — qui fait
 * quoi, ce qui traîne, ce qui reste. La lecture suit donc la même règle que
 * l'écriture, élargie aux membres approuvés du club porteur.
 */
@Injectable()
export class TaskReadGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OptionalAuthRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentification requise.');
    }

    const autorite = await autoriteSurProjet(
      this.prisma,
      user,
      paramOf(request, 'projectId') ?? '',
    );
    if (autorite === null) {
      throw new NotFoundException('Projet non trouvé');
    }
    if (autorite === 'aucune') {
      throw new ForbiddenException(
        "Le tableau des tâches est réservé à l'équipe du projet.",
      );
    }
    return true;
  }
}
