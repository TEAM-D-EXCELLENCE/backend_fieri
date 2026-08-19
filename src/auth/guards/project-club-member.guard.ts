import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { OptionalAuthRequest } from '../authenticated-request';

/**
 * Contrôle le rattachement d'un nouveau projet à un club : seuls le responsable
 * du club, ses membres dont l'adhésion est approuvée, et les ADMIN peuvent le
 * faire.
 *
 * Le rattachement étant facultatif, un corps sans `clubId` passe sans contrôle.
 */
@Injectable()
export class ProjectClubMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OptionalAuthRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentification requise.');
    }

    const body = request.body as { clubId?: unknown } | undefined;
    const clubId = typeof body?.clubId === 'string' ? body.clubId : null;
    if (!clubId) {
      return true; // projet sans club : rien à vérifier
    }
    if (user.role === 'ADMIN') {
      return true;
    }

    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { responsibleId: true },
    });
    if (!club) {
      throw new NotFoundException('Club introuvable.');
    }
    if (club.responsibleId === user.id) {
      return true;
    }

    const membership = await this.prisma.clubMembership.findUnique({
      where: { clubId_memberId: { clubId, memberId: user.id } },
      select: { status: true },
    });
    if (membership?.status === 'APPROVED') {
      return true;
    }
    throw new ForbiddenException(
      "Vous n'êtes pas autorisé à créer un projet rattaché à ce club.",
    );
  }
}
