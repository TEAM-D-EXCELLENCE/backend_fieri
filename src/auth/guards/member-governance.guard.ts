import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import type { OptionalAuthRequest } from '../authenticated-request';
import {
  GOVERNANCE_MODE_KEY,
  type GovernanceMode,
} from './member-governance.decorator';
import { paramOf } from './request-params';

/**
 * Autorise une action de gouvernance visant un autre membre (`:id`).
 *
 * Les trois modes couvrent la chaîne d'exclusion contrôlée et le statut de
 * figure emblématique. Un ADMIN global passe toujours.
 */
@Injectable()
export class MemberGovernanceGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const mode = this.reflector.getAllAndOverride<GovernanceMode>(
      GOVERNANCE_MODE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!mode) {
      throw new ForbiddenException(
        'Mode de gouvernance non déterminé pour cette route.',
      );
    }

    const request = context.switchToHttp().getRequest<OptionalAuthRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentification requise.');
    }
    if (user.role === 'ADMIN') {
      return true;
    }

    const targetId = Number(paramOf(request, 'id'));
    if (!Number.isInteger(targetId)) {
      throw new NotFoundException('Membre introuvable.');
    }

    if (mode === 'club-responsible') {
      const club = await this.prisma.club.findFirst({
        where: {
          responsibleId: user.id,
          memberships: { some: { memberId: targetId } },
        },
        select: { id: true },
      });
      if (club) {
        return true;
      }
      throw new ForbiddenException(
        "Vous devez être responsable d'un club de ce membre (ou administrateur).",
      );
    }

    // mode === 'university-chief' : chef de l'université du membre visé
    const target = await this.prisma.member.findUnique({
      where: { id: targetId },
      select: { branch: { select: { universityId: true } } },
    });
    if (!target) {
      throw new NotFoundException('Membre introuvable.');
    }
    const post = await this.prisma.universityPost.findUnique({
      where: { memberId: user.id },
      select: { post: true, universityId: true },
    });
    if (
      post?.post === 'CHEF_UNIVERSITAIRE' &&
      post.universityId === target.branch?.universityId
    ) {
      return true;
    }
    throw new ForbiddenException(
      'Seul le Chef Universitaire du membre (ou un administrateur) peut valider.',
    );
  }
}
