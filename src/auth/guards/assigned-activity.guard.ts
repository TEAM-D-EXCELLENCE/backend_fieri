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
 * Autorise la mise à jour d'une activité assignée : le membre à qui elle
 * incombe (il rend compte de son avancement), le responsable du club qui l'a
 * confiée, ou un ADMIN.
 */
@Injectable()
export class AssignedActivityGuard implements CanActivate {
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

    const activity = await this.prisma.assignedActivity.findUnique({
      where: { id: paramOf(request, 'id') ?? '' },
      select: { memberId: true, club: { select: { responsibleId: true } } },
    });
    if (!activity) {
      throw new NotFoundException('Activité introuvable.');
    }
    if (
      activity.memberId === user.id ||
      activity.club.responsibleId === user.id
    ) {
      return true;
    }
    throw new ForbiddenException(
      "Vous n'êtes pas autorisé à modifier cette activité.",
    );
  }
}
