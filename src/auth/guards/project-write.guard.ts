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

/**
 * Autorise la modification ou la suppression d'un projet : son porteur, le
 * responsable du club auquel il est rattaché, ou un ADMIN.
 *
 * Se combine avec `@Roles(...)`, qui filtre en amont *qui* peut toucher aux
 * projets ; ce garde décide *quels* projets.
 */
@Injectable()
export class ProjectWriteGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OptionalAuthRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentification requise.');
    }
    if (user.role === 'ADMIN') {
      return true;
    }

    const project = await this.prisma.project.findUnique({
      where: { id: paramOf(request, 'id') ?? '' },
      select: { ownerId: true, clubId: true },
    });
    if (!project) {
      throw new NotFoundException('Projet non trouvé');
    }
    if (project.ownerId === user.id) {
      return true;
    }
    if (project.clubId) {
      const club = await this.prisma.club.findUnique({
        where: { id: project.clubId },
        select: { responsibleId: true },
      });
      if (club?.responsibleId === user.id) {
        return true;
      }
    }
    throw new ForbiddenException(
      "Vous n'êtes pas autorisé à modifier ce projet.",
    );
  }
}
