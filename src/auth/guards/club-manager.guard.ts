import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ClubScopeService } from '../../common/club-scope/club-scope.service';
import type { OptionalAuthRequest } from '../authenticated-request';
import { CLUB_SOURCE_KEY, type ClubSource } from './club-source.decorator';
import { paramOf } from './request-params';

/**
 * Autorise le responsable du club visé par la route (ou un ADMIN global).
 *
 * C'est la règle d'autorisation la plus fréquente de la plateforme : elle
 * gouverne l'espace club, les recensements, les rapports d'activité, les défis
 * et la gestion des adhésions. Elle était auparavant réimplémentée dans quatre
 * services ; elle vit désormais ici seule.
 *
 * Le club visé est décrit par `@ClubFrom(...)` sur la route. Doit être appliquée
 * APRÈS `AuthGuard('jwt')` pour que `request.user` soit renseigné.
 */
@Injectable()
export class ClubManagerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private clubScope: ClubScopeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const source = this.reflector.getAllAndOverride<ClubSource>(
      CLUB_SOURCE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!source) {
      // Sans description de source, la garde ne sait pas quoi vérifier : on
      // refuse plutôt que d'ouvrir la route par défaut.
      throw new ForbiddenException(
        'Club cible non déterminé pour cette route.',
      );
    }

    const request = context.switchToHttp().getRequest<OptionalAuthRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentification requise.');
    }

    const clubId = await this.resolveClubId(request, source);
    if (!clubId) {
      if (source.optional) {
        return true;
      }
      throw new NotFoundException('Club introuvable.');
    }

    if (user.role === 'ADMIN') {
      return true;
    }

    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, responsibleId: true },
    });
    if (!club) {
      throw new NotFoundException('Club introuvable.');
    }
    if (club.responsibleId === user.id) {
      return true;
    }

    // Voie secondaire : un poste universitaire habilité sur l'université de
    // rattachement du club (la secrétaire, pour les recensements).
    if (source.posts?.length) {
      const universityId = await this.clubScope.getClubUniversityId(clubId);
      if (universityId) {
        const post = await this.prisma.universityPost.findUnique({
          where: { memberId: user.id },
          select: { post: true, universityId: true },
        });
        if (
          post &&
          post.universityId === universityId &&
          source.posts.includes(post.post)
        ) {
          return true;
        }
      }
      throw new ForbiddenException(
        'Réservé au responsable du club, à la secrétaire ou à un administrateur.',
      );
    }

    throw new ForbiddenException('Action réservée au responsable du club.');
  }

  /** Traduit la description `@ClubFrom(...)` en identifiant de club concret. */
  private async resolveClubId(
    request: OptionalAuthRequest,
    source: ClubSource,
  ): Promise<string | null> {
    if (source.body) {
      const body = request.body as Record<string, unknown> | undefined;
      const value = body?.[source.body];
      return typeof value === 'string' ? value : null;
    }

    const raw = source.param ? paramOf(request, source.param) : null;
    if (!raw) {
      return null;
    }
    if (!source.through) {
      return raw;
    }

    if (source.through === 'challenge') {
      const challenge = await this.prisma.challenge.findUnique({
        where: { id: raw },
        select: { clubId: true },
      });
      return challenge?.clubId ?? null;
    }

    const membership = await this.prisma.clubMembership.findUnique({
      where: { id: raw },
      select: { clubId: true },
    });
    return membership?.clubId ?? null;
  }
}
